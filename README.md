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
2. No Supabase, roda `supabase/migrations/0001_init.sql`. Em Auth, liga "anonymous sign-ins", "manual linking", Discord e Google, com redirect `https://SEU-DOMINIO/auth/callback`.
3. `vercel env pull .env.local` e `pnpm seed` pra subir a biblioteca de personagens.
