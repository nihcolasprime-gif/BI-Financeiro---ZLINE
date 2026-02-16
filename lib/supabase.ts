import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    '⚠️ Supabase não configurado. Executando em modo local (sem persistência remota). Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar banco.'
  );
}

export const isSupabaseEnabled = hasSupabaseConfig;

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
