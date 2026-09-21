import { db, tabela, type NomeTabela } from './db';
import { novoId, DATA_GERADO } from './ids';
import type { Base } from './tipos';
import { agendarSync } from './sync';

export function agora(): string {
  return new Date().toISOString();
}

type Entrada<T> = Partial<T> & { id?: string };

// Toda gravação passa por aqui: salva no aparelho e registra a pendência de envio.
export async function salvar<T extends Base>(nome: NomeTabela, dados: Entrada<T>, opcoes?: { gerado?: boolean }): Promise<T> {
  const t = tabela(nome);
  const id = dados.id ?? novoId();
  let registro!: T;
  await db.transaction('rw', t, db.pendencias, async () => {
    const existente = (await t.get(id)) as T | undefined;
    const momento = agora();
    registro = {
      ...(existente ?? {}),
      ...dados,
      id,
      criado_em: existente?.criado_em ?? momento,
      atualizado_em: opcoes?.gerado && !existente ? DATA_GERADO : momento,
      excluido: dados.excluido ?? existente?.excluido ?? false
    } as T;
    await t.put(registro);
    await db.pendencias.add({ tabela: nome, registro_id: id, criado_em: momento });
  });
  agendarSync();
  return registro;
}

// Cria apenas se ainda não existir (usado pelas rotinas automáticas, com ID determinístico).
export async function criarSeNaoExistir<T extends Base>(nome: NomeTabela, dados: Entrada<T> & { id: string }): Promise<boolean> {
  const existente = await tabela(nome).get(dados.id);
  if (existente) return false;
  await salvar<T>(nome, dados, { gerado: true });
  return true;
}

// Exclusão lógica: o registro some da tela, mas a exclusão também é sincronizada.
export async function excluir(nome: NomeTabela, id: string) {
  const existente = await tabela(nome).get(id);
  if (!existente) return;
  await salvar(nome, { id, excluido: true } as any);
}

export async function listar<T extends Base>(nome: NomeTabela): Promise<T[]> {
  return (await tabela(nome).toArray()).filter((r: T) => !r.excluido) as T[];
}
