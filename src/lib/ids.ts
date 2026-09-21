// IDs aleatórios para registros criados pela pessoa e IDs determinísticos para
// registros gerados automaticamente (cobranças, tarefas recorrentes, eventos).
// O ID determinístico garante que celular e computador gerem o MESMO registro,
// então a sincronização junta os dois em vez de duplicar.

export function novoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return idDeterministico(String(Math.random()) + Date.now());
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export function idDeterministico(chave: string): string {
  const hex = cyrb128(chave).map((n) => n.toString(16).padStart(8, '0')).join('');
  const v = hex.split('');
  v[12] = '4';
  v[16] = ((parseInt(v[16], 16) & 0x3) | 0x8).toString(16);
  const s = v.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

// Registros gerados automaticamente nascem com esta data de atualização.
// Assim, qualquer edição feita por você (data atual) sempre vence na sincronização.
export const DATA_GERADO = '2000-01-01T00:00:00.000Z';
