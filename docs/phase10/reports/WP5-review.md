# WP5 review (commit 712de86)

**Verdict: passed.** I found no high or medium defects. There are two low findings, both cheap to fix.

## What was checked

I went through every acceptance item of plan 5 (WP5), 1.5 and 1.6 in the code:

- **Draft routes**
  - The checks run in this order: origin, identity, rate limit `draft:id` (120/min), validation, seated, then the engine's `DRAFT` rules.
  - Validation: the name is at most 60 characters, and `imageUrl` must be one of our uploads.
  - The image route shares the `upload:id` limit.
  - The write is a quiet dispatch (no `roomChanged` and no `lobbyChanged`) and answers 204.
- **`newId`**
  - It is set once, and a lost compare-and-swap keeps the winner's id.
  - Confirm and timeout both use the draft's `newId`. Hosted `createOnce` is insert-or-nothing on both tables, so racing timeouts end with one row.
- **Timeout**
  - The order is: the drafted character (preview id, else the typed name made or reused), then the provisional card from the engine, then fallbacks for empty cards only.
  - Server and engine agree on what counts as an empty card. Both trim and squash spaces the same way, and both treat a `characterId` that doesn't resolve with an empty name as empty. So the engine never runs out of fallbacks (`invalid_input`), which would leave the room stuck.
  - Fallbacks leave out every character already on a card and every drafted one. The caller's own secret is never drawn.
- **`confirmCard`**
  - It inserts only. A same-name entry is reused as it is.
  - The picture comes from the stored draft, and only for a new-character draft.
- **`randomPick`**: it saves the draw as a quiet draft. Its exclusion is unchanged.
- **`dispatch`**: it retries with a backoff of 15–60 ms × attempt.
- **Rule examples**
  - Only on the first match (`round === 0`), at START in vote mode and on the theming → vote timeout.
  - They are stored in the vote, so every viewer sees the same cards.
  - ✓✓ comes from the starters by position, then from history.
  - The ✗ comes from contrasting sets. It is null for cross-cutting and mixed sets, and it is deterministic (FNV hash).
  - Ids that don't resolve are skipped.
  - A failed read never blocks START.
- **Hand route**: up to 8 cards, history with signal first, then starters, pictures first. It is cacheable, and `/api` is outside the `proxy.ts` matcher, so no Set-Cookie reaches the CDN. It never leaves out what the match picked.
- **Secrecy**
  - Drafts stay in the picker's view only (the test checks the target's JSON).
  - The `drafted` and fallback lists ride on the event and are never stored.
  - The hand is the same for every viewer and for every match.
- **Fixtures**: no test reads `data/*.json`. The PostgREST embeds match the 0011 foreign keys, and `characters.kind` and `themes.active`/`theme_set` exist.
- **No UI**: WP5 has none, so the i18n, layout, dark theme and reduced-motion checks don't apply.

**Runs**

- `pnpm exec vitest run src/server/server.test.ts src/server/rule-examples.test.ts src/server/theme-picks.test.ts src/server/backend/supabase/themes.test.ts`: 4 files, 54 tests passed.
- `pnpm typecheck`: passes.

## Findings

### Low: the hand route doesn't fall back when the history read fails

- **Where**: `src/app/api/themes/[id]/picks/route.ts:30` (the same pattern is at `src/server/rule-examples.ts:216`).
- **Problem**:
  - `matches.popularPicks` throws on a Supabase or RPC error (`supabase/matches.ts:24`). The route has no catch, so the pick screen gets a 500 and no hand. The starters would have been enough on their own.
  - In `ruleExamplesFor`, the history fill's `popularPicks` rejection rejects the whole `Promise.all`. `voteExamples` then drops the cards of all three themes, including the themes whose starters were complete.
- **Why it matters**: plan 1.6 says both "degrade gracefully", and `fallbackCharacters` already does `.catch(() => [])`.
- **Fix**: add `.catch(() => [])` on `popularPicks` in both places.

### Low: the draft picture is stored before the deadline check

- **Where**: `src/app/api/rooms/[code]/draft/image/route.ts:33-39`.
- **Problem**: the route checks only `phase === "picking"`, then runs `files.put`. If the deadline has passed but the timeout hasn't fired yet, the file is uploaded to the public bucket. Then `saveDraft` refuses it with `wrong_phase` (409), and the file is left orphaned.
- **Fix**: before `files.put`, add `if (state.deadline !== null && Date.now() >= state.deadline) return failure("wrong_phase")`.
