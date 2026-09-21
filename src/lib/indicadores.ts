import { diaDe, mesDe } from './formato';
import type { Categoria, Cliente, Lancamento } from './tipos';

// Números usados no Painel e em Metas.
export function faturamentoDoMes(lancs: Lancamento[], mes: string): number {
  return lancs.filter((l) => l.carteira === 'negocio' && l.tipo === 'entrada' && l.status === 'pago' && mesDe(l.data) === mes)
    .reduce((s, l) => s + Number(l.valor), 0);
}

export function resumoDoMes(lancs: Lancamento[], cats: Categoria[], mes: string) {
  const verba = new Set(cats.filter((c) => c.especial === 'verba_adiantada').map((c) => c.id));
  const doMes = lancs.filter((l) => l.carteira === 'negocio' && l.status === 'pago' && mesDe(l.data) === mes);
  const entradas = doMes.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + Number(l.valor), 0);
  const saidas = doMes.filter((l) => l.tipo === 'saida' && !verba.has(l.categoria_id ?? '')).reduce((s, l) => s + Number(l.valor), 0);
  return { entradas, saidas, lucro: entradas - saidas };
}

export function novosClientesDoMes(clientes: Cliente[], mes: string): number {
  return clientes.filter((c) => mesDe(diaDe(c.criado_em)) === mes).length;
}
