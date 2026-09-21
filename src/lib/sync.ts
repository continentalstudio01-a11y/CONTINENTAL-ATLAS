import { db, tabela, TABELAS_SYNC, lerEstado, gravarEstado } from './db';
import { supabase } from './supabase';

// Sincronização "local primeiro":
// 1) envia as pendências (registros alterados no aparelho) com upsert;
// 2) baixa o que mudou na nuvem desde a última vez;
// 3) em conflito, vence a edição mais recente (atualizado_em). O banco guarda a versão
//    anterior em historico_versoes (ver supabase/migrations/0001_esquema.sql).

export interface StatusSync {
  modo: 'local' | 'nuvem';
  online: boolean;
  sincronizando: boolean;
  ultimo: string | null;
  erro: string | null;
  pendentes: number;
  sessaoAtiva: boolean;
  emailUsuario: string | null;
}

let status: StatusSync = {
  modo: supabase ? 'nuvem' : 'local',
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  sincronizando: false,
  ultimo: null,
  erro: null,
  pendentes: 0,
  sessaoAtiva: false,
  emailUsuario: null
};

const ouvintes = new Set<(s: StatusSync) => void>();
function atualizar(parcial: Partial<StatusSync>) {
  status = { ...status, ...parcial };
  ouvintes.forEach((f) => f(status));
}

export function ouvirStatus(f: (s: StatusSync) => void) {
  ouvintes.add(f);
  f(status);
  return () => { ouvintes.delete(f); };
}

export function statusAtual() { return status; }

export async function checarSessao(): Promise<boolean> {
  if (!supabase) {
    atualizar({ sessaoAtiva: false, emailUsuario: null });
    return false;
  }
  try {
    const { data } = await supabase.auth.getSession();
    const ativa = !!data?.session;
    atualizar({
      sessaoAtiva: ativa,
      emailUsuario: data?.session?.user?.email ?? null
    });
    return ativa;
  } catch {
    atualizar({ sessaoAtiva: false, emailUsuario: null });
    return false;
  }
}

let temporizador: ReturnType<typeof setTimeout> | null = null;
export function agendarSync(atraso = 1500) {
  db.pendencias.count().then((n) => atualizar({ pendentes: n }));
  if (!supabase) return;
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => { sincronizar(); }, atraso);
}

const LIMPAR = (r: any) => { const { dono_id, sincronizado_em, ...resto } = r; return resto; };
let emAndamento: Promise<void> | null = null;

export function sincronizar(): Promise<void> {
  if (!emAndamento) emAndamento = executar().finally(() => { emAndamento = null; });
  return emAndamento;
}

async function executar() {
  if (!supabase || !navigator.onLine) { atualizar({ online: navigator.onLine }); return; }
  const { data: sessao } = await supabase.auth.getSession();
  const ativa = !!sessao?.session;
  atualizar({
    sessaoAtiva: ativa,
    emailUsuario: sessao?.session?.user?.email ?? null
  });
  if (!ativa) return;

  atualizar({ sincronizando: true, erro: null, online: true });
  try {
    // 1) envio
    const pend = await db.pendencias.orderBy('seq').toArray();
    for (const nome of TABELAS_SYNC) {
      const doGrupo = pend.filter((p) => p.tabela === nome);
      if (!doGrupo.length) continue;
      const ids = Array.from(new Set(doGrupo.map((p) => p.registro_id)));
      const registros = (await tabela(nome).bulkGet(ids)).filter(Boolean);
      for (let i = 0; i < registros.length; i += 200) {
        const lote = registros.slice(i, i + 200);
        const { error } = await supabase.from(nome).upsert(lote, { onConflict: 'id' });
        if (error) throw new Error(`${nome}: ${error.message}`);
      }
      await db.pendencias.bulkDelete(doGrupo.map((p) => p.seq!));
    }
    // 2) recebimento: cursor pela hora em que o servidor gravou (sincronizado_em) + id,
    //    para nunca pular registros gravados no mesmo instante.
    for (const nome of TABELAS_SYNC) {
      const chave = `cursor_${nome}`;
      let cursor: { t: string; id: string } = JSON.parse((await lerEstado(chave)) ?? '{"t":"1970-01-01T00:00:00+00:00","id":"00000000-0000-0000-0000-000000000000"}');
      for (;;) {
        const { data, error } = await supabase.from(nome).select('*')
          .or(`sincronizado_em.gt."${cursor.t}",and(sincronizado_em.eq."${cursor.t}",id.gt.${cursor.id})`)
          .order('sincronizado_em', { ascending: true }).order('id', { ascending: true }).limit(1000);
        if (error) throw new Error(`${nome}: ${error.message}`);
        if (!data || !data.length) break;
        await db.transaction('rw', tabela(nome), async () => {
          for (const remoto of data) {
            const local = await tabela(nome).get(remoto.id);
            if (!local || new Date(local.atualizado_em) <= new Date(remoto.atualizado_em)) {
              await tabela(nome).put(LIMPAR(remoto));
            }
            if (nome === 'configuracoes') {
              try { localStorage.setItem('atlas_config_empresa', JSON.stringify(remoto)); } catch {}
            }
          }
        });
        const ultimo = data[data.length - 1];
        cursor = { t: ultimo.sincronizado_em, id: ultimo.id };
        await gravarEstado(chave, JSON.stringify(cursor));
        if (data.length < 1000) break;
      }
    }
    atualizar({ sincronizando: false, ultimo: new Date().toISOString(), pendentes: await db.pendencias.count() });
    await gravarEstado('ultimo_sync', new Date().toISOString());
  } catch (e: any) {
    atualizar({ sincronizando: false, erro: e?.message ?? String(e), pendentes: await db.pendencias.count() });
  }
}

// Força baixar todos os registros da nuvem (ideal para novo navegador, celular ou deploy no Netlify)
export async function forcarSincronizacaoCompleta(): Promise<{ sucesso: boolean; total: number; erro?: string }> {
  if (!supabase) return { sucesso: false, total: 0, erro: 'Supabase não inicializado.' };
  let totalBaixados = 0;
  atualizar({ sincronizando: true, erro: null });
  try {
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao?.session) {
      atualizar({ sincronizando: false, sessaoAtiva: false });
      return { sucesso: false, total: 0, erro: 'Você precisa entrar na sua conta para baixar os dados.' };
    }
    atualizar({ sessaoAtiva: true, emailUsuario: sessao.session.user?.email ?? null });

    for (const nome of TABELAS_SYNC) {
      const { data, error } = await supabase.from(nome).select('*');
      if (error) continue;
      if (data && data.length) {
        totalBaixados += data.length;
        await db.transaction('rw', tabela(nome), async () => {
          for (const item of data) {
            await tabela(nome).put(LIMPAR(item));
            if (nome === 'configuracoes') {
              try { localStorage.setItem('atlas_config_empresa', JSON.stringify(item)); } catch {}
            }
          }
        });
        const ultimo = data[data.length - 1];
        await gravarEstado(`cursor_${nome}`, JSON.stringify({ t: ultimo.sincronizado_em, id: ultimo.id }));
      }
    }

    const agora = new Date().toISOString();
    atualizar({ sincronizando: false, ultimo: agora, pendentes: await db.pendencias.count() });
    await gravarEstado('ultimo_sync', agora);
    return { sucesso: true, total: totalBaixados };
  } catch (err: any) {
    const msg = err?.message || String(err);
    atualizar({ sincronizando: false, erro: msg });
    return { sucesso: false, total: totalBaixados, erro: msg };
  }
}

// Teste em tempo real da conexão com o Supabase
export async function testarConexaoSupabase(): Promise<{
  ok: boolean;
  latenciaMs: number;
  usuario: string | null;
  totalClientesNuvem: number;
  detalhes?: string;
  erro?: string;
}> {
  const inicio = performance.now();
  if (!supabase) {
    return { ok: false, latenciaMs: 0, usuario: null, totalClientesNuvem: 0, erro: 'Cliente Supabase não configurado.' };
  }
  try {
    const { data: sessao } = await supabase.auth.getSession();
    const usuario = sessao?.session?.user?.email ?? null;

    const { data: clientes, error, count } = await supabase
      .from('clientes')
      .select('id, nome', { count: 'exact' });

    const latenciaMs = Math.round(performance.now() - inicio);

    if (error) {
      return {
        ok: false,
        latenciaMs,
        usuario,
        totalClientesNuvem: 0,
        erro: error.message
      };
    }

    const total = count ?? (clientes?.length || 0);
    return {
      ok: true,
      latenciaMs,
      usuario,
      totalClientesNuvem: total,
      detalhes: `Banco Supabase ativo e respondendo em ${latenciaMs}ms. ${total} cliente(s) encontrados na nuvem.`
    };
  } catch (err: any) {
    const latenciaMs = Math.round(performance.now() - inicio);
    return {
      ok: false,
      latenciaMs,
      usuario: null,
      totalClientesNuvem: 0,
      erro: err?.message || String(err)
    };
  }
}

// Liga os gatilhos: ao voltar a internet, ao reabrir o app, a cada minuto e em tempo real.
export function iniciarSync() {
  checarSessao();
  window.addEventListener('online', () => { atualizar({ online: true }); sincronizar(); });
  window.addEventListener('offline', () => atualizar({ online: false }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { checarSessao(); sincronizar(); } });
  setInterval(() => { if (!document.hidden) sincronizar(); }, 60_000);
  if (supabase) {
    supabase.channel('atlas-mudancas')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => agendarSync(800))
      .subscribe();
  }
  agendarSync(300);
}
