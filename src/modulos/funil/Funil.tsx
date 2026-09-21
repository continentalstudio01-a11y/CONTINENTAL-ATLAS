import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, MessageCircle, User, ChevronRight, Clock, Trash2, ArrowRight, Calendar, CalendarPlus, PhoneCall } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, AssistenteTexto, useAvisar } from '../../componentes/ui';
import { data, hoje, moeda, numero, somarDias } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import { salvar as salvarRepo } from '../../lib/repo';
import type { Lead, LeadInteracao, Evento } from '../../lib/tipos';

const ETAPAS: { id: Lead['etapa']; rotulo: string }[] = [
  { id: 'novo', rotulo: 'Novo Lead' },
  { id: 'contato', rotulo: 'Contato Feito' },
  { id: 'reuniao', rotulo: 'Reunião Marcada' },
  { id: 'proposta', rotulo: 'Proposta Enviada' },
  { id: 'fechado', rotulo: 'Fechado' },
  { id: 'perdido', rotulo: 'Perdido' },
];

const COR_ETAPA: Record<Lead['etapa'], string> = {
  novo: '#59627E', contato: '#4A78B0', reuniao: '#2E8B57',
  proposta: '#C98A1B', fechado: '#2E8B57', perdido: '#B42318',
};

export const LEADS_INICIAIS = (hojeData: string, ontemData: string, amanhaData: string): Lead[] => [
  {
    id: 'lead-demo-1',
    nome: 'Dr. Roberto Almeida',
    empresa: 'Clínica Sorriso Prime',
    telefone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: 'contato@sorrisoprime.com.br',
    cidade: 'São Paulo - SP',
    nicho: 'Odontologia / Estética Dental',
    origem: 'Google Maps',
    etapa: 'contato',
    valor_estimado: 2500,
    motivo_perda: null,
    pontuacao: 9,
    chave_externa: null,
    dados_externos: {},
    proximo_contato: `${hojeData}T15:30`,
    observacoes: 'Lead pediu para ligar hoje às 15:30 para alinhar a verba de anúncios no Meta e Google Ads.',
    cliente_id: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    excluido: false,
  },
  {
    id: 'lead-demo-2',
    nome: 'Mariana Santos',
    empresa: 'Boutique Elegance',
    telefone: '(21) 99887-1122',
    whatsapp: '(21) 99887-1122',
    email: 'mariana@boutiqueelegance.com',
    cidade: 'Rio de Janeiro - RJ',
    nicho: 'Moda Feminina / E-commerce',
    origem: 'Instagram',
    etapa: 'reuniao',
    valor_estimado: 1800,
    motivo_perda: null,
    pontuacao: 8,
    chave_externa: null,
    dados_externos: {},
    proximo_contato: `${ontemData}T11:00`,
    observacoes: 'Pediu retorno com proposta de tráfego pago para catálogo online.',
    cliente_id: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    excluido: false,
  },
  {
    id: 'lead-demo-3',
    nome: 'Carlos Eduardo',
    empresa: 'Auto Peças & Centro Automotivo Líder',
    telefone: '(31) 97654-3210',
    whatsapp: '(31) 97654-3210',
    email: 'carlos@autolider.com.br',
    cidade: 'Belo Horizonte - MG',
    nicho: 'Automotivo / Serviços',
    origem: 'Indicação',
    etapa: 'novo',
    valor_estimado: 2000,
    motivo_perda: null,
    pontuacao: 7,
    chave_externa: null,
    dados_externos: {},
    proximo_contato: null,
    observacoes: 'Indicado por cliente antigo. Precisa de campanhas para atrair clientes locais para troca de óleo e pneus.',
    cliente_id: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    excluido: false,
  },
  {
    id: 'lead-demo-4',
    nome: 'Dra. Juliana Mendes',
    empresa: 'Clínica Dermatológica Renova',
    telefone: '(41) 98123-4567',
    whatsapp: '(41) 98123-4567',
    email: 'dra.juliana@renovaderma.com.br',
    cidade: 'Curitiba - PR',
    nicho: 'Dermatologia / Estética',
    origem: 'Site',
    etapa: 'proposta',
    valor_estimado: 3200,
    motivo_perda: null,
    pontuacao: 10,
    chave_externa: null,
    dados_externos: {},
    proximo_contato: `${amanhaData}T14:00`,
    observacoes: 'Proposta de R$ 3.200/mês enviada. Ligar amanhã para colher assinatura do contrato.',
    cliente_id: null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    excluido: false,
  }
];

function carregarLeads(): Lead[] {
  try {
    const salvos = localStorage.getItem('atlas_leads');
    if (salvos) {
      const lista: Lead[] = JSON.parse(salvos);
      if (Array.isArray(lista) && lista.length > 0) return lista;
    }
  } catch {}

  // Se não houver leads salvos, inicializa dados ricos para teste imediato
  const hj = hoje();
  const ontem = somarDias(hj, -1);
  const amanha = somarDias(hj, 1);
  const iniciais = LEADS_INICIAIS(hj, ontem, amanha);
  localStorage.setItem('atlas_leads', JSON.stringify(iniciais));
  return iniciais;
}

function salvarLeadsStorage(l: Lead[]) {
  localStorage.setItem('atlas_leads', JSON.stringify(l));
  try {
    window.dispatchEvent(new Event('atlas_leads_updated'));
  } catch {}
}

function carregarInteracoes(): LeadInteracao[] {
  try { return JSON.parse(localStorage.getItem('atlas_interacoes') || '[]'); } catch { return []; }
}
function salvarInteracoesStorage(l: LeadInteracao[]) { localStorage.setItem('atlas_interacoes', JSON.stringify(l)); }

const LEAD_VAZIO = (): Omit<Lead, 'id' | 'criado_em' | 'atualizado_em' | 'excluido'> => ({
  nome: '', empresa: '', telefone: '', whatsapp: '', email: '', cidade: '', nicho: '',
  origem: 'Outro', etapa: 'novo', valor_estimado: 0, motivo_perda: null, pontuacao: null,
  chave_externa: null, dados_externos: {}, proximo_contato: null, observacoes: '', cliente_id: null,
});

const ORIGENS = ['Google Maps', 'Indicação', 'Instagram', 'Site', 'Anúncios', 'Outro'];

export function Funil() {
  const [leads, setLeads] = useState<Lead[]>(carregarLeads);
  const [interacoes, setInteracoes] = useState<LeadInteracao[]>(carregarInteracoes);
  const avisar = useAvisar();
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState<Lead | 'novo' | null>(null);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [moverPara, setMoverPara] = useState<{ lead: Lead; etapa: Lead['etapa'] } | null>(null);
  const [novaInteracao, setNovaInteracao] = useState({ tipo: 'nota' as LeadInteracao['tipo'], descricao: '' });
  const [form, setForm] = useState(LEAD_VAZIO());
  const dragging = useRef<string | null>(null);

  // Agendamento de Retorno / Ligar para o Lead
  const [abaVisualizacao, setAbaVisualizacao] = useState<'kanban' | 'retornos'>('kanban');
  const [agendandoRetorno, setAgendandoRetorno] = useState<Lead | null>(null);
  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string>('');
  const [formRetorno, setFormRetorno] = useState({
    data: hoje(),
    hora: '14:00',
    pauta: '',
    inserirNaAgenda: true
  });

  const abrirModalRetorno = (lead?: Lead | null) => {
    if (lead) {
      setAgendandoRetorno(lead);
      setLeadSelecionadoId(lead.id);
    } else {
      setAgendandoRetorno(leads[0] || null);
      setLeadSelecionadoId(leads[0]?.id || '');
    }
    setFormRetorno({
      data: hoje(),
      hora: '14:00',
      pauta: '',
      inserirNaAgenda: true
    });
  };

  const confirmarRetorno = async () => {
    if (!agendandoRetorno) return;
    const lead = agendandoRetorno;
    const dataHora = `${formRetorno.data}T${formRetorno.hora}`;
    const agora = new Date().toISOString();

    const pautaTexto = formRetorno.pauta.trim();
    const updObs = pautaTexto
      ? `${lead.observacoes ? lead.observacoes + '\n' : ''}[Retorno agendado p/ ${data(formRetorno.data)} às ${formRetorno.hora}]: ${pautaTexto}`
      : lead.observacoes;

    const listaUpd = leads.map(l => l.id === lead.id ? {
      ...l,
      proximo_contato: dataHora,
      etapa: l.etapa === 'novo' ? ('contato' as const) : l.etapa,
      observacoes: updObs,
      atualizado_em: agora
    } : l);
    salvar(listaUpd);

    const novaInteracao: LeadInteracao = {
      id: novoId(),
      lead_id: lead.id,
      tipo: 'reuniao',
      descricao: `Retorno/Contato agendado para ${data(formRetorno.data)} às ${formRetorno.hora}. Pauta: ${pautaTexto || 'Sem pauta informada'}`,
      data: agora,
      criado_em: agora,
      atualizado_em: agora,
      excluido: false
    };
    salvarInter([novaInteracao, ...interacoes]);

    if (formRetorno.inserirNaAgenda) {
      const horaNum = Number(formRetorno.hora.slice(0, 2)) || 14;
      const horaFim = String(horaNum + 1).padStart(2, '0') + formRetorno.hora.slice(2);
      const tel = (lead.whatsapp || lead.telefone || '').replace(/\D/g, '');
      await salvarRepo<Evento>('eventos', {
        id: novoId(),
        titulo: `📞 Ligar/Chamar: ${lead.nome} (${lead.empresa || 'Lead'})`,
        tipo: 'reuniao',
        inicio: `${formRetorno.data}T${formRetorno.hora}:00-03:00`,
        fim: `${formRetorno.data}T${horaFim}:00-03:00`,
        dia_inteiro: false,
        local_link: tel ? `https://wa.me/55${tel}` : '',
        descricao: `Retornar contato agendado com o Lead:\n\nNome: ${lead.nome}\nEmpresa: ${lead.empresa || '—'}\nNicho: ${lead.nicho || '—'}\nCidade: ${lead.cidade || '—'}\nWhatsApp: ${lead.whatsapp || lead.telefone || '—'}\n\nPauta / O que falar: ${pautaTexto || 'Retornar contato conforme combinado com o lead'}`,
        cliente_id: null,
        lead_id: lead.id,
        recorrencia: 'nenhuma',
        lembretes: [15, 60],
        automatico: false,
        origem_tabela: 'leads',
        origem_id: lead.id,
        google_event_id: null,
        sync_pendente: true
      });
    }

    setAgendandoRetorno(null);
    avisar(`Retorno agendado para ${data(formRetorno.data)} às ${formRetorno.hora} e registrado na Agenda!`);
  };

  const salvar = (lista: Lead[]) => { setLeads(lista); salvarLeadsStorage(lista); };
  const salvarInter = (lista: LeadInteracao[]) => { setInteracoes(lista); salvarInteracoesStorage(lista); };

  const leadSelecionado = detalhesId ? leads.find(l => l.id === detalhesId) ?? null : null;
  const interacoesLead = leadSelecionado ? interacoes.filter(i => i.lead_id === leadSelecionado.id).sort((a, b) => b.data.localeCompare(a.data)) : [];

  const filtrados = useMemo(() => {
    if (!busca) return leads.filter(l => !l.excluido);
    const b = busca.toLowerCase();
    return leads.filter(l => !l.excluido && (l.nome.toLowerCase().includes(b) || l.empresa.toLowerCase().includes(b) || l.nicho.toLowerCase().includes(b)));
  }, [leads, busca]);

  const abrirNovo = () => { setForm(LEAD_VAZIO()); setFormAberto('novo'); };
  const abrirEditar = (lead: Lead) => { setForm({ ...lead } as typeof form); setFormAberto(lead); };
  const set = (f: keyof typeof form, v: unknown) => setForm(prev => ({ ...prev, [f]: v }));

  const confirmarForm = () => {
    if (!form.nome.trim()) { avisar('Informe o nome do lead.'); return; }
    const agora = new Date().toISOString();
    if (formAberto === 'novo') {
      const novo: Lead = { ...form, id: novoId(), criado_em: agora, atualizado_em: agora, excluido: false };
      salvar([novo, ...leads]);
    } else {
      salvar(leads.map(l => l.id === (formAberto as Lead).id ? { ...l, ...form, atualizado_em: agora } : l));
    }
    setFormAberto(null);
    avisar('Lead salvo');
  };

  const mover = (lead: Lead, etapa: Lead['etapa']) => {
    if (etapa === 'perdido') { setMoverPara({ lead, etapa }); setMotivo(''); return; }
    salvar(leads.map(l => l.id === lead.id ? { ...l, etapa, atualizado_em: new Date().toISOString() } : l));
    avisar(`Movido para ${ETAPAS.find(e => e.id === etapa)?.rotulo}`);
  };

  const confirmarPerda = () => {
    if (!moverPara) return;
    salvar(leads.map(l => l.id === moverPara.lead.id ? { ...l, etapa: 'perdido', motivo_perda: motivo, atualizado_em: new Date().toISOString() } : l));
    setMoverPara(null);
    avisar('Lead marcado como perdido');
  };

  const excluir = (id: string) => {
    salvar(leads.map(l => l.id === id ? { ...l, excluido: true } : l));
    setDetalhesId(null);
    avisar('Lead excluído');
  };

  const adicionarInteracao = () => {
    if (!novaInteracao.descricao.trim() || !leadSelecionado) return;
    const agora = new Date().toISOString();
    const nova: LeadInteracao = { id: novoId(), lead_id: leadSelecionado.id, ...novaInteracao, data: agora, criado_em: agora, atualizado_em: agora, excluido: false };
    salvarInter([nova, ...interacoes]);
    setNovaInteracao({ tipo: 'nota', descricao: '' });
    avisar('Interação registrada');
  };

  const converterEmCliente = (lead: Lead) => {
    navigate('/clientes/novo', { state: { fromLead: lead } });
  };

  const whatsapp = (lead: Lead) => {
    const tel = (lead.whatsapp || lead.telefone).replace(/\D/g, '');
    if (tel) window.open(`https://wa.me/55${tel}`, '_blank');
    else avisar('Lead sem telefone cadastrado.');
  };

  // Drag and Drop
  const onDragStart = (id: string) => { dragging.current = id; };
  const onDrop = (etapa: Lead['etapa']) => {
    if (!dragging.current) return;
    const lead = leads.find(l => l.id === dragging.current);
    if (lead) mover(lead, etapa);
    dragging.current = null;
  };

  const leadsComRetorno = useMemo(() => {
    return leads
      .filter(l => !l.excluido && l.proximo_contato)
      .sort((a, b) => (a.proximo_contato ?? '').localeCompare(b.proximo_contato ?? ''));
  }, [leads]);

  return (
    <>
      <CabecalhoTela
        titulo="Funil de Prospecção & Retornos de Leads"
        icone={<Filter size={28} strokeWidth={1.6} />}
        subtitulo="Acompanhe leads, reuniões e datas agendadas para ligar/contatar"
        acoes={
          <div className="linha" style={{ gap: 8 }}>
            <Botao onClick={() => abrirModalRetorno(null)}>
              <CalendarPlus size={16} /> 📞 Agendar Retorno com Lead
            </Botao>
            <Botao variante="primario" onClick={abrirNovo}>
              <Plus size={17} /> Novo Lead
            </Botao>
          </div>
        }
      />

      {/* Alternar entre Kanban e Lista de Retornos Agendados */}
      <div className="linha entre" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div className="abas vidro-pilula" style={{ width: 'fit-content' }}>
          <button
            type="button"
            className={`aba ${abaVisualizacao === 'kanban' ? 'ativa' : ''}`}
            onClick={() => setAbaVisualizacao('kanban')}
          >
            Kanban do Funil ({filtrados.length})
          </button>
          <button
            type="button"
            className={`aba ${abaVisualizacao === 'retornos' ? 'ativa' : ''}`}
            onClick={() => setAbaVisualizacao('retornos')}
          >
            📞 Retornos Agendados ({leadsComRetorno.length})
          </button>
        </div>

        <input
          className="entrada"
          placeholder="Buscar por nome, empresa ou nicho..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {/* ABA 1: KANBAN DO FUNIL */}
      {abaVisualizacao === 'kanban' && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
          {ETAPAS.map(etapa => {
            const cards = filtrados.filter(l => l.etapa === etapa.id);
            return (
              <div key={etapa.id} style={{ minWidth: 250, flex: '0 0 250px' }}
                onDragOver={e => e.preventDefault()} onDrop={() => onDrop(etapa.id)}>
                <div className="linha entre" style={{ marginBottom: 8, padding: '0 2px' }}>
                  <span className="titulo-card" style={{ fontSize: 13 }}>{etapa.rotulo}</span>
                  <Chip>{cards.length}</Chip>
                </div>
                <div className="coluna" style={{ gap: 8 }}>
                  {cards.length === 0 && (
                    <div className="vidro-painel" style={{ padding: 12, borderRadius: 14, textAlign: 'center' }}>
                      <p className="pequeno secundario">Nenhum lead</p>
                    </div>
                  )}
                  {cards.map(lead => {
                    const vencido = lead.proximo_contato && lead.proximo_contato < hoje();
                    const hojeMarcado = lead.proximo_contato && lead.proximo_contato.slice(0, 10) === hoje();
                    return (
                      <div key={lead.id} draggable
                        onDragStart={() => onDragStart(lead.id)}
                        onClick={() => setDetalhesId(lead.id)}
                        className={`vidro-painel ${vencido ? 'atrasado' : ''}`}
                        style={{ padding: '12px 14px', borderRadius: 14, cursor: 'pointer', borderLeft: `3px solid ${COR_ETAPA[lead.etapa]}` }}>
                        <div className="titulo" style={{ fontSize: 14, marginBottom: 4 }}>{lead.nome}</div>
                        {lead.empresa && <div className="pequeno secundario">{lead.empresa}</div>}
                        {lead.nicho && <div className="pequeno secundario">{lead.nicho} · {lead.cidade}</div>}
                        {lead.valor_estimado > 0 && <div className="pequeno num" style={{ marginTop: 4 }}>{moeda(lead.valor_estimado)}/mês</div>}

                        {/* Indicador destacado de próximo contato */}
                        {lead.proximo_contato ? (
                          <div
                            className={`pequeno linha ${vencido ? 'negativo' : hojeMarcado ? 'positivo' : 'secundario'}`}
                            style={{
                              gap: 4, marginTop: 6, padding: '3px 6px', borderRadius: 6,
                              background: vencido ? '#b4231815' : hojeMarcado ? '#2e8b5715' : 'var(--vidro-painel-b)',
                              fontWeight: 600, fontSize: 11
                            }}
                          >
                            <Clock size={12} />
                            {vencido ? '⚠️ Atrasado: ' : hojeMarcado ? '🔔 Hoje às ' : '📅 '}
                            {lead.proximo_contato.length > 10 ? `${data(lead.proximo_contato.slice(0, 10))} às ${lead.proximo_contato.slice(11, 16)}` : data(lead.proximo_contato)}
                          </div>
                        ) : null}

                        {/* Botões de Ação Direta no Card */}
                        <div className="linha entre" style={{ gap: 4, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => abrirModalRetorno(lead)}
                            title="Agendar data e horário para entrar em contato"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                              background: 'var(--destaque)18', color: 'var(--destaque)', border: 'none', cursor: 'pointer'
                            }}
                          >
                            <CalendarPlus size={13} /> {lead.proximo_contato ? 'Alterar Retorno' : 'Agendar Retorno'}
                          </button>

                          <div className="linha" style={{ gap: 4 }}>
                            <BotaoIcone rotulo="WhatsApp" onClick={() => whatsapp(lead)}>
                              <MessageCircle size={14} />
                            </BotaoIcone>
                            <BotaoIcone rotulo="Detalhes" onClick={() => setDetalhesId(lead.id)}>
                              <ChevronRight size={14} />
                            </BotaoIcone>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA 2: LISTA DE RETORNOS DE LEADS AGENDADOS */}
      {abaVisualizacao === 'retornos' && (
        <div className="coluna" style={{ gap: 14 }}>
          {leadsComRetorno.length === 0 ? (
            <Vazio
              texto="Nenhum lead com retorno agendado no momento."
              acao={
                <Botao variante="primario" onClick={() => abrirModalRetorno(null)}>
                  <CalendarPlus size={15} /> Agendar Primeiro Retorno
                </Botao>
              }
            />
          ) : (
            <Card titulo={`Todos os Retornos Agendados (${leadsComRetorno.length})`}>
              <div className="lista">
                {leadsComRetorno.map(lead => {
                  const vencido = (lead.proximo_contato ?? '').slice(0, 10) < hoje();
                  const eHoje = (lead.proximo_contato ?? '').slice(0, 10) === hoje();
                  const dataFormatada = lead.proximo_contato && lead.proximo_contato.length > 10
                    ? `${data(lead.proximo_contato.slice(0, 10))} às ${lead.proximo_contato.slice(11, 16)}`
                    : data(lead.proximo_contato ?? '');
                  const tel = (lead.whatsapp || lead.telefone || '').replace(/\D/g, '');

                  return (
                    <div key={lead.id} className={`item ${vencido ? 'atrasado' : ''}`} style={{ alignItems: 'flex-start', gap: 10 }}>
                      <div className="cresce">
                        <div className="linha" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span className="titulo" style={{ fontWeight: 600 }}>{lead.nome}</span>
                          <Chip cor={vencido ? 'erro' : eHoje ? 'ok' : 'destaque'}>
                            {vencido ? '⚠️ Atrasado' : eHoje ? '🔔 Hoje' : '📅 Agendado'}
                          </Chip>
                          <Chip>{ETAPAS.find(e => e.id === lead.etapa)?.rotulo}</Chip>
                        </div>
                        <div className="pequeno secundario">
                          {lead.empresa && <span><strong>Empresa:</strong> {lead.empresa} · </span>}
                          {lead.nicho && <span><strong>Nicho:</strong> {lead.nicho} · </span>}
                          {lead.cidade && <span><strong>Cidade:</strong> {lead.cidade} · </span>}
                          <span><strong>Contato marcado para:</strong> {dataFormatada}</span>
                        </div>
                        {lead.observacoes && (
                          <div className="pequeno secundario" style={{ marginTop: 4, fontStyle: 'italic', background: 'var(--vidro-painel-b)', padding: '4px 8px', borderRadius: 6 }}>
                            {lead.observacoes.split('\n').pop()}
                          </div>
                        )}
                      </div>

                      <div className="linha" style={{ gap: 6, flex: 'none' }}>
                        <Botao onClick={() => abrirModalRetorno(lead)}>
                          <CalendarPlus size={14} /> Reagendar
                        </Botao>
                        {tel && (
                          <a
                            href={`https://wa.me/55${tel}`}
                            target="_blank"
                            rel="noopener noreferrer"
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
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                              background: 'var(--destaque)20', color: 'var(--destaque)', textDecoration: 'none',
                            }}
                          >
                            <PhoneCall size={14} /> Ligar
                          </a>
                        )}
                        <BotaoIcone rotulo="Detalhes" onClick={() => setDetalhesId(lead.id)}>
                          <ChevronRight size={14} />
                        </BotaoIcone>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal Formulário */}
      <Modal titulo={formAberto === 'novo' ? 'Novo Lead' : 'Editar Lead'} aberto={!!formAberto} aoFechar={() => setFormAberto(null)}
        rodape={<Botao variante="primario" onClick={confirmarForm}>Salvar Lead</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <div className="grade grade-2">
            <Campo rotulo="Nome *"><input className="entrada" value={form.nome} onChange={e => set('nome', e.target.value)} autoFocus /></Campo>
            <Campo rotulo="Empresa"><input className="entrada" value={form.empresa} onChange={e => set('empresa', e.target.value)} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Telefone"><input className="entrada" value={form.telefone} onChange={e => set('telefone', e.target.value)} /></Campo>
            <Campo rotulo="WhatsApp"><input className="entrada" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="E-mail"><input className="entrada" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Campo>
            <Campo rotulo="Cidade"><input className="entrada" value={form.cidade} onChange={e => set('cidade', e.target.value)} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Nicho"><input className="entrada" value={form.nicho} onChange={e => set('nicho', e.target.value)} placeholder="Ex: Pizzaria, Clínica..." /></Campo>
            <Campo rotulo="Origem">
              <select className="entrada" value={form.origem} onChange={e => set('origem', e.target.value)}>
                {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Etapa">
              <select className="entrada" value={form.etapa} onChange={e => set('etapa', e.target.value as Lead['etapa'])}>
                {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.rotulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Valor Estimado (R$/mês)">
              <input className="entrada" type="number" min="0" step="0.01" value={form.valor_estimado || ''} onChange={e => set('valor_estimado', numero(e.target.value))} />
            </Campo>
          </div>
          <Campo rotulo="Próximo Contato">
            <input className="entrada" type="date" value={form.proximo_contato || ''} onChange={e => set('proximo_contato', e.target.value || null)} />
          </Campo>
          <Campo rotulo="Observações" acao={<AssistenteTexto valor={form.observacoes} aoCorrigir={v => set('observacoes', v)} />}>
            <textarea className="entrada" rows={3} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Anotações sobre o negócio, perfil do lead..." />
          </Campo>
        </div>
      </Modal>

      {/* Modal Detalhes */}
      <Modal titulo={leadSelecionado?.nome ?? ''} aberto={!!detalhesId} aoFechar={() => setDetalhesId(null)}>
        {leadSelecionado && (
          <div className="coluna" style={{ gap: 16 }}>
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip>{ETAPAS.find(e => e.id === leadSelecionado.etapa)?.rotulo}</Chip>
              {leadSelecionado.empresa && <span className="secundario pequeno">{leadSelecionado.empresa}</span>}
              {leadSelecionado.nicho && <span className="secundario pequeno">{leadSelecionado.nicho}</span>}
            </div>
            <div className="lista">
              {leadSelecionado.telefone && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Telefone</span><span>{leadSelecionado.telefone}</span></div>}
              {leadSelecionado.email && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">E-mail</span><span>{leadSelecionado.email}</span></div>}
              {leadSelecionado.cidade && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Cidade</span><span>{leadSelecionado.cidade}</span></div>}
              {leadSelecionado.valor_estimado > 0 && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Valor Estimado</span><span className="num">{moeda(leadSelecionado.valor_estimado)}/mês</span></div>}
              {leadSelecionado.proximo_contato && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Próximo Contato</span><span>{data(leadSelecionado.proximo_contato)}</span></div>}
              {leadSelecionado.motivo_perda && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Motivo da Perda</span><span>{leadSelecionado.motivo_perda}</span></div>}
            </div>
            {leadSelecionado.observacoes && <p className="secundario pequeno">{leadSelecionado.observacoes}</p>}

            {/* Mover para outra etapa */}
            <div>
              <p className="pequeno secundario" style={{ marginBottom: 6 }}>Mover para:</p>
              <div className="linha" style={{ gap: 6, flexWrap: 'wrap' }}>
                {ETAPAS.filter(e => e.id !== leadSelecionado.etapa).map(e => (
                  <Botao key={e.id} onClick={() => mover(leadSelecionado, e.id)}>
                    <ArrowRight size={13} /> {e.rotulo}
                  </Botao>
                ))}
              </div>
            </div>

            {/* Histórico de interações */}
            <div>
              <p className="titulo-card" style={{ fontSize: 14, marginBottom: 8 }}>Histórico de Interações</p>
              <div className="coluna" style={{ gap: 6, marginBottom: 10 }}>
                <div className="linha" style={{ gap: 8 }}>
                  <select className="entrada" value={novaInteracao.tipo} onChange={e => setNovaInteracao(n => ({ ...n, tipo: e.target.value as LeadInteracao['tipo'] }))} style={{ flex: 'none', width: 130 }}>
                    <option value="nota">Nota</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="ligacao">Ligação</option>
                    <option value="reuniao">Reunião</option>
                  </select>
                  <input className="entrada" placeholder="Descreva a interação..." value={novaInteracao.descricao}
                    onChange={e => setNovaInteracao(n => ({ ...n, descricao: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && adicionarInteracao()} style={{ flex: 1 }} />
                  <Botao onClick={adicionarInteracao}><Plus size={14} /></Botao>
                </div>
              </div>
              {interacoesLead.length === 0 && <p className="secundario pequeno">Nenhuma interação registrada.</p>}
              <div className="lista">
                {interacoesLead.slice(0, 20).map(i => (
                  <div key={i.id} className="item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                    <div className="cresce">
                      <div className="linha" style={{ gap: 6, marginBottom: 2 }}>
                        <Chip>{i.tipo}</Chip>
                        <span className="pequeno secundario">{data(i.data)}</span>
                      </div>
                      <div className="pequeno">{i.descricao}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Botao onClick={() => whatsapp(leadSelecionado)}><MessageCircle size={14} /> WhatsApp</Botao>
              <Botao onClick={() => abrirModalRetorno(leadSelecionado)}><CalendarPlus size={14} /> Agendar Retorno</Botao>
              <Botao onClick={() => { setDetalhesId(null); abrirEditar(leadSelecionado); }}><User size={14} /> Editar</Botao>
              {leadSelecionado.etapa === 'fechado' && (
                <Botao variante="primario" onClick={() => converterEmCliente(leadSelecionado)}>Converter em Cliente</Botao>
              )}
              <Botao variante="perigo" onClick={() => { if (confirm('Excluir este lead?')) excluir(leadSelecionado.id); }}>
                <Trash2 size={14} /> Excluir
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Agendar Retorno com o Lead */}
      <Modal titulo={`Agendar Retorno / Ligar — ${agendandoRetorno?.nome ?? ''}`} aberto={!!agendandoRetorno} aoFechar={() => setAgendandoRetorno(null)}
        rodape={<Botao variante="primario" onClick={confirmarRetorno}><CalendarPlus size={15} /> Confirmar & Salvar na Agenda</Botao>}>
        {agendandoRetorno && (
          <div className="coluna" style={{ gap: 14 }}>
            {/* Selecionar Lead */}
            <Campo rotulo="Selecionar Lead para Retorno *">
              <select
                className="entrada"
                value={agendandoRetorno.id}
                onChange={e => {
                  const escolhido = leads.find(l => l.id === e.target.value);
                  if (escolhido) setAgendandoRetorno(escolhido);
                }}
              >
                {leads.filter(l => !l.excluido).map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome} {l.empresa ? `(${l.empresa})` : ''} - {ETAPAS.find(et => et.id === l.etapa)?.rotulo}
                  </option>
                ))}
              </select>
            </Campo>

            {/* Card com resumo do lead */}
            <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
              <p className="pequeno secundario">Lead que pediu para entrar em contato:</p>
              <p style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{agendandoRetorno.nome}</p>
              <div className="linha" style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                {agendandoRetorno.empresa && <Chip>{agendandoRetorno.empresa}</Chip>}
                {agendandoRetorno.nicho && <Chip>{agendandoRetorno.nicho}</Chip>}
                {agendandoRetorno.cidade && <Chip>{agendandoRetorno.cidade}</Chip>}
                {(agendandoRetorno.whatsapp || agendandoRetorno.telefone) && (
                  <span className="pequeno secundario">Tel: <strong>{agendandoRetorno.whatsapp || agendandoRetorno.telefone}</strong></span>
                )}
              </div>
            </div>

            <div className="grade grade-2">
              <Campo rotulo="Data do Retorno *">
                <input className="entrada" type="date" value={formRetorno.data} onChange={e => setFormRetorno(prev => ({ ...prev, data: e.target.value }))} autoFocus />
              </Campo>
              <Campo rotulo="Horário Marcado *">
                <input className="entrada" type="time" value={formRetorno.hora} onChange={e => setFormRetorno(prev => ({ ...prev, hora: e.target.value }))} />
              </Campo>
            </div>

            <Campo rotulo="O que falar / Assunto do Retorno" acao={<AssistenteTexto valor={formRetorno.pauta} aoCorrigir={v => setFormRetorno(prev => ({ ...prev, pauta: v }))} />}>
              <textarea
                className="entrada"
                rows={3}
                placeholder="Ex: Lead pediu para ligar após a reunião com o sócio; apresentar proposta de R$ 1.500/mês para tráfego local..."
                value={formRetorno.pauta}
                onChange={e => setFormRetorno(prev => ({ ...prev, pauta: e.target.value }))}
              />
            </Campo>

            <label className="marcador" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={formRetorno.inserirNaAgenda} onChange={e => setFormRetorno(prev => ({ ...prev, inserirNaAgenda: e.target.checked }))} />
              <span>Colocar automaticamente como compromisso na <strong>Agenda do Atlas</strong> com lembrete</span>
            </label>
          </div>
        )}
      </Modal>

      {/* Modal Motivo da Perda */}
      <Modal titulo="Motivo da Perda" aberto={!!moverPara} aoFechar={() => setMoverPara(null)}
        rodape={<Botao variante="primario" onClick={confirmarPerda}>Confirmar</Botao>}>
        <Campo rotulo="Por que este lead foi perdido?">
          <textarea className="entrada" rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Preço alto, foi para concorrente, não tinha budget..." autoFocus />
        </Campo>
      </Modal>
    </>
  );
}
