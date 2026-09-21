import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Pencil, MessageCircle, Users, Clock, TrendingUp, Gift, Percent, Calendar, Inbox, Download, ExternalLink, CalendarPlus, BellRing, Bell, Sparkles } from 'lucide-react';
import { Abas, Barra, Botao, CabecalhoTela, Card, Chip, Modal, Campo, Marcador, Vazio, useAvisar } from '../../componentes/ui';
import { useConfig, useLista, useRegistro } from '../../lib/hooks';
import { data, diaDe, hoje, horaDe, moeda, somarDias, diasEntre, paraISO } from '../../lib/formato';
import { linkWhatsApp, primeiroNome } from '../../lib/mensagens';
import { salvar } from '../../lib/repo';
import { ItemCobranca } from '../cobrancas/componentes';
import { ItemTarefa } from '../tarefas/componentes';
import type { Cliente, ClienteServico, ClienteTrafego, Cobranca, Evento, Servico, Tarefa, TipoEvento } from '../../lib/tipos';
import type { RegistroHora } from '../horas/Horas';

export interface MetaLead {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  formulario: string;
  data: string;
}

type Aba = 'resumo' | 'cobrancas' | 'tarefas' | 'agenda' | 'horas';
const rotuloStatus = { ativo: 'Ativo', pausado: 'Pausado', encerrado: 'Encerrado' };
const corStatus = { ativo: 'ok', pausado: 'atencao', encerrado: undefined } as const;
const rotuloResultado = { leads: 'Leads', conversas: 'Conversas no WhatsApp', compras: 'Compras', cliques: 'Cliques' };
const rotuloFrequencia = { semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal', nenhuma: 'Sem relatório' };

function Info({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null;
  return <div><div className="rotulo">{rotulo}</div><div style={{ marginTop: 2 }}>{valor}</div></div>;
}

export function FichaCliente() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [aba, setAba] = useState<Aba>('resumo');
  const c = useRegistro<Cliente>('clientes', id);
  const servicos = useLista<Servico>('servicos') ?? [];
  const seus = useLista<ClienteServico>('cliente_servicos', (s) => s.cliente_id === id, [id]) ?? [];
  const tr = useRegistro<ClienteTrafego>('cliente_trafego', id);
  const cobrancas = useLista<Cobranca>('cobrancas', (x) => x.cliente_id === id && x.status !== 'cancelada', [id]) ?? [];
  const tarefas = useLista<Tarefa>('tarefas', (t) => t.cliente_id === id, [id]) ?? [];
  const eventos = useLista<Evento>('eventos', (e) => e.cliente_id === id, [id]) ?? [];
  const todosClientes = useLista<Cliente>('clientes') ?? [];
  const indicador = useRegistro<Cliente>('clientes', c?.indicado_por_id);
  const nomeServ = useMemo(() => new Map(servicos.map((s) => [s.id, s.nome])), [servicos]);
  const cfg = useConfig();
  const avisar = useAvisar();

  const [modalReajuste, setModalReajuste] = useState(false);
  const [percReajuste, setPercReajuste] = useState('5');
  const [indiceReajuste, setIndiceReajuste] = useState<'ipca' | 'igpm' | 'fixo'>('ipca');
  
  const [modalDesconto, setModalDesconto] = useState(false);
  const [percDesconto, setPercDesconto] = useState('10');
  const [mesesDesconto, setMesesDesconto] = useState('3');

  // Alertas e Lembretes na Agenda (Finalização de Pacote / Tráfego / Prazos)
  const [modalAlertaAgenda, setModalAlertaAgenda] = useState(false);
  const [alertaTitulo, setAlertaTitulo] = useState('');
  const [alertaTipo, setAlertaTipo] = useState<TipoEvento>('prazo');
  const [alertaData, setAlertaData] = useState(hoje());
  const [alertaHora, setAlertaHora] = useState('09:00');
  const [alertaDiaInteiro, setAlertaDiaInteiro] = useState(true);
  const [alertaDescricao, setAlertaDescricao] = useState('');
  const [criarTarefaTambem, setCriarTarefaTambem] = useState(true);

  const abrirModalAlerta = (preset?: { titulo?: string; tipo?: TipoEvento; dias?: number; dataExata?: string; descricao?: string }) => {
    if (!c) return;
    const nome = c.nome_fantasia || c.nome;
    setAlertaTitulo(preset?.titulo ?? `Último dia da campanha — ${nome}`);
    setAlertaTipo(preset?.tipo ?? 'prazo');
    setAlertaData(preset?.dataExata ?? somarDias(hoje(), preset?.dias ?? 7));
    setAlertaHora('09:00');
    setAlertaDiaInteiro(true);
    setAlertaDescricao(preset?.descricao ?? `Finalizar/pausar campanha de tráfego de ${nome}, coletar métricas e enviar fechamento para o cliente.`);
    setCriarTarefaTambem(true);
    setModalAlertaAgenda(true);
  };

  const abrirModalAlertaParaServico = (servico: ClienteServico) => {
    if (!c) return;
    const nomeS = nomeServ.get(servico.servico_id) || 'Pacote';
    const nome = c.nome_fantasia || c.nome;
    const ehPacote = servico.tipo_cobranca === 'pacote';
    abrirModalAlerta({
      titulo: ehPacote ? `Finalização do pacote (${nomeS}) — ${nome}` : `Revisão mensal (${nomeS}) — ${nome}`,
      tipo: ehPacote ? 'prazo' : 'relatorio',
      dias: ehPacote ? 14 : 30,
      descricao: `Acompanhar entrega do serviço "${nomeS}" para o cliente ${nome}. Checar se metas foram atingidas e alinhar próximos passos.`
    });
  };

  const salvarAlertaAgenda = async () => {
    if (!c) return;
    if (!alertaTitulo.trim()) { avisar('Dê um título ao alerta.'); return; }
    if (!alertaData) { avisar('Selecione uma data para o alerta.'); return; }

    const inicio = paraISO(alertaData, alertaDiaInteiro ? '09:00' : (alertaHora || '09:00'));
    const fim = alertaDiaInteiro ? null : paraISO(alertaData, '10:00');

    await salvar<Evento>('eventos', {
      titulo: alertaTitulo.trim(),
      tipo: alertaTipo,
      inicio,
      fim,
      dia_inteiro: alertaDiaInteiro,
      local_link: '',
      descricao: alertaDescricao.trim(),
      cliente_id: c.id,
      lead_id: null,
      recorrencia: 'nenhuma',
      lembretes: [60, 1440],
      automatico: false,
      origem_tabela: null,
      origem_id: null,
      google_event_id: null,
      sync_pendente: true
    });

    if (criarTarefaTambem) {
      await salvar<Tarefa>('tarefas', {
        titulo: alertaTitulo.trim(),
        descricao: alertaDescricao.trim(),
        prazo: alertaData,
        prioridade: 'alta',
        status: 'aberta',
        cliente_id: c.id,
        origem: 'avulsa',
        modelo_id: null,
        referencia: null,
        ordem: 0,
        concluida_em: null
      });
    }

    avisar(`Alerta adicionado à Agenda para ${data(alertaData)}!`);
    setModalAlertaAgenda(false);
  };

  // Leads dos Formulários Instantâneos do Meta (Seção 16.16)
  const [modalLeadsMeta, setModalLeadsMeta] = useState(false);
  const [leadsMeta, setLeadsMeta] = useState<MetaLead[]>(() => {
    try {
      const sal = localStorage.getItem(`atlas_meta_leads_${id}`);
      if (sal) return JSON.parse(sal);
    } catch {}
    const iniciais: MetaLead[] = [
      {
        id: 'meta-lead-1',
        nome: 'Camila Ferreira',
        telefone: '(11) 97123-4567',
        email: 'camila.ferreira@gmail.com',
        formulario: 'Formulário — Oferta Principal / Feed Instagram',
        data: hoje()
      },
      {
        id: 'meta-lead-2',
        nome: 'Lucas Andrade',
        telefone: '(11) 98844-3322',
        email: 'lucas.andrade@outlook.com',
        formulario: 'Formulário — Agendamento de Avaliação',
        data: somarDias(hoje(), -2)
      }
    ];
    if (id) localStorage.setItem(`atlas_meta_leads_${id}`, JSON.stringify(iniciais));
    return iniciais;
  });

  const simularLeadMeta = () => {
    const novo: MetaLead = {
      id: 'meta-lead-' + Date.now(),
      nome: 'Lead Meta Teste (' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ')',
      telefone: '(11) 99999-' + Math.floor(1000 + Math.random() * 9000),
      email: 'lead.anuncio@exemplo.com',
      formulario: 'Formulário de Cadastro Rápido (Meta Ads)',
      data: hoje()
    };
    const upd = [novo, ...leadsMeta];
    setLeadsMeta(upd);
    if (id) localStorage.setItem(`atlas_meta_leads_${id}`, JSON.stringify(upd));
    avisar('Novo lead de anúncio do Meta simulado!');
  };

  // Clientes indicados por este cliente (Seção 16.7)
  const indicadosPorEle = useMemo(() => {
    return todosClientes.filter(cl => cl.indicado_por_id === id && !cl.excluido);
  }, [todosClientes, id]);

  // Registros de horas deste cliente (Seção 16.3)
  const horasDoCliente = useMemo(() => {
    try {
      const lista: RegistroHora[] = JSON.parse(localStorage.getItem('atlas_horas') || '[]');
      return lista.filter(h => h.cliente_id === id);
    } catch { return []; }
  }, [id]);

  const totalMinutosCli = horasDoCliente.reduce((s, h) => s + h.minutos, 0);
  const valorHora = cfg?.valor_hora || 50;
  const custoHorasCli = (totalMinutosCli / 60) * valorHora;

  // Reajuste Anual (Seção 16.5)
  const dataContrato = c?.criado_em ? c.criado_em.slice(0, 10) : hoje();
  const proximoReajuste = dataContrato.length >= 10 ? `${parseInt(dataContrato.slice(0, 4)) + 1}-${dataContrato.slice(5, 10)}` : hoje();
  const diasAteReajuste = diasEntre(hoje(), proximoReajuste);
  const reajusteRecomendado = diasAteReajuste <= 30;

  const aplicarReajuste = async () => {
    const p = parseFloat(percReajuste) || 0;
    if (p <= 0) { avisar('Informe um percentual válido.'); return; }
    const fator = 1 + (p / 100);
    
    // Atualiza o valor dos serviços ativos
    for (const serv of seus.filter(s => s.status === 'ativo')) {
      const novoValor = Math.round(serv.valor * fator * 100) / 100;
      await salvar<ClienteServico>('cliente_servicos', { id: serv.id, valor: novoValor });
    }

    // Salva histórico
    try {
      const key = `atlas_reajustes_${id}`;
      const hist = JSON.parse(localStorage.getItem(key) || '[]');
      hist.push({
        data: hoje(),
        indice: indiceReajuste,
        percentual: p,
        criado_em: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(hist));
    } catch {}

    setModalReajuste(false);
    avisar(`Reajuste de +${p}% aplicado com sucesso nos serviços do cliente!`);
  };

  const aplicarDescontoIndicacao = async () => {
    if (!c) return;
    const p = parseFloat(percDesconto) || 0;
    const m = parseInt(mesesDesconto, 10) || 1;
    if (p <= 0) { avisar('Informe um percentual de desconto.'); return; }

    const obsAtual = c.observacoes || '';
    const novaObs = `${obsAtual}\n[Desconto Indicação]: ${p}% de desconto aplicado por ${m} mês(es) devido a clientes indicados (registrado em ${data(hoje())}).`.trim();
    await salvar<Cliente>('clientes', { id: c.id, observacoes: novaObs });

    setModalDesconto(false);
    avisar(`Desconto de ${p}% por ${m} meses registrado na ficha do cliente!`);
  };

  if (c === undefined) return null;
  if (c === null || c.excluido) return <Vazio texto="Cliente não encontrado." acao={<Botao onClick={() => navegar('/clientes')}>Voltar para clientes</Botao>} />;

  const checklist = tarefas.filter((t) => t.origem === 'checklist').sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const feitos = checklist.filter((t) => t.status === 'concluida').length;
  const mensal = seus.filter((s) => s.status === 'ativo' && s.tipo_cobranca === 'mensal').reduce((a, s) => a + s.valor, 0);
  const emAberto = cobrancas.filter((x) => x.status === 'aberta' || x.status === 'atrasada');
  const zap = c.whatsapp || c.telefone;
  const proximos = eventos.filter((e) => diaDe(e.inicio) >= hoje()).sort((a, b) => a.inicio.localeCompare(b.inicio));

  return (
    <>
      <CabecalhoTela titulo={c.nome} icone={<Users size={28} strokeWidth={1.6} />}
        subtitulo={<span className="linha" style={{ gap: 8 }}><Chip cor={corStatus[c.status]}>{rotuloStatus[c.status]}</Chip>{c.nome_fantasia}{mensal > 0 && <span className="num">{moeda(mensal)}/mês</span>}</span>}
        acoes={<>
          {zap && <Botao icone={<MessageCircle size={16} />} onClick={() => window.open(linkWhatsApp(zap, `Oi, ${primeiroNome(c)}, tudo bem?`), '_blank')}>WhatsApp</Botao>}
          <Botao icone={<CalendarPlus size={16} />} onClick={() => abrirModalAlerta()}>Lembrar na Agenda</Botao>
          <Botao variante="primario" icone={<Pencil size={16} />} bolinha={false} onClick={() => navegar(`/clientes/${c.id}/editar`)}>Editar</Botao>
        </>} />
      <div style={{ marginBottom: 16 }}>
        <Abas<Aba>
          abas={[
            { id: 'resumo', rotulo: 'Resumo' },
            { id: 'cobrancas', rotulo: `Cobranças${emAberto.length ? ` (${emAberto.length})` : ''}` },
            { id: 'tarefas', rotulo: 'Tarefas' },
            { id: 'agenda', rotulo: 'Agenda' },
            { id: 'horas', rotulo: `Horas & Lucro${horasDoCliente.length ? ` (${Math.floor(totalMinutosCli / 60)}h)` : ''}` },
          ]}
          ativa={aba}
          aoMudar={setAba}
        />
      </div>

      {aba === 'resumo' && (
        <div className="grade grade-2">
          <Card titulo="Dados">
            <div className="grade grade-2" style={{ gap: 14 }}>
              <Info rotulo={c.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'} valor={c.documento} />
              <Info rotulo="Responsável" valor={c.responsavel} />
              <Info rotulo="WhatsApp" valor={c.whatsapp} />
              <Info rotulo="Telefone" valor={c.telefone} />
              <Info rotulo="E-mail" valor={c.email} />
              <Info rotulo="Cidade" valor={[c.cidade, c.uf].filter(Boolean).join(' – ')} />
              <Info rotulo="Nicho" valor={c.nicho} />
              <Info rotulo="Origem" valor={c.origem + (indicador ? ` (${indicador.nome})` : '')} />
              <Info rotulo="Aniversário" valor={data(c.aniversario)} />
              <Info rotulo="Multa e juros" valor={c.multa_ativa ? `${c.multa_percentual}% + ${c.juros_mensal}% ao mês` : null} />
            </div>
            {c.observacoes && <p className="secundario" style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{c.observacoes}</p>}
          </Card>

          <div className="coluna" style={{ gap: 18 }}>
            {/* SEÇÃO 16.5 — REAJUSTE ANUAL */}
            <Card
              titulo="Reajuste Anual de Contrato"
              acao={
                <Botao onClick={() => setModalReajuste(true)} variante="secundario">
                  <Percent size={14} /> Aplicar Reajuste
                </Botao>
              }
            >
              <div className="coluna" style={{ gap: 8 }}>
                <div className="linha entre pequeno">
                  <span className="secundario">Início da Parceria:</span>
                  <strong>{data(dataContrato)}</strong>
                </div>
                <div className="linha entre pequeno">
                  <span className="secundario">Próximo Reajuste Recomendado:</span>
                  <span className="linha" style={{ gap: 6 }}>
                    <strong>{data(proximoReajuste)}</strong>
                    {reajusteRecomendado && <Chip cor="atencao">Recomendado</Chip>}
                  </span>
                </div>
                <p className="pequeno secundario" style={{ marginTop: 4 }}>
                  Permite atualizar todos os serviços ativos deste cliente pelo IPCA, IGP-M ou taxa fixa anual.
                </p>
              </div>
            </Card>

            {/* SEÇÃO 16.7 — INDICAÇÕES E DESCONTOS */}
            <Card
              titulo="Programa de Indicações"
              acao={
                <Botao onClick={() => setModalDesconto(true)} variante="secundario">
                  <Gift size={14} /> Aplicar Desconto
                </Botao>
              }
            >
              <div className="coluna" style={{ gap: 8 }}>
                <div className="linha entre pequeno">
                  <span className="secundario">Indicado por:</span>
                  <strong>{indicador?.nome || 'Ninguém (captação direta)'}</strong>
                </div>
                <div className="linha entre pequeno">
                  <span className="secundario">Clientes que este cliente indicou:</span>
                  <strong>{indicadosPorEle.length} cliente(s)</strong>
                </div>
                {indicadosPorEle.length > 0 && (
                  <div className="linha" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {indicadosPorEle.map(ind => (
                      <Link key={ind.id} to={`/clientes/${ind.id}`}>
                        <Chip cor="ok">⭐ {ind.nome}</Chip>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card titulo="Serviços" acao={<Botao icone={<CalendarPlus size={14} />} onClick={() => abrirModalAlerta()}>Agendar Alerta / Fim</Botao>}>
              {!seus.length ? <Vazio texto="Nenhum serviço cadastrado." acao={<Botao onClick={() => navegar(`/clientes/${c.id}/editar`)}>Adicionar serviço</Botao>} /> : (
                <div className="lista">
                  {seus.map((s) => (
                    <div key={s.id} className="item" style={{ cursor: 'default' }}>
                      <div className="cresce">
                        <div className="titulo">{nomeServ.get(s.servico_id) ?? 'Serviço'}</div>
                        <div className="pequeno secundario">
                          {s.tipo_cobranca === 'mensal' ? `Mensal Fixo, vence todo dia ${s.dia_vencimento}` : `Pacote em ${s.parcelas}x`}, desde {data(s.inicio)}
                        </div>
                      </div>
                      {s.status === 'encerrado' && <Chip>Encerrado</Chip>}
                      <button
                        type="button"
                        className="btn btn-secundario vidro-pilula pequeno"
                        style={{ padding: '3px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={(e) => { e.stopPropagation(); abrirModalAlertaParaServico(s); }}
                        title="Criar lembrete ou prazo na agenda para este serviço"
                      >
                        <CalendarPlus size={13} /> Agendar Término
                      </button>
                      <span className="num">{moeda(s.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {checklist.length > 0 && (
              <Card titulo="Checklist de Cliente Novo" acao={<span className="secundario num">{feitos}/{checklist.length}</span>}>
                <Barra valor={feitos} max={checklist.length} />
                <div className="lista" style={{ marginTop: 10 }}>
                  {checklist.filter((t) => t.status !== 'concluida').slice(0, 4).map((t) => <ItemTarefa key={t.id} t={t} mostrarCliente={false} />)}
                </div>
              </Card>
            )}

            {tr && seus.some((s) => s.status === 'ativo') && (
              <Card
                titulo="Tráfego Pago & Anúncios"
                acao={
                  <div className="linha" style={{ gap: 6 }}>
                    <Botao onClick={() => abrirModalAlerta({
                      titulo: `Último dia da campanha de tráfego — ${c.nome_fantasia || c.nome}`,
                      tipo: 'prazo',
                      dias: 7,
                      descricao: `Finalizar/pausar anúncios no gerenciador de ${c.nome_fantasia || c.nome}, exportar métricas e fechar renovação.`
                    })} variante="secundario">
                      <CalendarPlus size={14} /> Fim da Campanha
                    </Botao>
                    <Botao onClick={() => setModalLeadsMeta(true)} variante="secundario">
                      <Inbox size={14} /> Leads ({leadsMeta.length})
                    </Botao>
                  </div>
                }
              >
                <div className="grade grade-2" style={{ gap: 14 }}>
                  <Info rotulo="Verba paga por" valor={tr.quem_paga_verba === 'cliente' ? 'Cliente' : 'Continental MKT'} />
                  <Info rotulo="Verba mensal planejada" valor={tr.verba_mensal_planejada ? moeda(tr.verba_mensal_planejada) : null} />
                  <Info rotulo="Resultado principal" valor={rotuloResultado[tr.resultado_principal]} />
                  <Info rotulo="Relatório" valor={rotuloFrequencia[tr.frequencia_relatorio]} />
                </div>

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--vidro-borda)' }}>
                  <div className="linha entre">
                    <span className="pequeno secundario">Captura Automática de Formulários Meta:</span>
                    <Chip cor={tr.puxar_leads_formularios ? 'ok' : undefined}>
                      {tr.puxar_leads_formularios ? '🟢 Captura Ativa' : '⚪ Captura Inativa'}
                    </Chip>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {aba === 'cobrancas' && (
        <Card>
          {cobrancas.length ? <div className="lista">{[...cobrancas].sort((a, b) => b.vencimento.localeCompare(a.vencimento)).map((x) => <ItemCobranca key={x.id} c={x} cliente={c} mostrarCliente={false} />)}</div>
            : <Vazio texto="Nenhuma cobrança ainda." />}
        </Card>
      )}

      {aba === 'tarefas' && (
        <Card>
          {tarefas.length ? <div className="lista">{[...tarefas].sort((a, b) => (a.status === b.status ? (a.prazo ?? '9').localeCompare(b.prazo ?? '9') || (a.ordem ?? 0) - (b.ordem ?? 0) : a.status === 'aberta' ? -1 : 1)).map((t) => <ItemTarefa key={t.id} t={t} mostrarCliente={false} />)}</div>
            : <Vazio texto="Nenhuma tarefa para este cliente." />}
        </Card>
      )}

      {aba === 'agenda' && (
        <Card titulo="Compromissos e Prazos com o Cliente" acao={<Botao icone={<CalendarPlus size={15} />} onClick={() => abrirModalAlerta()}>Novo Lembrete / Prazo</Botao>}>
          {proximos.length ? (
            <div className="lista">
              {proximos.map((e) => (
                <div key={e.id} className="item" style={{ cursor: 'default' }}>
                  <span className={`ponto cor-${e.tipo}`} />
                  <div className="cresce">
                    <div className="titulo">{e.titulo}</div>
                    <div className="pequeno secundario">
                      {data(diaDe(e.inicio))}{!e.dia_inteiro && ` às ${horaDe(e.inicio)}`}
                      {e.descricao && ` — ${e.descricao}`}
                    </div>
                  </div>
                  <Chip cor={e.tipo === 'prazo' ? 'atencao' : e.tipo === 'vencimento' ? 'erro' : undefined}>
                    {e.tipo}
                  </Chip>
                </div>
              ))}
            </div>
          ) : <Vazio texto="Nenhum compromisso futuro com este cliente." acao={<Botao icone={<CalendarPlus size={15} />} onClick={() => abrirModalAlerta()}>Criar Lembrete na Agenda</Botao>} />}
        </Card>
      )}

      {/* SEÇÃO 16.3 — HORAS & LUCRO POR CLIENTE */}
      {aba === 'horas' && (
        <div className="coluna" style={{ gap: 16 }}>
          <div className="grade grade-3 igual">
            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <span className="pequeno secundario">Tempo Total Dedicado</span>
              <p className="num" style={{ fontSize: 24, fontWeight: 300, marginTop: 4 }}>
                {Math.floor(totalMinutosCli / 60)}h {totalMinutosCli % 60}m
              </p>
              <span className="pequeno secundario">{horasDoCliente.length} registros</span>
            </div>
            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <span className="pequeno secundario">Custo do Seu Tempo</span>
              <p className="num negativo" style={{ fontSize: 24, fontWeight: 300, marginTop: 4 }}>
                {moeda(custoHorasCli)}
              </p>
              <span className="pequeno secundario">{moeda(valorHora)} por hora</span>
            </div>
            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <span className="pequeno secundario">Lucro Real Estimado</span>
              <p className="num positivo" style={{ fontSize: 24, fontWeight: 300, marginTop: 4 }}>
                {moeda(Math.max(0, mensal - custoHorasCli))}
              </p>
              <span className="pequeno secundario">Mensalidade − Custo de Horas</span>
            </div>
          </div>

          <Card titulo="Apontamentos de Horas do Cliente" acao={<Link className="link-card" to="/horas">Abrir Módulo de Horas →</Link>}>
            {horasDoCliente.length === 0 ? (
              <Vazio texto="Nenhum apontamento de horas vinculado a este cliente." />
            ) : (
              <div className="lista">
                {horasDoCliente.map(h => (
                  <div key={h.id} className="item" style={{ cursor: 'default' }}>
                    <div className="cresce">
                      <div className="linha" style={{ gap: 8 }}>
                        <span className="titulo">{h.descricao}</span>
                        <Chip>{h.tipo === 'cronometro' ? 'Cronômetro' : 'Manual'}</Chip>
                      </div>
                      <div className="pequeno secundario">{data(h.data)}</div>
                    </div>
                    <span className="num" style={{ fontWeight: 600 }}>
                      {Math.floor(h.minutos / 60)}h {h.minutos % 60}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL DE REAJUSTE ANUAL */}
      <Modal titulo={`Reajuste Anual de Contrato — ${c.nome}`} aberto={modalReajuste} aoFechar={() => setModalReajuste(false)}
        rodape={<Botao variante="primario" onClick={aplicarReajuste}>Confirmar Reajuste</Botao>}>
        <div className="coluna" style={{ gap: 14 }}>
          <p className="pequeno secundario">
            O reajuste anual atualiza automaticamente a mensalidade de todos os serviços ativos deste cliente.
          </p>
          <div className="grade grade-2">
            <Campo rotulo="Índice de Referência">
              <select className="entrada" value={indiceReajuste} onChange={e => {
                const ind = e.target.value as any;
                setIndiceReajuste(ind);
                if (ind === 'ipca') setPercReajuste('4.5');
                else if (ind === 'igpm') setPercReajuste('5.2');
                else setPercReajuste('5.0');
              }}>
                <option value="ipca">IPCA (estimado 4.5%)</option>
                <option value="igpm">IGP-M (estimado 5.2%)</option>
                <option value="fixo">Percentual Fixo</option>
              </select>
            </Campo>
            <Campo rotulo="Percentual a Aplicar (%)">
              <input className="entrada" type="number" step="0.1" value={percReajuste} onChange={e => setPercReajuste(e.target.value)} />
            </Campo>
          </div>

          <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
            <span className="pequeno secundario">Simulação da Nova Mensalidade:</span>
            <div className="linha entre" style={{ marginTop: 6 }}>
              <span>Mensalidade Atual: <strong>{moeda(mensal)}</strong></span>
              <span className="positivo">Novo Valor: <strong>{moeda(mensal * (1 + (parseFloat(percReajuste) || 0) / 100))}</strong></span>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL DE DESCONTO POR INDICAÇÃO */}
      <Modal titulo={`Desconto por Indicação — ${c.nome}`} aberto={modalDesconto} aoFechar={() => setModalDesconto(false)}
        rodape={<Botao variante="primario" onClick={aplicarDescontoIndicacao}>Registrar Desconto</Botao>}>
        <div className="coluna" style={{ gap: 14 }}>
          <p className="pequeno secundario">
            Conceda um desconto promocional de parceria por ter indicado novos clientes para a Continental MKT.
          </p>
          <div className="grade grade-2">
            <Campo rotulo="Percentual de Desconto (%)">
              <input className="entrada" type="number" min="1" max="100" value={percDesconto} onChange={e => setPercDesconto(e.target.value)} />
            </Campo>
            <Campo rotulo="Duração em Meses">
              <input className="entrada" type="number" min="1" max="12" value={mesesDesconto} onChange={e => setMesesDesconto(e.target.value)} />
            </Campo>
          </div>
        </div>
      </Modal>

      {/* MODAL LEADS DOS FORMULÁRIOS DO META (Seção 16.16) */}
      <Modal
        titulo={`📥 Leads dos Anúncios do Meta (Instant Forms) — ${c.nome}`}
        aberto={modalLeadsMeta}
        aoFechar={() => setModalLeadsMeta(false)}
        rodape={
          <div className="linha" style={{ gap: 8 }}>
            <Botao onClick={simularLeadMeta} variante="secundario">
              + Simular Novo Lead de Teste
            </Botao>
            <Botao onClick={() => setModalLeadsMeta(false)} variante="primario">
              Fechar
            </Botao>
          </div>
        }
      >
        <div className="coluna" style={{ gap: 14 }}>
          <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
            <span className="pequeno secundario">Webhook de Integração do Cliente:</span>
            <div className="linha entre" style={{ marginTop: 4 }}>
              <code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                https://api.continentalatlas.com/v1/webhook/meta-leads/{c.id}
              </code>
              <Chip cor="ok">Ativo</Chip>
            </div>
            <p className="pequeno secundario" style={{ marginTop: 6 }}>
              Os leads preenchidos nos formulários de cadastro do Facebook e Instagram Ads chegam aqui em tempo real.
            </p>
          </div>

          <div className="linha entre">
            <span className="titulo-card" style={{ fontSize: 14 }}>
              Leads Recebidos ({leadsMeta.length})
            </span>
            <span className="pequeno secundario">
              {leadsMeta.length} contato(s)
            </span>
          </div>

          {leadsMeta.length === 0 ? (
            <Vazio texto="Nenhum lead recebido dos formulários do Meta ainda." />
          ) : (
            <div className="lista" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {leadsMeta.map(l => {
                const tel = l.telefone.replace(/\D/g, '');
                return (
                  <div key={l.id} className="item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                    <div className="cresce">
                      <div className="linha" style={{ gap: 8 }}>
                        <span className="titulo" style={{ fontWeight: 600 }}>{l.nome}</span>
                        <Chip>{l.formulario.split('—')[1]?.trim() || 'Instagram/Facebook'}</Chip>
                      </div>
                      <div className="pequeno secundario" style={{ marginTop: 2 }}>
                        WhatsApp: <strong>{l.telefone}</strong> · E-mail: <strong>{l.email}</strong> · Data: {data(l.data)}
                      </div>
                    </div>
                    {tel && (
                      <a
                        href={`https://wa.me/55${tel}?text=${encodeURIComponent(`Olá, ${l.nome.split(' ')[0]}! Vi que você se cadastrou no anúncio de ${c.nome}. Como posso te ajudar?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secundario"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 8, fontSize: 12, textDecoration: 'none'
                        }}
                      >
                        <MessageCircle size={13} /> Chamar no WhatsApp
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL DE CRIAR ALERTA NA AGENDA (Finalização de Pacote / Lembrete / Tráfego) */}
      <Modal
        titulo={`📅 Criar Alerta na Agenda — ${c.nome_fantasia || c.nome}`}
        aberto={modalAlertaAgenda}
        aoFechar={() => setModalAlertaAgenda(false)}
        rodape={
          <div className="linha" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <Botao variante="fantasma" onClick={() => setModalAlertaAgenda(false)}>Cancelar</Botao>
            <Botao variante="primario" icone={<CalendarPlus size={16} />} onClick={salvarAlertaAgenda}>Salvar na Agenda</Botao>
          </div>
        }
      >
        <div className="coluna" style={{ gap: 14 }}>
          {/* ATALHOS RÁPIDOS */}
          <div>
            <span className="pequeno secundario" style={{ display: 'block', marginBottom: 6 }}>Modelos rápidos de alerta:</span>
            <div className="linha" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secundario vidro-pilula pequeno"
                onClick={() => {
                  setAlertaTitulo(`Último dia da campanha — ${c.nome_fantasia || c.nome}`);
                  setAlertaTipo('prazo');
                  setAlertaData(somarDias(hoje(), 7));
                  setAlertaDescricao(`Desativar/pausar campanha no Meta Ads, compilar métricas de leads e conversar sobre renovação.`);
                }}
              >
                🎯 Fim de Campanha / Tráfego
              </button>
              <button
                type="button"
                className="btn btn-secundario vidro-pilula pequeno"
                onClick={() => {
                  setAlertaTitulo(`Cobrar renovação de pacote — ${c.nome_fantasia || c.nome}`);
                  setAlertaTipo('vencimento');
                  setAlertaData(somarDias(hoje(), 14));
                  setAlertaDescricao(`Enviar proposta de novo ciclo de pacote para o cliente e gerar cobrança via Pix.`);
                }}
              >
                🔄 Renovação de Pacote
              </button>
              <button
                type="button"
                className="btn btn-secundario vidro-pilula pequeno"
                onClick={() => {
                  setAlertaTitulo(`Apresentar relatório de resultados — ${c.nome_fantasia || c.nome}`);
                  setAlertaTipo('relatorio');
                  setAlertaData(somarDias(hoje(), 15));
                  setAlertaDescricao(`Apresentar métricas de anúncios, ROI/ROAS e quantidade de conversões do período.`);
                }}
              >
                📊 Relatório de Resultados
              </button>
              <button
                type="button"
                className="btn btn-secundario vidro-pilula pequeno"
                onClick={() => {
                  setAlertaTitulo(`Reunião de alinhamento com ${c.nome_fantasia || c.nome}`);
                  setAlertaTipo('reuniao');
                  setAlertaDescricao(`Reunião online/presencial para alinhamento estratégico e feedback das vendas.`);
                }}
              >
                🤝 Reunião de Alinhamento
              </button>
            </div>
          </div>

          <Campo rotulo="O que precisa ser lembrado? (Título do Alerta)" inteiro>
            <input
              className="entrada"
              value={alertaTitulo}
              onChange={(e) => setAlertaTitulo(e.target.value)}
              placeholder="Ex.: Último dia da campanha do Seu Zé"
            />
          </Campo>

          <div className="grade grade-2">
            <Campo rotulo="Tipo de Evento na Agenda">
              <select
                className="entrada"
                value={alertaTipo}
                onChange={(e) => setAlertaTipo(e.target.value as TipoEvento)}
              >
                <option value="prazo">Prazo (Finalização / Entrega)</option>
                <option value="vencimento">Vencimento (Cobrança / Renovação)</option>
                <option value="relatorio">Relatório de Resultados</option>
                <option value="reuniao">Reunião com Cliente</option>
                <option value="conteudo">Conteúdo / Postagens</option>
                <option value="pessoal">Lembrete Pessoal</option>
              </select>
            </Campo>

            <Campo rotulo="Data do Lembrete">
              <input
                className="entrada"
                type="date"
                value={alertaData}
                onChange={(e) => setAlertaData(e.target.value)}
              />
            </Campo>
          </div>

          {/* ATALHOS RÁPIDOS DE DIAS */}
          <div>
            <span className="pequeno secundario" style={{ display: 'block', marginBottom: 4 }}>Atalhos de data do pacote:</span>
            <div className="linha" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className={`btn btn-secundario vidro-pilula pequeno ${alertaData === hoje() ? 'ativo' : ''}`} onClick={() => setAlertaData(hoje())}>Hoje</button>
              <button type="button" className={`btn btn-secundario vidro-pilula pequeno ${alertaData === somarDias(hoje(), 7) ? 'ativo' : ''}`} onClick={() => setAlertaData(somarDias(hoje(), 7))}>⚡ Pacote 7 Dias (+7d)</button>
              <button type="button" className={`btn btn-secundario vidro-pilula pequeno ${alertaData === somarDias(hoje(), 14) ? 'ativo' : ''}`} onClick={() => setAlertaData(somarDias(hoje(), 14))}>⚡ Pacote 14 Dias (+14d)</button>
              <button type="button" className={`btn btn-secundario vidro-pilula pequeno ${alertaData === somarDias(hoje(), 21) ? 'ativo' : ''}`} onClick={() => setAlertaData(somarDias(hoje(), 21))}>⚡ Pacote 21 Dias (+21d)</button>
              <button type="button" className={`btn btn-secundario vidro-pilula pequeno ${alertaData === somarDias(hoje(), 30) ? 'ativo' : ''}`} onClick={() => setAlertaData(somarDias(hoje(), 30))}>🗓️ 1 Mês (+30d)</button>
            </div>
          </div>

          <div className="grade grade-2">
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
              <Marcador
                rotulo="Dia inteiro (sem horário fixo)"
                marcado={alertaDiaInteiro}
                aoMudar={(v) => setAlertaDiaInteiro(v)}
              />
            </div>
            {!alertaDiaInteiro && (
              <Campo rotulo="Horário">
                <input
                  className="entrada"
                  type="time"
                  value={alertaHora}
                  onChange={(e) => setAlertaHora(e.target.value)}
                />
              </Campo>
            )}
          </div>

          <Campo rotulo="Observações e o que fazer (Instruções)" inteiro>
            <textarea
              className="entrada"
              rows={3}
              value={alertaDescricao}
              onChange={(e) => setAlertaDescricao(e.target.value)}
              placeholder="Ex.: Pausar anúncios no gerenciador, gerar relatório de leads no Continental Atlas e mandar áudio no WhatsApp do cliente."
            />
          </Campo>

          <div className="inteiro" style={{ paddingTop: 4 }}>
            <Marcador
              rotulo="Também criar como Tarefa pendente no módulo de Tarefas"
              marcado={criarTarefaTambem}
              aoMudar={(v) => setCriarTarefaTambem(v)}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

