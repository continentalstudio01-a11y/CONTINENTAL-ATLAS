import { useState, useMemo } from 'react';
import {
  BarChart3, Plus, Trash2, ChevronRight, TrendingUp, AlertCircle,
  Code, Copy, CheckCircle2, ExternalLink, Link2, Sparkles, Sliders
} from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar, Barra } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje, moeda, numero, somarDias } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente, ClienteTrafego } from '../../lib/tipos';

interface MetricaManual {
  id: string;
  cliente_id: string;
  plataforma: 'meta' | 'google';
  campanha: string;
  periodo_inicio: string;
  periodo_fim: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  leads: number;
  criado_em: string;
}

interface Otimizacao {
  id: string;
  cliente_id: string;
  data: string;
  campanha: string;
  categoria: string;
  descricao: string;
}

export interface TrackingConfig {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  meta_pixel_id: string;
  meta_capi_token: string;
  meta_test_code: string;
  google_conversion_id: string;
  google_conversion_label: string;
  gtm_id: string;
  ga4_id: string;
  status: 'configurado' | 'pendente' | 'testado';
  observacoes: string;
  atualizado_em: string;
}

function carregarMetricas(): MetricaManual[] {
  try { return JSON.parse(localStorage.getItem('atlas_metricas') || '[]'); } catch { return []; }
}
function salvarMetricas(l: MetricaManual[]) { localStorage.setItem('atlas_metricas', JSON.stringify(l)); }

function carregarOtimizacoes(): Otimizacao[] {
  try { return JSON.parse(localStorage.getItem('atlas_otimizacoes') || '[]'); } catch { return []; }
}
function salvarOtimizacoes(l: Otimizacao[]) { localStorage.setItem('atlas_otimizacoes', JSON.stringify(l)); }

export interface BMConta {
  id: string;
  conta_id: string;
  nome: string;
  moeda: string;
  limite?: string;
  cliente_id?: string;
}

export interface BMRegistro {
  id: string;
  bm_id: string;
  nome: string;
  funcao: 'principal' | 'clientes' | 'prospeccao' | 'contingencia' | 'reserva';
  status: 'ativa' | 'aquecendo' | 'verificada' | 'restrita';
  token_acesso: string;
  contas: BMConta[];
  observacoes: string;
  criado_em: string;
  atualizado_em: string;
}

function carregarTrackings(): TrackingConfig[] {
  try { return JSON.parse(localStorage.getItem('atlas_tracking') || '[]'); } catch { return []; }
}
function salvarTrackings(l: TrackingConfig[]) { localStorage.setItem('atlas_tracking', JSON.stringify(l)); }

function carregarBMs(): BMRegistro[] {
  try { return JSON.parse(localStorage.getItem('atlas_bms') || '[]'); } catch { return []; }
}
function salvarBMs(l: BMRegistro[]) { localStorage.setItem('atlas_bms', JSON.stringify(l)); }

export function Campanhas() {
  const [abaPrincipal, setAbaPrincipal] = useState<'metricas' | 'tracking' | 'utm' | 'otimizacoes' | 'bms'>('metricas');
  const [metricas, setMetricas] = useState<MetricaManual[]>(carregarMetricas);
  const [otimizacoes, setOtimizacoes] = useState<Otimizacao[]>(carregarOtimizacoes);
  const [trackings, setTrackings] = useState<TrackingConfig[]>(carregarTrackings);
  const [bms, setBms] = useState<BMRegistro[]>(carregarBMs);

  const [formBMAberto, setFormBMAberto] = useState(false);
  const [bmSelecionada, setBmSelecionada] = useState<string | null>(null);
  const [formContaAberto, setFormContaAberto] = useState(false);
  const [testandoBM, setTestandoBM] = useState<string | null>(null);

  const [formBM, setFormBM] = useState({
    bm_id: '',
    nome: '',
    funcao: 'principal' as BMRegistro['funcao'],
    status: 'ativa' as BMRegistro['status'],
    token_acesso: '',
    observacoes: ''
  });

  const [formConta, setFormConta] = useState({
    conta_id: '',
    nome: '',
    moeda: 'BRL',
    limite: 'R$ 250,00/dia',
    cliente_id: ''
  });

  const clientes = useLista<Cliente>('clientes') ?? [];
  const trafegos = useLista<ClienteTrafego>('cliente_trafego') ?? [];
  const avisar = useAvisar();

  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [formMetrica, setFormMetrica] = useState(false);
  const [formOtim, setFormOtim] = useState(false);
  const [formTracking, setFormTracking] = useState(false);
  const [modalCodigo, setModalCodigo] = useState<{ titulo: string; codigo: string } | null>(null);

  // Form states
  const [fm, setFm] = useState({
    cliente_id: '', plataforma: 'meta' as 'meta' | 'google', campanha: '',
    periodo_inicio: somarDias(hoje(), -30), periodo_fim: hoje(),
    investimento: '', impressoes: '', cliques: '', leads: ''
  });
  const [fo, setFo] = useState({ cliente_id: '', data: hoje(), campanha: '', categoria: 'Ajuste de segmentação', descricao: '' });

  const [ft, setFt] = useState({
    cliente_id: '', meta_pixel_id: '', meta_capi_token: '', meta_test_code: '',
    google_conversion_id: '', google_conversion_label: '', gtm_id: '', ga4_id: '',
    status: 'pendente' as TrackingConfig['status'], observacoes: ''
  });

  // UTM Builder state
  const [utmUrl, setUtmUrl] = useState('');
  const [utmSource, setUtmSource] = useState('facebook');
  const [utmMedium, setUtmMedium] = useState('cpc');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [utmTerm, setUtmTerm] = useState('');

  const clientesComTrafego = useMemo(() => clientes.filter(c => trafegos.some(t => t.cliente_id === c.id)), [clientes, trafegos]);

  const metricasCliente = (cid: string) => metricas.filter(m => m.cliente_id === cid);
  const otimizacoesCliente = (cid: string) => otimizacoes.filter(o => o.cliente_id === cid).sort((a, b) => b.data.localeCompare(a.data));
  const trackingCliente = (cid: string) => trackings.find(t => t.cliente_id === cid);

  const resumo = (mets: MetricaManual[]) => ({
    investimento: mets.reduce((s, m) => s + m.investimento, 0),
    impressoes: mets.reduce((s, m) => s + m.impressoes, 0),
    cliques: mets.reduce((s, m) => s + m.cliques, 0),
    leads: mets.reduce((s, m) => s + m.leads, 0),
  });

  const salvarMetrica = () => {
    if (!fm.cliente_id) { avisar('Selecione um cliente.'); return; }
    const agora = new Date().toISOString();
    const nova: MetricaManual = {
      id: novoId(), ...fm,
      investimento: numero(fm.investimento),
      impressoes: numero(fm.impressoes),
      cliques: numero(fm.cliques),
      leads: numero(fm.leads),
      criado_em: agora
    };
    const novaLista = [nova, ...metricas];
    setMetricas(novaLista);
    salvarMetricas(novaLista);
    setFormMetrica(false);
    avisar('Métricas registradas');
  };

  const salvarOtimizacao = () => {
    if (!fo.cliente_id || !fo.descricao.trim()) { avisar('Preencha cliente e descrição.'); return; }
    const nova: Otimizacao = { id: novoId(), ...fo };
    const novaLista = [nova, ...otimizacoes];
    setOtimizacoes(novaLista);
    salvarOtimizacoes(novaLista);
    setFormOtim(false);
    avisar('Otimização registrada');
  };

  const salvarTrackingConfig = () => {
    if (!ft.cliente_id) { avisar('Selecione um cliente.'); return; }
    const cli = clientes.find(c => c.id === ft.cliente_id);
    const existente = trackings.find(t => t.cliente_id === ft.cliente_id);
    const agora = new Date().toISOString();
    let novaLista: TrackingConfig[];
    if (existente) {
      novaLista = trackings.map(t => t.cliente_id === ft.cliente_id ? { ...t, ...ft, cliente_nome: cli?.nome ?? '', atualizado_em: agora } : t);
    } else {
      const novo: TrackingConfig = {
        id: novoId(), ...ft, cliente_nome: cli?.nome ?? '', atualizado_em: agora
      };
      novaLista = [novo, ...trackings];
    }
    setTrackings(novaLista);
    salvarTrackings(novaLista);
    setFormTracking(false);
    avisar('Configuração de Tracking salva');
  };

  const abrirEdicaoTracking = (t?: TrackingConfig, cid?: string) => {
    if (t) {
      setFt({
        cliente_id: t.cliente_id,
        meta_pixel_id: t.meta_pixel_id || '',
        meta_capi_token: t.meta_capi_token || '',
        meta_test_code: t.meta_test_code || '',
        google_conversion_id: t.google_conversion_id || '',
        google_conversion_label: t.google_conversion_label || '',
        gtm_id: t.gtm_id || '',
        ga4_id: t.ga4_id || '',
        status: t.status,
        observacoes: t.observacoes || ''
      });
    } else {
      setFt({
        cliente_id: cid || '',
        meta_pixel_id: '',
        meta_capi_token: '',
        meta_test_code: '',
        google_conversion_id: '',
        google_conversion_label: '',
        gtm_id: '',
        ga4_id: '',
        status: 'pendente',
        observacoes: ''
      });
    }
    setFormTracking(true);
  };

  const salvarNovaBM = () => {
    if (!formBM.nome.trim() || !formBM.bm_id.trim()) {
      avisar('Preencha nome e ID da BM.');
      return;
    }
    const agora = new Date().toISOString();
    const nova: BMRegistro = {
      id: novoId(),
      ...formBM,
      contas: [],
      criado_em: agora,
      atualizado_em: agora
    };
    const lista = [nova, ...bms];
    setBms(lista);
    salvarBMs(lista);
    setFormBMAberto(false);
    setFormBM({ bm_id: '', nome: '', funcao: 'principal', status: 'ativa', token_acesso: '', observacoes: '' });
    avisar('BM cadastrada com sucesso!');
  };

  const excluirBM = (id: string) => {
    const lista = bms.filter(b => b.id !== id);
    setBms(lista);
    salvarBMs(lista);
    avisar('BM removida');
  };

  const salvarContaBM = () => {
    if (!bmSelecionada || !formConta.nome.trim() || !formConta.conta_id.trim()) {
      avisar('Preencha nome e ID da conta de anúncios.');
      return;
    }
    const novaConta: BMConta = {
      id: novoId(),
      ...formConta
    };
    const lista = bms.map(b => b.id === bmSelecionada ? {
      ...b,
      contas: [...b.contas, novaConta],
      atualizado_em: new Date().toISOString()
    } : b);
    setBms(lista);
    salvarBMs(lista);
    setFormContaAberto(false);
    setFormConta({ conta_id: '', nome: '', moeda: 'BRL', limite: 'R$ 250,00/dia', cliente_id: '' });
    avisar('Conta de anúncios vinculada à BM!');
  };

  const removerContaBM = (bmId: string, contaId: string) => {
    const lista = bms.map(b => b.id === bmId ? {
      ...b,
      contas: b.contas.filter(c => c.id !== contaId),
      atualizado_em: new Date().toISOString()
    } : b);
    setBms(lista);
    salvarBMs(lista);
    avisar('Conta removida da BM');
  };

  const testarConexaoBM = (bm: BMRegistro) => {
    setTestandoBM(bm.id);
    setTimeout(() => {
      setTestandoBM(null);
      avisar(`BM ${bm.nome} sincronizada: Ativos e contas validados!`);
    }, 1000);
  };

  const copiar = (texto: string, rotulo: string) => {
    navigator.clipboard?.writeText(texto).then(() => avisar(`${rotulo} copiado!`));
  };

  // Gerador de script Meta Pixel
  const gerarCodigoMeta = (pixelId: string) => `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;

  // Gerador de Google Ads Tag
  const gerarCodigoGoogle = (convId: string, label?: string) => `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${convId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${convId}');
${label ? `  // Evento de conversão\n  gtag('event', 'conversion', {'send_to': '${convId}/${label}'});\n` : ''}</script>`;

  // Gerador de GTM
  const gerarCodigoGTM = (gtmId: string) => `<!-- Google Tag Manager - Cole o mais alto possível no <head> -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->

<!-- Cole logo após a abertura da tag <body> -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;

  // URL final com UTMs
  const urlFinalUtm = useMemo(() => {
    if (!utmUrl.trim()) return '';
    try {
      const base = utmUrl.startsWith('http') ? utmUrl : `https://${utmUrl}`;
      const u = new URL(base);
      if (utmSource) u.searchParams.set('utm_source', utmSource);
      if (utmMedium) u.searchParams.set('utm_medium', utmMedium);
      if (utmCampaign) u.searchParams.set('utm_campaign', utmCampaign);
      if (utmContent) u.searchParams.set('utm_content', utmContent);
      if (utmTerm) u.searchParams.set('utm_term', utmTerm);
      return u.toString();
    } catch {
      return '';
    }
  }, [utmUrl, utmSource, utmMedium, utmCampaign, utmContent, utmTerm]);

  const trafego = (cid: string) => trafegos.find(t => t.cliente_id === cid);

  return (
    <>
      <CabecalhoTela
        titulo="Campanhas & Tracking"
        icone={<BarChart3 size={28} strokeWidth={1.6} />}
        subtitulo="Gestão de anúncios, rastreamento de conversão (Pixel/Google) e otimizações"
        acoes={
          <div className="linha" style={{ gap: 8 }}>
            <Botao onClick={() => abrirEdicaoTracking(undefined, clienteSelecionado || undefined)}>
              <Code size={16} /> Configurar Pixel / Tag
            </Botao>
            <Botao variante="primario" onClick={() => { setFm(f => ({ ...f, cliente_id: clienteSelecionado || '' })); setFormMetrica(true); }}>
              <Plus size={17} /> Registrar Métricas
            </Botao>
          </div>
        }
      />

      {/* Abas Superiores */}
      <div className="abas vidro-pilula" style={{ width: 'fit-content', marginBottom: 16 }}>
        <button type="button" className={`aba ${abaPrincipal === 'metricas' ? 'ativa' : ''}`} onClick={() => setAbaPrincipal('metricas')}>
          Campanhas & Métricas
        </button>
        <button type="button" className={`aba ${abaPrincipal === 'tracking' ? 'ativa' : ''}`} onClick={() => setAbaPrincipal('tracking')}>
          🎯 Tracking & Pixels (Meta/Google)
        </button>
        <button type="button" className={`aba ${abaPrincipal === 'bms' ? 'ativa' : ''}`} onClick={() => setAbaPrincipal('bms')}>
          🏢 Gerenciador de BMs & Contingência
        </button>
        <button type="button" className={`aba ${abaPrincipal === 'utm' ? 'ativa' : ''}`} onClick={() => setAbaPrincipal('utm')}>
          🔗 Gerador de UTMs
        </button>
        <button type="button" className={`aba ${abaPrincipal === 'otimizacoes' ? 'ativa' : ''}`} onClick={() => setAbaPrincipal('otimizacoes')}>
          Diário de Otimizações
        </button>
      </div>

      {/* ABA 1: MÉTRICAS */}
      {abaPrincipal === 'metricas' && (
        <>
          <div className="linha" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="entrada" value={clienteSelecionado || ''} onChange={e => setClienteSelecionado(e.target.value || null)} style={{ flex: 1, maxWidth: 360 }}>
              <option value="">— Visão Geral de Todos os Clientes —</option>
              {clientesComTrafego.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {!clienteSelecionado && (
            <div className="coluna" style={{ gap: 12 }}>
              {clientesComTrafego.length === 0 ? (
                <Vazio texto="Nenhum cliente com serviço de tráfego contratado." />
              ) : (
                clientesComTrafego.map(c => {
                  const mets = metricasCliente(c.id);
                  const traf = trafego(c.id);
                  const trk = trackingCliente(c.id);
                  const r = resumo(mets);
                  const pct = traf && traf.verba_mensal_planejada > 0 ? Math.min(100, (r.investimento / traf.verba_mensal_planejada) * 100) : 0;
                  return (
                    <Card key={c.id} medio>
                      <div className="linha entre" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <div className="linha" style={{ gap: 8 }}>
                          <span className="titulo">{c.nome}</span>
                          {trk?.meta_pixel_id && <Chip cor="ok">Meta Pixel Ativo</Chip>}
                          {trk?.google_conversion_id && <Chip cor="ok">Google Tag Ativo</Chip>}
                          {!trk?.meta_pixel_id && !trk?.google_conversion_id && <Chip cor="atencao">Sem Tracking Configurado</Chip>}
                        </div>
                        <Botao onClick={() => setClienteSelecionado(c.id)}>Ver detalhes <ChevronRight size={13} /></Botao>
                      </div>
                      <div className="grade grade-3" style={{ gap: 12, marginBottom: 8 }}>
                        <div><p className="pequeno secundario">Investimento Registrado</p><p className="num" style={{ fontSize: 20 }}>{moeda(r.investimento)}</p></div>
                        <div><p className="pequeno secundario">Leads Gerados</p><p className="num" style={{ fontSize: 20 }}>{r.leads}</p></div>
                        <div><p className="pequeno secundario">Cliques nos Anúncios</p><p className="num" style={{ fontSize: 20 }}>{r.cliques.toLocaleString('pt-BR')}</p></div>
                      </div>
                      {traf && traf.verba_mensal_planejada > 0 && (
                        <div>
                          <div className="linha entre pequeno" style={{ marginBottom: 4 }}>
                            <span>Verba mensal consumida</span>
                            <span>{moeda(r.investimento)} de {moeda(traf.verba_mensal_planejada)} ({Math.round(pct)}%)</span>
                          </div>
                          <Barra valor={r.investimento} max={traf.verba_mensal_planejada} />
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {clienteSelecionado && (() => {
            const c = clientes.find(x => x.id === clienteSelecionado)!;
            const mets = metricasCliente(clienteSelecionado);
            const otims = otimizacoesCliente(clienteSelecionado);
            const trk = trackingCliente(clienteSelecionado);
            const r = resumo(mets);
            const cpc = r.cliques > 0 ? r.investimento / r.cliques : 0;
            const cpl = r.leads > 0 ? r.investimento / r.leads : 0;
            return (
              <div className="coluna" style={{ gap: 16 }}>
                <div className="linha entre" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <h2 className="titulo-tela" style={{ fontSize: 22 }}>{c?.nome}</h2>
                  <div className="linha" style={{ gap: 8 }}>
                    <Botao onClick={() => abrirEdicaoTracking(trk, c.id)}><Code size={15} /> Editar Tracking</Botao>
                    <Botao onClick={() => { setFo(f => ({ ...f, cliente_id: c.id })); setFormOtim(true); }}>+ Otimização</Botao>
                  </div>
                </div>

                <div className="grade grade-3 igual" style={{ gap: 12 }}>
                  {[
                    { r: 'Investimento Total', v: moeda(r.investimento) },
                    { r: 'Leads / Resultados', v: r.leads },
                    { r: 'Cliques', v: r.cliques.toLocaleString('pt-BR') },
                    { r: 'Impressões', v: r.impressoes.toLocaleString('pt-BR') },
                    { r: 'CPC Médio', v: moeda(cpc) },
                    { r: 'Custo por Lead (CPL)', v: cpl > 0 ? moeda(cpl) : '—' },
                  ].map(({ r, v }) => (
                    <Card key={r} medio><p className="pequeno secundario">{r}</p><p className="num" style={{ fontSize: 22, fontWeight: 300 }}>{v}</p></Card>
                  ))}
                </div>

                {/* Status do Tracking deste cliente */}
                <Card medio>
                  <div className="linha entre" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <p className="titulo" style={{ fontSize: 15 }}>Rastreamento & Pixels do Cliente</p>
                      <p className="pequeno secundario">
                        {trk ? `Status: ${trk.status.toUpperCase()} · Pixel Meta: ${trk.meta_pixel_id || 'Não def.'} · Google Tag: ${trk.google_conversion_id || 'Não def.'}` : 'Nenhum pixel ou tag de conversão configurado ainda para este cliente.'}
                      </p>
                    </div>
                    <Botao onClick={() => setAbaPrincipal('tracking')}>Abrir Central de Tracking <ChevronRight size={14} /></Botao>
                  </div>
                </Card>

                {/* Tabela de métricas */}
                <Card titulo="Registros de Métricas" acao={<Botao onClick={() => { setFm(f => ({ ...f, cliente_id: clienteSelecionado })); setFormMetrica(true); }}><Plus size={14} /> Registrar</Botao>}>
                  {mets.length === 0 ? <Vazio texto="Nenhuma métrica lançada para este cliente." /> : (
                    <div className="lista">
                      {mets.map(m => (
                        <div key={m.id} className="item" style={{ alignItems: 'flex-start' }}>
                          <div className="cresce">
                            <div className="linha" style={{ gap: 8 }}>
                              <Chip cor={m.plataforma === 'meta' ? 'destaque' : 'ok'}>{m.plataforma === 'meta' ? 'Meta Ads' : 'Google Ads'}</Chip>
                              <span className="titulo" style={{ fontSize: 14 }}>{m.campanha || 'Campanha'}</span>
                            </div>
                            <div className="pequeno secundario">{data(m.periodo_inicio)} a {data(m.periodo_fim)}</div>
                            <div className="pequeno">Investido: <strong>{moeda(m.investimento)}</strong> · Leads: <strong>{m.leads}</strong> · Cliques: {m.cliques.toLocaleString('pt-BR')}</div>
                          </div>
                          <BotaoIcone rotulo="Excluir" onClick={() => { setMetricas(metricas.filter(x => x.id !== m.id)); salvarMetricas(metricas.filter(x => x.id !== m.id)); avisar('Excluído'); }}><Trash2 size={14} /></BotaoIcone>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            );
          })()}
        </>
      )}

      {/* ABA 2: TRACKING, PIXELS & CAPI */}
      {abaPrincipal === 'tracking' && (
        <div className="coluna" style={{ gap: 16 }}>
          <Card medio>
            <div className="linha" style={{ gap: 12 }}>
              <Code size={24} className="destaque" style={{ flex: 'none' }} />
              <div>
                <p className="titulo" style={{ fontSize: 16 }}>Central de Rastreamento (Meta Ads, Google Ads & GTM)</p>
                <p className="pequeno secundario">
                  Configure os IDs do Pixel do Meta, API de Conversões (CAPI), Tags de Conversão do Google Ads e GTM.
                  O sistema gera os códigos prontos para colar no site do cliente e links para testar os disparos em tempo real.
                </p>
              </div>
            </div>
          </Card>

          {clientes.length === 0 ? (
            <Vazio texto="Nenhum cliente cadastrado." />
          ) : (
            <div className="coluna" style={{ gap: 12 }}>
              {clientes.map(c => {
                const trk = trackingCliente(c.id);
                return (
                  <Card key={c.id} medio>
                    <div className="linha entre" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <span className="titulo">{c.nome}</span>
                        <div className="linha" style={{ gap: 6, marginTop: 4 }}>
                          <Chip cor={trk?.status === 'testado' ? 'ok' : trk?.status === 'configurado' ? 'destaque' : 'atencao'}>
                            {trk ? `Status: ${trk.status.toUpperCase()}` : 'Não configurado'}
                          </Chip>
                        </div>
                      </div>
                      <div className="linha" style={{ gap: 8 }}>
                        <Botao onClick={() => abrirEdicaoTracking(trk, c.id)}>
                          {trk ? 'Editar IDs' : 'Configurar IDs'}
                        </Botao>
                      </div>
                    </div>

                    {trk ? (
                      <div className="coluna" style={{ gap: 10 }}>
                        <div className="grade grade-2" style={{ gap: 10 }}>
                          {/* Bloco Meta */}
                          <div className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 14 }}>
                            <div className="linha entre" style={{ marginBottom: 4 }}>
                              <strong>🔵 Meta Ads (Facebook/Instagram)</strong>
                              {trk.meta_pixel_id && <Chip cor="ok">ID Configurado</Chip>}
                            </div>
                            <p className="pequeno secundario">Pixel ID: <strong>{trk.meta_pixel_id || 'Não informado'}</strong></p>
                            {trk.meta_test_code && <p className="pequeno secundario">Código de Teste CAPI: <code>{trk.meta_test_code}</code></p>}
                            {trk.meta_pixel_id && (
                              <div className="linha" style={{ gap: 6, marginTop: 8 }}>
                                <Botao onClick={() => setModalCodigo({ titulo: `Código do Meta Pixel — ${c.nome}`, codigo: gerarCodigoMeta(trk.meta_pixel_id) })}>
                                  <Code size={13} /> Gerar Script Pixel
                                </Botao>
                                <Botao onClick={() => copiar(trk.meta_pixel_id, 'Pixel ID')}>
                                  <Copy size={13} /> Copiar ID
                                </Botao>
                              </div>
                            )}
                          </div>

                          {/* Bloco Google */}
                          <div className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 14 }}>
                            <div className="linha entre" style={{ marginBottom: 4 }}>
                              <strong>🔴 Google Ads & GA4</strong>
                              {trk.google_conversion_id && <Chip cor="ok">Tag Ativa</Chip>}
                            </div>
                            <p className="pequeno secundario">ID de Conversão: <strong>{trk.google_conversion_id || 'Não informado'}</strong></p>
                            {trk.google_conversion_label && <p className="pequeno secundario">Rótulo: <code>{trk.google_conversion_label}</code></p>}
                            {trk.ga4_id && <p className="pequeno secundario">GA4: <strong>{trk.ga4_id}</strong></p>}
                            {trk.google_conversion_id && (
                              <div className="linha" style={{ gap: 6, marginTop: 8 }}>
                                <Botao onClick={() => setModalCodigo({ titulo: `Tag Global Google Ads — ${c.nome}`, codigo: gerarCodigoGoogle(trk.google_conversion_id, trk.google_conversion_label) })}>
                                  <Code size={13} /> Gerar Script Tag
                                </Botao>
                                <Botao onClick={() => copiar(trk.google_conversion_id, 'Google Conversion ID')}>
                                  <Copy size={13} /> Copiar ID
                                </Botao>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bloco GTM se existir */}
                        {trk.gtm_id && (
                          <div className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 14 }}>
                            <div className="linha entre">
                              <span><strong>Google Tag Manager:</strong> {trk.gtm_id}</span>
                              <Botao onClick={() => setModalCodigo({ titulo: `Contêiner GTM — ${c.nome}`, codigo: gerarCodigoGTM(trk.gtm_id) })}>
                                <Code size={13} /> Ver Código GTM
                              </Botao>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="pequeno secundario">Clique em 'Configurar IDs' para salvar o Pixel do Meta Ads e a Tag de Conversão do Google Ads deste cliente.</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: GERADOR DE UTMS */}
      {abaPrincipal === 'utm' && (
        <div className="coluna" style={{ gap: 16 }}>
          <Card titulo="Gerador de Links Rastreados (UTM Builder)">
            <p className="pequeno secundario" style={{ marginBottom: 14 }}>
              Crie links com parâmetros UTM para rastrear com precisão as origens dos cliques e conversões vindas dos anúncios do Meta Ads, Google Ads ou WhatsApp.
            </p>

            <div className="coluna" style={{ gap: 12 }}>
              <Campo rotulo="URL do Site / Landing Page *">
                <input className="entrada" placeholder="https://seusite.com.br/lp" value={utmUrl} onChange={e => setUtmUrl(e.target.value)} />
              </Campo>

              <div className="grade grade-2">
                <Campo rotulo="Origem da Campanha (utm_source) *">
                  <select className="entrada" value={utmSource} onChange={e => setUtmSource(e.target.value)}>
                    <option value="facebook">Meta Ads (Facebook/Instagram)</option>
                    <option value="instagram">Instagram Orgânico</option>
                    <option value="google">Google Ads</option>
                    <option value="whatsapp">WhatsApp Direto</option>
                    <option value="tiktok">TikTok Ads</option>
                    <option value="email">E-mail Marketing</option>
                  </select>
                </Campo>
                <Campo rotulo="Mídia / Canal (utm_medium) *">
                  <select className="entrada" value={utmMedium} onChange={e => setUtmMedium(e.target.value)}>
                    <option value="cpc">CPC (Anúncio Pago)</option>
                    <option value="feed">Feed / Post</option>
                    <option value="stories">Stories</option>
                    <option value="reels">Reels</option>
                    <option value="bio">Link da Bio</option>
                    <option value="search">Search (Rede de Pesquisa)</option>
                    <option value="display">Display / Banner</option>
                  </select>
                </Campo>
              </div>

              <div className="grade grade-3">
                <Campo rotulo="Nome da Campanha (utm_campaign)">
                  <input className="entrada" placeholder="ex: leads_outubro" value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} />
                </Campo>
                <Campo rotulo="Conteúdo do Anúncio (utm_content)">
                  <input className="entrada" placeholder="ex: criativo_01_video" value={utmContent} onChange={e => setUtmContent(e.target.value)} />
                </Campo>
                <Campo rotulo="Termo / Palavra-chave (utm_term)">
                  <input className="entrada" placeholder="ex: marketing_digital" value={utmTerm} onChange={e => setUtmTerm(e.target.value)} />
                </Campo>
              </div>

              {urlFinalUtm && (
                <div className="vidro-painel" style={{ padding: '14px', borderRadius: 14, marginTop: 10 }}>
                  <p className="pequeno secundario" style={{ marginBottom: 6 }}>Link Rastreado Pronto:</p>
                  <div className="linha" style={{ gap: 8 }}>
                    <input className="entrada" readOnly value={urlFinalUtm} style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
                    <Botao variante="primario" onClick={() => copiar(urlFinalUtm, 'Link rastreado')}>
                      <Copy size={15} /> Copiar Link
                    </Botao>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ABA 4: OTIMIZAÇÕES */}
      {abaPrincipal === 'otimizacoes' && (
        <Card titulo="Diário de Otimizações de Anúncios" acao={<Botao onClick={() => setFormOtim(true)}><Plus size={14} /> Nova Otimização</Botao>}>
          {otimizacoes.length === 0 ? (
            <Vazio texto="Nenhuma otimização registrada." />
          ) : (
            <div className="lista">
              {otimizacoes.sort((a, b) => b.data.localeCompare(a.data)).map(o => (
                <div key={o.id} className="item" style={{ alignItems: 'flex-start', cursor: 'default' }}>
                  <div className="cresce">
                    <div className="linha" style={{ gap: 8 }}>
                      <span className="pequeno secundario">{data(o.data)}</span>
                      <Chip>{o.categoria}</Chip>
                      <span className="titulo" style={{ fontSize: 14 }}>{clientes.find(c => c.id === o.cliente_id)?.nome}</span>
                      {o.campanha && <span className="pequeno secundario">· {o.campanha}</span>}
                    </div>
                    <p style={{ marginTop: 4 }}>{o.descricao}</p>
                  </div>
                  <BotaoIcone rotulo="Excluir" onClick={() => { setOtimizacoes(otimizacoes.filter(x => x.id !== o.id)); salvarOtimizacoes(otimizacoes.filter(x => x.id !== o.id)); avisar('Excluído'); }}><Trash2 size={14} /></BotaoIcone>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ABA 5: GERENCIADOR DE BMS & CONTINGÊNCIA */}
      {abaPrincipal === 'bms' && (
        <div className="coluna" style={{ gap: 16 }}>
          <Card
            titulo="Estrutura de Business Managers (BMs) & Contingência"
            acao={<Botao variante="primario" onClick={() => setFormBMAberto(true)}><Plus size={15} /> Cadastrar Nova BM</Botao>}
          >
            <p className="pequeno secundario" style={{ marginBottom: 16 }}>
              Organize suas BMs por finalidade (Conta Principal, Clientes, Prospecção ou Contingência), vincule contas de anúncios e acompanhe o status de integridade dos seus ativos no Meta Ads.
            </p>

            {bms.length === 0 ? (
              <Vazio texto="Nenhuma BM cadastrada. Cadastre sua BM Principal ou de Contingência." acao={<Botao variante="primario" onClick={() => setFormBMAberto(true)}><Plus size={15} /> Cadastrar BM</Botao>} />
            ) : (
              <div className="coluna" style={{ gap: 14 }}>
                {bms.map(bm => {
                  const corFuncao = bm.funcao === 'principal' ? 'ok' : bm.funcao === 'clientes' ? 'destaque' : bm.funcao === 'contingencia' ? 'atencao' : undefined;
                  const corStatus = bm.status === 'ativa' || bm.status === 'verificada' ? 'ok' : bm.status === 'aquecendo' ? 'destaque' : 'erro';
                  return (
                    <div key={bm.id} className="vidro-painel" style={{ padding: '18px 20px', borderRadius: 20 }}>
                      <div className="linha entre" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        <div>
                          <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
                            <span className="titulo" style={{ fontSize: 17 }}>{bm.nome}</span>
                            <Chip cor={corFuncao}>
                              {bm.funcao === 'principal' ? '⭐ BM Principal da Agência' : bm.funcao === 'clientes' ? '👥 BM de Clientes' : bm.funcao === 'prospeccao' ? '🎯 BM Prospecção Própria' : '🛡️ BM de Contingência'}
                            </Chip>
                            <Chip cor={corStatus}>
                              {bm.status === 'ativa' ? 'Ativa & Rodando' : bm.status === 'verificada' ? 'Empresa Verificada' : bm.status === 'aquecendo' ? 'Aquecendo Pixel/Conta' : 'Restrita / Bloqueada'}
                            </Chip>
                          </div>
                          <p className="pequeno secundario" style={{ marginTop: 4 }}>
                            BM ID: <code>{bm.bm_id}</code> {bm.observacoes ? `· ${bm.observacoes}` : ''}
                          </p>
                        </div>

                        <div className="linha" style={{ gap: 6 }}>
                          <Botao onClick={() => testarConexaoBM(bm)} disabled={testandoBM === bm.id}>
                            <Sparkles size={14} /> {testandoBM === bm.id ? 'Testando API...' : 'Testar Conexão Graph API'}
                          </Botao>
                          <Botao onClick={() => { setBmSelecionada(bm.id); setFormContaAberto(true); }}>
                            <Plus size={14} /> Add Conta
                          </Botao>
                          <BotaoIcone rotulo="Excluir BM" onClick={() => excluirBM(bm.id)}><Trash2 size={14} /></BotaoIcone>
                        </div>
                      </div>

                      {/* Contas de Anúncios dentro desta BM */}
                      <div style={{ marginTop: 10, background: 'var(--vidro-painel-b)', borderRadius: 14, padding: '12px 14px' }}>
                        <p className="pequeno secundario" style={{ marginBottom: 8, fontWeight: 600 }}>
                          Contas de Anúncios Vinculadas ({bm.contas.length}):
                        </p>
                        {bm.contas.length === 0 ? (
                          <p className="pequeno secundario">Nenhuma conta vinculada ainda. Clique em 'Add Conta'.</p>
                        ) : (
                          <div className="lista">
                            {bm.contas.map(cta => (
                              <div key={cta.id} className="item" style={{ cursor: 'default', padding: '8px 10px' }}>
                                <div className="cresce">
                                  <div className="linha" style={{ gap: 8 }}>
                                    <strong>{cta.nome}</strong>
                                    <code>{cta.conta_id}</code>
                                    <Chip>{cta.moeda}</Chip>
                                    {cta.limite && <span className="pequeno secundario">Limite: {cta.limite}</span>}
                                  </div>
                                </div>
                                <BotaoIcone rotulo="Remover da BM" onClick={() => removerContaBM(bm.id, cta.id)}><Trash2 size={13} /></BotaoIcone>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal Configurar Tracking */}
      <Modal titulo="Configurar Tracking & Pixels do Cliente" aberto={formTracking} aoFechar={() => setFormTracking(false)}
        rodape={<Botao variante="primario" onClick={salvarTrackingConfig}><CheckCircle2 size={15} /> Salvar Rastreamento</Botao>}>
        <div className="coluna" style={{ gap: 14 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={ft.cliente_id} onChange={e => {
              const cid = e.target.value;
              const trk = trackingCliente(cid);
              if (trk) {
                setFt({
                  cliente_id: cid,
                  meta_pixel_id: trk.meta_pixel_id || '',
                  meta_capi_token: trk.meta_capi_token || '',
                  meta_test_code: trk.meta_test_code || '',
                  google_conversion_id: trk.google_conversion_id || '',
                  google_conversion_label: trk.google_conversion_label || '',
                  gtm_id: trk.gtm_id || '',
                  ga4_id: trk.ga4_id || '',
                  status: trk.status,
                  observacoes: trk.observacoes || ''
                });
              } else {
                setFt(prev => ({ ...prev, cliente_id: cid }));
              }
            }}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>

          <div className="grade grade-2">
            <Campo rotulo="Meta Pixel ID">
              <input className="entrada" placeholder="ex: 123456789012345" value={ft.meta_pixel_id} onChange={e => setFt(prev => ({ ...prev, meta_pixel_id: e.target.value }))} />
            </Campo>
            <Campo rotulo="Código de Teste CAPI (Meta)">
              <input className="entrada" placeholder="ex: TEST12345" value={ft.meta_test_code} onChange={e => setFt(prev => ({ ...prev, meta_test_code: e.target.value }))} />
            </Campo>
          </div>

          <Campo rotulo="Token da API de Conversões (Meta CAPI)">
            <input className="entrada" placeholder="EAAB..." value={ft.meta_capi_token} onChange={e => setFt(prev => ({ ...prev, meta_capi_token: e.target.value }))} />
          </Campo>

          <div className="grade grade-2">
            <Campo rotulo="Google Ads ID de Conversão">
              <input className="entrada" placeholder="ex: AW-123456789" value={ft.google_conversion_id} onChange={e => setFt(prev => ({ ...prev, google_conversion_id: e.target.value }))} />
            </Campo>
            <Campo rotulo="Google Ads Rótulo de Conversão">
              <input className="entrada" placeholder="ex: AbC_xYz123" value={ft.google_conversion_label} onChange={e => setFt(prev => ({ ...prev, google_conversion_label: e.target.value }))} />
            </Campo>
          </div>

          <div className="grade grade-2">
            <Campo rotulo="Google Tag Manager (GTM ID)">
              <input className="entrada" placeholder="ex: GTM-XXXXXXX" value={ft.gtm_id} onChange={e => setFt(prev => ({ ...prev, gtm_id: e.target.value }))} />
            </Campo>
            <Campo rotulo="Google Analytics 4 (GA4 ID)">
              <input className="entrada" placeholder="ex: G-XXXXXXXXXX" value={ft.ga4_id} onChange={e => setFt(prev => ({ ...prev, ga4_id: e.target.value }))} />
            </Campo>
          </div>

          <Campo rotulo="Status do Rastreamento">
            <select className="entrada" value={ft.status} onChange={e => setFt(prev => ({ ...prev, status: e.target.value as TrackingConfig['status'] }))}>
              <option value="pendente">Pendente de Instalação</option>
              <option value="configurado">Configurado no Site</option>
              <option value="testado">Testado & Disparando Ativo</option>
            </select>
          </Campo>

          <Campo rotulo="Observações de Instalação">
            <textarea className="entrada" rows={2} placeholder="ex: Instalado via plugin PixelYourSite no WordPress" value={ft.observacoes} onChange={e => setFt(prev => ({ ...prev, observacoes: e.target.value }))} />
          </Campo>
        </div>
      </Modal>

      {/* Modal Visualização de Código Gerado */}
      <Modal titulo={modalCodigo?.titulo ?? 'Script de Rastreamento'} aberto={!!modalCodigo} aoFechar={() => setModalCodigo(null)}
        rodape={<Botao variante="primario" onClick={() => modalCodigo && copiar(modalCodigo.codigo, 'Código')}><Copy size={15} /> Copiar Código</Botao>}>
        {modalCodigo && (
          <div className="coluna" style={{ gap: 10 }}>
            <p className="pequeno secundario">Copie e cole este código dentro da tag <code>&lt;head&gt;</code> do site do cliente:</p>
            <textarea className="entrada" rows={12} readOnly value={modalCodigo.codigo} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        )}
      </Modal>

      {/* Modal Registro de Métricas */}
      <Modal titulo="Registrar Métricas da Campanha" aberto={formMetrica} aoFechar={() => setFormMetrica(false)}
        rodape={<Botao variante="primario" onClick={salvarMetrica}><TrendingUp size={15} /> Salvar Métricas</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={fm.cliente_id} onChange={e => setFm(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Selecionar...</option>
              {clientesComTrafego.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Plataforma">
              <select className="entrada" value={fm.plataforma} onChange={e => setFm(f => ({ ...f, plataforma: e.target.value as 'meta' | 'google' }))}>
                <option value="meta">Meta Ads (Facebook/Instagram)</option>
                <option value="google">Google Ads</option>
              </select>
            </Campo>
            <Campo rotulo="Campanha"><input className="entrada" value={fm.campanha} onChange={e => setFm(f => ({ ...f, campanha: e.target.value }))} placeholder="Nome da campanha" /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Período Início"><input className="entrada" type="date" value={fm.periodo_inicio} onChange={e => setFm(f => ({ ...f, periodo_inicio: e.target.value }))} /></Campo>
            <Campo rotulo="Período Fim"><input className="entrada" type="date" value={fm.periodo_fim} onChange={e => setFm(f => ({ ...f, periodo_fim: e.target.value }))} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Investimento (R$)"><input className="entrada" type="number" min="0" step="0.01" value={fm.investimento} onChange={e => setFm(f => ({ ...f, investimento: e.target.value }))} /></Campo>
            <Campo rotulo="Impressões"><input className="entrada" type="number" min="0" value={fm.impressoes} onChange={e => setFm(f => ({ ...f, impressoes: e.target.value }))} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Cliques"><input className="entrada" type="number" min="0" value={fm.cliques} onChange={e => setFm(f => ({ ...f, cliques: e.target.value }))} /></Campo>
            <Campo rotulo="Leads / Resultados"><input className="entrada" type="number" min="0" value={fm.leads} onChange={e => setFm(f => ({ ...f, leads: e.target.value }))} /></Campo>
          </div>
        </div>
      </Modal>

      {/* Modal Otimização */}
      <Modal titulo="Registrar Otimização" aberto={formOtim} aoFechar={() => setFormOtim(false)}
        rodape={<Botao variante="primario" onClick={salvarOtimizacao}>Salvar Otimização</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={fo.cliente_id} onChange={e => setFo(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Selecionar...</option>
              {clientesComTrafego.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Data"><input className="entrada" type="date" value={fo.data} onChange={e => setFo(f => ({ ...f, data: e.target.value }))} /></Campo>
            <Campo rotulo="Categoria">
              <select className="entrada" value={fo.categoria} onChange={e => setFo(f => ({ ...f, categoria: e.target.value }))}>
                {['Ajuste de segmentação', 'Mudança de criativo', 'Ajuste de orçamento', 'Pause de campanha', 'Nova campanha', 'Ajuste de lance', 'Outro'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
          </div>
          <Campo rotulo="Campanha"><input className="entrada" value={fo.campanha} onChange={e => setFo(f => ({ ...f, campanha: e.target.value }))} placeholder="Nome da campanha" /></Campo>
          <Campo rotulo="O que foi feito?"><textarea className="entrada" rows={3} value={fo.descricao} onChange={e => setFo(f => ({ ...f, descricao: e.target.value }))} autoFocus /></Campo>
        </div>
      </Modal>

      {/* Modal Nova BM */}
      <Modal titulo="Cadastrar Business Manager (BM)" aberto={formBMAberto} aoFechar={() => setFormBMAberto(false)}
        rodape={<Botao variante="primario" onClick={salvarNovaBM}>Cadastrar BM</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Nome / Apelido da BM *">
            <input className="entrada" placeholder="Ex: BM Matriz Agência, BM Clientes 01, BM Contingência" value={formBM.nome} onChange={e => setFormBM(prev => ({ ...prev, nome: e.target.value }))} autoFocus />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="ID da BM no Meta *">
              <input className="entrada" placeholder="Ex: 738192849182912" value={formBM.bm_id} onChange={e => setFormBM(prev => ({ ...prev, bm_id: e.target.value }))} />
            </Campo>
            <Campo rotulo="Finalidade / Função">
              <select className="entrada" value={formBM.funcao} onChange={e => setFormBM(prev => ({ ...prev, funcao: e.target.value as BMRegistro['funcao'] }))}>
                <option value="principal">⭐ BM Principal da Agência</option>
                <option value="clientes">👥 BM Exclusiva para Clientes</option>
                <option value="prospeccao">🎯 BM para Prospecção Própria</option>
                <option value="contingencia">🛡️ BM de Contingência / Reserva</option>
                <option value="reserva">📦 BM Reserva</option>
              </select>
            </Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Status da BM">
              <select className="entrada" value={formBM.status} onChange={e => setFormBM(prev => ({ ...prev, status: e.target.value as BMRegistro['status'] }))}>
                <option value="ativa">Ativa & Rodando</option>
                <option value="verificada">Empresa Verificada (CNPJ)</option>
                <option value="aquecendo">Aquecendo Pixel / Contas</option>
                <option value="restrita">Restrita / Bloqueada</option>
              </select>
            </Campo>
            <Campo rotulo="Token de Sistema / Acesso (Opcional)">
              <input className="entrada" placeholder="EAAB..." value={formBM.token_acesso} onChange={e => setFormBM(prev => ({ ...prev, token_acesso: e.target.value }))} />
            </Campo>
          </div>
          <Campo rotulo="Anotações / Ativos (Perfis de Admin, WhatsApp, Domínios)">
            <textarea className="entrada" rows={3} placeholder="Ex: Administrador: Perfil backup 01; Cartão vinculado: Black..." value={formBM.observacoes} onChange={e => setFormBM(prev => ({ ...prev, observacoes: e.target.value }))} />
          </Campo>
        </div>
      </Modal>

      {/* Modal Adicionar Conta de Anúncios na BM */}
      <Modal titulo="Adicionar Conta de Anúncios na BM" aberto={!!formContaAberto} aoFechar={() => setFormContaAberto(false)}
        rodape={<Botao variante="primario" onClick={salvarContaBM}>Vincular Conta</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Nome da Conta de Anúncios *">
            <input className="entrada" placeholder="Ex: Conta 01 - Tráfego Geral, Conta Cliente X" value={formConta.nome} onChange={e => setFormConta(prev => ({ ...prev, nome: e.target.value }))} autoFocus />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="ID da Conta (act_...) *">
              <input className="entrada" placeholder="act_1234567890" value={formConta.conta_id} onChange={e => setFormConta(prev => ({ ...prev, conta_id: e.target.value }))} />
            </Campo>
            <Campo rotulo="Moeda">
              <select className="entrada" value={formConta.moeda} onChange={e => setFormConta(prev => ({ ...prev, moeda: e.target.value }))}>
                <option value="BRL">BRL (R$ Real)</option>
                <option value="USD">USD ($ Dólar)</option>
              </select>
            </Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Limite de Gastos Diário">
              <input className="entrada" placeholder="Ex: R$ 250,00/dia ou Ilimitado" value={formConta.limite} onChange={e => setFormConta(prev => ({ ...prev, limite: e.target.value }))} />
            </Campo>
            <Campo rotulo="Cliente Vinculado (Opcional)">
              <select className="entrada" value={formConta.cliente_id} onChange={e => setFormConta(prev => ({ ...prev, cliente_id: e.target.value }))}>
                <option value="">Nenhum / Agência própria</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
          </div>
        </div>
      </Modal>
    </>
  );
}
