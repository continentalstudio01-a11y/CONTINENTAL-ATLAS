import { db, tabela, TABELAS_SYNC } from './db';
import { baixarArquivo } from './baixar';
import { hoje } from './formato';
import { agora } from './repo';
import { agendarSync } from './sync';

export async function montarBackup() {
  const tabelas: Record<string, unknown[]> = {};
  for (const nome of TABELAS_SYNC) tabelas[nome] = await tabela(nome).toArray();
  return { sistema: 'Continental Atlas', versao: 1, exportado_em: agora(), tabelas };
}

export async function baixarBackupJSON() {
  const b = await montarBackup();
  baixarArquivo(`atlas-backup-${hoje()}.json`, JSON.stringify(b), 'application/json');
}

export async function baixarBackupExcel() {
  const XLSX = await import('xlsx');
  const b = await montarBackup();
  const livro = XLSX.utils.book_new();
  for (const [nome, linhas] of Object.entries(b.tabelas)) {
    const planas = (linhas as any[]).map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === 'object' ? JSON.stringify(v) : v])));
    XLSX.utils.book_append_sheet(livro, XLSX.utils.json_to_sheet(planas), nome.slice(0, 31));
  }
  const saida = XLSX.write(livro, { type: 'array', bookType: 'xlsx' });
  baixarArquivo(`atlas-backup-${hoje()}.xlsx`, saida, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// Restaura um backup JSON: junta com os dados atuais (vence o registro mais recente).
export async function restaurarBackup(arquivo: File): Promise<number> {
  const b = JSON.parse(await arquivo.text());
  if (b?.sistema !== 'Continental Atlas' || !b.tabelas) throw new Error('Este arquivo não é um backup do Continental Atlas.');
  let total = 0;
  for (const nome of TABELAS_SYNC) {
    const linhas: any[] = b.tabelas[nome] ?? [];
    await db.transaction('rw', tabela(nome), db.pendencias, async () => {
      for (const r of linhas) {
        const atual = await tabela(nome).get(r.id);
        if (!atual || new Date(atual.atualizado_em) <= new Date(r.atualizado_em)) {
          await tabela(nome).put(r);
          await db.pendencias.add({ tabela: nome, registro_id: r.id, criado_em: agora() });
          total++;
        }
      }
    });
  }
  agendarSync();
  return total;
}
