import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Send, Clock, Sparkles } from 'lucide-react';
import { Botao, Campo, Card, Chip } from '../../componentes/ui';

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

interface BriefingStorage {
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

const MODELOS: Record<string, BriefingPergunta[]> = {
  trafego: [
    { id: '1', texto: 'Qual o principal objetivo dos seus anúncios?', tipo: 'texto_longo', obrigatoria: true },
    { id: '2', texto: 'Qual a verba mensal disponível para investir em anúncios?', tipo: 'texto', obrigatoria: true },
    { id: '3', texto: 'Você já anunciou antes no Meta Ads ou Google Ads? Como foi a experiência?', tipo: 'texto_longo', obrigatoria: false },
    { id: '4', texto: 'Quem é o seu cliente ideal (idade, cidade, gênero, profissão, dores)?', tipo: 'texto_longo', obrigatoria: true },
    { id: '5', texto: 'Qual é o principal produto ou serviço que vamos divulgar?', tipo: 'texto_longo', obrigatoria: true },
    { id: '6', texto: 'Você tem site, landing page ou o destino será o WhatsApp?', tipo: 'texto', obrigatoria: true },
    { id: '7', texto: 'Quais são os seus principais concorrentes diretos?', tipo: 'texto_longo', obrigatoria: false },
    { id: '8', texto: 'O que a sua empresa tem de melhor em relação a eles (diferencial)?', tipo: 'texto_longo', obrigatoria: true },
  ],
  site: [
    { id: '1', texto: 'Qual o objetivo principal do site (vender, gerar contatos no WhatsApp, catálogo)?', tipo: 'texto_longo', obrigatoria: true },
    { id: '2', texto: 'Você já tem domínio registrado (ex: seunome.com.br)? Se sim, qual?', tipo: 'texto', obrigatoria: false },
    { id: '3', texto: 'Quais páginas ou seções o site precisa ter (Início, Sobre, Serviços, Contato)?', tipo: 'texto_longo', obrigatoria: true },
    { id: '4', texto: 'Cole aqui links de sites ou referências visuais que você acha bonitos:', tipo: 'texto_longo', obrigatoria: false },
    { id: '5', texto: 'Você já tem logo em boa resolução e identidade visual definida?', tipo: 'sim_nao', obrigatoria: true },
    { id: '6', texto: 'Tem fotos reais do seu negócio/equipe ou precisará de fotos de banco de imagens?', tipo: 'texto', obrigatoria: true },
  ],
  social: [
    { id: '1', texto: 'Quais redes sociais vamos gerenciar (Instagram, Facebook, LinkedIn)?', tipo: 'texto', obrigatoria: true },
    { id: '2', texto: 'Quantas publicações por semana foram alinhadas?', tipo: 'texto', obrigatoria: true },
    { id: '3', texto: 'Quem é o seu público e o que ele busca no seu perfil?', tipo: 'texto_longo', obrigatoria: true },
    { id: '4', texto: 'Qual o tom de voz da marca (formal, jovem, descontraído, autoritário)?', tipo: 'texto_longo', obrigatoria: true },
    { id: '5', texto: 'Existe algum assunto ou termo que é PROIBIDO citar nas postagens?', tipo: 'texto_longo', obrigatoria: false },
  ],
  gmn: [
    { id: '1', texto: 'Você já possui ficha no Google Meu Negócio / Google Maps criada?', tipo: 'sim_nao', obrigatoria: true },
    { id: '2', texto: 'Qual o endereço completo com CEP que deve aparecer no Google?', tipo: 'texto_longo', obrigatoria: true },
    { id: '3', texto: 'Quais são os horários e dias exatos de funcionamento?', tipo: 'texto_longo', obrigatoria: true },
    { id: '4', texto: 'Telefone e WhatsApp oficial para os clientes ligarem:', tipo: 'texto', obrigatoria: true },
    { id: '5', texto: 'Lista dos principais serviços ou produtos oferecidos:', tipo: 'texto_longo', obrigatoria: true },
  ]
};

export function BriefingPublico() {
  const { token } = useParams<{ token: string }>();
  const [briefing, setBriefing] = useState<BriefingStorage | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) {
      setErro('Link de briefing inválido.');
      return;
    }

    try {
      const lista: BriefingStorage[] = JSON.parse(localStorage.getItem('atlas_briefings') || '[]');
      const b = lista.find(item => item.token === token);

      if (!b) {
        setErro('Briefing não encontrado. Verifique se o link está correto.');
        return;
      }

      if (b.status === 'respondido') {
        setBriefing(b);
        setSucesso(true);
        return;
      }

      const hoje = new Date().toISOString().slice(0, 10);
      if (b.validade && b.validade < hoje) {
        setErro('Este link de briefing expirou. Por favor, solicite um novo link à Continental MKT.');
        return;
      }

      setBriefing(b);

      // Carregar rascunho salvo no navegador do cliente se houver
      const rascunho = localStorage.getItem(`rascunho_briefing_${token}`);
      if (rascunho) {
        try { setRespostas(JSON.parse(rascunho)); } catch {}
      } else if (b.respostas) {
        setRespostas(b.respostas);
      }
    } catch {
      setErro('Erro ao carregar os dados do briefing.');
    }
  }, [token]);

  // Salvar rascunho automático enquanto o cliente digita
  const setResposta = (id: string, valor: string) => {
    const novo = { ...respostas, [id]: valor };
    setRespostas(novo);
    if (token) {
      localStorage.setItem(`rascunho_briefing_${token}`, JSON.stringify(novo));
    }
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefing || !token) return;

    const perguntas = MODELOS[briefing.modelo_id] || MODELOS.trafego;

    // Validação de campos obrigatórios
    for (const p of perguntas) {
      if (p.obrigatoria && (!respostas[p.id] || !respostas[p.id].trim())) {
        alert(`Por favor, responda a pergunta: "${p.texto}"`);
        return;
      }
    }

    setEnviando(true);

    try {
      const lista: BriefingStorage[] = JSON.parse(localStorage.getItem('atlas_briefings') || '[]');
      const agora = new Date().toISOString();

      const atualizado = lista.map(item => {
        if (item.token === token) {
          return {
            ...item,
            status: 'respondido' as const,
            respostas,
            respondido_em: agora
          };
        }
        return item;
      });

      localStorage.setItem('atlas_briefings', JSON.stringify(atualizado));
      localStorage.removeItem(`rascunho_briefing_${token}`);

      setSucesso(true);
    } catch {
      alert('Houve um erro ao enviar suas respostas. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (erro) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="vidro-painel" style={{ maxWidth: 500, width: '100%', padding: '32px 24px', borderRadius: 24, textAlign: 'center' }}>
          <AlertCircle size={48} className="erro" style={{ margin: '0 auto 16px' }} />
          <h2 className="titulo-card" style={{ fontSize: 22, marginBottom: 8 }}>Aviso</h2>
          <p className="secundario">{erro}</p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="vidro-painel" style={{ maxWidth: 540, width: '100%', padding: '40px 28px', borderRadius: 24, textAlign: 'center' }}>
          <CheckCircle2 size={56} className="positivo" style={{ margin: '0 auto 16px' }} />
          <h2 className="titulo-card" style={{ fontSize: 24, marginBottom: 12 }}>Briefing Enviado com Sucesso!</h2>
          <p style={{ fontSize: 16, marginBottom: 16 }}>
            Obrigado, <strong>{briefing?.cliente_nome}</strong>! Suas respostas sobre <strong>{briefing?.modelo_nome}</strong> foram registradas com sucesso.
          </p>
          <p className="pequeno secundario">
            A equipe da <strong>Continental MKT</strong> já tem acesso a todas as suas informações para dar início aos trabalhos. Você pode fechar esta página.
          </p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="secundario">Carregando briefing...</p>
      </div>
    );
  }

  const perguntas = MODELOS[briefing.modelo_id] || MODELOS.trafego;

  return (
    <div style={{ minHeight: '100vh', padding: '32px 16px 64px', maxWidth: 680, margin: '0 auto' }}>
      {/* Topo com Identidade Continental MKT */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: 'var(--vidro-pilula)', border: '1px solid var(--vidro-borda)', marginBottom: 16 }}>
          <Sparkles size={18} className="destaque" />
          <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Continental MKT</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Briefing de {briefing.modelo_nome}
        </h1>
        <p className="secundario" style={{ fontSize: 15 }}>
          Olá, <strong>{briefing.cliente_nome}</strong>. Responda às perguntas abaixo para alinharmos e executarmos a sua estratégia com máxima precisão.
        </p>
      </div>

      <form onSubmit={enviar} className="coluna" style={{ gap: 20 }}>
        {perguntas.map((p, index) => (
          <div key={p.id} className="vidro-painel" style={{ padding: '20px 22px', borderRadius: 20 }}>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span className="num secundario" style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>
                  {String(index + 1).padStart(2, '0')}.
                </span>
                <span style={{ fontSize: 16, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
                  {p.texto} {p.obrigatoria && <span style={{ color: '#B42318' }}>*</span>}
                </span>
              </div>
            </label>

            {p.tipo === 'texto_longo' && (
              <textarea
                className="entrada"
                rows={4}
                required={p.obrigatoria}
                value={respostas[p.id] || ''}
                onChange={e => setResposta(p.id, e.target.value)}
                placeholder="Digite sua resposta com o máximo de detalhes..."
                style={{ width: '100%', resize: 'vertical' }}
              />
            )}

            {p.tipo === 'texto' && (
              <input
                className="entrada"
                type="text"
                required={p.obrigatoria}
                value={respostas[p.id] || ''}
                onChange={e => setResposta(p.id, e.target.value)}
                placeholder="Sua resposta..."
                style={{ width: '100%' }}
              />
            )}

            {p.tipo === 'sim_nao' && (
              <div className="linha" style={{ gap: 16 }}>
                <label className="marcador" style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`pergunta_${p.id}`}
                    required={p.obrigatoria}
                    checked={respostas[p.id] === 'Sim'}
                    onChange={() => setResposta(p.id, 'Sim')}
                  />
                  <span>Sim</span>
                </label>
                <label className="marcador" style={{ cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`pergunta_${p.id}`}
                    required={p.obrigatoria}
                    checked={respostas[p.id] === 'Não'}
                    onChange={() => setResposta(p.id, 'Não')}
                  />
                  <span>Não</span>
                </label>
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button
            type="submit"
            disabled={enviando}
            className="btn btn-primario"
            style={{ width: '100%', padding: '18px', fontSize: 17, justifyContent: 'center' }}
          >
            <Send size={18} />
            {enviando ? 'Enviando...' : 'Finalizar e Enviar Briefing'}
          </button>
          <p className="pequeno secundario" style={{ marginTop: 14 }}>
            🔒 Suas respostas são salvas automaticamente enquanto você digita e enviadas em ambiente seguro.
          </p>
        </div>
      </form>
    </div>
  );
}
