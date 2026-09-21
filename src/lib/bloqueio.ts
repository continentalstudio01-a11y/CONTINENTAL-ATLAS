// Bloqueio do app com PIN ou digital. Fica só neste aparelho (não sincroniza).
const CHAVE_PIN = 'atlas_pin';
const CHAVE_DIGITAL = 'atlas_digital';
export const MINUTOS_BLOQUEIO = 5;

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const temPin = () => !!localStorage.getItem(CHAVE_PIN);
export const temDigital = () => !!localStorage.getItem(CHAVE_DIGITAL);

export async function definirPin(pin: string) {
  const sal = b64(aleatorio(16));
  localStorage.setItem(CHAVE_PIN, `${sal}:${await sha256(sal + pin)}`);
}
export async function conferirPin(pin: string): Promise<boolean> {
  const [sal, hash] = (localStorage.getItem(CHAVE_PIN) || ':').split(':');
  return !!sal && (await sha256(sal + pin)) === hash;
}
export function removerBloqueio() {
  localStorage.removeItem(CHAVE_PIN);
  localStorage.removeItem(CHAVE_DIGITAL);
}

export async function digitalDisponivel(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch { return false; }
}

export async function cadastrarDigital(): Promise<boolean> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatorio(32),
      rp: { name: 'Continental Atlas' },
      user: { id: aleatorio(16), name: 'atlas', displayName: 'Continental Atlas' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000
    }
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  localStorage.setItem(CHAVE_DIGITAL, b64(cred.rawId));
  return true;
}

export async function conferirDigital(): Promise<boolean> {
  const id = localStorage.getItem(CHAVE_DIGITAL);
  if (!id) return false;
  try {
    const r = await navigator.credentials.get({
      publicKey: { challenge: aleatorio(32), allowCredentials: [{ type: 'public-key', id: deB64(id) }], userVerification: 'required', timeout: 60000 }
    });
    return !!r;
  } catch { return false; }
}
