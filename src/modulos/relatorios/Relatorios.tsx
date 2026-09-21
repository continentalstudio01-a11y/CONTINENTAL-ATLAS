import { useState, useMemo } from 'react';
import { FileBarChart, Plus, Send, Printer, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Botao, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, AssistenteTexto, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje, moeda, numero, somarDias } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente, ClienteTrafego } from '../../lib/tipos';

interface Relatorio {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  leads: number;
  conversoes: number;
  faturamento_informado: number;
  analise: string;
  proximos_passos: string;
  status: 'rascunho' | 'gerado' | 'enviado';
  enviado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

function carregar(): Relatorio[] {
  try { return JSON.parse(localStorage.getItem('atlas_relatorios') || '[]'); } catch { return []; }
}
function salvarStorage(l: Relatorio[]) { localStorage.setItem('atlas_relatorios', JSON.stringify(l)); }

const COR_STATUS: Record<Relatorio['status'], 'ok' | 'atencao' | 'destaque' | undefined> = {
  rascunho: undefined, gerado: 'destaque', enviado: 'ok',
};
const LABEL_STATUS: Record<Relatorio['status'], string> = {
  rascunho: 'Rascunho', gerado: 'Gerado', enviado: 'Enviado',
};

function calcular(r: Relatorio) {
  const cpc = r.cliques > 0 ? r.investimento / r.cliques : 0;
  const cpl = r.leads > 0 ? r.investimento / r.leads : 0;
  const ctr = r.impressoes > 0 ? (r.cliques / r.impressoes) * 100 : 0;
  const roas = r.investimento > 0 && r.faturamento_informado > 0 ? r.faturamento_informado / r.investimento : 0;
  return { cpc, cpl, ctr, roas };
}

export function Relatorios() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>(carregar);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const trafegos = useLista<ClienteTrafego>('cliente_trafego') ?? [];
  const avisar = useAvisar();

  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [detalhes, setDetalhes] = useState<Relatorio | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [form, setForm] = useState({
    cliente_id: '', periodo_inicio: somarDias(hoje(), -30), periodo_fim: hoje(),
    investimento: '', impressoes: '', cliques: '', leads: '', conversoes: '',
    faturamento_informado: '', analise: '', proximos_passos: '',
  });

  const clientesComTrafego = useMemo(() => clientes.filter(c => trafegos.some(t => t.cliente_id === c.id)), [clientes, trafegos]);

  const salvar = (lista: Relatorio[]) => { setRelatorios(lista); salvarStorage(lista); };
  const set = (f: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const lista = useMemo(() => {
    let l = relatorios;
    if (filtroCliente) l = l.filter(r => r.cliente_id === filtroCliente);
    if (filtroStatus !== 'todos') l = l.filter(r => r.status === filtroStatus);
    return l.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [relatorios, filtroCliente, filtroStatus]);

  const criar = (statusInicial: Relatorio['status'] = 'rascunho') => {
    if (!form.cliente_id) { avisar('Selecione um cliente.'); return; }
    const cli = clientes.find(c => c.id === form.cliente_id);
    const agora = new Date().toISOString();
    const novo: Relatorio = {
      id: novoId(), cliente_id: form.cliente_id, cliente_nome: cli?.nome ?? '',
      periodo_inicio: form.periodo_inicio, periodo_fim: form.periodo_fim,
      investimento: numero(form.investimento), impressoes: numero(form.impressoes),
      cliques: numero(form.cliques), leads: numero(form.leads),
      conversoes: numero(form.conversoes), faturamento_informado: numero(form.faturamento_informado),
      analise: form.analise, proximos_passos: form.proximos_passos,
      status: statusInicial, enviado_em: null, criado_em: agora, atualizado_em: agora,
    };
    salvar([novo, ...relatorios]);
    setFormAberto(false);
    avisar('Relatório salvo');
  };

  const mudarStatus = (r: Relatorio, status: Relatorio['status']) => {
    const agora = new Date().toISOString();
    const upd = { ...r, status, enviado_em: status === 'enviado' ? agora : r.enviado_em, atualizado_em: agora };
    salvar(relatorios.map(x => x.id === r.id ? upd : x));
    setDetalhes(d => d?.id === r.id ? upd : d);
    avisar(`Relatório marcado como ${LABEL_STATUS[status].toLowerCase()}`);
  };

  const enviarWhats = (r: Relatorio) => {
    const cli = clientes.find(c => c.id === r.cliente_id);
    const tel = (cli?.whatsapp || cli?.telefone || '').replace(/\D/g, '');
    const calc = calcular(r);
    const msg = encodeURIComponent(
      `Olá ${r.cliente_nome}! Segue o relatório de ${data(r.periodo_inicio)} a ${data(r.periodo_fim)}:\n\n` +
      `📊 *Resumo do Período*\n` +
      `💰 Investimento: ${moeda(r.investimento)}\n` +
      `👆 Cliques: ${r.cliques.toLocaleString('pt-BR')}\n` +
      `🎯 Leads: ${r.leads}\n` +
      (r.faturamento_informado > 0 ? `📈 ROAS: ${calc.roas.toFixed(2)}x\n` : '') +
      `\n📝 *Análise:*\n${r.analise}\n\n*Próximos Passos:*\n${r.proximos_passos}`
    );
    window.open(`https://wa.me/${tel ? '55' + tel : ''}?text=${msg}`, '_blank');
  };

  const imprimir = (r: Relatorio) => {
    const calc = calcular(r);
    const janela = window.open('', '_blank')!;
    janela.document.write(`<html><head><title>Relatório ${r.cliente_nome}</title>
    <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6}
    h1{font-size:1.4rem}h2{font-size:1.1rem;margin-top:2rem;border-bottom:1px solid #ddd;padding-bottom:6px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:16px 0}
    .kpi{background:#f5f5f5;padding:16px;border-radius:8px;text-align:center}
    .kpi p{margin:0;color:#666;font-size:12px}.kpi strong{font-size:24px;font-weight:300}
    pre{white-space:pre-wrap;font-family:inherit;background:#f9f9f9;padding:16px;border-radius:8px}</style></head><body>
    <h1>Relatório de Campanhas — ${r.cliente_nome}</h1>
    <p>Período: ${data(r.periodo_inicio)} a ${data(r.periodo_fim)}</p>
    <h2>Resultados do Período</h2>
    <div class="grid">
      <div class="kpi"><p>Investimento</p><strong>${moeda(r.investimento)}</strong></div>
      <div class="kpi"><p>Leads</p><strong>${r.leads}</strong></div>
      <div class="kpi"><p>Cliques</p><strong>${r.cliques.toLocaleString('pt-BR')}</strong></div>
      <div class="kpi"><p>CPC Médio</p><strong>${moeda(calc.cpc)}</strong></div>
      <div class="kpi"><p>Custo por Lead</p><strong>${calc.cpl > 0 ? moeda(calc.cpl) : '—'}</strong></div>
      ${r.faturamento_informado > 0 ? `<div class="kpi"><p>ROAS</p><strong>${calc.roas.toFixed(2)}x</strong></div>` : ''}
    </div>
    ${r.analise ? `<h2>Análise</h2><pre>${r.analise}</pre>` : ''}
    ${r.proximos_passos ? `<h2>Próximos Passos</h2><pre>${r.proximos_passos}</pre>` : ''}
    </body></html>`);
    janela.document.close();
    janela.print();
  };

  return (
    <>
      <CabecalhoTela
        titulo="Relatórios"
        icone={<FileBarChart size={28} strokeWidth={1.6} />}
        subtitulo="Relatórios mensais de campanhas para os clientes"
        acoes={<Botao variante="primario" onClick={() => { setForm({ cliente_id: '', periodo_inicio: somarDias(hoje(), -30), periodo_fim: hoje(), investimento: '', impressoes: '', cliques: '', leads: '', conversoes: '', faturamento_informado: '', analise: '', proximos_passos: '' }); setFormAberto(true); }}>
          <Plus size={17} /> Novo Relatório
        </Botao>}
      />

      <div className="linha" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="entrada" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ flex: 1, maxWidth: 260 }}>
          <option value="">Todos os clientes</option>
          {clientesComTrafego.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="entrada" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: 'auto' }}>
          <option value="todos">Todos os status</option>
          {Object.entries(LABEL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vazio texto="Nenhum relatório encontrado." acao={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={15} /> Novo Relatório</Botao>} />
      ) : (
        <Card>
          <div className="lista">
            {lista.map(r => {
              const calc = calcular(r);
              return (
                <div key={r.id} className="item" onClick={() => setDetalhes(r)} style={{ cursor: 'pointer' }}>
                  <div className="cresce">
                    <div className="linha" style={{ gap: 8 }}>
                      <span className="titulo">{r.cliente_nome}</span>
                      <Chip cor={COR_STATUS[r.status]}>{LABEL_STATUS[r.status]}</Chip>
                    </div>
                    <div className="pequeno secundario">{data(r.periodo_inicio)} a {data(r.periodo_fim)}</div>
                    <div className="pequeno">{moeda(r.investimento)} investidos · {r.leads} leads · CPC {moeda(calc.cpc)}</div>
                  </div>
                  <ChevronRight size={18} className="secundario" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modal Formulário */}
      <Modal titulo="Novo Relatório" aberto={formAberto} aoFechar={() => setFormAberto(false)}
        rodape={
          <div className="linha" style={{ gap: 8 }}>
            <Botao onClick={() => criar('rascunho')}>Salvar Rascunho</Botao>
            <Botao variante="primario" onClick={() => criar('gerado')}><CheckCircle2 size={15} /> Salvar como Gerado</Botao>
          </div>
        }>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Selecionar cliente...</option>
              {clientesComTrafego.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Período Início"><input className="entrada" type="date" value={form.periodo_inicio} onChange={e => set('periodo_inicio', e.target.value)} /></Campo>
            <Campo rotulo="Período Fim"><input className="entrada" type="date" value={form.periodo_fim} onChange={e => set('periodo_fim', e.target.value)} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Investimento (R$)"><input className="entrada" type="number" min="0" step="0.01" value={form.investimento} onChange={e => set('investimento', e.target.value)} /></Campo>
            <Campo rotulo="Faturamento Informado (R$)"><input className="entrada" type="number" min="0" step="0.01" value={form.faturamento_informado} onChange={e => set('faturamento_informado', e.target.value)} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Impressões"><input className="entrada" type="number" min="0" value={form.impressoes} onChange={e => set('impressoes', e.target.value)} /></Campo>
            <Campo rotulo="Cliques"><input className="entrada" type="number" min="0" value={form.cliques} onChange={e => set('cliques', e.target.value)} /></Campo>
          </div>
          <div className="grade grade-2">
            <Campo rotulo="Leads"><input className="entrada" type="number" min="0" value={form.leads} onChange={e => set('leads', e.target.value)} /></Campo>
            <Campo rotulo="Conversões"><input className="entrada" type="number" min="0" value={form.conversoes} onChange={e => set('conversoes', e.target.value)} /></Campo>
          </div>
          <Campo rotulo="Análise (o que funcionou, o que mudamos...)" acao={<AssistenteTexto valor={form.analise} aoCorrigir={v => set('analise', v)} />}>
            <textarea className="entrada" rows={4} value={form.analise} onChange={e => set('analise', e.target.value)} placeholder="Principais aprendizados, campanhas campeãs..." />
          </Campo>
          <Campo rotulo="Próximos Passos" acao={<AssistenteTexto valor={form.proximos_passos} aoCorrigir={v => set('proximos_passos', v)} />}>
            <textarea className="entrada" rows={3} value={form.proximos_passos} onChange={e => set('proximos_passos', e.target.value)} placeholder="Ajustes de criativos, novas estratégias de público..." />
          </Campo>
        </div>
      </Modal>

      {/* Modal Detalhes */}
      <Modal titulo={`Relatório — ${detalhes?.cliente_nome}`} aberto={!!detalhes} aoFechar={() => setDetalhes(null)}>
        {detalhes && (() => {
          const calc = calcular(detalhes);
          return (
            <div className="coluna" style={{ gap: 16 }}>
              <div className="linha" style={{ gap: 8 }}>
                <Chip cor={COR_STATUS[detalhes.status]}>{LABEL_STATUS[detalhes.status]}</Chip>
                <span className="secundario pequeno">{data(detalhes.periodo_inicio)} a {data(detalhes.periodo_fim)}</span>
              </div>
              <div className="grade grade-2" style={{ gap: 10 }}>
                {[
                  ['Investimento', moeda(detalhes.investimento)],
                  ['Leads', String(detalhes.leads)],
                  ['Cliques', detalhes.cliques.toLocaleString('pt-BR')],
                  ['CPC Médio', moeda(calc.cpc)],
                  ['Custo por Lead', calc.cpl > 0 ? moeda(calc.cpl) : '—'],
                  ['ROAS', detalhes.faturamento_informado > 0 ? `${calc.roas.toFixed(2)}x` : '—'],
                ].map(([r, v]) => (
                  <div key={r} className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 14 }}>
                    <p className="pequeno secundario">{r}</p>
                    <p className="num" style={{ fontSize: 18, fontWeight: 300 }}>{v}</p>
                  </div>
                ))}
              </div>
              {detalhes.analise && <div><p className="pequeno secundario" style={{ marginBottom: 4 }}>Análise:</p><p style={{ whiteSpace: 'pre-wrap' }}>{detalhes.analise}</p></div>}
              {detalhes.proximos_passos && <div><p className="pequeno secundario" style={{ marginBottom: 4 }}>Próximos Passos:</p><p style={{ whiteSpace: 'pre-wrap' }}>{detalhes.proximos_passos}</p></div>}
              {detalhes.enviado_em && <p className="pequeno secundario">Enviado em {data(detalhes.enviado_em)}</p>}
              <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Botao onClick={() => imprimir(detalhes)}><Printer size={14} /> Imprimir</Botao>
                {(detalhes.status === 'gerado' || detalhes.status === 'enviado') && (
                  <Botao onClick={() => enviarWhats(detalhes)}><Send size={14} /> WhatsApp</Botao>
                )}
                {detalhes.status === 'rascunho' && <Botao onClick={() => mudarStatus(detalhes, 'gerado')}><CheckCircle2 size={14} /> Marcar Gerado</Botao>}
                {detalhes.status === 'gerado' && <Botao variante="primario" onClick={() => mudarStatus(detalhes, 'enviado')}><Send size={14} /> Marcar Enviado</Botao>}
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
