# WP9b review (commit 5b7388f)

Verdict: **not passed**. Two medium defects and one low.

Checked: every acceptance item of the brief against `pick-screen.tsx`, `pick-hand.tsx`, `done-row.tsx`, `use-pick-draft.ts`, `draft-api.ts`, `show-timing/pick.ts`, `lab/scenarios/pick.ts`, `e2e/helpers.ts` (`pickAll`) and `e2e/picture.spec.ts`, plus the parts of WP9a's card and WP5's routes and actions they rely on. These hold:
- `PickIntro` plays during draw and target, and the table plays from the `entrance` beat with the brief's times.
- The title has the target's avatar. The `lg` row and the phone column are laid out as the brief says.
- Confirm is a yes key at 56/64 px. Random is 44 px with the dice spin, and it is hidden for a typed theme.
- The `not_enough_picks` note and `DrawFeedback` are kept.
- The hand draws 5 of 8 from `youId:round`, uses the fan formula and shows likes only when > 0.
- Confirm and Random are disabled until `stepStartsAt` and during uploads.
- On confirm the card grows to 1.08 from its top, and the done row shows ticks with `Intl.ListFormat` and avatars on the names.
- At time-out the stamp shows and the card freezes. An empty card flips to the drawn character.
- The table fades over the last 0.4 s of `picked`. The card shrinks with `clamp` on short windows.
- Reduced motion keeps the same times with fades.
- Secrecy holds: nothing on the screen shows the viewer's own character.

Ran:
- `pnpm exec vitest run src/features/pick/draft-api.test.ts src/features/stage/lab/scenarios.test.ts src/i18n/messages.test.ts`: 53 passed.
- `pnpm typecheck`: clean.
- Lab on :3100. 3 screenshots: phone pt `names=long` dark, desktop light, phone with the panel hidden. Plus measurements at 390×844 for pick at +5 s and cast at +0.5 s. No page errors and no horizontal overflow.
- At 390×844 the card is 224 px (y 178–542), the actions row is at y 556–618, the hand label is at y 685 and the cards bleed under the chat bar. In the cast, the card is `matrix(1.08…)` and "Everyone has picked!" sits at y 684.

## Medium: a transient CAS `conflict` stops the autosave for the rest of the pick

- **Where:** `src/features/pick/use-pick-draft.ts:111`. It relies on `src/server/http.ts` (`conflict: 409`) and `src/server/rooms.ts:131`.
- **Problem:** `send` sets `s.stopped = true` on any 403 or 409. `dispatch` throws `GameError("conflict")` after its 5 CAS attempts, and the route maps that to 409. So one save that loses five races in a row turns the autosave off for good. That is the case the plan's backoff and jitter were made for: several pickers typing, or the clustered final flushes. After that, nothing more is saved: not the debounced saves, not the final flush, not the keepalive. The `flush()` before a new name's Confirm also does nothing.
- **Failure scenario:** 4 players type at the same time on the Supabase backend. One PUT returns 409 `conflict`. That player keeps editing (for example, picks a hand card), the clock runs out, and the server picks the older draft. The rule "whatever is on the card is the pick" is broken without any visible sign.
- **Fix:** stop only for errors that close the card. Read the body's `error` and stop on `already_done`, `wrong_phase`, `not_member` and `unauthorized`. Treat `conflict` (and 429 or 5xx) as retryable: leave `accepted` unchanged so the next change or the final flush sends it again.

## Medium: a Random draw that is overtaken still overwrites the server's draft, then yanks the card or decides the timeout

- **Where:** `src/features/pick/pick-screen.tsx:278-286` (`roll`), with `randomPick` in `src/server/actions.ts:330-381` and the "draft saved elsewhere" effect in `use-pick-draft.ts:152-166`.
- **Problem:** while a draw is in flight, the hand and the field stay enabled. Only Confirm and Random are `busy`. A hand tap bumps `rollId` and saves at once through the PUT route, which runs in parallel with the Server Action. `randomPick` makes several round trips before its own `saveDraft`: the room, `popularPicks`, `getMany`. So its write usually lands **after** the hand card's write. The client throws the draw away (`id !== rollId.current`), but the server's draft is now the draw. This page never added the draw's key to `known`, and it believes the hand card is `accepted`.
- **Failure scenario:**
  1. The player clicks Random, then taps a hand card before the draw comes back.
  2. Server draft = the random draw. Card = the hand card. `accepted` = the hand card.
  3. With the field not focused, the next view (local poll, or any player's action) brings `pick.draft` = the draw. The effect sees a server draft new to the page and a clean card, so it calls `setContent(fromDraft(draw))`. The hand card is silently replaced by the discarded draw.
  4. If the field is focused instead, nothing is resent, and a timeout picks the draw rather than what is on the card.
- **Fix:** when a stale roll returns `ok`, add the drawn draft's key to `known` and force a resave of the current card. A simple way is to reset `s.accepted` to `""` (through a small `markDirty()` on the hook) and call `flush()`. Another way is to disable the hand and the field while `rolling`.

## Low: after a timeout, the stamped card can show something other than the real pick

- **Where:** `src/features/pick/pick-screen.tsx:341-348` (`shown`).
- **Problem:** `shown` swaps in `pick.character` only for `empty` and `typing` cards. A `picked` or `new` card that changed after the last accepted save keeps showing the local content under "Time! That's the one." Late saves are refused once `now >= deadline`. Typing in the last ~1.1–1.5 s comes after the final flush and is still inside the 600 ms debounce. A hand tap in the last instant can reach the server after the deadline. In all these cases the server picked the earlier draft.
- **Failure scenario:** a player types "Chapol", which is saved, then "Chapolin" in the last second. The stamp freezes "Chapolin", but the server created "Chapol". Or a player taps a hand card 200 ms before the deadline, the PUT gets 409, and the card shows the hand character over the stamp while another character goes.
- **Fix:** once `timeUp && pick.character`, show `pick.character` (as `restore`) whenever it is not the same as the local card (different `characterId`, or a different name for a new one). Optionally, also skip the debounce inside the last `FINAL_FLUSH_MS`.
