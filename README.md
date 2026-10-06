# 4Dare

A guessing game for 2 to 4 friends. Everyone picks a character for someone else. You see everyone's card but yours, and find out who you are with yes-or-no questions.

## Run

```
pnpm install
pnpm dev
```

## Commands

- `pnpm test`: tests
- `pnpm test:e2e`: whole matches in the browser (Edge), on a production build, two at a time
- `pnpm test:e2e:smoke`: the hub and one match only
- `pnpm lint`: lint
- `pnpm typecheck`: types

## Test rooms

`pnpm test-rooms` fills the room list with made-up rooms: lobbies (open, full, private with password `1234`) and matches going on. `--keep` keeps them listed until Ctrl+C, `--hold` does that for the ones already there, and `--clear` closes them all.
