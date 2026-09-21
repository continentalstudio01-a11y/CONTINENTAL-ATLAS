import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Credenciais padrão do projeto Continental Atlas no Supabase
export const SUPABASE_URL_PADRAO = 'https://tgueyqsujcpbynyhgzok.supabase.co';
export const SUPABASE_KEY_PADRAO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRndWV5cXN1amNwYnlueWhnem9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NTI1OTUsImV4cCI6MjEwNTMyODU5NX0.zOgxPKSRdtxm1t5Ex2CnkYmnQt2id78IzrHvwSTgj4Y';

// Lê do ambiente (Vite) ou usa o padrão da nuvem caso o deploy (ex: Netlify) não tenha as variáveis configuradas
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL_PADRAO;
const chave = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_KEY_PADRAO;

export const supabase: SupabaseClient = createClient(url, chave, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const modoNuvem = true;
export const SUPABASE_URL_ATUAL = url;
