import { useState } from 'react';
import { supabase, SUPABASE_URL_ATUAL } from '../lib/supabase';
import { forcarSincronizacaoCompleta } from '../lib/sync';
import { Botao, Campo } from '../componentes/ui';

export function TelaLogin({ aoEntrar, aoPular }: { aoEntrar: () => void; aoPular?: () => void }) {
  const [email, setEmail] = useState('continentalstudio01@gmail.com');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    if (!supabase) return;
    setOcupado(true); setErro(null); setAviso(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setOcupado(false);
      setErro('E-mail ou senha incorretos. Confira seus dados e tente novamente.');
      return;
    }
    // Baixa os dados da nuvem para o novo aparelho/navegador
    setAviso('Baixando dados da nuvem...');
    try {
      await forcarSincronizacaoCompleta();
    } catch {}
    setOcupado(false);
    aoEntrar();
  };

  const criar = async () => {
    if (!supabase) return;
    setOcupado(true); setErro(null); setAviso(null);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
    setOcupado(false);
    if (error) setErro(error.message);
    else if (data.session) aoEntrar();
    else setAviso('Conta criada! Verifique seu e-mail para confirmar e depois entre.');
  };

  const recuperarSenha = async () => {
    if (!email) { setErro('Informe seu e-mail para recuperar a senha.'); return; }
    setOcupado(true); setErro(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setOcupado(false);
    if (error) setErro(error.message);
    else setAviso(`Link de recuperação enviado para ${email}. Verifique sua caixa de entrada.`);
  };

  return (
    <div className="bloqueio">
      <form className="card vidro-painel coluna" style={{ width: 'min(440px,100%)', gap: 14 }} onSubmit={(e) => { e.preventDefault(); entrar(); }}>
        <div>
          <p className="marca" style={{ marginBottom: 4 }}>Continental Atlas</p>
          <h1 className="titulo-tela" style={{ fontSize: 28 }}>Entrar na Conta</h1>
          <p className="secundario pequeno" style={{ marginTop: 2 }}>
            Acesse para carregar e sincronizar seus clientes e dados na nuvem.
          </p>
        </div>

        <div className="vidro-painel" style={{ padding: '8px 12px', borderRadius: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0 }} />
          <span className="secundario" style={{ fontSize: 11, wordBreak: 'break-all' }}>
            Banco conectado: <strong>{SUPABASE_URL_ATUAL}</strong>
          </span>
        </div>

        <Campo rotulo="E-mail">
          <input className="entrada" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Campo>

        <Campo rotulo="Senha" erro={erro}>
          <input className="entrada" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} placeholder="Sua senha de acesso" />
        </Campo>

        {aviso && <p className="faixa" style={{ color: 'var(--ok)' }}>{aviso}</p>}

        <div className="coluna" style={{ gap: 8, marginTop: 6 }}>
          <Botao variante="primario" type="submit" disabled={ocupado}>
            {ocupado ? 'Entrando e sincronizando...' : 'Entrar e Sincronizar'}
          </Botao>

          <div className="linha entre" style={{ marginTop: 2 }}>
            <button type="button" onClick={recuperarSenha} className="pequeno link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-secundario)', padding: 0 }}>
              Esqueci minha senha
            </button>
            <button type="button" onClick={criar} className="pequeno link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--texto-secundario)', padding: 0 }}>
              Criar conta nova
            </button>
          </div>

          {aoPular && (
            <Botao variante="fantasma" onClick={aoPular} style={{ marginTop: 4, fontSize: 13 }}>
              Continuar em modo local (sem login)
            </Botao>
          )}
        </div>
      </form>
    </div>
  );
}
