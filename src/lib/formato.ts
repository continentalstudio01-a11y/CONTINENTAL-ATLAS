// Formatação no padrão brasileiro e datas no fuso de Brasília.
export const FUSO = 'America/Sao_Paulo';
const OFFSET = '-03:00'; // Brasil sem horário de verão desde 2019

const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const moeda = (v: number | null | undefined) => fmtMoeda.format(Number(v) || 0);
export const moedaCurta = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : moeda(v);

const fmtDiaISO = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });

export function hoje(): string { return fmtDiaISO.format(new Date()); }
export function diaDe(iso: string): string { return fmtDiaISO.format(new Date(iso)); }
export function horaDe(iso: string): string { return fmtHora.format(new Date(iso)); }
export function paraISO(dia: string, hora = '00:00'): string { return `${dia}T${hora}:00${OFFSET}`; }

export function data(d: string | null | undefined): string {
  if (!d) return '';
  const [a, m, di] = d.slice(0, 10).split('-');
  return `${di}/${m}/${a}`;
}
export function dataCurta(d: string): string {
  const [, m, di] = d.slice(0, 10).split('-');
  return `${di}/${m}`;
}

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function diasEntre(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}
export function mesDe(dia: string): string { return dia.slice(0, 7); }
export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
export function diasNoMes(mes: string): number {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}
export function diaNoMes(mes: string, dia: number): string {
  return `${mes}-${String(Math.min(Math.max(dia, 1), diasNoMes(mes))).padStart(2, '0')}`;
}
export function diaDaSemana(dia: string): number { return new Date(`${dia}T12:00:00Z`).getUTCDay(); }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function nomeMes(mes: string, comAno = true): string {
  const [a, m] = mes.split('-').map(Number);
  return comAno ? `${MESES[m - 1]} de ${a}` : MESES[m - 1];
}
export function tituloMes(mes: string): string {
  const s = nomeMes(mes);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function saudacao(): string {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', hour12: false }).format(new Date()));
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export function soDigitos(s: string): string { return (s || '').replace(/\D/g, ''); }
export function numero(v: string | number): number {
  if (typeof v === 'number') return v;
  const limpo = String(v).replace(/[^\d,.-]/g, '');
  const normal = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const n = parseFloat(normal);
  return isNaN(n) ? 0 : n;
}
export function semAcento(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
