import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Cloud, CloudOff, RefreshCw, HardDrive, UserPlus, CalendarPlus, ListPlus, CircleDollarSign } from 'lucide-react';
import { SECOES, NAV_CELULAR } from './secoes';
import { Botao, Modal, Chip } from '../componentes/ui';
import { useConfig, useStatusSync } from '../lib/hooks';

function Logo() {
  const cfg = useConfig();
  if (cfg?.logo_url) return <img className="logo" src={cfg.logo_url} alt="" />;
  return (
    <span className="logo" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3.5 9h17M3.5 15h17" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function IndicadorSync() {
  const s = useStatusSync();
  const navegar = useNavigate();
  if (s.modo === 'local') return <span className="chip so-desktop" title="Dados só neste aparelho"><HardDrive size={14} /> Modo local</span>;
  if (!s.sessaoAtiva) {
    return (
      <button
        type="button"
        className="chip"
        data-cor="atencao"
        title="Clique para entrar na conta e puxar os dados da nuvem"
        onClick={() => navegar('/configuracoes?aba=dados')}
        style={{ cursor: 'pointer' }}
      >
        <CloudOff size={14} /> Entrar na Nuvem
      </button>
    );
  }
  if (!s.online) return <span className="chip" data-cor="atencao" title={`${s.pendentes} alterações esperando internet`}><CloudOff size={14} /> Sem internet</span>;
  if (s.erro) return <span className="chip" data-cor="erro" title={s.erro}><CloudOff size={14} /> Erro ao sincronizar</span>;
  if (s.sincronizando) return <span className="chip so-desktop"><RefreshCw size={14} /> Sincronizando</span>;
  return <span className="chip so-desktop" data-cor="ok" title={`Nuvem conectada: ${s.emailUsuario || 'Ativa'}`}><Cloud size={14} /> Sincronizado</span>;
}

export function Layout({ children }: { children: ReactNode }) {
  const [mais, setMais] = useState(false);
  const [novo, setNovo] = useState(false);
  const navegar = useNavigate();
  const s = useStatusSync();
  const principais = SECOES.filter((sec) => sec.principal);
  const ir = (rota: string) => { setNovo(false); setMais(false); navegar(rota); };

  return (
    <>
      <header className="topo">
        <Link to="/" className="topo-marca">
          <Logo />
          <span className="marca">Continental Atlas</span>
        </Link>
        <nav className="nav-pilula vidro-pilula" aria-label="Seções principais">
          {principais.map((sec) => (
            <NavLink key={sec.rota} to={sec.rota} end={sec.rota === '/'} className={({ isActive }) => `nav-item ${isActive ? 'ativo' : ''}`} title={sec.rotulo}>
              <sec.icone size={18} strokeWidth={1.7} /><span className="rot">{sec.rotulo}</span>
            </NavLink>
          ))}
          <button className="nav-item" onClick={() => setMais(true)} title="Mais"><MoreHorizontal size={18} strokeWidth={1.7} /><span className="rot">Mais</span></button>
        </nav>
        <div className="topo-acoes">
          <IndicadorSync />
          <Botao variante="primario" className="so-desktop" onClick={() => setNovo(true)}>Novo</Botao>
        </div>
      </header>

      {!s.sessaoAtiva && s.modo === 'nuvem' && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(234,88,12,0.18), rgba(245,158,11,0.18))',
          borderBottom: '1px solid rgba(245,158,11,0.3)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13
        }}>
          <span>
            ☁️ <strong>Atenção:</strong> Você está no navegador web e não fez login. Entre com sua conta para carregar seus clientes e configurações salvos no Supabase.
          </span>
          <button
            type="button"
            className="btn btn-primario vidro-pilula pequeno"
            style={{ padding: '4px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => navegar('/configuracoes?aba=dados')}
          >
            Entrar e Carregar Dados
          </button>
        </div>
      )}

      <main className="conteudo">{children}</main>

      <nav className="nav-baixo vidro-pilula" aria-label="Navegação">
        {NAV_CELULAR.map((rota) => {
          const sec = SECOES.find((x) => x.rota === rota)!;
          return (
            <NavLink key={rota} to={rota} end={rota === '/'} className={({ isActive }) => `nav-item ${isActive ? 'ativo' : ''}`}>
              <sec.icone size={20} strokeWidth={1.7} /><span className="rot">{sec.rotulo}</span>
            </NavLink>
          );
        })}
        <button className="nav-item" onClick={() => setMais(true)}><MoreHorizontal size={20} strokeWidth={1.7} /><span className="rot">Mais</span></button>
      </nav>
      <button className="fab" aria-label="Criar" onClick={() => setNovo(true)}><Plus size={26} strokeWidth={1.8} /></button>

      <Modal titulo="Todas as Seções" aberto={mais} aoFechar={() => setMais(false)}>
        <div className="grade-mais">
          {SECOES.map((sec) => (
            <button key={sec.rota} className="mais-item" onClick={() => ir(sec.rota)} style={{ cursor: 'pointer', textAlign: 'left' }}>
              <sec.icone size={22} strokeWidth={1.7} />
              <span style={{ fontWeight: 500 }}>{sec.rotulo}</span>
              {sec.fase && <Chip>Fase {sec.fase}</Chip>}
            </button>
          ))}
        </div>
      </Modal>

      <Modal titulo="Criar" aberto={novo} aoFechar={() => setNovo(false)}>
        <div className="lista">
          <button className="item" onClick={() => ir('/clientes/novo')}><UserPlus size={20} strokeWidth={1.7} /><span className="titulo">Novo cliente</span></button>
          <button className="item" onClick={() => ir('/funil')}><span className="titulo">Novo lead (Funil)</span></button>
          <button className="item" onClick={() => ir('/propostas')}><span className="titulo">Nova proposta comercial</span></button>
          <button className="item" onClick={() => ir('/campanhas')}><span className="titulo">Registrar métricas / tracking</span></button>
          <button className="item" onClick={() => ir('/agenda?novo=1')}><CalendarPlus size={20} strokeWidth={1.7} /><span className="titulo">Novo evento</span></button>
          <button className="item" onClick={() => ir('/tarefas?novo=1')}><ListPlus size={20} strokeWidth={1.7} /><span className="titulo">Nova tarefa</span></button>
          <button className="item" onClick={() => ir('/financeiro?novo=1')}><CircleDollarSign size={20} strokeWidth={1.7} /><span className="titulo">Novo lançamento</span></button>
        </div>
      </Modal>
    </>
  );
}
