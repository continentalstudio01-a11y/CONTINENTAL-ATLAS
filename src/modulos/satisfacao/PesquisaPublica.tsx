import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, HeartHandshake, Send, Sparkles } from 'lucide-react';

interface PesquisaStorage {
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

export function PesquisaPublica() {
  const { token } = useParams<{ token: string }>();
  const [pesquisa, setPesquisa] = useState<PesquisaStorage | null>(null);
  const [notaSel, setNotaSel] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) {
      setErro('Link de avaliação inválido.');
      return;
    }
    try {
      const lista: PesquisaStorage[] = JSON.parse(localStorage.getItem('atlas_nps') || '[]');
      const p = lista.find(item => item.token === token);
      if (!p) {
        setErro('Pesquisa de satisfação não encontrada.');
        return;
      }
      if (p.status === 'respondida') {
        setPesquisa(p);
        setSucesso(true);
        return;
      }
      setPesquisa(p);
    } catch {
      setErro('Erro ao carregar a avaliação.');
    }
  }, [token]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (notaSel === null) {
      alert('Por favor, selecione uma nota de 0 a 10.');
      return;
    }
    setEnviando(true);
    try {
      const lista: PesquisaStorage[] = JSON.parse(localStorage.getItem('atlas_nps') || '[]');
      const agora = new Date().toISOString();
      const atualizadas = lista.map(item => {
        if (item.token === token) {
          return {
            ...item,
            nota: notaSel,
            comentario,
            status: 'respondida' as const,
            respondido_em: agora
          };
        }
        return item;
      });
      localStorage.setItem('atlas_nps', JSON.stringify(atualizadas));
      setSucesso(true);
    } catch {
      alert('Erro ao registrar resposta.');
    } finally {
      setEnviando(false);
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

  if (sucesso) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="vidro-painel" style={{ maxWidth: 500, width: '100%', padding: '40px 28px', borderRadius: 24, textAlign: 'center' }}>
          <CheckCircle2 size={56} className="positivo" style={{ margin: '0 auto 16px' }} />
          <h2 className="titulo-card" style={{ fontSize: 24, marginBottom: 12 }}>Muito obrigado pela avaliação!</h2>
          <p style={{ fontSize: 16, marginBottom: 12 }}>
            Sua opinião é fundamental para aprimorarmos os serviços prestados pela <strong>Continental MKT</strong> para você, <strong>{pesquisa?.cliente_nome}</strong>.
          </p>
          <p className="pequeno secundario">
            Sua avaliação foi registrada em segurança. Tenha um excelente dia!
          </p>
        </div>
      </div>
    );
  }

  if (!pesquisa) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="secundario">Carregando pesquisa...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '36px 16px', maxWidth: 620, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: 'var(--vidro-pilula)', border: '1px solid var(--vidro-borda)', marginBottom: 16 }}>
          <Sparkles size={18} className="destaque" />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Continental MKT</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Pesquisa de Satisfação
        </h1>
        <p className="secundario" style={{ fontSize: 15 }}>
          Olá, <strong>{pesquisa.cliente_nome}</strong>! Em uma escala de 0 a 10, qual a probabilidade de você recomendar a Continental MKT para um amigo ou parceiro de negócios?
        </p>
      </div>

      <form onSubmit={enviar} className="coluna" style={{ gap: 20 }}>
        <div className="vidro-painel" style={{ padding: '24px 20px', borderRadius: 24, textAlign: 'center' }}>
          {/* Seletor de 0 a 10 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '14px 0' }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
              const selecionado = notaSel === n;
              const cor = n <= 6 ? '#B42318' : n <= 8 ? '#C98A1B' : '#2E8B57';
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNotaSel(n)}
                  style={{
                    width: 44,
                    height: 48,
                    borderRadius: 12,
                    fontSize: 18,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: selecionado ? `2px solid ${cor}` : '1px solid var(--vidro-borda)',
                    background: selecionado ? cor : 'var(--vidro-painel-a)',
                    color: selecionado ? '#fff' : 'inherit',
                    boxShadow: selecionado ? `0 4px 14px ${cor}40` : 'none'
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <div className="linha entre pequeno secundario" style={{ maxWidth: 440, margin: '8px auto 0' }}>
            <span>Pouco provável (0)</span>
            <span>Muito provável (10)</span>
          </div>
        </div>

        <div className="vidro-painel" style={{ padding: '20px 22px', borderRadius: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            O que motivou a sua nota? Tem alguma sugestão ou ponto de melhoria? (Opcional)
          </label>
          <textarea
            className="entrada"
            rows={4}
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Conte-nos o que achou dos resultados, atendimento ou prazos..."
            style={{ width: '100%' }}
          />
        </div>

        <button
          type="submit"
          disabled={enviando || notaSel === null}
          className="btn btn-primario"
          style={{ width: '100%', padding: '18px', fontSize: 17, justifyContent: 'center' }}
        >
          <Send size={18} />
          {enviando ? 'Enviando...' : 'Enviar Avaliação'}
        </button>
      </form>
    </div>
  );
}
