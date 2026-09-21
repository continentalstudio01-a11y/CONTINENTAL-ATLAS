import Dexie, { type Table } from 'dexie';
import type {
  Configuracao, Servico, Pacote, Cliente, ClienteServico, ClienteTrafego, ContaAnuncio,
  Evento, Tarefa, TarefaModelo, Categoria, Lancamento, Cobranca, Meta, Pendencia, Estado
} from './tipos';

// Banco local no aparelho (IndexedDB). O Atlas funciona 100% offline a partir daqui;
// a sincronização com o Supabase (sync.ts) replica essas tabelas na nuvem.
export class BancoAtlas extends Dexie {
  configuracoes!: Table<Configuracao, string>;
  servicos!: Table<Servico, string>;
  pacotes!: Table<Pacote, string>;
  clientes!: Table<Cliente, string>;
  cliente_servicos!: Table<ClienteServico, string>;
  cliente_trafego!: Table<ClienteTrafego, string>;
  contas_anuncio!: Table<ContaAnuncio, string>;
  eventos!: Table<Evento, string>;
  tarefas!: Table<Tarefa, string>;
  tarefa_modelos!: Table<TarefaModelo, string>;
  categorias!: Table<Categoria, string>;
  lancamentos!: Table<Lancamento, string>;
  cobrancas!: Table<Cobranca, string>;
  metas!: Table<Meta, string>;
  pendencias!: Table<Pendencia, number>;
  estado!: Table<Estado, string>;

  constructor() {
    super('continental-atlas');
    this.version(1).stores({
      configuracoes: 'id, atualizado_em',
      servicos: 'id, atualizado_em, chave',
      pacotes: 'id, atualizado_em',
      clientes: 'id, atualizado_em, status, nome',
      cliente_servicos: 'id, atualizado_em, cliente_id, servico_id',
      cliente_trafego: 'id, atualizado_em, cliente_id',
      contas_anuncio: 'id, atualizado_em, cliente_id',
      eventos: 'id, atualizado_em, inicio, cliente_id, origem_id',
      tarefas: 'id, atualizado_em, prazo, status, cliente_id, referencia',
      tarefa_modelos: 'id, atualizado_em, servico_id, tipo',
      categorias: 'id, atualizado_em, carteira',
      lancamentos: 'id, atualizado_em, data, carteira, cliente_id, referencia',
      cobrancas: 'id, atualizado_em, vencimento, status, cliente_id, cliente_servico_id',
      metas: 'id, atualizado_em, mes',
      pendencias: '++seq, tabela, registro_id',
      estado: 'chave'
    });
  }
}

export const db = new BancoAtlas();

// Tabelas replicadas na nuvem, na ordem em que são enviadas (pais antes dos filhos).
export const TABELAS_SYNC = [
  'configuracoes', 'servicos', 'pacotes', 'clientes', 'cliente_servicos', 'cliente_trafego',
  'contas_anuncio', 'categorias', 'lancamentos', 'cobrancas', 'eventos', 'tarefa_modelos',
  'tarefas', 'metas'
] as const;
export type NomeTabela = (typeof TABELAS_SYNC)[number];

export function tabela(nome: NomeTabela): Table<any, string> {
  return (db as any)[nome];
}

export async function lerEstado(chave: string): Promise<string | null> {
  return (await db.estado.get(chave))?.valor ?? null;
}
export async function gravarEstado(chave: string, valor: string) {
  await db.estado.put({ chave, valor });
}
