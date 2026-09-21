import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Sparkles, Send, Edit3, MessageSquare, Instagram, Facebook } from 'lucide-react';
import { Botao, Chip } from '../../componentes/ui';
import { data } from '../../lib/formato';

interface PostConteudoStorage {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  titulo: string;
  legenda: string;
  formato: string;
  rede: string;
  agendado_para: string | null;
  status: 'ideia' | 'producao' | 'aprovacao' | 'ajustes' | 'aprovado' | 'publicado';
  imagem_url?: string;
  comentario_ajuste?: string;
  token?: string;
}

export function AprovacaoPublica() {
  const { token } = useParams<{ token: string }>();
  const [post, setPost] = useState<PostConteudoStorage | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [comentarioAjuste, setComentarioAjuste] = useState('');
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false);
  const [sucessoAprovado, setSucessoAprovado] = useState(false);
  const [sucessoAjuste, setSucessoAjuste] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!token) {
      setErro('Link de aprovação inválido.');
      return;
    }

    try {
      const posts: PostConteudoStorage[] = JSON.parse(localStorage.getItem('atlas_conteudo') || '[]');
      const p = posts.find(item => item.token === token || item.id === token);
      if (!p) {
        setErro('Publicação ou criativo não encontrado.');
        return;
      }
      setPost(p);
      if (p.status === 'aprovado') {
        setSucessoAprovado(true);
      } else if (p.status === 'ajustes') {
        setSucessoAjuste(true);
      }
    } catch {
      setErro('Erro ao carregar os dados do criativo.');
    }
  }, [token]);

  const aprovar = () => {
    if (!post) return;
    setProcessando(true);
    try {
      const posts: PostConteudoStorage[] = JSON.parse(localStorage.getItem('atlas_conteudo') || '[]');
      const atualizados = posts.map(item => {
        if (item.id === post.id) {
          return {
            ...item,
            status: 'aprovado' as const,
            comentario_ajuste: undefined
          };
        }
        return item;
      });
      localStorage.setItem('atlas_conteudo', JSON.stringify(atualizados));
      setSucessoAprovado(true);
    } catch {
      alert('Erro ao aprovar publicação.');
    } finally {
      setProcessando(false);
    }
  };

  const solicitarAjustes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !comentarioAjuste.trim()) {
      alert('Por favor, descreva os ajustes necessários.');
      return;
    }
    setProcessando(true);
    try {
      const posts: PostConteudoStorage[] = JSON.parse(localStorage.getItem('atlas_conteudo') || '[]');
      const atualizados = posts.map(item => {
        if (item.id === post.id) {
          return {
            ...item,
            status: 'ajustes' as const,
            comentario_ajuste: comentarioAjuste
          };
        }
        return item;
      });
      localStorage.setItem('atlas_conteudo', JSON.stringify(atualizados));
      setModalAjusteAberto(false);
      setSucessoAjuste(true);
    } catch {
      alert('Erro ao enviar solicitação de ajustes.');
    } finally {
      setProcessando(false);
    }
  };

  if (erro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="vidro-painel" style={{ maxWidth: 480, width: '100%', padding: '32px 24px', borderRadius: 24, textAlign: 'center' }}>
          <AlertCircle size={44} className="erro" style={{ margin: '0 auto 16px' }} />
          <h2 className="titulo-card" style={{ fontSize: 20, marginBottom: 8 }}>Aviso</h2>
          <p className="secundario">{erro}</p>
        </div>
      </div>
    );
  }

  if (sucessoAprovado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="vidro-painel" style={{ maxWidth: 500, width: '100%', padding: '40px 28px', borderRadius: 24, textAlign: 'center' }}>
          <CheckCircle2 size={56} className="positivo" style={{ margin: '0 auto 16px' }} />
          <h2 className="titulo-card" style={{ fontSize: 24, marginBottom: 12 }}>Criativo Aprovado!</h2>
          <p style={{ fontSize: 16, marginBottom: 16 }}>
            Perfeito! O criativo <strong>"{post?.titulo}"</strong> foi aprovado com sucesso.
          </p>
          <p className="pequeno secundario">
            A equipe da <strong>Continental MKT</strong> já foi notificada e dará andamento ao agendamento e veiculação.
          </p>
        </div>
      </div>
    );
  }

  if (sucessoAjuste) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="vidro-painel" style={{ maxWidth: 500, width: '100%', padding: '40px 28px', borderRadius: 24, textAlign: 'center' }}>
          <Edit3 size={52} className="destaque" style={{ margin: '0 auto 16px' }} />
          <h2 className="titulo-card" style={{ fontSize: 22, marginBottom: 12 }}>Ajustes Solicitados</h2>
          <p style={{ fontSize: 15, marginBottom: 14 }}>
            Recebemos suas observações sobre <strong>"{post?.titulo}"</strong>.
          </p>
          <div className="vidro-painel" style={{ padding: '12px 16px', borderRadius: 14, textAlign: 'left', marginBottom: 16 }}>
            <p className="pequeno secundario">Seu comentário:</p>
            <p style={{ fontStyle: 'italic', marginTop: 4 }}>"{post?.comentario_ajuste || comentarioAjuste}"</p>
          </div>
          <p className="pequeno secundario">
            Nossa equipe já está fazendo as alterações e enviaremos a nova versão em breve.
          </p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="secundario">Carregando criativo...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px 64px', maxWidth: 620, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: 'var(--vidro-pilula)', border: '1px solid var(--vidro-borda)', marginBottom: 16 }}>
          <Sparkles size={18} className="destaque" />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Continental MKT</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 6 }}>
          Aprovação de Conteúdo
        </h1>
        <p className="secundario" style={{ fontSize: 15 }}>
          Revise a arte e a legenda da publicação abaixo para autorizar a veiculação.
        </p>
      </div>

      <div className="vidro-painel" style={{ borderRadius: 24, overflow: 'hidden', padding: '24px 20px', marginBottom: 20 }}>
        {/* Badges do Post */}
        <div className="linha entre" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <span className="titulo" style={{ fontSize: 18 }}>{post.titulo}</span>
          <div className="linha" style={{ gap: 6 }}>
            <Chip>{post.formato.toUpperCase()}</Chip>
            <Chip cor="destaque">{post.rede.toUpperCase()}</Chip>
            {post.agendado_para && <Chip>{data(post.agendado_para)}</Chip>}
          </div>
        </div>

        {/* Imagem do Criativo Otimizada */}
        {post.imagem_url ? (
          <div style={{ textAlign: 'center', marginBottom: 18, borderRadius: 16, overflow: 'hidden', background: '#000' }}>
            <img
              src={post.imagem_url}
              alt="Criativo"
              style={{ width: '100%', maxHeight: 480, objectFit: 'contain', display: 'block' }}
            />
          </div>
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--vidro-painel-b)', borderRadius: 16, marginBottom: 18 }}>
            <p className="secundario">Arte em formato carrossel / texto descritivo.</p>
          </div>
        )}

        {/* Legenda do Post */}
        {post.legenda && (
          <div style={{ background: 'var(--vidro-painel-a)', padding: '16px', borderRadius: 16, marginBottom: 16 }}>
            <p className="pequeno secundario" style={{ marginBottom: 6, fontWeight: 600 }}>Texto da Legenda:</p>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 14 }}>
              {post.legenda}
            </p>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="grade grade-2" style={{ gap: 12, marginTop: 18 }}>
          <button
            type="button"
            disabled={processando}
            onClick={() => setModalAjusteAberto(true)}
            className="btn btn-secundario vidro-pilula"
            style={{ padding: '16px', justifyContent: 'center', fontSize: 15 }}
          >
            <Edit3 size={16} /> Solicitar Ajustes
          </button>
          <button
            type="button"
            disabled={processando}
            onClick={aprovar}
            className="btn btn-primario"
            style={{ padding: '16px', justifyContent: 'center', fontSize: 15 }}
          >
            <CheckCircle2 size={18} /> Aprovar Publicação
          </button>
        </div>
      </div>

      {/* Modal para escrever ajustes */}
      {modalAjusteAberto && (
        <div className="sobreposicao" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="modal" style={{ maxWidth: 500, width: '100%' }}>
            <h3 className="titulo-card" style={{ marginBottom: 10 }}>O que gostaria de ajustar?</h3>
            <p className="pequeno secundario" style={{ marginBottom: 14 }}>
              Descreva com detalhes o que devemos alterar na imagem ou no texto:
            </p>
            <form onSubmit={solicitarAjustes}>
              <textarea
                className="entrada"
                rows={5}
                required
                autoFocus
                value={comentarioAjuste}
                onChange={e => setComentarioAjuste(e.target.value)}
                placeholder="Ex: Gostaria de trocar a imagem de fundo por outra, e ajustar o número do WhatsApp na legenda..."
                style={{ width: '100%', marginBottom: 14 }}
              />
              <div className="linha entre">
                <Botao onClick={() => setModalAjusteAberto(false)}>Cancelar</Botao>
                <Botao variante="primario" type="submit" disabled={processando}>
                  <Send size={14} /> Enviar Ajustes
                </Botao>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
