import { novoId } from './ids';

export interface ChavePixRegistro {
  id: string;
  apelido: string; // Ex: 'Nubank Agência', 'Inter MEI', 'Pix Pessoal'
  tipo: 'cnpj' | 'cpf' | 'email' | 'celular' | 'aleatoria';
  chave: string;
  nome_recebedor: string;
  cidade: string;
  padrao: boolean;
  criado_em: string;
}

const STORAGE_KEY = 'atlas_chaves_pix';

export function carregarChavesPix(): ChavePixRegistro[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function salvarChavesPix(chaves: ChavePixRegistro[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chaves));
}

export function obterChavePadrao(): ChavePixRegistro | null {
  const lista = carregarChavesPix();
  return lista.find(c => c.padrao) || lista[0] || null;
}

export function definirComoPadrao(id: string): void {
  const lista = carregarChavesPix().map(c => ({
    ...c,
    padrao: c.id === id
  }));
  salvarChavesPix(lista);
}

export function adicionarChavePix(dados: Omit<ChavePixRegistro, 'id' | 'criado_em'>): ChavePixRegistro {
  const lista = carregarChavesPix();
  const nova: ChavePixRegistro = {
    ...dados,
    id: novoId(),
    criado_em: new Date().toISOString(),
    padrao: dados.padrao || lista.length === 0
  };
  const atualizadas = dados.padrao ? lista.map(c => ({ ...c, padrao: false })) : lista;
  salvarChavesPix([nova, ...atualizadas]);
  return nova;
}

export function removerChavePix(id: string): void {
  const lista = carregarChavesPix().filter(c => c.id !== id);
  if (lista.length > 0 && !lista.some(c => c.padrao)) {
    lista[0].padrao = true;
  }
  salvarChavesPix(lista);
}
