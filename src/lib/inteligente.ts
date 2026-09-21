import { hoje, somarDias, diasEntre } from './formato';
import type { Cliente, Cobranca, ClienteServico, Servico } from './tipos';

export interface AlertaInteligente {
  id: string;
  tipo: 'risco_cliente' | 'oportunidade' | 'aniversario' | 'dominio_vencendo';
  titulo: string;
  corpo: string;
  link: string;
  cor: 'erro' | 'atencao' | 'ok' | 'destaque';
}

export function alertasClienteRisco(clientes: Cliente[], cobrancas: Cobranca[]): AlertaInteligente[] {
  const alertas: AlertaInteligente[] = [];
  const hojeStr = hoje();

  // 1. Cobranças atrasadas há mais de 5 dias
  cobrancas.filter(c => c.status === 'atrasada' && !c.excluido).forEach(c => {
    const atraso = diasEntre(c.vencimento, hojeStr);
    if (atraso >= 5) {
      const cli = clientes.find(x => x.id === c.cliente_id);
      alertas.push({
        id: `risco-cobranca-${c.id}`,
        tipo: 'risco_cliente',
        titulo: `⚠️ Inadimplência: ${cli?.nome ?? c.descricao}`,
        corpo: `Cobrança vencida há ${atraso} dias (R$ ${c.valor.toFixed(2).replace('.', ',')})`,
        link: '/cobrancas',
        cor: 'erro',
      });
    }
  });

  // 2. NPS Detratores (ler de atlas_nps)
  try {
    const npsLista: any[] = JSON.parse(localStorage.getItem('atlas_nps') || '[]');
    npsLista.filter(n => n.nota !== null && n.nota <= 6).forEach(n => {
      alertas.push({
        id: `risco-nps-${n.id}`,
        tipo: 'risco_cliente',
        titulo: `⚠️ Cliente Insatisfeito (NPS ${n.nota}/10)`,
        corpo: `${n.cliente_nome}: "${n.comentario || 'Sem comentário'}"`,
        link: '/satisfacao',
        cor: 'erro',
      });
    });
  } catch {}

  return alertas;
}

export function alertasAniversarios(clientes: Cliente[]): AlertaInteligente[] {
  const alertas: AlertaInteligente[] = [];
  const hojeStr = hoje();
  const mesDiaHoje = hojeStr.slice(5); // MM-DD

  clientes.filter(c => c.status === 'ativo' && !c.excluido).forEach(c => {
    // Aniversário do cliente
    if (c.aniversario) {
      const md = c.aniversario.length >= 5 ? c.aniversario.slice(-5) : '';
      if (md === mesDiaHoje) {
        const tel = (c.whatsapp || c.telefone || '').replace(/\D/g, '');
        alertas.push({
          id: `aniv-cliente-${c.id}-${hojeStr.slice(0, 7)}`,
          tipo: 'aniversario',
          titulo: `🎂 Aniversário de ${c.nome}`,
          corpo: 'Clique para enviar os parabéns pelo WhatsApp!',
          link: tel ? `https://wa.me/55${tel}?text=${encodeURIComponent(`Parabéns, ${c.nome.split(' ')[0]}! 🎉 A Continental MKT te deseja muito sucesso!`)}` : `/clientes/${c.id}`,
          cor: 'ok',
        });
      }
    }

    // Aniversário de Contrato (criado_em mesmo mês e dia)
    if (c.criado_em) {
      const mdCriado = c.criado_em.slice(5, 10);
      const anoCriado = parseInt(c.criado_em.slice(0, 4), 10);
      const anoAtual = parseInt(hojeStr.slice(0, 4), 10);
      if (mdCriado === mesDiaHoje && anoAtual > anoCriado) {
        const anos = anoAtual - anoCriado;
        alertas.push({
          id: `aniv-contrato-${c.id}-${anoAtual}`,
          tipo: 'aniversario',
          titulo: `🤝 ${anos} ano${anos > 1 ? 's' : ''} de Parceria com ${c.nome}`,
          corpo: `Cliente comemora ${anos} ano${anos > 1 ? 's' : ''} na Continental MKT hoje!`,
          link: `/clientes/${c.id}`,
          cor: 'destaque',
        });
      }
    }
  });

  return alertas;
}

export function alertasDominiosVencendo(): AlertaInteligente[] {
  const alertas: AlertaInteligente[] = [];
  const hojeStr = hoje();
  const limite = somarDias(hojeStr, 30);

  try {
    const dominios: any[] = JSON.parse(localStorage.getItem('atlas_sites_dominios') || '[]');
    dominios.forEach(d => {
      if (d.vence_dominio && d.vence_dominio >= hojeStr && d.vence_dominio <= limite) {
        alertas.push({
          id: `dom-venc-${d.id}`,
          tipo: 'dominio_vencendo',
          titulo: `🌐 Domínio Vencendo: ${d.dominio}`,
          corpo: `Vence em ${d.vence_dominio}. Pago por: ${d.quem_paga === 'continental' ? 'Continental' : 'Cliente'}`,
          link: '/sites',
          cor: 'atencao',
        });
      }
    });
  } catch {}

  return alertas;
}

export function alertasOportunidades(clientes: Cliente[], clienteServicos: ClienteServico[], servicos: Servico[]): AlertaInteligente[] {
  const alertas: AlertaInteligente[] = [];
  const servicosTrafego = new Set(servicos.filter(s => s.chave === 'trafego').map(s => s.id));
  const servicosSite = new Set(servicos.filter(s => s.chave === 'site').map(s => s.id));

  clientes.filter(c => c.status === 'ativo' && !c.excluido).forEach(c => {
    const csCliente = clienteServicos.filter(cs => cs.cliente_id === c.id && cs.status === 'ativo');
    const temTrafego = csCliente.some(cs => servicosTrafego.has(cs.servico_id));
    const temSite = csCliente.some(cs => servicosSite.has(cs.servico_id));

    if (!temTrafego) {
      alertas.push({
        id: `op-trafego-${c.id}`,
        tipo: 'oportunidade',
        titulo: `💰 Oportunidade: Oferecer Tráfego para ${c.nome}`,
        corpo: 'Cliente ativo ainda não possui gestão de tráfego pago contratada.',
        link: `/clientes/${c.id}`,
        cor: 'ok',
      });
    } else if (!temSite) {
      alertas.push({
        id: `op-site-${c.id}`,
        tipo: 'oportunidade',
        titulo: `💰 Oportunidade: Oferecer Landing Page para ${c.nome}`,
        corpo: 'Cliente roda anúncios mas ainda não possui Landing Page de alta conversão.',
        link: `/clientes/${c.id}`,
        cor: 'ok',
      });
    }
  });

  return alertas;
}

export function calcularAlertas(clientes: Cliente[], cobrancas: Cobranca[], clienteServicos: ClienteServico[] = [], servicos: Servico[] = []): AlertaInteligente[] {
  return [
    ...alertasClienteRisco(clientes, cobrancas),
    ...alertasAniversarios(clientes),
    ...alertasDominiosVencendo(),
    ...alertasOportunidades(clientes, clienteServicos, servicos),
  ];
}
