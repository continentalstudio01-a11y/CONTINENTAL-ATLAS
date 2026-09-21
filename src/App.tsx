import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { FundoGlobo } from './app/FundoGlobo';
import { Layout } from './app/Layout';
import { TelaBloqueio } from './app/Bloqueio';
import { TelaLogin } from './app/Login';
import { ProvedorAvisos } from './componentes/ui';
import { aplicarTema, definirCorretor, definirFundo, lerCorretor, lerFundo, lerTema } from './lib/hooks';
import { semear } from './lib/sementes';
import { rotinaDiaria } from './lib/automacoes';
import { iniciarSync, sincronizar } from './lib/sync';
import { supabase } from './lib/supabase';
import { MINUTOS_BLOQUEIO, temDigital, temPin } from './lib/bloqueio';

import { Painel } from './modulos/painel/Painel';
import { ListaClientes } from './modulos/clientes/ListaClientes';
import { FormCliente } from './modulos/clientes/FormCliente';
import { FichaCliente } from './modulos/clientes/FichaCliente';
import { Agenda } from './modulos/agenda/Agenda';
import { AgendamentoPublico } from './modulos/agenda/AgendamentoPublico';
import { Tarefas } from './modulos/tarefas/Tarefas';
import { Financeiro } from './modulos/financeiro/Financeiro';
import { Cobrancas } from './modulos/cobrancas/Cobrancas';
import { Metas } from './modulos/metas/Metas';
import { Configuracoes } from './modulos/configuracoes/Configuracoes';

import { Funil } from './modulos/funil/Funil';
import { Campanhas } from './modulos/campanhas/Campanhas';
import { Propostas } from './modulos/propostas/Propostas';
import { Contratos } from './modulos/contratos/Contratos';
import { Briefings } from './modulos/briefings/Briefings';
import { BriefingPublico } from './modulos/briefings/BriefingPublico';
import { Satisfacao } from './modulos/satisfacao/Satisfacao';
import { PesquisaPublica } from './modulos/satisfacao/PesquisaPublica';
import { Relatorios } from './modulos/relatorios/Relatorios';
import { Conteudo } from './modulos/conteudo/Conteudo';
import { AprovacaoPublica } from './modulos/conteudo/AprovacaoPublica';
import { Sites } from './modulos/sites/Sites';
import { Cofre } from './modulos/cofre/Cofre';
import { Horas } from './modulos/horas/Horas';
import { Terceirizados } from './modulos/terceirizados/Terceirizados';
import { Notificacoes } from './modulos/notificacoes/Notificacoes';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
let syncIniciado = false;

export default function App() {
  const [estado, setEstado] = useState<'carregando' | 'login' | 'pronto'>('carregando');
  const [bloqueado, setBloqueado] = useState(() => temPin() || temDigital());

  // Rotas públicas (Briefing, NPS, Agendamento, Aprovação de Criativos) não exigem login nem layout administrativo
  const [ePublico] = useState(() => {
    const p = window.location.pathname;
    return p.startsWith('/briefing/') || p.startsWith('/nps/') || p.startsWith('/agendar') || p.startsWith('/aprovar/');
  });

  const iniciar = useCallback(async () => {
    try {
      aplicarTema(lerTema());
      definirFundo(lerFundo());
      definirCorretor(lerCorretor());
      if (ePublico) return;
      try { await semear(); } catch (e) { console.warn('Semear dados locais:', e); }
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (!data?.session) { setEstado('login'); return; }
          await Promise.race([sincronizar(), esperar(4000)]);
        } catch (e) {
          console.warn('Sincronização inicial:', e);
        }
      }
      try { await rotinaDiaria(); } catch (e) { console.warn('Rotina diária:', e); }
      if (!syncIniciado) {
        syncIniciado = true;
        try { iniciarSync(); } catch {}
      }
    } catch (err) {
      console.error('Erro na inicialização:', err);
    } finally {
      setEstado((atual) => (atual === 'login' ? 'login' : 'pronto'));
    }
  }, [ePublico]);

  useEffect(() => {
    iniciar();
    // Trava de segurança: garante que o app carregue em no máximo 3.5 segundos mesmo em falha de conexão
    const timer = setTimeout(() => {
      setEstado((atual) => (atual === 'carregando' ? 'pronto' : atual));
    }, 3500);
    return () => clearTimeout(timer);
  }, [iniciar]);

  useEffect(() => {
    if (ePublico) return;
    let oculto = 0;
    const f = () => {
      if (document.hidden) { oculto = Date.now(); return; }
      if (oculto && Date.now() - oculto > MINUTOS_BLOQUEIO * 60_000 && (temPin() || temDigital())) setBloqueado(true);
      rotinaDiaria();
    };
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, [ePublico]);

  // Se o cliente ou lead abriu um link público exclusivo
  if (ePublico) {
    return (
      <BrowserRouter>
        <ProvedorAvisos>
          <FundoGlobo />
          <div className="app">
            <Routes>
              <Route path="/briefing/:token" element={<BriefingPublico />} />
              <Route path="/nps/:token" element={<PesquisaPublica />} />
              <Route path="/agendar" element={<AgendamentoPublico />} />
              <Route path="/aprovar/:token" element={<AprovacaoPublica />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </ProvedorAvisos>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ProvedorAvisos>
        <FundoGlobo />
        <div className="app">
          {estado === 'carregando' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
              <div className="icone-modulo" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--vidro-pilula)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3.5 9h17M3.5 15h17" strokeLinecap="round" />
                </svg>
              </div>
              <p style={{ fontSize: 16, fontWeight: 450, color: 'var(--texto)' }}>Carregando o Continental Atlas...</p>
            </div>
          )}
          {estado === 'login' && <TelaLogin aoEntrar={() => { setEstado('carregando'); iniciar(); }} />}
          {estado === 'pronto' && (
            <Layout>
              <Routes>
                <Route path="/" element={<Painel />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/tarefas" element={<Tarefas />} />
                <Route path="/clientes" element={<ListaClientes />} />
                <Route path="/clientes/novo" element={<FormCliente />} />
                <Route path="/clientes/:id" element={<FichaCliente />} />
                <Route path="/clientes/:id/editar" element={<FormCliente />} />
                <Route path="/funil" element={<Funil />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/campanhas" element={<Campanhas />} />
                <Route path="/cobrancas" element={<Cobrancas />} />
                <Route path="/metas" element={<Metas />} />
                <Route path="/propostas" element={<Propostas />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/briefings" element={<Briefings />} />
                <Route path="/satisfacao" element={<Satisfacao />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/conteudo" element={<Conteudo />} />
                <Route path="/sites" element={<Sites />} />
                <Route path="/cofre" element={<Cofre />} />
                <Route path="/horas" element={<Horas />} />
                <Route path="/terceirizados" element={<Terceirizados />} />
                <Route path="/notificacoes" element={<Notificacoes />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          )}
          {estado === 'pronto' && bloqueado && <TelaBloqueio aoDesbloquear={() => setBloqueado(false)} />}
        </div>
      </ProvedorAvisos>
    </BrowserRouter>
  );
}
