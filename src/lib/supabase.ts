import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Sem as variáveis de ambiente, o Atlas roda em modo local (dados só neste aparelho).
export const supabase: SupabaseClient | null =
  url && chave ? createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const modoNuvem = supabase !== null;
