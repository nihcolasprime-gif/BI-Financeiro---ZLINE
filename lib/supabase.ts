import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const hasUrl = Boolean(supabaseUrl);
const hasKey = Boolean(supabaseAnonKey);
const looksLikeDbUri = supabaseUrl?.startsWith('postgresql://') || supabaseUrl?.startsWith('postgres://');
const looksLikeHttpUrl = supabaseUrl?.startsWith('https://');

let connectionHint = '';

if (!hasUrl || !hasKey) {
  connectionHint = 'Defina VITE_SUPABASE_URL (https://<project-ref>.supabase.co) e VITE_SUPABASE_ANON_KEY.';
} else if (looksLikeDbUri) {
  connectionHint = 'Você usou string de conexão Postgres em VITE_SUPABASE_URL. Use a URL HTTP do projeto + ANON KEY (API Settings).';
} else if (!looksLikeHttpUrl) {
  connectionHint = 'VITE_SUPABASE_URL inválida. Esperado formato https://<project-ref>.supabase.co.';
}

const hasSupabaseConfig = hasUrl && hasKey && !looksLikeDbUri && looksLikeHttpUrl;

if (!hasSupabaseConfig) {
  console.warn(
    `⚠️ Supabase não configurado corretamente. Executando em modo local. ${connectionHint}`
  );
}

export const isSupabaseEnabled = hasSupabaseConfig;
export const supabaseConnectionHint = connectionHint;

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
