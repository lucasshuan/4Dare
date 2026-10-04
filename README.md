# 4Dare

A guessing game for 2 to 4 friends. Everyone picks a character for someone else. You see everyone's card but yours, and find out who you are with yes-or-no questions.

## Run

```
pnpm install
pnpm dev
```

Open http://localhost:3000. Nothing to set up: without keys, everything lives in memory, with a few characters and themes for testing. With the Supabase keys in `.env.local`, dev uses the real database.

To test alone, open another browser or a private window. Each one is a player.

To play with friends on the same network: `pnpm build && pnpm start`, and they open `http://YOUR-IP:3000`.

## Commands

- `pnpm test`: tests
- `pnpm test:e2e`: whole matches in the browser (Edge), on a production build, two at a time
- `pnpm test:e2e:smoke`: the hub and one match only
- `pnpm lint`: lint
- `pnpm typecheck`: types

## Online

1. On Vercel, import the repo and add the Supabase integration. The keys come in on their own.
2. Discord: at discord.com/developers, New Application → OAuth2 → Redirect `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
3. Google: at console.cloud.google.com, Credentials → OAuth client ID (Web application) → the same redirect.
4. `vercel env pull .env.local` (or paste the integration's variables) and add a token from supabase.com/dashboard/account/tokens, the Discord and Google ID and secret, and your domain.
5. `pnpm setup:supabase`: creates the tables, turns on Discord and Google (guests need nothing), sets the URLs, and puts the keys in `.env.local`.
6. The character library and the themes were fed by hand and live only in the database: a new project gets them from a backup of the old one. Change them there, insert or update only.

## Test rooms

`pnpm test-rooms` fills the room list with made-up rooms: lobbies (open, full, private with password `1234`) and matches going on. `--keep` keeps them listed until Ctrl+C, `--hold` does that for the ones already there, and `--clear` closes them all.
