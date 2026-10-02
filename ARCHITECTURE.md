# Arquitetura

Next.js 16 + React 19 + Tailwind 4, tudo em TypeScript.

## Pastas

- `src/game`: as regras, puras. `reduce(sala, evento)` devolve a sala nova. `toView` esconde o que cada um não pode ver (tipo a própria carta).
- `src/server`: as ações do jogador (server actions). Cada uma carrega a sala, aplica o evento e salva só se ninguém mexeu antes; se mexeu, tenta de novo.
- `src/server/backend`: onde as coisas ficam. `local` = memória + pasta `.data`. `supabase` = Postgres, Realtime e Storage. Tem chave do Supabase? Usa Supabase. Senão, local.
- `src/app`: páginas e API. `/api/rooms/[code]` devolve a sala como você pode vê-la.
- `src/features`: as telas (início, sala de espera, escolha, turno, fim).
- `src/components/ui`: botões, cartas, relógio e afins.
- `messages/<idioma>`: os textos.
- `data`: temas e personagens.

## Detalhes

- Relógio sem cron: quando alguém busca a sala, o servidor aplica os tempos que já venceram.
- Tempo real: local busca a sala a cada 1 s. No Supabase chega um aviso pelo Realtime.
- Partidas: quando uma termina, vira um registro por jogador (`src/game/record.ts`), salvo depois da resposta. Convidado no Supabase é usuário anônimo; ao vincular Discord/Google o id não muda, então as partidas continuam dele.
- Tema: o Claude sorteia se tiver `ANTHROPIC_API_KEY`. Senão sai da lista de 306.
- Testes: `vitest` no motor (inclui 300 partidas aleatórias) e `playwright` com partidas inteiras.
