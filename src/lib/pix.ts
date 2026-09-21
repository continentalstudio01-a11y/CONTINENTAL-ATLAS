import QRCode from 'qrcode';
import { semAcento, soDigitos } from './formato';

// Pix estático no padrão BR Code (EMV) do Banco Central, gerado no aparelho, sem custo.
const campo = (id: string, valor: string) => id + String(valor.length).padStart(2, '0') + valor;

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizarChave(chave: string): string {
  const c = chave.trim();
  if (c.includes('@')) return c.toLowerCase(); // e-mail
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(c)) return c.toLowerCase(); // chave aleatória
  const d = soDigitos(c);
  if (c.startsWith('+')) return `+${d}`; // celular no formato +55DDDNUMERO
  if (d.length === 13 && d.startsWith('55')) return `+${d}`;
  return d; // CPF (11 dígitos) ou CNPJ (14 dígitos)
}

const texto = (s: string, max: number) => semAcento(s).toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, max);

export function payloadPix(p: { chave: string; nome: string; cidade: string; valor?: number; txid?: string }): string {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', normalizarChave(p.chave));
  const txid = (p.txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  let s = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986');
  if (p.valor && p.valor > 0) s += campo('54', p.valor.toFixed(2));
  s += campo('58', 'BR') + campo('59', texto(p.nome, 25) || 'RECEBEDOR') + campo('60', texto(p.cidade, 15) || 'BRASIL');
  s += campo('62', campo('05', txid)) + '6304';
  return s + crc16(s);
}

export function qrDoPix(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, { margin: 1, width: 360, errorCorrectionLevel: 'M' });
}
