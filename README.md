<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1MIX84jpkSsePbyicvtUSo4EPoJDiAMAN

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase: por que aparece "não conectado" agora?

Se essa mensagem começou a aparecer recentemente, não significa necessariamente que o Supabase "quebrou" agora.
Ela aparece porque o app passou a mostrar um diagnóstico explícito quando as variáveis de ambiente não estão no formato esperado no frontend.

### O que mudou

- O app agora valida `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na inicialização.
- Se faltar URL/KEY, ou se a URL estiver no formato de banco (`postgres://...`), ele entra em modo local e mostra aviso.
- Antes, esse erro podia ficar silencioso e parecer só "não salvou" após recarregar.

### Causas mais comuns

- `VITE_SUPABASE_URL` ausente no ambiente de deploy.
- `VITE_SUPABASE_ANON_KEY` ausente no ambiente de deploy.
- Uso da string de conexão Postgres (`postgresql://...`) no lugar da URL HTTP do projeto Supabase (`https://<project-ref>.supabase.co`).
- Variáveis configuradas no ambiente errado (ex.: Preview vs Production) e o deploy atual não recebeu as mesmas chaves.

### Observação sobre Vite vs Next

Este projeto é Vite, então o padrão correto é usar `VITE_*`.
Por compatibilidade, o app também aceita `NEXT_PUBLIC_*`, mas a referência principal continua sendo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
