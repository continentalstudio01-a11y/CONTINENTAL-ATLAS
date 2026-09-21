import { createContext, useCallback, useContext, useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { ChevronRight, X, Wand2 } from 'lucide-react';
import { usePreferencias } from '../lib/hooks';
import { aprimorarTexto, corrigirTextoPtBr } from '../lib/corretor';

// ---------- botões ----------
type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo';
  icone?: ReactNode;
  bolinha?: boolean;
};
export function Botao({ variante = 'secundario', icone, bolinha, children, className = '', ...resto }: BotaoProps) {
  const classe = variante === 'secundario' ? 'btn btn-secundario vidro-pilula' : `btn btn-${variante}`;
  const comBolinha = variante === 'primario' && bolinha !== false;
  return (
    <button type="button" className={`${classe} ${variante === 'primario' && !comBolinha ? 'sem-bolinha' : ''} ${className}`} {...resto}>
      {icone}
      {children}
      {comBolinha && <span className="bolinha" aria-hidden="true"><ChevronRight size={17} strokeWidth={1.9} /></span>}
    </button>
  );
}

export function BotaoIcone({ rotulo, children, ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string }) {
  return <button type="button" className="btn btn-fantasma btn-icone" aria-label={rotulo} title={rotulo} {...resto}>{children}</button>;
}

// ---------- campos & corretor de texto ----------
export function Campo({ rotulo, erro, children, inteiro, acao }: { rotulo: string; erro?: string | null; children: ReactNode; inteiro?: boolean; acao?: ReactNode }) {
  return (
    <label className={`campo ${inteiro ? 'inteiro' : ''}`}>
      <div className="linha entre" style={{ marginBottom: 2 }}>
        <span>{rotulo}</span>
        {acao}
      </div>
      {children}
      {erro && <small className="erro">{erro}</small>}
    </label>
  );
}

export function Marcador({ rotulo, marcado, aoMudar }: { rotulo: string; marcado: boolean; aoMudar: (v: boolean) => void }) {
  return (
    <label className="marcador">
      <input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} />
      <span>{rotulo}</span>
    </label>
  );
}

// Assistente / Botão de Correção Rápida para Textareas e Inputs
export function AssistenteTexto({
  valor,
  aoCorrigir,
  tipo = 'completo',
}: {
  valor: string;
  aoCorrigir: (novoTexto: string) => void;
  tipo?: 'simples' | 'completo';
}) {
  const { corretor } = usePreferencias();
  const avisar = useAvisar();
  if (!corretor || !valor?.trim()) return null;

  const aplicar = (modo: 'ortografia' | 'profissional' | 'comercial' | 'whatsapp') => {
    let t = valor;
    if (modo === 'ortografia') {
      t = corrigirTextoPtBr(valor);
      avisar('Ortografia e pontuação corrigidas!');
    } else if (modo === 'profissional') {
      t = aprimorarTexto(valor, { tom: 'profissional' });
      avisar('Tom formal/profissional aplicado!');
    } else if (modo === 'comercial') {
      t = aprimorarTexto(valor, { tom: 'comercial' });
      avisar('Tom persuasivo/comercial aplicado!');
    } else if (modo === 'whatsapp') {
      t = aprimorarTexto(valor, { tom: 'amigavel', formatarWhatsapp: true });
      avisar('Formatado com estilo para WhatsApp!');
    }
    aoCorrigir(t);
  };

  return (
    <div className="linha" style={{ gap: 4 }}>
      <button
        type="button"
        title="Corrigir erros de português e pontuação"
        className="pequeno"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); aplicar('ortografia'); }}
        style={{
          border: 0,
          background: 'var(--vidro-pilula)',
          padding: '2px 8px',
          borderRadius: 8,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: 'var(--destaque)',
          fontWeight: 550
        }}
      >
        <Wand2 size={12} /> Corrigir Texto
      </button>

      {tipo === 'completo' && (
        <>
          <button
            type="button"
            title="Formatar para WhatsApp (bullets e tom amigável)"
            className="pequeno"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); aplicar('whatsapp'); }}
            style={{
              border: 0,
              background: 'transparent',
              padding: '2px 6px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--texto-secundario)',
            }}
          >
            💬 WhatsApp
          </button>
          <button
            type="button"
            title="Tornar mais formal / profissional"
            className="pequeno"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); aplicar('profissional'); }}
            style={{
              border: 0,
              background: 'transparent',
              padding: '2px 6px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--texto-secundario)',
            }}
          >
            👔 Formal
          </button>
        </>
      )}
    </div>
  );
}

// ---------- estrutura ----------
export function CabecalhoTela({ titulo, subtitulo, icone, acoes }: { titulo: string; subtitulo?: ReactNode; icone?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className="cabecalho-tela">
      <div className="esq">
        {icone && <div className="icone-modulo" aria-hidden="true">{icone}</div>}
        <div>
          <h1 className="titulo-tela">{titulo}</h1>
          {subtitulo && <p className="subtitulo" style={{ marginTop: 6 }}>{subtitulo}</p>}
        </div>
      </div>
      {acoes && <div className="linha">{acoes}</div>}
    </header>
  );
}

export function Card({ titulo, acao, children, className = '', medio }: { titulo?: string; acao?: ReactNode; children: ReactNode; className?: string; medio?: boolean }) {
  return (
    <section className={`${medio ? 'card-medio' : 'card'} vidro-painel ${className}`}>
      {(titulo || acao) && (
        <div className="card-titulo">
          {titulo && <h2 className="titulo-card">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function Vazio({ texto, acao }: { texto: string; acao?: ReactNode }) {
  return <div className="vazio"><p>{texto}</p>{acao}</div>;
}

export function Barra({ valor, max }: { valor: number; max: number }) {
  const p = max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0;
  return <div className="barra" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${p}%` }} /></div>;
}

export function Chip({ children, cor }: { children: ReactNode; cor?: 'ok' | 'atencao' | 'erro' | 'destaque' }) {
  return <span className="chip" data-cor={cor}>{children}</span>;
}

export function Abas<T extends string>({ abas, ativa, aoMudar }: { abas: { id: T; rotulo: string }[]; ativa: T; aoMudar: (id: T) => void }) {
  return (
    <div className="abas vidro-pilula" role="tablist">
      {abas.map((a) => (
        <button key={a.id} type="button" role="tab" aria-selected={a.id === ativa} className={`aba ${a.id === ativa ? 'ativa' : ''}`} onClick={() => aoMudar(a.id)}>
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}

// ---------- modal / painel deslizante ----------
export function Modal({ titulo, aberto, aoFechar, children, rodape }: { titulo: string; aberto: boolean; aoFechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  useEffect(() => {
    if (!aberto) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar(); };
    document.addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', f); document.body.style.overflow = ''; };
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="sobreposicao" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h2 className="titulo-card">{titulo}</h2>
          <BotaoIcone rotulo="Fechar" onClick={aoFechar}><X size={20} strokeWidth={1.7} /></BotaoIcone>
        </div>
        {children}
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  );
}

// ---------- avisos rápidos ----------
const AvisosCtx = createContext<(texto: string) => void>(() => {});
export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<{ id: number; texto: string }[]>([]);
  const avisar = useCallback((texto: string) => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l, { id, texto }]);
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), 2800);
  }, []);
  return (
    <AvisosCtx.Provider value={avisar}>
      {children}
      <div className="avisos" aria-live="polite">
        {lista.map((a) => <div key={a.id} className="aviso vidro-pilula">{a.texto}</div>)}
      </div>
    </AvisosCtx.Provider>
  );
}
export const useAvisar = () => useContext(AvisosCtx);
