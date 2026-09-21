import { db, gravarEstado, lerEstado } from './db';
import { salvar, criarSeNaoExistir, listar } from './repo';
import { idDeterministico } from './ids';
import { hoje, somarDias, mesDe, somarMeses, diaNoMes, paraISO, nomeMes, diasEntre } from './formato';
import { CAT, ID_CONFIG } from './sementes';
import type {
  Cliente, ClienteServico, Cobranca, Configuracao, Evento, Lancamento, Servico, Tarefa, TarefaModelo
} from './tipos';

// Rotinas automáticas da Fase 1. Todas são idempotentes: rodar de novo não duplica nada.

async function criarCobranca(cs: ClienteServico, cliente: Cliente, p: { ref: string; venc: string; valor: number; descricao: string }) {
  const id = idDeterministico(`cobranca:${cs.id}:${p.ref}`);
  await criarSeNaoExistir<Cobranca>('cobrancas', {
    id, cliente_id: cliente.id, cliente_servico_id: cs.id, lancamento_origem_id: null,
    descricao: p.descricao, valor: p.valor, vencimento: p.venc,
    status: p.venc < hoje() ? 'atrasada' : 'aberta', pago_em: null, valor_pago: null,
    forma_pagamento: '', lancamento_id: null, referencia: p.ref
  });
  await criarEventoVencimento(id, cliente, p.venc);
}

async function criarEventoVencimento(cobrancaId: string, cliente: Cliente, venc: string) {
  await criarSeNaoExistir<Evento>('eventos', {
    id: idDeterministico(`evento:cobranca:${cobrancaId}`), titulo: `Vencimento — ${cliente.nome}`,
    tipo: 'vencimento', inicio: paraISO(venc, '09:00'), fim: null, dia_inteiro: true, local_link: '',
    descricao: '', cliente_id: cliente.id, lead_id: null, recorrencia: 'nenhuma', lembretes: [],
    automatico: true, origem_tabela: 'cobrancas', origem_id: cobrancaId, google_event_id: null, sync_pendente: true
  });
}

export async function gerarCobrancas(cs: ClienteServico, cliente: Cliente) {
  if (cs.excluido || cs.status !== 'ativo' || cliente.status !== 'ativo' || cliente.excluido) return;
  const servico = await db.servicos.get(cs.servico_id);
  const nome = cs.descricao || servico?.nome || 'Serviço';
  if (cs.tipo_cobranca === 'mensal') {
    const limite = somarDias(hoje(), 35);
    let mes = mesDe(hoje()) > mesDe(cs.inicio) ? mesDe(hoje()) : mesDe(cs.inicio);
    for (let guarda = 0; guarda < 24; guarda++) {
      const venc = diaNoMes(mes, cs.dia_vencimento || 10);
      if (venc > limite || (cs.fim && venc > cs.fim)) break;
      if (venc >= cs.inicio) {
        await criarCobranca(cs, cliente, { ref: mes, venc, valor: cs.valor, descricao: `${nome} — ${nomeMes(mes, false)}` });
      }
      mes = somarMeses(mes, 1);
    }
  } else {
    const n = Math.max(1, cs.parcelas || 1);
    const base = Math.floor((cs.valor / n) * 100) / 100;
    const primeiro = cs.primeiro_vencimento || cs.inicio;
    for (let i = 0; i < n; i++) {
      const valor = i === n - 1 ? Math.round((cs.valor - base * (n - 1)) * 100) / 100 : base;
      const venc = diaNoMes(somarMeses(mesDe(primeiro), i), Number(primeiro.slice(8, 10)));
      await criarCobranca(cs, cliente, {
        ref: `parcela-${i + 1}`, venc, valor, descricao: n > 1 ? `${nome} — parcela ${i + 1}/${n}` : nome
      });
    }
  }
}

// Quando o valor ou o dia de vencimento mudam, as cobranças futuras em aberto acompanham.
export async function atualizarCobrancasFuturas(cs: ClienteServico) {
  if (cs.tipo_cobranca !== 'mensal') return;
  const cobs = (await db.cobrancas.where('cliente_servico_id').equals(cs.id).toArray())
    .filter((c) => !c.excluido && (c.status === 'aberta' || c.status === 'atrasada') && c.vencimento >= hoje());
  for (const c of cobs) {
    const venc = diaNoMes(mesDe(c.vencimento), cs.dia_vencimento || 10);
    if (venc !== c.vencimento || c.valor !== cs.valor) {
      await salvar<Cobranca>('cobrancas', { id: c.id, vencimento: venc, valor: cs.valor });
      const ev = await db.eventos.get(idDeterministico(`evento:cobranca:${c.id}`));
      if (ev) await salvar<Evento>('eventos', { id: ev.id, inicio: paraISO(venc, '09:00'), sync_pendente: true });
    }
  }
}

export async function aplicarChecklists(cliente: Cliente, cs: ClienteServico) {
  const modelos = (await db.tarefa_modelos.where('servico_id').equals(cs.servico_id).toArray())
    .filter((m) => !m.excluido && m.tipo === 'checklist');
  for (const m of modelos) {
    for (let i = 0; i < m.itens.length; i++) {
      await criarSeNaoExistir<Tarefa>('tarefas', {
        id: idDeterministico(`checklist:${m.id}:${cs.id}:${i}`), titulo: m.itens[i], descricao: '',
        prazo: somarDias(hoje(), 7), prioridade: 'media', status: 'aberta', cliente_id: cliente.id,
        origem: 'checklist', modelo_id: m.id, referencia: `checklist:${m.id}:${cs.id}`, ordem: i, concluida_em: null
      });
    }
  }
}

export async function encerrarCliente(cliente: Cliente) {
  const cobs = (await db.cobrancas.where('cliente_id').equals(cliente.id).toArray())
    .filter((c) => !c.excluido && (c.status === 'aberta' || c.status === 'atrasada') && c.vencimento >= hoje());
  for (const c of cobs) {
    await salvar<Cobranca>('cobrancas', { id: c.id, status: 'cancelada' });
    const ev = await db.eventos.get(idDeterministico(`evento:cobranca:${c.id}`));
    if (ev) await salvar<Evento>('eventos', { id: ev.id, excluido: true });
  }
}

export function valorAtualizado(c: Cobranca, cliente?: Cliente | null) {
  const atraso = Math.max(0, diasEntre(c.vencimento, hoje()));
  if (!cliente?.multa_ativa || atraso === 0 || c.status === 'paga') return { total: c.valor, multa: 0, juros: 0, atraso };
  const multa = Math.round(c.valor * (cliente.multa_percentual / 100) * 100) / 100;
  const juros = Math.round(c.valor * (cliente.juros_mensal / 100) * (atraso / 30) * 100) / 100;
  return { total: Math.round((c.valor + multa + juros) * 100) / 100, multa, juros, atraso };
}

async function mostrarVencimento(cobrancaId: string, visivel: boolean) {
  const ev = await db.eventos.get(idDeterministico(`evento:cobranca:${cobrancaId}`));
  if (ev && ev.excluido === visivel) await salvar<Evento>('eventos', { id: ev.id, excluido: !visivel });
}

export async function pagarCobranca(c: Cobranca, p: { data: string; valor: number; forma: string }) {
  await mostrarVencimento(c.id, false);
  if (c.lancamento_origem_id) {
    // Reembolso de verba adiantada: não é receita, só baixa o valor a receber.
    await salvar<Lancamento>('lancamentos', { id: c.lancamento_origem_id, reembolsado_em: p.data });
    await salvar<Cobranca>('cobrancas', { id: c.id, status: 'paga', pago_em: p.data, valor_pago: p.valor, forma_pagamento: p.forma });
    return;
  }
  const cliente = await db.clientes.get(c.cliente_id);
  const lancId = idDeterministico(`lancamento:cobranca:${c.id}`);
  await salvar<Lancamento>('lancamentos', {
    id: lancId, carteira: 'negocio', categoria_id: CAT.receitaServicos, tipo: 'entrada',
    descricao: `${c.descricao}${cliente ? ` — ${cliente.nome}` : ''}`, valor: p.valor, data: p.data,
    status: 'pago', forma_pagamento: p.forma, cliente_id: c.cliente_id, cobranca_id: c.id,
    recorrente: false, recorrencia_origem_id: null, referencia: null, reembolsado_em: null, excluido: false
  });
  await salvar<Cobranca>('cobrancas', {
    id: c.id, status: 'paga', pago_em: p.data, valor_pago: p.valor, forma_pagamento: p.forma, lancamento_id: lancId
  });
}

export async function desfazerPagamento(c: Cobranca) {
  await mostrarVencimento(c.id, true);
  if (c.lancamento_id) await salvar<Lancamento>('lancamentos', { id: c.lancamento_id, excluido: true });
  if (c.lancamento_origem_id) await salvar<Lancamento>('lancamentos', { id: c.lancamento_origem_id, reembolsado_em: null });
  await salvar<Cobranca>('cobrancas', {
    id: c.id, status: c.vencimento < hoje() ? 'atrasada' : 'aberta', pago_em: null, valor_pago: null, lancamento_id: null
  });
}

// Verba adiantada vinculada a um cliente vira uma cobrança de reembolso.
export async function aposSalvarLancamento(l: Lancamento) {
  if (l.excluido || !l.cliente_id || l.tipo !== 'saida') return;
  const cat = l.categoria_id ? await db.categorias.get(l.categoria_id) : null;
  if (cat?.especial !== 'verba_adiantada') return;
  const cliente = await db.clientes.get(l.cliente_id);
  if (!cliente) return;
  const id = idDeterministico(`cobranca:verba:${l.id}`);
  const venc = somarDias(l.data, 5);
  const criada = await criarSeNaoExistir<Cobranca>('cobrancas', {
    id, cliente_id: cliente.id, cliente_servico_id: null, lancamento_origem_id: l.id,
    descricao: 'Reembolso de verba de anúncios', valor: l.valor, vencimento: venc,
    status: venc < hoje() ? 'atrasada' : 'aberta', pago_em: null, valor_pago: null,
    forma_pagamento: '', lancamento_id: null, referencia: `verba:${l.id}`
  });
  if (!criada) {
    const c = await db.cobrancas.get(id);
    if (c && c.status !== 'paga' && c.valor !== l.valor) await salvar<Cobranca>('cobrancas', { id, valor: l.valor });
  }
  await criarEventoVencimento(id, cliente, venc);
}

async function tarefasRecorrentes(mes: string) {
  const clientes = (await listar<Cliente>('clientes')).filter((c) => c.status === 'ativo');
  const modelos = (await listar<TarefaModelo>('tarefa_modelos')).filter((m) => m.tipo === 'recorrente');
  const servicos = (await listar<ClienteServico>('cliente_servicos')).filter((s) => s.status === 'ativo');
  for (const cliente of clientes) {
    const doCliente = new Set(servicos.filter((s) => s.cliente_id === cliente.id).map((s) => s.servico_id));
    for (const m of modelos) {
      if (!m.servico_id || !doCliente.has(m.servico_id)) continue;
      for (let i = 0; i < m.itens.length; i++) {
        await criarSeNaoExistir<Tarefa>('tarefas', {
          id: idDeterministico(`recorrente:${m.id}:${cliente.id}:${mes}:${i}`), titulo: m.itens[i], descricao: '',
          prazo: diaNoMes(mes, m.dia_do_mes || 1), prioridade: 'media', status: 'aberta', cliente_id: cliente.id,
          origem: 'recorrente', modelo_id: m.id, referencia: `recorrente:${m.id}:${mes}`, ordem: i, concluida_em: null
        });
      }
    }
  }
}

async function lancamentosRecorrentes(mes: string) {
  const origens = (await listar<Lancamento>('lancamentos')).filter((l) => l.recorrente && !l.recorrencia_origem_id);
  for (const o of origens) {
    if (mesDe(o.data) >= mes) continue;
    await criarSeNaoExistir<Lancamento>('lancamentos', {
      ...o, id: idDeterministico(`recorrente:${o.id}:${mes}`), data: diaNoMes(mes, Number(o.data.slice(8, 10))),
      status: 'previsto', recorrente: false, recorrencia_origem_id: o.id, referencia: mes,
      cobranca_id: null, reembolsado_em: null, excluido: false
    });
  }
}

async function lembretesMei(mes: string) {
  const cfg = await db.configuracoes.get(ID_CONFIG);
  if (!cfg?.mei) return;
  for (const m of [mes, somarMeses(mes, 1)]) {
    const dia = diaNoMes(m, 20);
    await criarSeNaoExistir<Evento>('eventos', {
      id: idDeterministico(`mei:das:${m}`), titulo: 'Pagar o DAS do MEI', tipo: 'vencimento',
      inicio: paraISO(dia, '09:00'), fim: null, dia_inteiro: true, local_link: '', descricao: 'Guia mensal do MEI (vence todo dia 20).',
      cliente_id: null, lead_id: null, recorrencia: 'nenhuma', lembretes: [], automatico: true,
      origem_tabela: 'mei', origem_id: `das-${m}`, google_event_id: null, sync_pendente: true
    });
  }
  const ano = Number(hoje().slice(0, 4));
  const prazo = hoje() <= `${ano}-05-31` ? `${ano}-05-31` : `${ano + 1}-05-31`;
  await criarSeNaoExistir<Evento>('eventos', {
    id: idDeterministico(`mei:dasn:${prazo}`), titulo: 'Enviar a declaração anual do MEI (DASN-SIMEI)', tipo: 'prazo',
    inicio: paraISO(prazo, '09:00'), fim: null, dia_inteiro: true, local_link: '', descricao: '',
    cliente_id: null, lead_id: null, recorrencia: 'nenhuma', lembretes: [], automatico: true,
    origem_tabela: 'mei', origem_id: `dasn-${prazo}`, google_event_id: null, sync_pendente: true
  });
}

export async function rotinaDiaria(forcar = false) {
  const dia = hoje();
  if (!forcar && (await lerEstado('rotina_dia')) === dia) return;
  const clientes = await listar<Cliente>('clientes');
  const porId = new Map(clientes.map((c) => [c.id, c]));
  for (const cs of await listar<ClienteServico>('cliente_servicos')) {
    const cliente = porId.get(cs.cliente_id);
    if (cliente && cs.tipo_cobranca === 'mensal') await gerarCobrancas(cs, cliente);
  }
  for (const c of await listar<Cobranca>('cobrancas')) {
    if (c.status === 'aberta' && c.vencimento < dia) await salvar<Cobranca>('cobrancas', { id: c.id, status: 'atrasada' });
  }
  const mes = mesDe(dia);
  await tarefasRecorrentes(mes);
  await lancamentosRecorrentes(mes);
  await lembretesMei(mes);
  await gravarEstado('rotina_dia', dia);
}

export async function config(): Promise<Configuracao | undefined> {
  return db.configuracoes.get(ID_CONFIG);
}
export type { Servico };

// Serviço removido ou encerrado: cancela as cobranças futuras que ainda estão em aberto.
export async function cancelarCobrancasFuturas(clienteServicoId: string) {
  const cobs = (await db.cobrancas.where('cliente_servico_id').equals(clienteServicoId).toArray())
    .filter((c) => !c.excluido && (c.status === 'aberta' || c.status === 'atrasada') && c.vencimento >= hoje());
  for (const c of cobs) {
    await salvar<Cobranca>('cobrancas', { id: c.id, status: 'cancelada' });
    const ev = await db.eventos.get(idDeterministico(`evento:cobranca:${c.id}`));
    if (ev) await salvar<Evento>('eventos', { id: ev.id, excluido: true });
  }
}
