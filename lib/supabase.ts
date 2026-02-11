import { createClient } from '@supabase/supabase-js';

// Tenta pegar as variáveis de ambiente com segurança
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação para não quebrar o app silenciosamente
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ ATENÇÃO: Variáveis de ambiente do Supabase não encontradas. ' +
    'O sistema pode não funcionar corretamente. Verifique o arquivo .env ou as configurações da Vercel.'
  );
}

// Cria a conexão única
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
