import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, ChevronRight, Trash2, Copy, CheckCircle2, Clock, XCircle, Send } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje, moeda, numero } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente, Servico } from '../../lib/tipos';

interface PropostaItem {
  id: string;
  descricao: string;
  tipo_cobranca: 'mensal' | 'pacote';
  valor: number;
}

interface Proposta {
  id: string;
  numero: string;
  cliente_id: string | null;
  lead_id: string | null;
  titulo_cliente: string; // nome do cliente/lead para exibição
  modo: 'pacote' | 'livre';
  titulo: string;
  itens: PropostaItem[];
  desconto: number;
  desconto_tipo: 'valor' | 'percentual';
  total_mensal: number;
  total_unico: number;
  validade: string;
  condicoes: string;
  observacoes: string;
  status: 'rascunho' | 'enviada' | 'aceita' | 'recusada' | 'expirada';
  criado_em: string;
  atualizado_em: string;
}

const STORAGE_KEY = 'atlas_propostas';

function carregarPropostas(): Proposta[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function salvarPropostasStorage(lista: Proposta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function gerarNumero(lista: Proposta[]): string {
  const ano = new Date().getFullYear();
  const seq = lista.filter(p => p.numero.startsWith(String(ano))).length + 1;
  return `${ano}-${String(seq).padStart(3, '0')}`;
}

const COR_STATUS: Record<Proposta['status'], 'ok' | 'atencao' | 'erro' | 'destaque' | undefined> = {
  rascunho: undefined,
  enviada: 'destaque',
  aceita: 'ok',
  recusada: 'erro',
  expirada: 'atencao',
};

const LABEL_STATUS: Record<Proposta['status'], string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  aceita: 'Aceita',
  recusada: 'Recusada',
  expirada: 'Expirada',
};

function calcularTotais(itens: PropostaItem[], desconto: number, desconto_tipo: 'valor' | 'percentual') {
  const bruto_mensal = itens.filter(i => i.tipo_cobranca === 'mensal').reduce((s, i) => s + i.valor, 0);
  const bruto_unico = itens.filter(i => i.tipo_cobranca === 'pacote').reduce((s, i) => s + i.valor, 0);
  const bruto_total = bruto_mensal + bruto_unico;
  const desconto_val = desconto_tipo === 'percentual' ? bruto_total * (desconto / 100) : desconto;
  const fator = bruto_total > 0 ? (bruto_total - desconto_val) / bruto_total : 1;
  return {
    total_mensal: Math.max(0, bruto_mensal * fator),
    total_unico: Math.max(0, bruto_unico * fator),
  };
}

const PROPOSTA_VAZIA = (): Omit<Proposta, 'id' | 'numero' | 'criado_em' | 'atualizado_em'> => ({
  cliente_id: null, lead_id: null, titulo_cliente: '',
  modo: 'livre', titulo: '',
  itens: [], desconto: 0, desconto_tipo: 'valor',
  total_mensal: 0, total_unico: 0,
  validade: '', condicoes: '', observacoes: '',
  status: 'rascunho',
});

export function Propostas() {
  const [propostas, setPropostas] = useState<Proposta[]>(carregarPropostas);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const servicos = useLista<Servico>('servicos') ?? [];
  const avisar = useAvisar();
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [abrindo, setAbrindo] = useState<Proposta | null | 'novo'>(null);
  const [form, setForm] = useState(PROPOSTA_VAZIA());
  const [detalhes, setDetalhes] = useState<Proposta | null>(null);

  const lista = useMemo(() => {
    let l = propostas;
    if (busca) {
      const b = busca.toLowerCase();
      l = l.filter(p => p.titulo_cliente.toLowerCase().includes(b) || p.numero.includes(b) || p.titulo.toLowerCase().includes(b));
    }
    if (filtroStatus !== 'todos') l = l.filter(p => p.status === filtroStatus);
    return l.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [propostas, busca, filtroStatus]);

  const salvar = (lista: Proposta[]) => { setPropostas(lista); salvarPropostasStorage(lista); };

  const abrirNova = () => { setForm(PROPOSTA_VAZIA()); setAbrindo('novo'); };
  const abrirEditar = (p: Proposta) => {
    setForm({ ...p }); setAbrindo(p);
  };

  const setItem = (field: keyof typeof form, value: unknown) => setForm(f => ({ ...f, [field]: value }));

  const addItem = () => {
    setForm(f => ({
      ...f,
      itens: [...f.itens, { id: novoId(), descricao: '', tipo_cobranca: 'mensal', valor: 0 }]
    }));
  };
  const updateItem = (id: string, field: keyof PropostaItem, value: unknown) => {
    setForm(f => ({ ...f, itens: f.itens.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  };
  const removeItem = (id: string) => setForm(f => ({ ...f, itens: f.itens.filter(i => i.id !== id) }));

  const { total_mensal, total_unico } = calcularTotais(form.itens, form.desconto, form.desconto_tipo);

  const confirmarSalvar = (status: Proposta['status'] = 'rascunho') => {
    if (!form.titulo_cliente.trim()) { avisar('Informe o cliente ou lead.'); return; }
    const totais = calcularTotais(form.itens, form.desconto, form.desconto_tipo);
    const agora = new Date().toISOString();
    if (abrindo === 'novo') {
      const nova: Proposta = {
        ...form, ...totais, status,
        id: novoId(), numero: gerarNumero(propostas),
        criado_em: agora, atualizado_em: agora,
      };
      salvar([nova, ...propostas]);
    } else {
      const atualizada: Proposta = {
        ...(abrindo as Proposta), ...form, ...totais, status, atualizado_em: agora,
      };
      salvar(propostas.map(p => p.id === atualizada.id ? atualizada : p));
    }
    setAbrindo(null);
    avisar('Proposta salva');
  };

  const mudarStatus = (p: Proposta, status: Proposta['status']) => {
    salvar(propostas.map(x => x.id === p.id ? { ...x, status, atualizado_em: new Date().toISOString() } : x));
    setDetalhes(d => d?.id === p.id ? { ...d, status } : d);
    avisar(`Proposta marcada como ${LABEL_STATUS[status].toLowerCase()}`);
  };

  const excluir = (id: string) => {
    salvar(propostas.filter(p => p.id !== id));
    setDetalhes(null);
    avisar('Proposta excluída');
  };

  const duplicar = (p: Proposta) => {
    const agora = new Date().toISOString();
    const nova: Proposta = { ...p, id: novoId(), numero: gerarNumero(propostas), status: 'rascunho', criado_em: agora, atualizado_em: agora };
    salvar([nova, ...propostas]);
    avisar('Proposta duplicada');
  };

  const gerarTextoProposta = (p: Proposta): string => {
    let txt = `*PROPOSTA COMERCIAL — CONTINENTAL MKT*\n`;
    txt += `📋 *Proposta nº:* ${p.numero}\n`;
    txt += `👤 *Cliente:* ${p.titulo_cliente}\n`;
    if (p.titulo) txt += `📌 *Projeto:* ${p.titulo}\n`;
    txt += `\n*Serviços Incluídos:*\n`;
    if (p.itens && p.itens.length > 0) {
      p.itens.forEach(it => {
        const tipo = it.tipo_cobranca === 'mensal' ? '/mês' : ' (único)';
        txt += `• ${it.descricao}: ${moeda(it.valor)}${tipo}\n`;
      });
    } else {
      txt += `• Conforme alinhamento inicial\n`;
    }

    txt += `\n*Investimento:*\n`;
    if (p.total_mensal > 0) txt += `💰 *Valor Mensal:* ${moeda(p.total_mensal)}\n`;
    if (p.total_unico > 0) txt += `💳 *Valor do Pacote:* ${moeda(p.total_unico)}\n`;
    if (p.validade) txt += `📅 *Válida até:* ${data(p.validade)}\n`;
    if (p.condicoes) txt += `\n*Condições:*\n${p.condicoes}\n`;
    if (p.observacoes) txt += `\n*Observações:*\n${p.observacoes}\n`;

    txt += `\nQualquer dúvida estou à total disposição para alinharmos e iniciarmos! 🤝🚀`;
    return txt;
  };

  const copiarTextoProposta = (p: Proposta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const txt = gerarTextoProposta(p);
    navigator.clipboard.writeText(txt).then(() => {
      avisar('Proposta copiada! Só colar no WhatsApp.');
    }).catch(() => {
      avisar('Erro ao copiar proposta.');
    });
  };

  const compartilharWhats = (p: Proposta) => {
    const cli = clientes.find(c => c.id === p.cliente_id);
    const tel = cli?.whatsapp || cli?.telefone || '';
    const txt = gerarTextoProposta(p);
    if (!tel) {
      copiarTextoProposta(p);
      avisar('Cliente sem telefone cadastrado. O texto foi copiado para colar no WhatsApp!');
      return;
    }
    const msg = encodeURIComponent(txt);
    window.open(`https://wa.me/55${tel.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  const aceite = (p: Proposta) => {
    const cli = clientes.find(c => c.id === p.cliente_id);
    navigate('/clientes/novo', { state: { fromProposta: p, clienteExistente: cli } });
  };

  return (
    <>
      <CabecalhoTela
        titulo="Propostas"
        icone={<FileText size={28} strokeWidth={1.6} />}
        subtitulo="Propostas comerciais para leads e clientes"
        acoes={<Botao variante="primario" onClick={abrirNova}><Plus size={17} /> Nova Proposta</Botao>}
      />

      <div className="linha" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="entrada" placeholder="Buscar por cliente ou número..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select className="entrada" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ flex: 'none', width: 'auto' }}>
          <option value="todos">Todos os status</option>
          {Object.entries(LABEL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vazio texto="Nenhuma proposta encontrada." acao={<Botao variante="primario" onClick={abrirNova}><Plus size={15} /> Nova Proposta</Botao>} />
      ) : (
        <Card>
          <div className="lista">
            {lista.map(p => (
              <div key={p.id} className="item" onClick={() => setDetalhes(p)} style={{ cursor: 'pointer' }}>
                <div className="cresce">
                  <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span className="titulo">{p.numero} — {p.titulo_cliente}</span>
                    <Chip cor={COR_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Chip>
                  </div>
                  {p.titulo && <div className="pequeno secundario">{p.titulo}</div>}
                  <div className="pequeno secundario">
                    {p.total_mensal > 0 && `Mensal: ${moeda(p.total_mensal)}`}
                    {p.total_mensal > 0 && p.total_unico > 0 && ' · '}
                    {p.total_unico > 0 && `Pacote: ${moeda(p.total_unico)}`}
                    {p.validade && ` · Válida até ${data(p.validade)}`}
                  </div>
                </div>
                <div className="linha" style={{ gap: 4 }} onClick={e => e.stopPropagation()}>
                  <BotaoIcone rotulo="Copiar texto para WhatsApp" onClick={e => copiarTextoProposta(p, e)}>
                    <Copy size={17} strokeWidth={1.7} />
                  </BotaoIcone>
                </div>
                <ChevronRight size={18} className="secundario" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Formulário */}
      <Modal titulo={abrindo === 'novo' ? 'Nova Proposta' : 'Editar Proposta'} aberto={!!abrindo} aoFechar={() => setAbrindo(null)}
        rodape={
          <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Botao onClick={() => confirmarSalvar('rascunho')}>Salvar Rascunho</Botao>
            <Botao variante="primario" onClick={() => confirmarSalvar('enviada')}><Send size={15} /> Marcar como Enviada</Botao>
          </div>
        }>
        <div className="coluna" style={{ gap: 14 }}>
          <div className="grade grade-2">
            <Campo rotulo="Cliente / Lead *">
              <select className="entrada" value={form.cliente_id || ''} onChange={e => { setItem('cliente_id', e.target.value || null); setItem('titulo_cliente', clientes.find(c => c.id === e.target.value)?.nome || ''); }}>
                <option value="">Selecionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Ou nome do lead (se não for cliente)">
              <input className="entrada" value={form.cliente_id ? '' : form.titulo_cliente} disabled={!!form.cliente_id}
                placeholder="Nome do lead" onChange={e => setItem('titulo_cliente', e.target.value)} />
            </Campo>
          </div>
          <Campo rotulo="Título da Proposta">
            <input className="entrada" value={form.titulo} onChange={e => setItem('titulo', e.target.value)} placeholder="Ex: Gestão de Tráfego Pago — Mensal" />
          </Campo>

          <div>
            <div className="linha entre" style={{ marginBottom: 8 }}>
              <span className="titulo-card" style={{ fontSize: 15 }}>Itens da Proposta</span>
              <Botao icone={<Plus size={14} />} onClick={addItem}>Adicionar Item</Botao>
            </div>
            <div className="coluna" style={{ gap: 8 }}>
              {form.itens.length === 0 && <p className="secundario pequeno">Nenhum item adicionado ainda.</p>}
              {form.itens.map(item => (
                <div key={item.id} className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 14 }}>
                  <div className="grade grade-2" style={{ gap: 8, alignItems: 'end' }}>
                    <Campo rotulo="Descrição">
                      <input className="entrada" value={item.descricao} onChange={e => updateItem(item.id, 'descricao', e.target.value)} placeholder="Ex: Gestão de Tráfego Pago" />
                    </Campo>
                    <div className="linha" style={{ gap: 8, alignItems: 'flex-end' }}>
                      <Campo rotulo="Tipo">
                        <select className="entrada" value={item.tipo_cobranca} onChange={e => updateItem(item.id, 'tipo_cobranca', e.target.value)}>
                          <option value="mensal">Mensal</option>
                          <option value="pacote">Pacote (único)</option>
                        </select>
                      </Campo>
                      <Campo rotulo="Valor (R$)">
                        <input className="entrada" type="number" min="0" step="0.01" value={item.valor || ''} onChange={e => updateItem(item.id, 'valor', numero(e.target.value))} />
                      </Campo>
                      <BotaoIcone rotulo="Remover" onClick={() => removeItem(item.id)} style={{ marginBottom: 2 }}><Trash2 size={16} /></BotaoIcone>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grade grade-2">
            <Campo rotulo="Desconto">
              <div className="linha" style={{ gap: 6 }}>
                <select className="entrada" value={form.desconto_tipo} onChange={e => setItem('desconto_tipo', e.target.value)} style={{ flex: 'none', width: 80 }}>
                  <option value="valor">R$</option>
                  <option value="percentual">%</option>
                </select>
                <input className="entrada" type="number" min="0" step="0.01" value={form.desconto || ''} onChange={e => setItem('desconto', numero(e.target.value))} />
              </div>
            </Campo>
            <Campo rotulo="Validade">
              <input className="entrada" type="date" value={form.validade} onChange={e => setItem('validade', e.target.value)} min={hoje()} />
            </Campo>
          </div>

          {(total_mensal > 0 || total_unico > 0) && (
            <div className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 14 }}>
              <div className="linha entre">
                {total_mensal > 0 && <span>Total Mensal: <strong className="num">{moeda(total_mensal)}</strong></span>}
                {total_unico > 0 && <span>Total Pacote: <strong className="num">{moeda(total_unico)}</strong></span>}
              </div>
            </div>
          )}

          <Campo rotulo="Condições de Pagamento">
            <textarea className="entrada" rows={2} value={form.condicoes} onChange={e => setItem('condicoes', e.target.value)} placeholder="Ex: Boleto ou Pix, todo dia 10 do mês" />
          </Campo>
          <Campo rotulo="Observações">
            <textarea className="entrada" rows={2} value={form.observacoes} onChange={e => setItem('observacoes', e.target.value)} />
          </Campo>
        </div>
      </Modal>

      {/* Modal Detalhes */}
      <Modal titulo={`Proposta ${detalhes?.numero}`} aberto={!!detalhes} aoFechar={() => setDetalhes(null)}>
        {detalhes && (
          <div className="coluna" style={{ gap: 16 }}>
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip cor={COR_STATUS[detalhes.status]}>{LABEL_STATUS[detalhes.status]}</Chip>
              <span className="secundario pequeno">Criada em {data(detalhes.criado_em)}</span>
            </div>
            <div className="lista">
              <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Cliente / Lead</span><strong>{detalhes.titulo_cliente}</strong></div>
              {detalhes.titulo && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Título</span><strong>{detalhes.titulo}</strong></div>}
              {detalhes.validade && <div className="item" style={{ cursor: 'default' }}><span className="cresce secundario">Validade</span><strong>{data(detalhes.validade)}</strong></div>}
            </div>
            {detalhes.itens.length > 0 && (
              <div>
                <p className="titulo-card" style={{ fontSize: 14, marginBottom: 8 }}>Itens</p>
                <div className="lista">
                  {detalhes.itens.map(i => (
                    <div key={i.id} className="item" style={{ cursor: 'default' }}>
                      <span className="cresce">{i.descricao}</span>
                      <span className="num">{moeda(i.valor)}<span className="secundario pequeno"> / {i.tipo_cobranca === 'mensal' ? 'mês' : 'único'}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="lista">
              {detalhes.total_mensal > 0 && <div className="item" style={{ cursor: 'default' }}><span className="cresce titulo">Total Mensal</span><strong className="num positivo">{moeda(detalhes.total_mensal)}</strong></div>}
              {detalhes.total_unico > 0 && <div className="item" style={{ cursor: 'default' }}><span className="cresce titulo">Total Pacote</span><strong className="num positivo">{moeda(detalhes.total_unico)}</strong></div>}
            </div>
            {detalhes.condicoes && <div><p className="pequeno secundario">Condições:</p><p>{detalhes.condicoes}</p></div>}
            {detalhes.observacoes && <div><p className="pequeno secundario">Observações:</p><p>{detalhes.observacoes}</p></div>}

            {/* Mensagem pronta para WhatsApp */}
            <div style={{ marginTop: 4 }}>
              <div className="linha entre" style={{ marginBottom: 6 }}>
                <span className="pequeno secundario">💬 Texto pronto para WhatsApp:</span>
                <Botao onClick={() => copiarTextoProposta(detalhes)} style={{ padding: '4px 10px', fontSize: 12 }}>
                  <Copy size={13} /> Copiar Mensagem
                </Botao>
              </div>
              <pre style={{
                fontFamily: 'inherit',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                maxHeight: 160,
                overflowY: 'auto',
                padding: '10px 12px',
                background: 'var(--vidro-painel-a)',
                borderRadius: 8,
                border: '1px solid var(--vidro-borda)',
                color: 'var(--texto)',
                margin: 0
              }}>
                {gerarTextoProposta(detalhes)}
              </pre>
            </div>

            <div className="linha" style={{ gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <Botao variante="primario" onClick={() => copiarTextoProposta(detalhes)}>
                <Copy size={15} /> Copiar para WhatsApp
              </Botao>
              <Botao onClick={() => { setDetalhes(null); abrirEditar(detalhes); }}><Copy size={15} /> Editar</Botao>
              <Botao onClick={() => { duplicar(detalhes); setDetalhes(null); }}><Copy size={15} /> Duplicar</Botao>
              {(detalhes.status === 'rascunho' || detalhes.status === 'enviada') && (
                <Botao onClick={() => compartilharWhats(detalhes)}><Send size={15} /> Abrir WhatsApp</Botao>
              )}
              {detalhes.status === 'rascunho' && <Botao onClick={() => mudarStatus(detalhes, 'enviada')}><Send size={15} /> Marcar Enviada</Botao>}
              {detalhes.status === 'enviada' && (
                <>
                  <Botao variante="primario" onClick={() => mudarStatus(detalhes, 'aceita')}><CheckCircle2 size={15} /> Aceita</Botao>
                  <Botao onClick={() => mudarStatus(detalhes, 'recusada')}><XCircle size={15} /> Recusada</Botao>
                </>
              )}
              {detalhes.status === 'aceita' && detalhes.cliente_id && (
                <Botao variante="primario" onClick={() => aceite(detalhes)}>Converter em Cliente</Botao>
              )}
              {detalhes.status === 'rascunho' && (
                <Botao variante="perigo" onClick={() => { if (confirm('Excluir esta proposta?')) excluir(detalhes.id); }}><Trash2 size={15} /> Excluir</Botao>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
