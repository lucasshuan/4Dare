# Dare

Jogo de adivinhação pra 2 a 4 amigos. Cada um escolhe um personagem pra outro. Você vê a carta de todo mundo, menos a sua, e descobre quem é com perguntas de sim ou não.

## Rodar

```
pnpm install
pnpm dev
```

Abre http://localhost:3000. Não precisa configurar nada: sem chaves, tudo fica em memória.

Pra testar sozinho, abre outro navegador ou uma janela anônima. Cada um vira um jogador.

Pra jogar com amigos na mesma rede: `pnpm build && pnpm start`, e eles abrem `http://SEU-IP:3000`.

## Comandos

- `pnpm test`: testes
- `pnpm test:e2e`: partidas inteiras no navegador (Edge)
- `pnpm lint`: lint
- `pnpm typecheck`: tipos

## Online

1. Na Vercel, importa o repo e adiciona a integração do Supabase. As chaves entram sozinhas.
2. No Supabase, roda `supabase/migrations/0001_init.sql` no SQL Editor.
3. Em Authentication, liga "Allow anonymous sign-ins" e "Allow manual linking". Em URL Configuration: Site URL = seu domínio; Redirect URLs = `https://SEU-DOMINIO/**` e `http://localhost:3000/**`.
4. Discord: em discord.com/developers, New Application → OAuth2 → Redirect `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Copia Client ID e Client Secret.
5. Google: em console.cloud.google.com, Credenciais → ID do cliente OAuth (Aplicativo da Web) → mesmo redirect do passo 4. Copia ID e chave secreta.
6. Cola os dois em Supabase → Authentication → Sign In / Providers (Discord e Google).
7. `vercel env pull .env.local` e `pnpm seed` pra subir a biblioteca de personagens.
