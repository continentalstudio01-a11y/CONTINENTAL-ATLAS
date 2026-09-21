import { useEffect, useState } from 'react';
import { Fingerprint, Delete } from 'lucide-react';
import { conferirPin, conferirDigital, temDigital } from '../lib/bloqueio';

export function TelaBloqueio({ aoDesbloquear }: { aoDesbloquear: () => void }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState(false);

  const digital = async () => { if (await conferirDigital()) aoDesbloquear(); };
  useEffect(() => { if (temDigital()) digital(); }, []);

  const tocar = async (d: string) => {
    const novo = (pin + d).slice(0, 6);
    setErro(false);
    setPin(novo);
    if (novo.length >= 4 && (await conferirPin(novo))) aoDesbloquear();
    else if (novo.length === 6) { setErro(true); setPin(''); }
  };

  return (
    <div className="bloqueio">
      <div className="card vidro-painel" style={{ width: 'min(380px,100%)', textAlign: 'center' }}>
        <p className="marca">Continental Atlas</p>
        <p className="subtitulo" style={{ marginTop: 8 }}>{erro ? 'PIN incorreto. Tente de novo.' : 'Digite seu PIN'}</p>
        <div className="pontos-pin">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={i < pin.length ? 'cheio' : ''} />)}</div>
        <div className="teclado">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} className="tecla vidro-pilula" onClick={() => tocar(d)}>{d}</button>)}
          {temDigital() ? <button className="tecla vidro-pilula" aria-label="Usar digital" onClick={digital}><Fingerprint size={24} strokeWidth={1.6} /></button> : <span />}
          <button className="tecla vidro-pilula" onClick={() => tocar('0')}>0</button>
          <button className="tecla vidro-pilula" aria-label="Apagar" onClick={() => setPin(pin.slice(0, -1))}><Delete size={22} strokeWidth={1.6} /></button>
        </div>
      </div>
    </div>
  );
}
