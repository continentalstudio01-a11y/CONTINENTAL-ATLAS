import { useState, useMemo } from 'react';
import { HeartHandshake, Plus, Send, Copy, AlertTriangle, CheckCircle2, MessageCircle, Trash2, ExternalLink } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar, Barra } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente } from '../../lib/tipos';

export interface PesquisaNPS {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  token: string;
  nota: number | null;
  comentario: string;
  status: 'pendente' | 'respondida';
  criado_em: string;
  respondido_em: string | null;
}

function carregar(): PesquisaNPS[] {
  try { return JSON.parse(localStorage.getItem('atlas_nps') || '[]'); } catch { return []; }
}
function salvarStorage(l: PesquisaNPS[]) { localStorage.setItem('atlas_nps', JSON.stringify(l)); }

export function Satisfacao() {
  const [pesquisas, setPesquisas] = useState<PesquisaNPS[]>(carregar);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const avisar = useAvisar();

  const [formAberto, setFormAberto] = useState(false);
  const [clienteId, setClienteId] = useState('');

  const salvar = (l: PesquisaNPS[]) => { setPesquisas(l); salvarStorage(l); };

  const respondidas = useMemo(() => pesquisas.filter(p => p.status === 'respondida' && p.nota !== null), [pesquisas]);

  // Estatísticas NPS
  const stats = useMemo(() => {
    if (respondidas.length === 0) return { score: 0, promotores: 0, neutros: 0, detratores: 0, media: 0 };
    const prom = respondidas.filter(p => p.nota! >= 9).length;
    const neut = respondidas.filter(p => p.nota! >= 7 && p.nota! <= 8).length;
    const detr = respondidas.filter(p => p.nota! <= 6).length;
    const total = respondidas.length;
    const score = Math.round(((prom - detr) / total) * 100);
    const media = respondidas.reduce((acc, p) => acc + p.nota!, 0) / total;
    return { score, promotores: prom, neutros: neut, detratores: detr, media: Number(media.toFixed(1)) };
  }, [respondidas]);

  const detratores = useMemo(() => respondidas.filter(p => p.nota! <= 6), [respondidas]);

  const criarPesquisa = () => {
    if (!clienteId) { avisar('Selecione um cliente.'); return; }
    const cli = clientes.find(c => c.id === clienteId);
    const nova: PesquisaNPS = {
      id: novoId(),
      cliente_id: clienteId,
      cliente_nome: cli?.nome || 'Cliente',
      token: novoId().replace(/-/g, '').slice(0, 16),
      nota: null,
      comentario: '',
      status: 'pendente',
      criado_em: new Date().toISOString(),
      respondido_em: null
    };
    salvar([nova, ...pesquisas]);
    setFormAberto(false);
    setClienteId('');
    avisar('Pesquisa criada com link de envio!');
  };

  const copiarLink = (p: PesquisaNPS) => {
    const link = `${window.location.origin}/nps/${p.token}`;
    navigator.clipboard?.writeText(link).then(() => avisar('Link copiado!'));
  };

  const enviarWhats = (p: PesquisaNPS) => {
    const link = `${window.location.origin}/nps/${p.token}`;
    const msg = encodeURIComponent(
      `Olá ${p.cliente_nome}! Tudo bem? 😊\n\n` +
      `Gostaríamos muito de saber a sua opinião sincera sobre a nossa parceria e os serviços prestados pela Continental MKT.\n\n` +
      `Leva menos de 1 minuto para responder:\n👉 ${link}\n\n` +
      `Sua avaliação nos ajuda a melhorar sempre. Muito obrigado!`
    );
    const cli = clientes.find(c => c.id === p.cliente_id);
    const tel = (cli?.whatsapp || cli?.telefone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${tel ? '55' + tel : ''}?text=${msg}`, '_blank');
  };

  const excluir = (id: string) => {
    salvar(pesquisas.filter(p => p.id !== id));
    avisar('Pesquisa excluída');
  };

  return (
    <>
      <CabecalhoTela
        titulo="Pesquisa de Satisfação & NPS"
        icone={<HeartHandshake size={28} strokeWidth={1.6} />}
        subtitulo="Acompanhe o termômetro dos clientes e identifique riscos de cancelamento antes que aconteçam"
        acoes={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={17} /> Nova Pesquisa</Botao>}
      />

      {/* Alerta de Clientes em Risco (Detratores) */}
      {detratores.length > 0 && (
        <div style={{ marginBottom: 18, border: '1px solid rgba(240, 119, 107, 0.4)', borderRadius: 18 }}>
          <Card medio>
            <div className="linha" style={{ gap: 12, alignItems: 'flex-start' }}>
              <AlertTriangle size={24} className="erro" style={{ flex: 'none', marginTop: 2 }} />
              <div className="cresce">
                <p className="titulo" style={{ fontSize: 16, color: '#B42318' }}>
                  Alerta: {detratores.length} {detratores.length === 1 ? 'cliente insatisfeito (em risco de churn)' : 'clientes insatisfeitos (em risco de churn)'}
                </p>
                <p className="pequeno secundario" style={{ marginTop: 2, marginBottom: 8 }}>
                  Clientes com nota menor ou igual a 6 precisam de atenção imediata ou reunião de alinhamento.
                </p>
                <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {detratores.map(d => (
                    <Chip key={d.id} cor="erro">
                      {d.cliente_nome}: Nota {d.nota} {d.comentario ? `("${d.comentario.slice(0, 30)}...")` : ''}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Painel de Métricas NPS */}
      <div className="grade grade-3 igual" style={{ marginBottom: 18 }}>
        <Card medio>
          <p className="pequeno secundario">NPS Score Consolidado</p>
          <p className="num" style={{ fontSize: 32, fontWeight: 300, color: stats.score >= 50 ? 'var(--positivo)' : stats.score >= 0 ? 'var(--atencao)' : 'var(--erro)' }}>
            {respondidas.length > 0 ? stats.score : '—'}
          </p>
          <p className="pequeno secundario" style={{ marginTop: 4 }}>
            Zona de {stats.score >= 75 ? 'Excelência' : stats.score >= 50 ? 'Qualidade' : stats.score >= 0 ? 'Aperfeiçoamento' : 'Crítica'}
          </p>
        </Card>

        <Card medio>
          <p className="pequeno secundario">Média das Notas</p>
          <p className="num" style={{ fontSize: 32, fontWeight: 300 }}>
            {respondidas.length > 0 ? `${stats.media} / 10` : '—'}
          </p>
          <p className="pequeno secundario" style={{ marginTop: 4 }}>
            {respondidas.length} de {pesquisas.length} pesquisas respondidas
          </p>
        </Card>

        <Card medio>
          <p className="pequeno secundario">Distribuição dos Clientes</p>
          <div className="coluna" style={{ gap: 6, marginTop: 6 }}>
            <div className="linha entre pequeno">
              <span>Promotores (9-10):</span>
              <strong className="positivo">{stats.promotores}</strong>
            </div>
            <div className="linha entre pequeno">
              <span>Neutros (7-8):</span>
              <strong className="secundario">{stats.neutros}</strong>
            </div>
            <div className="linha entre pequeno">
              <span>Detratores (0-6):</span>
              <strong className="negativo">{stats.detratores}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Pesquisas */}
      {pesquisas.length === 0 ? (
        <Vazio texto="Nenhuma pesquisa de satisfação criada ainda." acao={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={15} /> Criar Pesquisa</Botao>} />
      ) : (
        <Card titulo="Histórico de Avaliações">
          <div className="lista">
            {pesquisas.map(p => {
              const corNota = p.nota === null ? undefined : p.nota >= 9 ? 'ok' : p.nota >= 7 ? 'destaque' : 'erro';
              return (
                <div key={p.id} className="item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
                  <div className="cresce">
                    <div className="linha" style={{ gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="titulo">{p.cliente_nome}</span>
                      {p.status === 'respondida' ? (
                        <Chip cor={corNota}>Nota {p.nota}/10</Chip>
                      ) : (
                        <Chip cor="atencao">Aguardando Resposta</Chip>
                      )}
                      <span className="pequeno secundario">
                        {p.respondido_em ? `Avaliado em ${data(p.respondido_em)}` : `Enviado em ${data(p.criado_em)}`}
                      </span>
                    </div>

                    {p.comentario && (
                      <p style={{ marginTop: 6, fontStyle: 'italic', background: 'var(--vidro-painel-b)', padding: '8px 12px', borderRadius: 10 }}>
                        "{p.comentario}"
                      </p>
                    )}

                    {p.status === 'pendente' && (
                      <div className="linha" style={{ gap: 8, marginTop: 8 }}>
                        <code className="pequeno secundario" style={{ background: 'var(--vidro-painel-b)', padding: '4px 8px', borderRadius: 6 }}>
                          {window.location.origin}/nps/{p.token}
                        </code>
                        <BotaoIcone rotulo="Copiar link" onClick={() => copiarLink(p)}><Copy size={13} /></BotaoIcone>
                        <Botao onClick={() => window.open(`/nps/${p.token}`, '_blank')} style={{ padding: '3px 8px', fontSize: 11 }}>
                          <ExternalLink size={12} /> Testar
                        </Botao>
                      </div>
                    )}
                  </div>

                  <div className="linha" style={{ gap: 6 }}>
                    {p.status === 'pendente' && (
                      <Botao onClick={() => enviarWhats(p)}>
                        <MessageCircle size={14} /> WhatsApp
                      </Botao>
                    )}
                    <BotaoIcone rotulo="Excluir" onClick={() => excluir(p.id)}><Trash2 size={14} /></BotaoIcone>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modal Criar Pesquisa */}
      <Modal titulo="Nova Pesquisa de Satisfação NPS" aberto={formAberto} aoFechar={() => setFormAberto(false)}
        rodape={<Botao variante="primario" onClick={criarPesquisa}><CheckCircle2 size={15} /> Gerar Link de Avaliação</Botao>}>
        <div className="coluna" style={{ gap: 14 }}>
          <Campo rotulo="Selecione o Cliente *">
            <select className="entrada" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <p className="pequeno secundario">
            Será gerado um link exclusivo de avaliação que você pode disparar via WhatsApp com mensagem modelo pronta.
          </p>
        </div>
      </Modal>
    </>
  );
}
