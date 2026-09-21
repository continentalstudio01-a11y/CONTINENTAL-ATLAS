import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, tabela, type NomeTabela } from './db';
import { ID_CONFIG } from './sementes';
import { ouvirStatus, statusAtual, type StatusSync } from './sync';
import type { Base, Configuracao } from './tipos';

export function useLista<T extends Base>(nome: NomeTabela, filtro?: (r: T) => boolean, deps: unknown[] = []): T[] | undefined {
  return useLiveQuery(async () => {
    const todos = (await tabela(nome).toArray()) as T[];
    return todos.filter((r) => !r.excluido && (!filtro || filtro(r)));
  }, deps);
}

export function useRegistro<T extends Base>(nome: NomeTabela, id: string | undefined | null): T | undefined | null {
  return useLiveQuery(async () => (id ? ((await tabela(nome).get(id)) as T | undefined) ?? null : null), [nome, id]);
}

export function useConfig(): Configuracao | undefined {
  return useLiveQuery(async () => {
    const doBanco = await db.configuracoes.get(ID_CONFIG);
    let doBackup: Partial<Configuracao> = {};
    try {
      doBackup = JSON.parse(localStorage.getItem('atlas_config_empresa') || '{}');
    } catch {}

    if (!doBanco && !doBackup.empresa_nome && !doBackup.logo_url) return undefined;

    return {
      ...(doBanco ?? {}),
      ...(doBackup ?? {}),
      logo_url: doBackup?.logo_url || doBanco?.logo_url || null,
      empresa_nome: doBackup?.empresa_nome || doBanco?.empresa_nome || 'Continental MKT',
    } as Configuracao;
  }, []);
}

export function useStatusSync(): StatusSync {
  const [s, setS] = useState(statusAtual());
  useEffect(() => ouvirStatus(setS), []);
  return s;
}

// ---------- preferências deste aparelho ----------
export type Tema = 'claro' | 'escuro' | 'azul' | 'vermelho';
export type ModoFundo = 'ligado' | 'economia' | 'desligado';
const evento = 'atlas-preferencias';

export function lerTema(): Tema { return (localStorage.getItem('atlas_tema') as Tema) || 'claro'; }
export function lerFundo(): ModoFundo {
  const salvo = localStorage.getItem('atlas_fundo') as ModoFundo | null;
  if (salvo) return salvo;
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'desligado' : 'ligado';
}
export function aplicarTema(t: Tema) {
  document.documentElement.setAttribute('data-tema', t);
  const fundo = getComputedStyle(document.documentElement).getPropertyValue('--fundo').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fundo || '#E6EDF6');
}
export function definirTema(t: Tema) { localStorage.setItem('atlas_tema', t); aplicarTema(t); window.dispatchEvent(new Event(evento)); }
export function definirFundo(f: ModoFundo) {
  localStorage.setItem('atlas_fundo', f);
  document.documentElement.setAttribute('data-economia', f === 'economia' ? '1' : '0');
  window.dispatchEvent(new Event(evento));
}
export function lerCorretor(): boolean {
  const salvo = localStorage.getItem('atlas_corretor_ativo');
  return salvo === null ? true : salvo === 'true';
}
export function definirCorretor(ativo: boolean) {
  localStorage.setItem('atlas_corretor_ativo', String(ativo));
  document.documentElement.setAttribute('data-corretor', ativo ? '1' : '0');
  window.dispatchEvent(new Event(evento));
}
export function usePreferencias() {
  const [p, setP] = useState({ tema: lerTema(), fundo: lerFundo(), corretor: lerCorretor() });
  useEffect(() => {
    const f = () => setP({ tema: lerTema(), fundo: lerFundo(), corretor: lerCorretor() });
    window.addEventListener(evento, f);
    return () => window.removeEventListener(evento, f);
  }, []);
  return p;
}
