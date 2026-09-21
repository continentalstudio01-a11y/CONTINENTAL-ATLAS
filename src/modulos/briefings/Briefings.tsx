import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Link2, Copy, CheckCircle2, Trash2, Send, ExternalLink, Edit3 } from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import type { Cliente } from '../../lib/tipos';

interface BriefingPergunta {
  id: string;
  texto: string;
  tipo: 'texto' | 'texto_longo' | 'sim_nao';
  obrigatoria: boolean;
}

interface BriefingModelo {
  id: string;
  nome: string;
  perguntas: BriefingPergunta[];
}

interface Briefing {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  modelo_id: string;
  modelo_nome: string;
  token: string;
  status: 'rascunho' | 'enviado' | 'respondido';
  respostas: Record<string, string>;
  validade: string;
  criado_em: string;
  respondido_em: string | null;
}

const MODELOS_PADRAO: BriefingModelo[] = [
  {
    id: 'trafego', nome: 'Tráfego Pago',
    perguntas: [
      { id: '1', texto: 'Qual o principal objetivo dos seus anúncios?', tipo: 'texto_longo', obrigatoria: true },
      { id: '2', texto: 'Qual a verba mensal disponível para investir em anúncios?', tipo: 'texto', obrigatoria: true },
      { id: '3', texto: 'Você já anunciou antes no Meta Ads ou Google Ads? Como foi a experiência?', tipo: 'texto_longo', obrigatoria: false },
      { id: '4', texto: 'Quem é o seu cliente ideal (idade, cidade, gênero, profissão, dores)?', tipo: 'texto_longo', obrigatoria: true },
      { id: '5', texto: 'Qual é o principal produto ou serviço que vamos divulgar?', tipo: 'texto_longo', obrigatoria: true },
      { id: '6', texto: 'Você tem site, landing page ou o destino será o WhatsApp?', tipo: 'texto', obrigatoria: true },
      { id: '7', texto: 'Quais são os seus principais concorrentes diretos?', tipo: 'texto_longo', obrigatoria: false },
      { id: '8', texto: 'O que a sua empresa tem de melhor em relação a eles (diferencial)?', tipo: 'texto_longo', obrigatoria: true },
    ]
  },
  {
    id: 'site', nome: 'Site e Landing Page',
    perguntas: [
      { id: '1', texto: 'Qual o objetivo principal do site (vender, gerar contatos no WhatsApp, catálogo)?', tipo: 'texto_longo', obrigatoria: true },
      { id: '2', texto: 'Você já tem domínio registrado (ex: seunome.com.br)? Se sim, qual?', tipo: 'texto', obrigatoria: false },
      { id: '3', texto: 'Quais páginas ou seções o site precisa ter (Início, Sobre, Serviços, Contato)?', tipo: 'texto_longo', obrigatoria: true },
      { id: '4', texto: 'Cole aqui links de sites ou referências visuais que você acha bonitos:', tipo: 'texto_longo', obrigatoria: false },
      { id: '5', texto: 'Você já tem logo em boa resolução e identidade visual definida?', tipo: 'sim_nao', obrigatoria: true },
      { id: '6', texto: 'Tem fotos reais do seu negócio/equipe ou precisará de fotos de banco de imagens?', tipo: 'texto', obrigatoria: true },
    ]
  },
  {
    id: 'social', nome: 'Social Media',
    perguntas: [
      { id: '1', texto: 'Quais redes sociais vamos gerenciar (Instagram, Facebook, LinkedIn)?', tipo: 'texto', obrigatoria: true },
      { id: '2', texto: 'Quantas publicações por semana foram alinhadas?', tipo: 'texto', obrigatoria: true },
      { id: '3', texto: 'Quem é o seu público e o que ele busca no seu perfil?', tipo: 'texto_longo', obrigatoria: true },
      { id: '4', texto: 'Qual o tom de voz da marca (formal, jovem, descontraído, autoritário)?', tipo: 'texto_longo', obrigatoria: true },
      { id: '5', texto: 'Existe algum assunto ou termo que é PROIBIDO citar nas postagens?', tipo: 'texto_longo', obrigatoria: false },
    ]
  },
  {
    id: 'gmn', nome: 'Google Meu Negócio',
    perguntas: [
      { id: '1', texto: 'Você já possui ficha no Google Meu Negócio / Google Maps criada?', tipo: 'sim_nao', obrigatoria: true },
      { id: '2', texto: 'Qual o endereço completo com CEP que deve aparecer no Google?', tipo: 'texto_longo', obrigatoria: true },
      { id: '3', texto: 'Quais são os horários e dias exatos de funcionamento?', tipo: 'texto_longo', obrigatoria: true },
      { id: '4', texto: 'Telefone e WhatsApp oficial para os clientes ligarem:', tipo: 'texto', obrigatoria: true },
      { id: '5', texto: 'Lista dos principais serviços ou produtos oferecidos:', tipo: 'texto_longo', obrigatoria: true },
    ]
  },
];

function carregar(): Briefing[] {
  try { return JSON.parse(localStorage.getItem('atlas_briefings') || '[]'); } catch { return []; }
}
function salvarStorage(l: Briefing[]) { localStorage.setItem('atlas_briefings', JSON.stringify(l)); }

const COR_STATUS: Record<Briefing['status'], 'ok' | 'atencao' | 'destaque' | undefined> = {
  rascunho: undefined, enviado: 'destaque', respondido: 'ok',
};
const LABEL_STATUS: Record<Briefing['status'], string> = {
  rascunho: 'Rascunho', enviado: 'Enviado ao Cliente', respondido: 'Respondido & Concluído',
};

export function Briefings() {
  const [briefings, setBriefings] = useState<Briefing[]>(carregar);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const avisar = useAvisar();

  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [formAberto, setFormAberto] = useState(false);
  const [detalhes, setDetalhes] = useState<Briefing | null>(null);
  const [modoPreenchimento, setModoPreenchimento] = useState(false);
  const [respostasEdicao, setRespostasEdicao] = useState<Record<string, string>>({});

  const [form, setForm] = useState({ cliente_id: '', modelo_id: 'trafego', validade_dias: 15 });

  const salvar = (lista: Briefing[]) => { setBriefings(lista); salvarStorage(lista); };

  const lista = useMemo(() => {
    let l = briefings;
    if (filtroStatus !== 'todos') l = l.filter(b => b.status === filtroStatus);
    return l.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [briefings, filtroStatus]);

  const criarBriefing = () => {
    const modelo = MODELOS_PADRAO.find(m => m.id === form.modelo_id)!;
    const cliente = clientes.find(c => c.id === form.cliente_id);
    const agora = new Date().toISOString();
    const validade = new Date(Date.now() + form.validade_dias * 864e5).toISOString().slice(0, 10);
    const novo: Briefing = {
      id: novoId(), cliente_id: form.cliente_id || null,
      cliente_nome: cliente?.nome || 'Cliente / Lead', modelo_id: modelo.id,
      modelo_nome: modelo.nome, token: novoId().replace(/-/g, '').slice(0, 16),
      status: 'rascunho', respostas: {}, validade,
      criado_em: agora, respondido_em: null,
    };
    salvar([novo, ...briefings]);
    setFormAberto(false);
    avisar('Briefing criado com link exclusivo');
  };

  const mudarStatus = (b: Briefing, status: Briefing['status']) => {
    const agora = new Date().toISOString();
    const upd = {
      ...b, status,
      respondido_em: status === 'respondido' ? (b.respondido_em || agora) : b.respondido_em
    };
    salvar(briefings.map(x => x.id === b.id ? upd : x));
    setDetalhes(d => d?.id === b.id ? upd : d);
    avisar('Status atualizado');
  };

  const salvarRespostasInternas = (b: Briefing) => {
    const agora = new Date().toISOString();
    const upd: Briefing = {
      ...b,
      respostas: respostasEdicao,
      status: 'respondido',
      respondido_em: b.respondido_em || agora
    };
    salvar(briefings.map(x => x.id === b.id ? upd : x));
    setDetalhes(upd);
    setModoPreenchimento(false);
    avisar('Respostas do briefing salvas!');
  };

  const excluir = (id: string) => {
    salvar(briefings.filter(b => b.id !== id));
    setDetalhes(null);
    avisar('Briefing excluído');
  };

  const copiarLink = (b: Briefing) => {
    const link = `${window.location.origin}/briefing/${b.token}`;
    navigator.clipboard?.writeText(link).then(() => avisar('Link copiado com sucesso!'));
  };

  const abrirLinkPublico = (b: Briefing) => {
    window.open(`/briefing/${b.token}`, '_blank');
  };

  const enviarWhats = (b: Briefing) => {
    const link = `${window.location.origin}/briefing/${b.token}`;
    const msg = encodeURIComponent(
      `Olá ${b.cliente_nome}! 👋\n\n` +
      `Para darmos início aos trabalhos de *${b.modelo_nome}* com máxima precisão, preparamos este formulário rápido de alinhamento:\n\n` +
      `👉 ${link}\n\n` +
      `Leva poucos minutos e você pode responder direto pelo celular. O link é seguro e válido até ${data(b.validade)}.`
    );
    const cli = clientes.find(c => c.id === b.cliente_id);
    const tel = (cli?.whatsapp || cli?.telefone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${tel ? '55' + tel : ''}?text=${msg}`, '_blank');
  };

  const modelo = MODELOS_PADRAO.find(m => m.id === detalhes?.modelo_id);

  return (
    <>
      <CabecalhoTela
        titulo="Briefings dos Clientes"
        icone={<ClipboardList size={28} strokeWidth={1.6} />}
        subtitulo="Formulários inteligentes por serviço com link público e resposta pelo celular"
        acoes={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={17} /> Novo Briefing</Botao>}
      />

      <div className="linha" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="entrada" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: 'auto' }}>
          <option value="todos">Todos os status</option>
          {Object.entries(LABEL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {lista.length === 0 ? (
        <Vazio texto="Nenhum briefing criado ainda." acao={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={15} /> Criar Primeiro Briefing</Botao>} />
      ) : (
        <Card>
          <div className="lista">
            {lista.map(b => {
              const mod = MODELOS_PADRAO.find(m => m.id === b.modelo_id);
              const qtdResp = Object.keys(b.respostas || {}).filter(k => !!b.respostas[k]?.trim()).length;
              const totalPerg = mod?.perguntas.length || 0;
              return (
                <div key={b.id} className="item" onClick={() => { setDetalhes(b); setModoPreenchimento(false); setRespostasEdicao(b.respostas || {}); }} style={{ cursor: 'pointer' }}>
                  <div className="cresce">
                    <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="titulo">{b.cliente_nome}</span>
                      <Chip cor={COR_STATUS[b.status]}>{LABEL_STATUS[b.status]}</Chip>
                      <Chip>{b.modelo_nome}</Chip>
                    </div>
                    <div className="pequeno secundario" style={{ marginTop: 2 }}>
                      Válido até {data(b.validade)} · {qtdResp} de {totalPerg} perguntas respondidas
                      {b.respondido_em && ` · Concluído em ${data(b.respondido_em)}`}
                    </div>
                  </div>
                  <div className="linha" style={{ gap: 8 }}>
                    <Botao onClick={(e) => { e.stopPropagation(); enviarWhats(b); }}>
                      <Send size={14} /> WhatsApp
                    </Botao>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Modal Criar */}
      <Modal titulo="Novo Briefing para Cliente" aberto={formAberto} aoFechar={() => setFormAberto(false)}
        rodape={<Botao variante="primario" onClick={criarBriefing}><CheckCircle2 size={15} /> Gerar Briefing & Link</Botao>}>
        <div className="coluna" style={{ gap: 14 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Modelo de Serviço *">
            <select className="entrada" value={form.modelo_id} onChange={e => setForm(f => ({ ...f, modelo_id: e.target.value }))}>
              {MODELOS_PADRAO.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Validade do Link (dias)">
            <input className="entrada" type="number" min="1" max="90" value={form.validade_dias}
              onChange={e => setForm(f => ({ ...f, validade_dias: parseInt(e.target.value) || 15 }))} />
          </Campo>
          <div className="vidro-painel" style={{ padding: '10px 14px', borderRadius: 14 }}>
            <p className="pequeno secundario" style={{ marginBottom: 6 }}>Perguntas incluídas neste formulário:</p>
            {MODELOS_PADRAO.find(m => m.id === form.modelo_id)?.perguntas.map((p, idx) => (
              <div key={p.id} className="pequeno" style={{ marginBottom: 4 }}>
                <strong>{idx + 1}.</strong> {p.texto} {p.obrigatoria && <span style={{ color: '#B42318' }}>*</span>}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal Detalhes do Briefing */}
      <Modal titulo={`Briefing — ${detalhes?.cliente_nome}`} aberto={!!detalhes} aoFechar={() => setDetalhes(null)}>
        {detalhes && (
          <div className="coluna" style={{ gap: 16 }}>
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip cor={COR_STATUS[detalhes.status]}>{LABEL_STATUS[detalhes.status]}</Chip>
              <Chip>{detalhes.modelo_nome}</Chip>
              <span className="secundario pequeno">Válido até {data(detalhes.validade)}</span>
            </div>

            {/* Link Exclusivo para o Cliente */}
            <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
              <div className="linha entre" style={{ marginBottom: 6 }}>
                <p className="pequeno secundario">Link exclusivo de resposta para o cliente:</p>
                <Botao onClick={() => abrirLinkPublico(detalhes)} style={{ padding: '4px 10px', fontSize: 12 }}>
                  <ExternalLink size={12} /> Abrir Página Pública
                </Botao>
              </div>
              <div className="linha" style={{ gap: 8 }}>
                <input
                  className="entrada"
                  readOnly
                  value={`${window.location.origin}/briefing/${detalhes.token}`}
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                />
                <BotaoIcone rotulo="Copiar link" onClick={() => copiarLink(detalhes)}><Copy size={15} /></BotaoIcone>
              </div>
            </div>

            {/* Modo de Visualização / Edição Interna das Respostas */}
            {modelo && (
              <div>
                <div className="linha entre" style={{ marginBottom: 8 }}>
                  <p className="titulo-card" style={{ fontSize: 15 }}>
                    {modoPreenchimento ? 'Preenchendo Respostas' : 'Respostas Registradas'}
                  </p>
                  <Botao onClick={() => setModoPreenchimento(!modoPreenchimento)}>
                    <Edit3 size={13} /> {modoPreenchimento ? 'Cancelar Edição' : 'Preencher / Editar Respostas'}
                  </Botao>
                </div>

                <div className="coluna" style={{ gap: 10 }}>
                  {modelo.perguntas.map((p, idx) => {
                    const resp = (modoPreenchimento ? respostasEdicao[p.id] : detalhes.respostas[p.id]) || '';
                    return (
                      <div key={p.id} className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
                        <p className="pequeno secundario" style={{ marginBottom: 4 }}>
                          <strong>{idx + 1}. {p.texto}</strong>
                        </p>
                        {modoPreenchimento ? (
                          <textarea
                            className="entrada"
                            rows={2}
                            value={respostasEdicao[p.id] || ''}
                            onChange={e => setRespostasEdicao(r => ({ ...r, [p.id]: e.target.value }))}
                            placeholder="Resposta..."
                            style={{ width: '100%', marginTop: 4 }}
                          />
                        ) : (
                          <p style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                            {resp ? resp : <em className="secundario">Ainda não respondida pelo cliente.</em>}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {modoPreenchimento && (
                  <div style={{ marginTop: 12 }}>
                    <Botao variante="primario" onClick={() => salvarRespostasInternas(detalhes)}>
                      Salvar Todas as Respostas
                    </Botao>
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <Botao onClick={() => enviarWhats(detalhes)}><Send size={14} /> Enviar pelo WhatsApp</Botao>
              <Botao onClick={() => copiarLink(detalhes)}><Link2 size={14} /> Copiar Link</Botao>
              {detalhes.status === 'rascunho' && (
                <Botao onClick={() => mudarStatus(detalhes, 'enviado')}>Marcar como Enviado</Botao>
              )}
              {detalhes.status !== 'respondido' && (
                <Botao variante="primario" onClick={() => mudarStatus(detalhes, 'respondido')}>
                  <CheckCircle2 size={14} /> Marcar como Respondido
                </Botao>
              )}
              <Botao variante="perigo" onClick={() => { if (confirm('Excluir este briefing?')) excluir(detalhes.id); }}>
                <Trash2 size={14} /> Excluir
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
