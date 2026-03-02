import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const viteUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const viteAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const nextPublicUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const nextPublicAnon = (
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()
);

const usingNextPublicFallback = !viteUrl && !viteAnonKey && Boolean(nextPublicUrl && nextPublicAnon);

const supabaseUrl = viteUrl || nextPublicUrl;
const supabaseAnonKey = viteAnonKey || nextPublicAnon;

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
} else if (usingNextPublicFallback) {
  console.warn(
    'ℹ️ Variáveis NEXT_PUBLIC_* detectadas. Funciona, mas o padrão para Vite é usar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const isSupabaseEnabled = hasSupabaseConfig;
export const supabaseConnectionHint = connectionHint;

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
