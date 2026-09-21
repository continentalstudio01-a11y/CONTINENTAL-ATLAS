// A biblioteca de planilhas é carregada só quando você importa ou exporta (deixa o app mais leve).
const carregarXLSX = () => import('xlsx');
import { baixarArquivo } from './baixar';
import { semAcento } from './formato';

export interface CampoImport { chave: string; rotulo: string; obrigatorio?: boolean }

export const CAMPOS_CLIENTES: CampoImport[] = [
  { chave: 'nome', rotulo: 'Nome', obrigatorio: true },
  { chave: 'tipo_pessoa', rotulo: 'Tipo (PF ou PJ)' },
  { chave: 'documento', rotulo: 'CPF ou CNPJ' },
  { chave: 'responsavel', rotulo: 'Responsável' },
  { chave: 'telefone', rotulo: 'Telefone' },
  { chave: 'whatsapp', rotulo: 'WhatsApp' },
  { chave: 'email', rotulo: 'E-mail' },
  { chave: 'cidade', rotulo: 'Cidade' },
  { chave: 'uf', rotulo: 'UF' },
  { chave: 'nicho', rotulo: 'Nicho' },
  { chave: 'origem', rotulo: 'Origem' },
  { chave: 'observacoes', rotulo: 'Observações' }
];

export const CAMPOS_LANCAMENTOS: CampoImport[] = [
  { chave: 'descricao', rotulo: 'Descrição', obrigatorio: true },
  { chave: 'valor', rotulo: 'Valor', obrigatorio: true },
  { chave: 'data', rotulo: 'Data', obrigatorio: true },
  { chave: 'tipo', rotulo: 'Tipo (entrada ou saída)', obrigatorio: true },
  { chave: 'carteira', rotulo: 'Carteira (negócio ou pessoal)' },
  { chave: 'categoria', rotulo: 'Categoria' },
  { chave: 'status', rotulo: 'Status (pago ou previsto)' }
];

export async function lerPlanilha(arquivo: File): Promise<{ colunas: string[]; linhas: Record<string, any>[] }> {
  const XLSX = await carregarXLSX();
  const livro = XLSX.read(await arquivo.arrayBuffer(), { cellDates: true });
  const aba = livro.Sheets[livro.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json<Record<string, any>>(aba, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
  const colunas = linhas.length ? Object.keys(linhas[0]) : [];
  return { colunas, linhas };
}

const norm = (s: string) => semAcento(s).toLowerCase().replace(/[^a-z0-9]/g, '');

export function mapearAutomatico(colunas: string[], campos: CampoImport[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const c of campos) {
    const alvo = [norm(c.chave), norm(c.rotulo.split('(')[0])];
    const achada = colunas.find((col) => alvo.some((a) => norm(col) === a))
      ?? colunas.find((col) => alvo.some((a) => norm(col).includes(a) || a.includes(norm(col))));
    if (achada) mapa[c.chave] = achada;
  }
  return mapa;
}

export async function baixarModelo(nome: string, campos: CampoImport[]) {
  const XLSX = await carregarXLSX();
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([campos.map((c) => c.rotulo)]), 'Modelo');
  baixarArquivo(`modelo-${nome}.xlsx`, XLSX.write(livro, { type: 'array', bookType: 'xlsx' }),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function exportarLista(nome: string, linhas: Record<string, unknown>[]) {
  const XLSX = await carregarXLSX();
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet(linhas), nome.slice(0, 31));
  baixarArquivo(`${nome}.xlsx`, XLSX.write(livro, { type: 'array', bookType: 'xlsx' }),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// Converte datas em dd/mm/aaaa ou aaaa-mm-dd para aaaa-mm-dd.
export function dataPlanilha(v: string): string | null {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}
