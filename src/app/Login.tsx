import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Botao, Campo } from '../componentes/ui';

export function TelaLogin({ aoEntrar }: { aoEntrar: () => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    if (!supabase) return;
    setOcupado(true); setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setOcupado(false);
    if (error) setErro('E-mail ou senha incorretos. Confira e tente de novo.');
    else aoEntrar();
  };
  const criar = async () => {
    if (!supabase) return;
    setOcupado(true); setErro(null);
    const { data, error } = await supabase.auth.signUp({ email, password: senha });
    setOcupado(false);
    if (error) setErro(error.message);
    else if (data.session) aoEntrar();
    else setAviso('Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.');
  };

  return (
    <div className="bloqueio">
      <form className="card vidro-painel coluna" style={{ width: 'min(420px,100%)' }} onSubmit={(e) => { e.preventDefault(); entrar(); }}>
        <p className="marca">Continental Atlas</p>
        <h1 className="titulo-tela" style={{ fontSize: 32 }}>Entrar</h1>
        <Campo rotulo="E-mail"><input className="entrada" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Campo>
        <Campo rotulo="Senha" erro={erro}><input className="entrada" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6} /></Campo>
        {aviso && <p className="faixa">{aviso}</p>}
        <Botao variante="primario" type="submit" disabled={ocupado}>Entrar</Botao>
        <Botao variante="fantasma" onClick={criar} disabled={ocupado || !email || senha.length < 6}>Criar minha conta (só na primeira vez)</Botao>
      </form>
    </div>
  );
}
