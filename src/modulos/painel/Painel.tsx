import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Code, TrendingUp, MessageCircle, Calendar, Phone, Sparkles, FileText, CalendarPlus, Plus } from 'lucide-react';
import { Barra, Card, Chip, Vazio, Botao, Modal, Campo, AssistenteTexto, useAvisar } from '../../componentes/ui';
import { useConfig, useLista } from '../../lib/hooks';
import { data, hoje, mesDe, moeda, saudacao, somarDias } from '../../lib/formato';
import { faturamentoDoMes, novosClientesDoMes, resumoDoMes } from '../../lib/indicadores';
import { ocorrencias, LinhaEvento } from '../agenda/Agenda';
import { ItemTarefa } from '../tarefas/componentes';
import { calcularAlertas } from '../../lib/inteligente';
import { AtaModal } from './AtaModal';
import { ResumoSemanalModal } from './ResumoSemanalModal';
import { LEADS_INICIAIS } from '../funil/Funil';
import { novoId } from '../../lib/ids';
import { salvar as salvarRepo } from '../../lib/repo';
import type { Categoria, Cliente, Cobranca, Evento, Lancamento, Meta, Tarefa, Lead, ClienteServico, Servico } from '../../lib/tipos';

const dataExtensa = () => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const numeroKpi = (v: number) => Math.round(v).toLocaleString('pt-BR');

interface MetricaStorage {
  investimento: number;
  leads: number;
  cliques: number;
}

interface TrackingStorage {
  meta_pixel_id: string;
  google_conversion_id: string;
  status: string;
}

export function Painel() {
  const cfg = useConfig();
  const clientes = useLista<Cliente>('clientes') ?? [];
  const servicos = useLista<Servico>('servicos') ?? [];
  const clienteServicos = useLista<ClienteServico>('cliente_servicos') ?? [];
  const lancs = useLista<Lancamento>('lancamentos') ?? [];
  const cats = useLista<Categoria>('categorias') ?? [];
  const eventos = useLista<Evento>('eventos') ?? [];
  const tarefas = useLista<Tarefa>('tarefas', (t) => t.status === 'aberta') ?? [];
  const cobrancas = useLista<Cobranca>('cobrancas', (c) => c.status === 'aberta' || c.status === 'atrasada') ?? [];
  const metas = useLista<Meta>('metas') ?? [];

  const [ataAberta, setAtaAberta] = useState(false);
  const [resumoSemanalAberto, setResumoSemanalAberto] = useState(false);

  // Recursos Inteligentes (Seção 16.12)
  const alertas = useMemo(() => {
    return calcularAlertas(clientes, cobrancas, clienteServicos, servicos);
  }, [clientes, cobrancas, clienteServicos, servicos]);

  // Métricas e Tracking salvos
  const metricasAds = useMemo(() => {
    try {
      const lista: MetricaStorage[] = JSON.parse(localStorage.getItem('atlas_metricas') || '[]');
      return {
        investimento: lista.reduce((s, m) => s + (Number(m.investimento) || 0), 0),
        leads: lista.reduce((s, m) => s + (Number(m.leads) || 0), 0),
        cliques: lista.reduce((s, m) => s + (Number(m.cliques) || 0), 0),
      };
    } catch {
      return { investimento: 0, leads: 0, cliques: 0 };
    }
  }, []);

  const trackings = useMemo(() => {
    try {
      const lista: TrackingStorage[] = JSON.parse(localStorage.getItem('atlas_tracking') || '[]');
      return {
        total: lista.length,
        metaAtivos: lista.filter(t => !!t.meta_pixel_id).length,
        googleAtivos: lista.filter(t => !!t.google_conversion_id).length,
      };
    } catch {
      return { total: 0, metaAtivos: 0, googleAtivos: 0 };
    }
  }, []);

  // Leads do Funil (Reativo em tempo real com evento de sincronização)
  const [todosLeads, setTodosLeads] = useState<Lead[]>(() => {
    try {
      const salvos = localStorage.getItem('atlas_leads');
      if (salvos) {
        const parsed: Lead[] = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const hj = hoje();
    const ontem = somarDias(hj, -1);
    const amanha = somarDias(hj, 1);
    const iniciais = LEADS_INICIAIS(hj, ontem, amanha);
    localStorage.setItem('atlas_leads', JSON.stringify(iniciais));
    return iniciais;
  });

  useEffect(() => {
    const atualizar = () => {
      try {
        const l: Lead[] = JSON.parse(localStorage.getItem('atlas_leads') || '[]');
        if (Array.isArray(l) && l.length > 0) setTodosLeads(l);
      } catch {}
    };
    window.addEventListener('storage', atualizar);
    window.addEventListener('atlas_leads_updated', atualizar);
    return () => {
      window.removeEventListener('storage', atualizar);
      window.removeEventListener('atlas_leads_updated', atualizar);
    };
  }, []);

  const leadsQtd = useMemo(() => {
    return todosLeads.filter(l => !l.excluido).length;
  }, [todosLeads]);

  // Modal de Agendamento Rápido de Retorno de Lead
  const avisar = useAvisar();
  const [modalAgendarLead, setModalAgendarLead] = useState(false);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState('');
  const [formRetornoPainel, setFormRetornoPainel] = useState({
    data: hoje(),
    hora: '15:00',
    pauta: '',
    inserirNaAgenda: true
  });

  const abrirAgendarPainel = (leadId?: string) => {
    setLeadSelecionadoId(leadId || (todosLeads[0]?.id ?? ''));
    setFormRetornoPainel({ data: hoje(), hora: '15:00', pauta: '', inserirNaAgenda: true });
    setModalAgendarLead(true);
  };

  const confirmarRetornoPainel = async () => {
    const lead = todosLeads.find(l => l.id === leadSelecionadoId);
    if (!lead) { avisar('Selecione um lead.'); return; }
    const dataHora = `${formRetornoPainel.data}T${formRetornoPainel.hora}`;
    const agora = new Date().toISOString();
    const pauta = formRetornoPainel.pauta.trim();
    const obs = pauta
      ? `${lead.observacoes ? lead.observacoes + '\n' : ''}[Retorno agendado p/ ${data(formRetornoPainel.data)} às ${formRetornoPainel.hora}]: ${pauta}`
      : lead.observacoes;

    const listaUpd = todosLeads.map(l => l.id === lead.id ? {
      ...l,
      proximo_contato: dataHora,
      observacoes: obs,
      atualizado_em: agora
    } : l);

    localStorage.setItem('atlas_leads', JSON.stringify(listaUpd));
    setTodosLeads(listaUpd);
    try { window.dispatchEvent(new Event('atlas_leads_updated')); } catch {}

    if (formRetornoPainel.inserirNaAgenda) {
      const tel = (lead.whatsapp || lead.telefone || '').replace(/\D/g, '');
      await salvarRepo<Evento>('eventos', {
        id: novoId(),
        titulo: `📞 Ligar/Chamar: ${lead.nome} (${lead.empresa || 'Lead'})`,
        tipo: 'reuniao',
        inicio: `${formRetornoPainel.data}T${formRetornoPainel.hora}:00-03:00`,
        fim: null,
        dia_inteiro: false,
        local_link: tel ? `https://wa.me/55${tel}` : '',
        descricao: `Contato agendado com Lead: ${lead.nome}\nEmpresa: ${lead.empresa}\nPauta: ${pauta || 'Sem pauta'}`,
        cliente_id: null,
        lead_id: lead.id,
        recorrencia: 'nenhuma',
        lembretes: [15],
        automatico: false,
        origem_tabela: 'leads',
        origem_id: lead.id,
        google_event_id: null,
        sync_pendente: true
      });
    }

    setModalAgendarLead(false);
    avisar(`Retorno com ${lead.nome} agendado para ${data(formRetornoPainel.data)} às ${formRetornoPainel.hora}!`);
  };

  // Leads com retorno agendado para hoje ou atrasados
  const leadsRetornoHoje = useMemo(() => {
    const hj = hoje();
    return todosLeads.filter(l => !l.excluido && l.proximo_contato && l.proximo_contato.slice(0, 10) <= hj);
  }, [todosLeads]);

  // Animação de entrada só na primeira abertura do dia (seção 4.6).
  const [entrada] = useState(() => {
    const ja = localStorage.getItem('atlas_entrada') === hoje();
    localStorage.setItem('atlas_entrada', hoje());
    return !ja;
  });

  const mes = mesDe(hoje());
  const nomeCli = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const ativos = clientes.filter((c) => c.status === 'ativo').length;
  const fat = faturamentoDoMes(lancs, mes);
  const resumo = resumoDoMes(lancs, cats, mes);
  const meta = metas.find((m) => m.mes === mes);
  const novos = novosClientesDoMes(clientes, mes);
  const deHoje = ocorrencias(eventos, hoje(), hoje());
  const proximos = ocorrencias(eventos, somarDias(hoje(), 1), somarDias(hoje(), 7));
  const tarefasHoje = tarefas.filter((t) => !t.prazo || t.prazo <= hoje())
    .sort((a, b) => (a.prazo ?? '9').localeCompare(b.prazo ?? '9')).slice(0, 6);
  const cobs = cobrancas.filter((c) => c.status === 'atrasada' || c.vencimento <= somarDias(hoje(), 7))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const qtdAtrasadas = cobrancas.filter((c) => c.status === 'atrasada').length;
  const nome = (cfg?.responsavel_nome ?? '').trim().split(/\s+/)[0];
  const atraso = (i: number) => ({ ['--atraso' as string]: `${120 + i * 70}ms` });

  return (
    <div className={entrada ? 'entrada-dia' : ''}>
      <div className="linha entre" style={{ marginTop: 18, marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <p className="subtitulo" style={{ margin: 0 }}>{saudacao()}{nome ? `, ${nome}` : ''}. Hoje é {dataExtensa()}.</p>
        <div className="linha" style={{ gap: 8 }}>
          <Botao onClick={() => setResumoSemanalAberto(true)} variante="secundario" icone={<Calendar size={15} />}>
            📋 Resumo da Semana
          </Botao>
          <Botao onClick={() => setAtaAberta(true)} variante="secundario" icone={<FileText size={15} />}>
            Ata da Reunião → Tarefas
          </Botao>
        </div>
      </div>

      {/* RECURSOS INTELIGENTES (Seção 16.12) */}
      {alertas.length > 0 && (
        <div style={{ margin: '0 0 18px 0' }}>
          <Card
            titulo={`💡 Recursos Inteligentes & Oportunidades (${alertas.length})`}
            acao={<Chip cor="destaque">Automação Ativa</Chip>}
          >
            <div className="lista">
              {alertas.slice(0, 6).map(a => {
                const isExterno = a.link.startsWith('http');
                const row = (
                  <div key={a.id} className={`item ${a.cor === 'erro' ? 'atrasado' : ''}`} style={{ cursor: 'pointer' }}>
                    <div className="cresce">
                      <div className="linha" style={{ gap: 8 }}>
                        <span className="titulo">{a.titulo}</span>
                        <Chip cor={a.cor}>{a.tipo === 'risco_cliente' ? 'Risco' : a.tipo === 'oportunidade' ? 'Venda' : a.tipo === 'aniversario' ? 'Comemoração' : 'Alerta'}</Chip>
                      </div>
                      <div className="pequeno secundario" style={{ marginTop: 2 }}>{a.corpo}</div>
                    </div>
                    <span className="pequeno" style={{ color: 'var(--destaque)', fontWeight: 500 }}>Acessar →</span>
                  </div>
                );
                return isExterno ? (
                  <a key={a.id} href={a.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{row}</a>
                ) : (
                  <Link key={a.id} to={a.link} style={{ textDecoration: 'none' }}>{row}</Link>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Bloco KPIs principais */}
      <div className="grade-painel">
        <div className="kpis" aria-label="Indicadores do mês">
          <div className="kpi">
            <span className="kpi-num"><small>R$</small>{numeroKpi(fat)}</span>
            <span className="kpi-rotulo">Faturamento<br />do Mês</span>
          </div>
          <span className="kpi-barra" aria-hidden="true" />
          <div className="kpi">
            <span className="kpi-num">{ativos}</span>
            <span className="kpi-rotulo">Clientes<br />Ativos</span>
          </div>
        </div>
        <Card titulo="Metas do Mês" acao={<Link className="link-card" to="/metas">{meta ? 'Ajustar' : 'Definir metas'}</Link>}>
          {meta ? (
            <div className="coluna" style={{ gap: 14 }}>
              <div>
                <div className="linha entre pequeno"><span>Faturamento</span><span className="num secundario">{moeda(fat)} de {moeda(meta.faturamento_alvo)}</span></div>
                <div style={{ marginTop: 8 }}><Barra valor={fat} max={meta.faturamento_alvo} /></div>
              </div>
              <div>
                <div className="linha entre pequeno"><span>Novos clientes</span><span className="num secundario">{novos} de {meta.novos_clientes_alvo}</span></div>
                <div style={{ marginTop: 8 }}><Barra valor={novos} max={meta.novos_clientes_alvo} /></div>
              </div>
            </div>
          ) : <p className="secundario">Defina quanto quer faturar e quantos clientes quer fechar neste mês.</p>}
        </Card>
      </div>

      {/* NOVO: BLOCO DE DESTAQUE DE TRÁFEGO, TRACKING & ANÚNCIOS (Meta & Google Ads) */}
      <div style={{ margin: '18px 0' }}>
        <Card
          titulo="Tráfego Pago & Tracking (Meta Ads & Google Ads)"
          acao={
            <div className="linha" style={{ gap: 8 }}>
              <Link className="link-card" to="/campanhas">Ver Campanhas & Pixels →</Link>
            </div>
          }
        >
          <div className="grade grade-3 igual" style={{ gap: 14 }}>
            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <div className="linha entre" style={{ marginBottom: 4 }}>
                <span className="pequeno secundario">Anúncios no Mês</span>
                <TrendingUp size={16} className="destaque" />
              </div>
              <p className="num" style={{ fontSize: 24, fontWeight: 300 }}>{moeda(metricasAds.investimento)}</p>
              <p className="pequeno secundario" style={{ marginTop: 4 }}>{metricasAds.cliques.toLocaleString('pt-BR')} cliques registrados</p>
            </div>

            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <div className="linha entre" style={{ marginBottom: 4 }}>
                <span className="pequeno secundario">Leads Gerados</span>
                <span className="num positivo">{metricasAds.leads}</span>
              </div>
              <p className="num" style={{ fontSize: 24, fontWeight: 300 }}>{metricasAds.leads} leads</p>
              <div className="linha entre pequeno secundario" style={{ marginTop: 4 }}>
                <span>No Funil de Vendas:</span>
                <Link to="/funil" style={{ textDecoration: 'underline' }}>{leadsQtd} oportunidades</Link>
              </div>
            </div>

            <div className="vidro-painel" style={{ padding: '14px 16px', borderRadius: 14 }}>
              <div className="linha entre" style={{ marginBottom: 4 }}>
                <span className="pequeno secundario">Tracking & Pixels</span>
                <Code size={16} className="positivo" />
              </div>
              <div className="linha" style={{ gap: 6, margin: '6px 0', flexWrap: 'wrap' }}>
                <Chip cor={trackings.metaAtivos > 0 ? 'ok' : 'atencao'}>
                  {trackings.metaAtivos} Meta Pixels
                </Chip>
                <Chip cor={trackings.googleAtivos > 0 ? 'ok' : 'atencao'}>
                  {trackings.googleAtivos} Google Tags
                </Chip>
              </div>
              <div style={{ marginTop: 6 }}>
                <Link to="/campanhas" className="pequeno" style={{ color: 'var(--destaque)', fontWeight: 500 }}>
                  Gerar scripts e tags de conversão →
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* RETORNOS DE LEADS AGENDADOS (Dashboard) */}
      <div style={{ margin: '0 0 18px 0' }}>
        <Card
          titulo={`📞 Retornos de Leads Agendados ${leadsRetornoHoje.length > 0 ? `(${leadsRetornoHoje.length})` : ''}`}
          acao={
            <div className="linha" style={{ gap: 10 }}>
              {leadsRetornoHoje.some(l => (l.proximo_contato ?? '').slice(0, 10) < hoje()) && (
                <Chip cor="erro">⚠️ Retorno(s) Atrasado(s)</Chip>
              )}
              <Botao onClick={() => abrirAgendarPainel()} variante="primario">
                <CalendarPlus size={14} /> + Agendar Retorno
              </Botao>
              <Link className="link-card" to="/funil">Ver Funil Completo →</Link>
            </div>
          }
        >
          {leadsRetornoHoje.length === 0 ? (
            <Vazio
              texto="Nenhum contato de lead agendado para hoje ou atrasado."
              acao={
                <div className="linha" style={{ gap: 8 }}>
                  <Botao onClick={() => abrirAgendarPainel()} variante="primario">
                    <CalendarPlus size={15} /> Agendar Retorno com Lead
                  </Botao>
                  <Link to="/funil" className="btn btn-secundario" style={{ textDecoration: 'none' }}>
                    Ir ao Funil de Vendas
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="lista">
              {leadsRetornoHoje.map(lead => {
                const atrasado = (lead.proximo_contato ?? '').slice(0, 10) < hoje();
                const horario = lead.proximo_contato && lead.proximo_contato.length > 10
                  ? lead.proximo_contato.slice(11, 16)
                  : null;
                const tel = (lead.whatsapp || lead.telefone || '').replace(/\D/g, '');
                return (
                  <div key={lead.id} className={`item ${atrasado ? 'atrasado' : ''}`} style={{ alignItems: 'flex-start', gap: 8 }}>
                    <div className="cresce">
                      <div className="linha entre" style={{ flexWrap: 'wrap', gap: 4 }}>
                        <span className="titulo" style={{ fontWeight: 600 }}>{lead.nome}</span>
                        <span className="pequeno secundario">
                          {atrasado ? '⚠️ Atrasado' : (horario ? `Hoje às ${horario}` : 'Hoje')}
                        </span>
                      </div>
                      {lead.empresa && <div className="pequeno secundario">{lead.empresa}{lead.nicho ? ` · ${lead.nicho}` : ''}</div>}
                      {lead.observacoes && (
                        <div className="pequeno secundario" style={{ marginTop: 2, fontStyle: 'italic' }}>
                          {lead.observacoes.split('\n').pop()}
                        </div>
                      )}
                    </div>
                    <div className="linha" style={{ gap: 6, flex: 'none' }}>
                      <button
                        type="button"
                        onClick={() => abrirAgendarPainel(lead.id)}
                        className="btn btn-secundario"
                        style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <CalendarPlus size={13} /> Reagendar
                      </button>
                      {tel && (
                        <a
                          href={`https://wa.me/55${tel}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir WhatsApp"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                            background: '#25d36620', color: '#25d366', textDecoration: 'none',
                          }}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                      )}
                      {tel && (
                        <a
                          href={`tel:+55${tel}`}
                          title="Ligar"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                            background: 'var(--destaque)20', color: 'var(--destaque)', textDecoration: 'none',
                          }}
                        >
                          <Phone size={14} /> Ligar
                        </a>
                      )}
                      <Link
                        to="/funil"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 8, fontSize: 13,
                          background: 'var(--vidro-pilula)', textDecoration: 'none', color: 'inherit'
                        }}
                      >
                        Ver no Funil
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Grade de 3 colunas: Hoje, Cobranças, Tarefas */}
      <div className="grade grade-3 igual" style={{ marginBottom: 18 }}>
        <div style={atraso(0)} className="coluna"><Card titulo="Hoje" acao={<Link className="link-card" to="/agenda">Agenda</Link>}>
          {deHoje.length ? <div className="lista">{deHoje.map((o) => <LinhaEvento key={o.ev.id} o={o} cliente={o.ev.cliente_id ? nomeCli.get(o.ev.cliente_id) : undefined} />)}</div>
            : <Vazio texto="Nenhum compromisso hoje." />}
        </Card></div>
        <div style={atraso(1)} className="coluna"><Card titulo="Cobranças" acao={<Link className="link-card" to="/cobrancas">Ver todas</Link>}>
          {cobs.length ? (
            <div className="lista">
              {cobs.slice(0, 6).map((c) => (
                <Link key={c.id} to="/cobrancas" className={`item ${c.status === 'atrasada' ? 'atrasado' : ''}`}>
                  <div className="cresce">
                    <div className="titulo">{nomeCli.get(c.cliente_id) ?? c.descricao}</div>
                    <div className="pequeno secundario">{c.status === 'atrasada' ? `Venceu em ${data(c.vencimento)}` : `Vence em ${data(c.vencimento)}`}</div>
                  </div>
                  <span className="num">{moeda(c.valor)}</span>
                </Link>
              ))}
            </div>
          ) : <Vazio texto="Nenhuma cobrança atrasada ou vencendo nos próximos 7 dias." />}
        </Card></div>
        <div style={atraso(2)} className="coluna"><Card titulo="Tarefas" acao={<Link className="link-card" to="/tarefas">Ver todas</Link>}>
          {tarefasHoje.length ? <div className="lista">{tarefasHoje.map((t) => <ItemTarefa key={t.id} t={t} cliente={clientes.find((c) => c.id === t.cliente_id)} />)}</div>
            : <Vazio texto="Nada pendente para hoje." />}
        </Card></div>
      </div>

      {/* Grade de 2 colunas: Próximos 7 dias e Financeiro */}
      <div className="grade grade-2 igual">
        <Card titulo="Próximos 7 Dias">
          {proximos.length ? <div className="lista">{proximos.slice(0, 8).map((o) => (
            <div key={o.ev.id + o.dia} className="linha" style={{ flexWrap: 'nowrap' }}>
              <span className="pequeno secundario num" style={{ width: 44, flex: 'none' }}>{data(o.dia).slice(0, 5)}</span>
              <div className="cresce"><LinhaEvento o={o} cliente={o.ev.cliente_id ? nomeCli.get(o.ev.cliente_id) : undefined} /></div>
            </div>
          ))}</div> : <Vazio texto="Semana livre por enquanto." />}
        </Card>
        <Card titulo="Resultado do Mês" acao={<Link className="link-card" to="/financeiro">Financeiro</Link>}>
          <div className="lista">
            <div className="item" style={{ cursor: 'default' }}><span className="cresce">Entradas</span><span className="num positivo">{moeda(resumo.entradas)}</span></div>
            <div className="item" style={{ cursor: 'default' }}><span className="cresce">Saídas, sem verbas adiantadas</span><span className="num">{moeda(resumo.saidas)}</span></div>
            <div className="item" style={{ cursor: 'default' }}><span className="cresce titulo">Lucro</span><span className={`num ${resumo.lucro < 0 ? 'negativo' : ''}`} style={{ fontWeight: 500 }}>{moeda(resumo.lucro)}</span></div>
          </div>
          {qtdAtrasadas > 0 && <div style={{ marginTop: 12 }}><Chip cor="erro">{qtdAtrasadas} {qtdAtrasadas === 1 ? 'cobrança atrasada' : 'cobranças atrasadas'}</Chip></div>}
        </Card>
      </div>

      <AtaModal aberto={ataAberta} aoFechar={() => setAtaAberta(false)} />

      {/* Modal de Agendamento Rápido de Retorno de Lead (Painel) */}
      <Modal
        titulo="📞 Agendar Retorno com Lead (Ligar / Mensagem)"
        aberto={modalAgendarLead}
        aoFechar={() => setModalAgendarLead(false)}
        rodape={
          <Botao variante="primario" onClick={confirmarRetornoPainel}>
            <CalendarPlus size={15} /> Confirmar & Salvar na Agenda
          </Botao>
        }
      >
        <div className="coluna" style={{ gap: 14 }}>
          <p className="pequeno secundario">
            Agende o dia e horário que o lead pediu para você entrar em contato. O retorno será exibido no Painel e sincronizado na sua Agenda!
          </p>

          <Campo rotulo="Selecione o Lead *">
            <select
              className="entrada"
              value={leadSelecionadoId}
              onChange={e => setLeadSelecionadoId(e.target.value)}
            >
              {todosLeads.filter(l => !l.excluido).map(l => (
                <option key={l.id} value={l.id}>
                  {l.nome} {l.empresa ? `(${l.empresa})` : ''} - {l.nicho || 'Geral'}
                </option>
              ))}
            </select>
          </Campo>

          <div className="grade grade-2">
            <Campo rotulo="Data do Retorno *">
              <input
                className="entrada"
                type="date"
                value={formRetornoPainel.data}
                onChange={e => setFormRetornoPainel(prev => ({ ...prev, data: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Horário Marcado *">
              <input
                className="entrada"
                type="time"
                value={formRetornoPainel.hora}
                onChange={e => setFormRetornoPainel(prev => ({ ...prev, hora: e.target.value }))}
              />
            </Campo>
          </div>

          <Campo rotulo="Pauta / O que falar com o Lead" acao={<AssistenteTexto valor={formRetornoPainel.pauta} aoCorrigir={v => setFormRetornoPainel(prev => ({ ...prev, pauta: v }))} />}>
            <textarea
              className="entrada"
              rows={3}
              placeholder="Ex: Lead pediu para ligar após conversar com a esposa/sócio; apresentar proposta de gestão de tráfego pago..."
              value={formRetornoPainel.pauta}
              onChange={e => setFormRetornoPainel(prev => ({ ...prev, pauta: e.target.value }))}
            />
          </Campo>

          <label className="marcador" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formRetornoPainel.inserirNaAgenda}
              onChange={e => setFormRetornoPainel(prev => ({ ...prev, inserirNaAgenda: e.target.checked }))}
            />
            <span>Criar compromisso na <strong>Agenda do Atlas</strong> automaticamente</span>
          </label>
        </div>
      </Modal>

      {/* Modal Resumo Executivo da Semana */}
      <ResumoSemanalModal
        aberto={resumoSemanalAberto}
        aoFechar={() => setResumoSemanalAberto(false)}
        cobrancas={cobrancas}
        tarefas={tarefas}
        eventos={eventos}
        clientes={clientes}
        meta={meta}
        faturamentoMes={fat}
      />
    </div>
  );
}
