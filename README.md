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
2. Discord: em discord.com/developers, New Application → OAuth2 → Redirect `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. Google: em console.cloud.google.com, Credenciais → ID do cliente OAuth (Aplicativo da Web) → o mesmo redirect.
4. No `.env.local` (veja o `.env.example`): URL do Supabase, um token de supabase.com/dashboard/account/tokens, ID e segredo do Discord e do Google, e o seu domínio.
5. `pnpm setup:supabase`: cria as tabelas, liga convidados, Discord e Google, as URLs, e põe as chaves no `.env.local`.
6. `pnpm seed` pra subir a biblioteca de personagens.
