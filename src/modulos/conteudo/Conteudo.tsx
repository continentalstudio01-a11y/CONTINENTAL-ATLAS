import { useState, useMemo } from 'react';
import {
  Image as ImageIcon, Plus, Trash2, ChevronRight, CheckCircle2, Calendar,
  Upload, Copy, Send, ExternalLink, Edit3, Sparkles
} from 'lucide-react';
import { Botao, BotaoIcone, CabecalhoTela, Campo, Card, Chip, Modal, Vazio, AssistenteTexto, useAvisar } from '../../componentes/ui';
import { useLista } from '../../lib/hooks';
import { data, hoje, nomeMes, mesDe, somarMeses } from '../../lib/formato';
import { novoId } from '../../lib/ids';
import { comprimirImagem } from '../../lib/compressor';
import type { Cliente } from '../../lib/tipos';

export interface PostConteudo {
  id: string;
  cliente_id: string;
  titulo: string;
  legenda: string;
  formato: 'feed' | 'carrossel' | 'reels' | 'story';
  rede: 'instagram' | 'facebook' | 'ambos';
  agendado_para: string | null;
  status: 'ideia' | 'producao' | 'aprovacao' | 'ajustes' | 'aprovado' | 'publicado';
  observacoes: string;
  imagem_url?: string;
  token?: string;
  comentario_ajuste?: string;
  criado_em: string;
  atualizado_em: string;
}

function carregar(): PostConteudo[] {
  try { return JSON.parse(localStorage.getItem('atlas_conteudo') || '[]'); } catch { return []; }
}
function salvarStorage(l: PostConteudo[]) { localStorage.setItem('atlas_conteudo', JSON.stringify(l)); }

const COR_STATUS: Record<PostConteudo['status'], 'ok' | 'atencao' | 'destaque' | 'erro' | undefined> = {
  ideia: undefined,
  producao: 'destaque',
  aprovacao: 'atencao',
  ajustes: 'erro',
  aprovado: 'ok',
  publicado: 'ok',
};
const LABEL_STATUS: Record<PostConteudo['status'], string> = {
  ideia: 'Ideia',
  producao: 'Em Produção',
  aprovacao: 'Aguardando Aprovação do Cliente',
  ajustes: 'Ajustes Solicitados pelo Cliente',
  aprovado: 'Aprovado pelo Cliente',
  publicado: 'Publicado',
};

const PROXIMOS_STATUS: Record<PostConteudo['status'], PostConteudo['status'] | null> = {
  ideia: 'producao',
  producao: 'aprovacao',
  aprovacao: 'aprovado',
  ajustes: 'producao',
  aprovado: 'publicado',
  publicado: null,
};

const LABEL_AVANCAR: Record<PostConteudo['status'], string> = {
  ideia: 'Iniciar Produção',
  producao: 'Enviar p/ Aprovação',
  aprovacao: 'Aprovar Diretamente',
  ajustes: 'Reenviar p/ Produção',
  aprovado: 'Marcar Publicado',
  publicado: '',
};

const DATAS_COMEMORATIVAS = [
  { data: '--01-01', nome: 'Ano Novo' }, { data: '--02-14', nome: 'Dia dos Namorados' },
  { data: '--03-08', nome: 'Dia da Mulher' }, { data: '--05-12', nome: 'Dia das Mães' },
  { data: '--06-12', nome: 'Dia dos Namorados' }, { data: '--08-13', nome: 'Dia dos Pais' },
  { data: '--10-12', nome: 'Dia das Crianças' }, { data: '--11-15', nome: 'Proclamação da República' },
  { data: '--11-20', nome: 'Consciência Negra' }, { data: '--11-25', nome: 'Black Friday' },
  { data: '--12-25', nome: 'Natal' },
];

export function Conteudo() {
  const [posts, setPosts] = useState<PostConteudo[]>(carregar);
  const clientes = useLista<Cliente>('clientes') ?? [];
  const avisar = useAvisar();

  const [mesAtual, setMesAtual] = useState(() => mesDe(hoje()));
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [formAberto, setFormAberto] = useState(false);
  const [detalhes, setDetalhes] = useState<PostConteudo | null>(null);

  // Form states
  const [form, setForm] = useState({
    cliente_id: '', titulo: '', legenda: '', formato: 'feed' as PostConteudo['formato'],
    rede: 'instagram' as PostConteudo['rede'], agendado_para: '', observacoes: '',
    imagem_url: ''
  });

  const [comprimindo, setComprimindo] = useState(false);
  const [infoCompressao, setInfoCompressao] = useState<string | null>(null);

  const salvar = (lista: PostConteudo[]) => { setPosts(lista); salvarStorage(lista); };
  const set = (f: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const doMes = useMemo(() => {
    let l = posts.filter(p => p.agendado_para ? p.agendado_para.startsWith(mesAtual) : p.criado_em.startsWith(mesAtual));
    if (clienteFiltro) l = l.filter(p => p.cliente_id === clienteFiltro);
    if (statusFiltro !== 'todos') l = l.filter(p => p.status === statusFiltro);
    return l.sort((a, b) => (a.agendado_para ?? a.criado_em).localeCompare(b.agendado_para ?? b.criado_em));
  }, [posts, mesAtual, clienteFiltro, statusFiltro]);

  const processarArquivoImagem = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      avisar('Selecione apenas arquivos de imagem.');
      return;
    }
    setComprimindo(true);
    setInfoCompressao(null);
    try {
      const res = await comprimirImagem(file);
      setForm(prev => ({ ...prev, imagem_url: res.dataUrl }));
      const economia = Math.round((1 - res.tamanhoKbComprimido / res.tamanhoKbOriginal) * 100);
      setInfoCompressao(`Imagem comprimida: de ${res.tamanhoKbOriginal} KB para ${res.tamanhoKbComprimido} KB (economia de ${economia}% sem perda visual)!`);
      avisar('Imagem otimizada com sucesso!');
    } catch {
      avisar('Erro ao comprimir imagem.');
    } finally {
      setComprimindo(false);
    }
  };

  const criarPost = () => {
    if (!form.cliente_id || !form.titulo.trim()) { avisar('Preencha cliente e título.'); return; }
    const agora = new Date().toISOString();
    const novo: PostConteudo = {
      id: novoId(),
      ...form,
      agendado_para: form.agendado_para || null,
      status: 'ideia',
      token: novoId().replace(/-/g, '').slice(0, 16),
      criado_em: agora,
      atualizado_em: agora,
    };
    salvar([novo, ...posts]);
    setFormAberto(false);
    setInfoCompressao(null);
    avisar('Post e criativo criados');
  };

  const avancar = (p: PostConteudo) => {
    const prox = PROXIMOS_STATUS[p.status];
    if (!prox) return;
    const upd = { ...p, status: prox, atualizado_em: new Date().toISOString() };
    salvar(posts.map(x => x.id === p.id ? upd : x));
    setDetalhes(upd);
    avisar(LABEL_STATUS[prox]);
  };

  const copiarLinkAprovacao = (p: PostConteudo) => {
    const link = `${window.location.origin}/aprovar/${p.token || p.id}`;
    navigator.clipboard?.writeText(link).then(() => avisar('Link de aprovação copiado!'));
  };

  const enviarWhatsAppAprovacao = (p: PostConteudo) => {
    const link = `${window.location.origin}/aprovar/${p.token || p.id}`;
    const cli = clientes.find(c => c.id === p.cliente_id);
    const msg = encodeURIComponent(
      `Olá ${cli?.nome || 'Cliente'}! 👋\n\n` +
      `Preparamos a arte e a legenda da publicação *"${p.titulo}"* para aprovação:\n\n` +
      `👉 ${link}\n\n` +
      `Você pode conferir a imagem direto pelo celular e clicar em Aprovar ou solicitar qualquer ajuste. Obrigado!`
    );
    const tel = (cli?.whatsapp || cli?.telefone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${tel ? '55' + tel : ''}?text=${msg}`, '_blank');
  };

  const excluir = (id: string) => {
    salvar(posts.filter(p => p.id !== id));
    setDetalhes(null);
    avisar('Post excluído');
  };

  const comemMes = DATAS_COMEMORATIVAS.filter(c => c.data.slice(3, 5) === mesAtual.slice(5, 7));

  return (
    <>
      <CabecalhoTela
        titulo="Calendário de Conteúdo & Criativos"
        icone={<ImageIcon size={28} strokeWidth={1.6} />}
        subtitulo="Planejamento de posts, upload e compressão de criativos leves e aprovação por link com o cliente"
        acoes={
          <Botao variante="primario" onClick={() => {
            setForm({ cliente_id: '', titulo: '', legenda: '', formato: 'feed', rede: 'instagram', agendado_para: '', observacoes: '', imagem_url: '' });
            setInfoCompressao(null);
            setFormAberto(true);
          }}>
            <Plus size={17} /> Novo Post / Criativo
          </Botao>
        }
      />

      {/* Controles de mês */}
      <div className="linha" style={{ gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Botao onClick={() => setMesAtual(somarMeses(mesAtual, -1))}>← Mês Anterior</Botao>
        <span className="titulo" style={{ flex: 1, textAlign: 'center', fontSize: 18 }}>{nomeMes(mesAtual)}</span>
        <Botao onClick={() => setMesAtual(somarMeses(mesAtual, 1))}>Próximo Mês →</Botao>
        <select className="entrada" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select className="entrada" value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} style={{ width: 'auto' }}>
          <option value="todos">Todos os status</option>
          {Object.entries(LABEL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Datas comemorativas do mês */}
      {comemMes.length > 0 && (
        <div className="linha" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Calendar size={14} className="secundario" />
          <span className="pequeno secundario">Datas Comemorativas:</span>
          {comemMes.map(c => <Chip key={c.data}>{c.data.slice(1)} {c.nome}</Chip>)}
        </div>
      )}

      {doMes.length === 0 ? (
        <Vazio texto={`Nenhum post planejado para ${nomeMes(mesAtual, false)}.`}
          acao={<Botao variante="primario" onClick={() => setFormAberto(true)}><Plus size={15} /> Criar Post</Botao>} />
      ) : (
        <Card>
          <div className="lista">
            {doMes.map(p => (
              <div key={p.id} className="item" onClick={() => setDetalhes(p)} style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 10, flex: 'none' }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--vidro-painel-b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <ImageIcon size={22} className="secundario" />
                  </div>
                )}
                <div className="cresce">
                  <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span className="titulo" style={{ fontSize: 15 }}>{p.titulo}</span>
                    <Chip cor={COR_STATUS[p.status]}>{LABEL_STATUS[p.status]}</Chip>
                    <Chip>{p.formato.toUpperCase()}</Chip>
                    <Chip cor="destaque">{p.rede.toUpperCase()}</Chip>
                  </div>
                  <div className="pequeno secundario" style={{ marginTop: 2 }}>
                    Cliente: <strong>{clientes.find(c => c.id === p.cliente_id)?.nome}</strong>
                    {p.agendado_para ? ` · Agendado para ${data(p.agendado_para)}` : ''}
                  </div>
                  {p.comentario_ajuste && (
                    <p className="pequeno" style={{ color: '#B42318', marginTop: 4 }}>
                      ⚠️ Ajuste pedido pelo cliente: "{p.comentario_ajuste}"
                    </p>
                  )}
                </div>
                <ChevronRight size={18} className="secundario" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Criar Post com Upload e Compressor */}
      <Modal titulo="Novo Post & Criativo" aberto={formAberto} aoFechar={() => setFormAberto(false)}
        rodape={<Botao variante="primario" onClick={criarPost}>Salvar Post</Botao>}>
        <div className="coluna" style={{ gap: 12 }}>
          <Campo rotulo="Cliente *">
            <select className="entrada" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
              <option value="">Selecionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>

          <Campo rotulo="Título do Post / Criativo *">
            <input className="entrada" value={form.titulo} onChange={e => set('titulo', e.target.value)} autoFocus placeholder="Ex: Post Promocional de Sexta-feira" />
          </Campo>

          {/* Upload com Arraste e Solte e Compressor */}
          <div className="vidro-painel" style={{ padding: '16px', borderRadius: 16 }}>
            <p className="pequeno secundario" style={{ marginBottom: 6, fontWeight: 600 }}>
              Arte do Criativo (Compressor Automático Embutido)
            </p>
            <p className="pequeno secundario" style={{ marginBottom: 10 }}>
              Arraste ou selecione imagens pesadas (PNG/JPG até 20MB) — o sistema comprime sozinho para menos de 200KB sem travar nada:
            </p>

            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) processarArquivoImagem(file);
              }}
              style={{
                border: '2px dashed var(--vidro-borda)',
                borderRadius: 14,
                padding: '20px',
                textAlign: 'center',
                background: 'var(--vidro-painel-a)',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('input-criativo')?.click()}
            >
              <Upload size={26} className="destaque" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                {comprimindo ? 'Comprimindo e otimizando imagem...' : 'Clique ou arraste a imagem do criativo aqui'}
              </p>
              <input
                id="input-criativo"
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) processarArquivoImagem(file);
                }}
              />
            </div>

            {infoCompressao && (
              <p className="pequeno positivo" style={{ marginTop: 8 }}>
                ✨ {infoCompressao}
              </p>
            )}

            {form.imagem_url && (
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={form.imagem_url} alt="Prévia" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} />
                <Botao onClick={() => { setForm(prev => ({ ...prev, imagem_url: '' })); setInfoCompressao(null); }}>
                  Remover Imagem
                </Botao>
              </div>
            )}
          </div>

          <Campo rotulo="Texto da Legenda" acao={<AssistenteTexto valor={form.legenda} aoCorrigir={v => set('legenda', v)} />}>
            <textarea className="entrada" rows={3} value={form.legenda} onChange={e => set('legenda', e.target.value)} placeholder="Texto que vai na publicação..." />
          </Campo>

          <div className="grade grade-2">
            <Campo rotulo="Formato">
              <select className="entrada" value={form.formato} onChange={e => set('formato', e.target.value as PostConteudo['formato'])}>
                <option value="feed">Feed (Quadrado / 4:5)</option>
                <option value="carrossel">Carrossel</option>
                <option value="reels">Reels / Vídeo Vertical</option>
                <option value="story">Story</option>
              </select>
            </Campo>
            <Campo rotulo="Rede">
              <select className="entrada" value={form.rede} onChange={e => set('rede', e.target.value as PostConteudo['rede'])}>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="ambos">Instagram + Facebook</option>
              </select>
            </Campo>
          </div>

          <Campo rotulo="Data Agendada">
            <input className="entrada" type="date" value={form.agendado_para} onChange={e => set('agendado_para', e.target.value)} />
          </Campo>
        </div>
      </Modal>

      {/* Modal Detalhes do Post */}
      <Modal titulo={detalhes?.titulo ?? ''} aberto={!!detalhes} aoFechar={() => setDetalhes(null)}>
        {detalhes && (
          <div className="coluna" style={{ gap: 16 }}>
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip cor={COR_STATUS[detalhes.status]}>{LABEL_STATUS[detalhes.status]}</Chip>
              <Chip>{detalhes.formato.toUpperCase()}</Chip>
              <Chip cor="destaque">{detalhes.rede.toUpperCase()}</Chip>
              {detalhes.agendado_para && <span className="secundario pequeno">Agendado: {data(detalhes.agendado_para)}</span>}
            </div>

            {/* Prévia da Imagem */}
            {detalhes.imagem_url && (
              <div style={{ textAlign: 'center', borderRadius: 14, overflow: 'hidden', background: '#000', maxHeight: 320 }}>
                <img src={detalhes.imagem_url} alt="" style={{ width: '100%', maxHeight: 320, objectFit: 'contain' }} />
              </div>
            )}

            {/* Ajuste solicitado */}
            {detalhes.comentario_ajuste && (
              <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14, borderLeft: '4px solid #B42318' }}>
                <p className="pequeno" style={{ color: '#B42318', fontWeight: 600 }}>Solicitação de Ajuste do Cliente:</p>
                <p style={{ marginTop: 4 }}>"{detalhes.comentario_ajuste}"</p>
              </div>
            )}

            {detalhes.legenda && (
              <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
                <p className="pequeno secundario" style={{ marginBottom: 4, fontWeight: 600 }}>Legenda:</p>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{detalhes.legenda}</p>
              </div>
            )}

            {/* Link de Aprovação do Cliente */}
            <div className="vidro-painel" style={{ padding: '12px 14px', borderRadius: 14 }}>
              <p className="pequeno secundario" style={{ marginBottom: 4 }}>Link de aprovação para o cliente:</p>
              <div className="linha" style={{ gap: 8 }}>
                <input
                  className="entrada pequeno"
                  readOnly
                  value={`${window.location.origin}/aprovar/${detalhes.token || detalhes.id}`}
                  style={{ flex: 1, fontFamily: 'monospace' }}
                />
                <Botao onClick={() => copiarLinkAprovacao(detalhes)}><Copy size={13} /></Botao>
                <Botao onClick={() => window.open(`/aprovar/${detalhes.token || detalhes.id}`, '_blank')}>
                  <ExternalLink size={13} />
                </Botao>
              </div>
            </div>

            {/* Ações */}
            <div className="linha" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Botao onClick={() => enviarWhatsAppAprovacao(detalhes)}>
                <Send size={14} /> Enviar Aprovação no WhatsApp
              </Botao>
              {PROXIMOS_STATUS[detalhes.status] && (
                <Botao variante="primario" onClick={() => avancar(detalhes)}>
                  <CheckCircle2 size={14} /> {LABEL_AVANCAR[detalhes.status]}
                </Botao>
              )}
              <Botao variante="perigo" onClick={() => { if (confirm('Excluir este post?')) excluir(detalhes.id); }}>
                <Trash2 size={14} /> Excluir
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
