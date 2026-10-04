# Phase 10: the game engine, mapped, with the proposed changes

This stage was read-only. Sources: `src/game/{types,engine,view,helpers,match,record,theme-sets,theme-id,test-utils}.ts`, the engine/view/simulation/record tests, `src/server/{rooms,actions,theme-picks,contract}.ts`, `src/server/backend/*`, `src/app/api/rooms/[code]/route.ts`, the UI screens that read clocks (`room-screen`, `vote-screen`, `theme-screen`, `pick-screen`, `reveal-overlay`, `timer`, `use-room`, `use-server-clock`), and the prototype in `docs/phase10/prototype/` (scene beats plus the timing chart in `player.js`).

---

## 0. Summary

- The engine already has everything the show needs: the shuffled order, the ring (`order[i]` picks for `order[i+1]`), a `round` counter that tells whether a match is the room's first, and a server-clock delayed start (`reveal.until` holds back `stepStartsAt`). No new phase is needed.
- **Proposal (a):** turn `Reveal` into the carrier for three "shows" (`opening`, `theme`, `cast`). Each holds a list of back-to-back **beats** with absolute server times. The engine computes the beats once, the view passes them through, and the UI finds the beat on screen with `now`. `startStep` holds the clock for any show, not only for `theme`.
- **Proposal (b):** add a `DRAFT` event that stores `Assignment.draft` (a library character, or a custom name/origin/image). The server writes it quietly, with no realtime ping. On timeout a draft becomes the pick, and the server creates the character idempotently. Random fills only empty cards.
- **Proposal (c):** set `VOTE_SECONDS = 20`. The vote's clock then starts after the opening show.
- **Proposal (d):** the view exposes, for everyone, who picks for whom (`picksForId`, plus `pickedById` including your own, which the ring already reveals), the show beats, a `first` flag, your saved draft and how each card was picked. Suggestions and the rule's ✓/✗ examples come from a server action or route, not from the engine.
- About 25 existing tests depend on timings. Most break only because `ASK` now gets `too_early` during the cast show, and adding `skipReveal()` to the `started()`/`timed()` helpers fixes them. The full list is in §3.

---

## 1. Map of the engine today

### 1.1 State machine

`RoomState.phase`: `lobby | theming | voting | picking | asking | answering | guessing | validating | finished | closed`.

| From | Event | To | Notes |
|---|---|---|---|
| lobby | `START` (host, ≥2 seated) | `voting`, or `theming` (`themeMode: "host"`) | `beginTheme` → `beginVote` (needs exactly `THEME_OPTIONS`=3 themes from the server) or `beginTheming` (ideas, `THEME_IDEAS`=12). Lobbies have no clock (`TIMEOUT` in lobby only drops a legacy deadline). |
| theming | `SET_THEME` (host) | picking | `beginMatch(theme{set:null})` + `revealTheme(REVEAL_TIMING.theme)` |
| theming | `TIMEOUT` (30 s) | voting | the server passes `themes` drawn from every set |
| voting | `VOTE` (last one in) / `TIMEOUT` / `LEAVE` (leaves everyone voted) | picking | `closeVote`: most votes wins, ties drawn with `ctx.random` → `beginMatch` → `revealTheme(theme + tieSpin if tied)` |
| voting / theming | `LEAVE` down to 1 player | lobby | `vote=null`, `ideas=[]`, `stopClock`. **`reveal` is not cleared** (see §1.9) |
| picking | `PICK` by the last picker | asking | `startTurns`: `playStartedAt=now`, `turnRound=0`, `goToTurn(from order.at(-1))` → `order[0]` if it can play |
| picking | `TIMEOUT` (120 s) | asking | missing picks filled from `fallbackCharacters`, marked `auto` |
| asking | `ASK` | answering, or straight to guessing if nobody present can answer | `fillMissingAnswers(onlyAway)` |
| asking | `TIMEOUT` | asking (next player) | strike; 2 strikes → `away` + `endOutcome` |
| answering | `ANSWER` (not the last) | answering | `cutAnswerClock` (−20 % of the answer time, floor 10 s) |
| answering | last `ANSWER` / `TIMEOUT` | guessing | `resolveQuestion`: answers reveal (6–10 s) while the guess clock already runs |
| guessing | `GUESS` close match | asking (next) | `hit` → guess reveal 5 s; place from `turnRound` (ties) |
| guessing | `GUESS` far | validating | the picker (or a stand-in) validates |
| guessing | `PASS` / `TIMEOUT` | asking (next) | no reveal |
| validating | `VALIDATE` / `TIMEOUT` (= miss) | asking (next) | `hit` or `miss` reveal (5 s / 4 s) |
| any match phase | `GIVE_UP` / `LEAVE` | … / finished | turn player: `abandonTurn`; fewer than 2 present, or nobody active → `finish` |
| finished | `BACK_TO_LOBBY` (host) / `TIMEOUT` (15 s after the last reveal) | lobby | away players lose their seats, `ready` resets, the vote is kept (the next draw avoids its themes) |
| any | `SWEEP` (every page closed past `GONE_GRACE_MS`) | closed (match) / frees seats (lobby) | |
| anything | `GONE`, `BACK`, `UPDATE_IDENTITY`, `SWAP_PLAYER`, `SET_READY`, `UPDATE_SETTINGS` | same | |

`reduce` is pure: `structuredClone`, apply, `updatedAt = now`. The server's `dispatch` loads, reduces and compare-and-swaps (5 tries); on success it pings `room:<code>` and saves the match record once, on the write that finished it.

### 1.2 Every timer constant

| Constant | Value | Where | Effect |
|---|---|---|---|
| `VOTE_SECONDS` | 13 | types.ts:124 | vote clock |
| `HOST_THEME_SECONDS` | 30 | types.ts:126 | host typing, then fall back to a vote |
| `PICK_SECONDS` | 120 | types.ts:101 | picking clock (fixed) |
| `askSeconds` / `answerSeconds` / `guessSeconds` / `validateSeconds` | 80 / 80 / 60 / 40 (room setting, 30–300) | `RoomSettings`, `stepSeconds()` falls back to defaults for older rooms | turn steps |
| `ANSWER_CUT`, `ANSWER_CUT_FLOOR_MS` | 0.2, 10 000 | types.ts:106-108 | answer clock cut |
| `RESULT_SECONDS` | 15 | types.ts:121 | podium, then lobby |
| `REVEAL_TIMING.answersBase/perAnswer/perNoteChar/Min/Max` | 4000 / 1000 / 60 / 6000 / 10000 | types.ts:140 | answers reveal length |
| `REVEAL_TIMING.guessMiss / guessHit` | 4000 / 5000 | | guess reveal length |
| `REVEAL_TIMING.theme` | 3000 | | theme on screen before picking |
| `REVEAL_TIMING.themeTieSpin` | 2000 | | extra time for the tie roulette (vote-screen reads it too) |
| `GONE_GRACE_MS` | 5000 | | reload grace |
| `LOBBY_LISTED_MS` | 15 min | | lobby leaves the room list |
| `PLAYING_FRESH_MS` (view.ts) | 20 min | | a stale match leaves the list and the online count |
| `SPOTLIGHT_MS` (vote-screen.tsx, UI only) | 700 | | the winner glows after the spin, within the 3 s theme reveal |

### 1.3 How deadlines, held clocks and reveals are synced

- State: `deadline` (when the step ends), `stepStartsAt` (when its clock starts; later than now while something holds it), `stepMs` (full length, so the UI shows answer cuts), `reveal: { kind: "answers" | "guess" | "theme", n, startsAt, until }`.
- `startStep(s, ctx, ms)`: `waits = reveal.kind === "theme" || phase not a turn step`; `start = max(now, waits ? reveal.until : 0)`. So:
  - turn steps start at once under an answers/guess reveal (players can close it);
  - picking waits for the theme reveal;
  - the podium waits for the last guess reveal.
- `guardStep` throws `too_early` while `now < stepStartsAt`, **only** for `ASK`, `ANSWER`, `GUESS`, `PASS` and `VALIDATE`. `VOTE`, `SET_THEME`, `PICK` and `GIVE_UP` are never guarded, so today a pick during the theme reveal is accepted.
- There is no cron. `GET /api/rooms/[code]` runs `applyDueTimeouts` (a `SWEEP` first, then up to 4 `TIMEOUT`s, with the server supplying `themes` / `fallbackCharacters`). `currentMatch` does the same. Clients refetch at `deadline + 300 ms` (`useRoom`), poll every 1 s (local) or 10 s (Supabase) and refetch on the broadcast ping.
- Clock sync: each view carries `serverNow`; `offset = serverNow − (sent + received)/2`; `useServerClock(offset)` ticks. The `Timer` "recharges" from `reveal.startsAt` to `stepStartsAt`, then counts down.
- The UI derives the moments inside a reveal from `reveal.startsAt` plus shared constants. For example, `rouletteAt` in vote-screen uses `REVEAL_TIMING.themeTieSpin` and `SPOTLIGHT_MS`, so every screen spins in step. **The new beats follow exactly this pattern.**
- The theme reveal stays in `s.reveal` through picking until the first answers reveal replaces it. `view.reveal()` returns null once `now ≥ until`. `RevealOverlay` ignores kind `theme`. `room-screen` keeps the vote or theme screen mounted while a `theme` reveal runs, and shows a blank `finished-wait` while a reveal runs on the podium.

### 1.4 `beginMatch` (engine.ts:263)

`round += 1` → `theme` set → `ideas=[]`, `plays=[]`, `turnPlayerId=null`, `reveal=null` → `order = shuffle(players)` (Fisher–Yates on `ctx.random`) → **ring**: `assignments[order[(i+1)%n]] = { pickerId: order[i], character: null }`. So whoever picks for you plays right before you, which the prototype's "order" note also says → outcomes reset; `strikes=0`, `away=false` → `playStartedAt=null` → phase `picking` → `startStep(PICK)`. It is called from `closeVote` and `setTheme`, each followed by `revealTheme`.

### 1.5 Picking today

- **`PICK`** (engine.ts:730): the phase must be picking; the assignment is found by `pickerId`; `already_done` if it is set. There is no `too_early` guard, and duplicates across assignments are allowed. Once every assignment has a character → `startTurns`. The character comes from the server: `confirmPick(code, id)` loads it with `characters.get(id)`.
- **Random** (`actions.randomPick`, not an engine event): it fails `not_enough_picks` for a typed theme. It runs `drawPopular` over `matches.popularPicks(themeId, 100)`: the 20 heaviest by `drawWeight = (picks + likes) × 0.5^dislikes`, in the player's language. It leaves out `taken` (every character already picked in the match, as language-free `pickKey`) and the last draw (`skip`). The player still confirms. `rateRandomPick` stores 👍/👎 in `pick_feedback`, only for characters the button can draw.
- **Custom character** (`actions.createCharacter`, FormData): name ≤ 60, origin ≤ 60, lang, image ≤ 4 MB (webp/jpeg/png checked by magic bytes, cropped 4:5 in the browser). The image goes through `files.put("characters")`. A library entry with the same normalized name (and origin) is reused (`setImage` if an image came with it); otherwise `characters.create` makes `u-<randomUUID>`. `replaceCharacterImage` swaps a library character's picture for everyone.
- **Timeout** (engine.ts:869): the server's `fallbackCharacters(state)` gives, per owed assignment, `characters.randomPopular(picker.lang, 4)` (globally popular, **not the theme's**) plus 6 `EMERGENCY` names. The engine fills each empty assignment from the unused pool, sets `auto: true` (records mark `autoPicked`, left out of theme stats), then `startTurns`. **Nothing typed or selected but unconfirmed survives**: there are no drafts.
- **Leaving while picking:** the leaver still owes a pick and nothing ends picking early, so the others wait for the 120 s clock (existing gap, out of scope).

### 1.6 Does the room know its first match?

Yes. `round` counts matches started (`beginMatch` increments it). It is still `0` during the first `START` → vote. It becomes `1` once the first theme is decided. A vote abandoned back to the lobby does not increment it. `round` is in `RoomView`. **First match = `round === 0` at `START`, `round === 1` after `beginMatch`.** No new counter is needed.

### 1.7 What `toView` exposes (per viewer)

- `players[]`:
  - id, name, avatar, `isYou`, `isHost`, `ready`, `status`, `seat` (colour);
  - `turnOrder` (index in `order`, in any non-lobby phase, **including voting and picking**);
  - `isTurn`, only in turn phases;
  - `card`: `canSeeCard` → turn phases and finished only, never your own unless you discovered it, gave up or the match finished;
  - `cardHidden`;
  - `pickedById`: only in turn phases and finished, and **null for your own card until finished**;
  - `discoveredAt`, `place`, `gaveUp`, `away`.
- `theme`, `round`, `deadline`, `stepStartsAt`, `stepMs`, `serverNow`.
- `reveal`: `theme` (times only), `answers` (question + answers), `guess` (your own card hidden on your miss; place and tie on a hit). Null after `until`.
- `vote`: during voting and during the theme reveal (options, open votes, `yourVote`, `chosen`, `tied`, `total`).
- `ideas`: the host only, while theming.
- `pick`: while picking. Contains `targetId` (whom **you** pick for), `confirmed`, your confirmed `character`, `confirmedIds`, `total`.
- `turn`: question, `answeredIds`, `yourAnswer`, answers once resolved, guess, `validatorId`.
- `history`: resolved plays. `canStart`.

### 1.8 Theme sets and ids

`THEME_SETS` holds 20 sets with an emoji and an `about`; `themeSetEmoji(set)` gives the emoji (backdrop symbols can start from it). `themeId(theme)` slugs the English text. It groups picks and likes per theme and is null for typed themes in records.

### 1.9 Gaps found while mapping (relevant to Phase 10)

1. `leave()` sending a vote or theming back to the lobby does not clear `s.reveal`. It is harmless today but **a bug once the opening show exists**: the lobby would replay the intro.
2. `finish()` during a running theme reveal makes the podium wait (blank `finished-wait`). With longer shows (up to 13 s) this becomes visible.
3. The `randomPick` exclusion set includes **the character picked for the caller**, so a button that never draws X hints that X is yours. A visible "hand of suggestions" would make this obvious. Exclude only characters picked for *other* players.
4. The timeout fallback ignores the theme (`randomPopular` is global).
5. `pickedById` for your own card is hidden, but it can already be derived from `turnOrder` plus the ring rule. Exposing it costs no secrecy.
6. Docs: `ARCHITECTURE.md:21` says the vote lasts **8 s** and the theme stays up 3 s. `PRODUCT.md:14` does not mention the vote time.

---

## 2. Proposed engine changes

### 2.1 (a) Shows: data model (`types.ts`)

```ts
export const VOTE_SECONDS = 20; // was 13
export const MAX_CHARACTER_NAME = 60; // was a bare 60 in actions.createCharacter

/**
 * The scenes that present a match, in ms. The room's first match gets the long
 * version, later matches the short one. Server-wide: reduced motion only changes
 * what each screen draws, never how long a scene lasts.
 */
export const SHOW_TIMING = {
  intro: 7000,          // cold open (first match): cards over heads, "Am I from Marvel?"
  roundCard: 1500,      // later matches: "Round 2"
  voteEntrance: 1700,   // the line alone (~0.8 s), rises into the title, cards dealt: then the clock
  tieSpin: 2000,        // moved from REVEAL_TIMING.themeTieSpin
  theme: { first: 2400, later: 3000 },   // the chosen theme grows in the middle
  rule: { cards: 3600, sentence: 2200 }, // first match only; a typed theme gets the sentence only
  draw: { first: 4500, later: 3000 },    // avatars hop into the 4, it shakes and spits the slip
  target: { first: 2500, later: 3000 },  // the slip is the screen: "You pick for Leo" + the ring
  picked: 1000,          // the last card grows / "Time!" stamp, then the cast
  received: { first: 4300, later: 3000 }, // "Rafa picked yours", the others face up
  order: { first: 4000, later: 3000 },    // shuffle into the turn order, "Bia starts!", into the strip
} as const;
// REVEAL_TIMING keeps answers*/guess* only; `theme` and `themeTieSpin` move here.

export const BEATS = [
  "intro", "round", "vote_entrance",
  "tie_spin", "theme", "rule", "draw", "target",
  "picked", "received", "order",
] as const;
export type BeatKind = (typeof BEATS)[number];
export interface Beat { kind: BeatKind; startsAt: number; until: number }

export type ShowKind = "opening" | "theme" | "cast";

export interface Reveal {
  kind: "answers" | "guess" | ShowKind;
  /** The jogada revealed; for a show, the match it presents (`round`; `round + 1` for "opening"). */
  n: number;
  startsAt: number;
  until: number;
  /** Shows only: scenes back to back from startsAt to until. Absent in rooms saved before shows. */
  beats?: Beat[];
  /** Shows only: the room's first match (the long version). */
  first?: boolean;
}
```

Timelines that come out of it (server ms):

| Show | Starts at | Beats, room's first match | Beats, later matches | Then |
|---|---|---|---|---|
| `opening`, vote mode | `START` | intro 7000 · vote_entrance 1700 = **8.7 s** | round 1500 · vote_entrance 1700 = **3.2 s** | vote clock 20 s |
| `opening`, host mode | `START` | intro 7000 | round 1500 | theming clock 30 s |
| `opening`, theming → vote fallback | `TIMEOUT` | vote_entrance 1700 | vote_entrance 1700 | vote clock 20 s |
| `theme`, voted | vote closes | [tie_spin 2000] · theme 2400 · rule 3600 · draw 4500 · target 2500 = **13 s** (+2) | [tie_spin 2000] · theme 3000 · draw 3000 · target 3000 = **9 s** (+2) | pick clock 120 s |
| `theme`, typed | `SET_THEME` | theme 2400 · rule 2200 (sentence) · draw 4500 · target 2500 = **11.6 s** | theme 3000 · draw 3000 · target 3000 = 9 s | pick clock 120 s |
| `cast` | last `PICK` or pick `TIMEOUT` | picked 1000 · received 4300 · order 4000 = **9.3 s** | picked 1000 · received 3000 · order 3000 = **7 s** | turn 1's ask clock |

This matches the proposal's chart (first match ≈ 30 s on top of the picking time, later ≈ 14 s plus the 1 s `picked` buffer). The `picked` beat is not in the chart. It gives the last confirmer's "card grows 1.08×" or the timeout's "Time! This one." stamp a moment, and it absorbs the fetch delay of a lazily applied timeout. It can be set to 0 if unwanted.

### 2.2 (a) Shows: engine functions (`engine.ts`)

```ts
const SHOW_KINDS = new Set<Reveal["kind"]>(["opening", "theme", "cast"]);
const isShow = (r: Reveal | null): r is Reveal => !!r && SHOW_KINDS.has(r.kind);
type Part = [BeatKind, number];

/** Puts a show on screen, after the one still playing if any; zero-length beats drop out. */
function stage(s: RoomState, kind: ShowKind, n: number, first: boolean, parts: Part[], ctx: Ctx) {
  let t = Math.max(ctx.now, isShow(s.reveal) ? s.reveal.until : 0);
  const startsAt = t;
  const beats = parts
    .filter(([, ms]) => ms > 0)
    .map(([kind, ms]) => ({ kind, startsAt: t, until: (t += ms) }));
  s.reveal = { kind, n, startsAt, until: t, beats, first };
}

function startStep(s: RoomState, ctx: Ctx, ms: number) {
  const waits = isShow(s.reveal) || !TURN_PHASES.has(s.phase); // was: reveal.kind === "theme"
  const start = Math.max(ctx.now, waits ? (s.reveal?.until ?? 0) : 0);
  s.stepStartsAt = start; s.deadline = start + ms; s.stepMs = ms;
}
```

- **`beginTheme` (START):** `first = s.round === 0`, `open: Part = first ? ["intro", T.intro] : ["round", T.roundCard]`. Pass `[open]` into `beginTheming(s, ideas, [open], ctx)` or `beginVote(s, themes, [open], ctx)`.
- **`beginVote(s, themes, opening, ctx)`:** keep the validation first, set `s.reveal = null`, then `stage(s, "opening", s.round + 1, s.round === 0, [...opening, ["vote_entrance", T.voteEntrance]], ctx)`, phase voting, `startStep(VOTE_SECONDS*1000)`. The theming timeout calls `beginVote(s, e.themes, [], ctx)`, which gives an entrance-only opening.
- **`beginTheming(s, ideas, opening, ctx)`:** the same idea, with `stage(..., opening)` and then `startStep(HOST_THEME_SECONDS*1000)`.
- **`beginMatch`:** **stop resetting `s.reveal`** and drop its own `startStep`. If the vote closed while the opening still runs (everyone voted during the last ~0.4 s of the entrance), the theme show queues after it instead of cutting it.
- **`closeVote` / `setTheme`:** `beginMatch(...)` then `showTheme(s, { tie, typed }, ctx)`. This replaces `revealTheme`:

```ts
/** The chosen theme, the rule (first match), the draw and "you pick for…"; then the picking clock. */
function showTheme(s: RoomState, o: { tie: boolean; typed: boolean }, ctx: Ctx) {
  const first = s.round === 1, v = first ? "first" : "later", T = SHOW_TIMING;
  stage(s, "theme", s.round, first, [
    ["tie_spin", o.tie ? T.tieSpin : 0],
    ["theme", T.theme[v]],
    ["rule", first ? (o.typed ? T.rule.sentence : T.rule.cards) : 0],
    ["draw", T.draw[v]],
    ["target", T.target[v]],
  ], ctx);
  startStep(s, ctx, PICK_SECONDS * 1000);
}
```

- **`startTurns`** (all picked, or pick timeout):

```ts
function startTurns(s: RoomState, ctx: Ctx) {
  const first = s.round === 1, v = first ? "first" : "later", T = SHOW_TIMING;
  stage(s, "cast", s.round, first,
    [["picked", T.picked], ["received", T.received[v]], ["order", T.order[v]]], ctx);
  s.playStartedAt = s.reveal!.until; // when turn 1's clock starts (was: picks done)
  s.turnRound = 0;
  goToTurn(s, ctx, s.order.at(-1) ?? null); // startStep waits for the cast
}
```

  During the cast the phase is already `asking`, with `turnPlayerId` set and its clock held. `ASK` gets `too_early` through the existing `guardStep`. A `GIVE_UP` or `LEAVE` from the first player moves the turn on, and the next clock still starts at `cast.until`.
- **`finish`:** before the podium, `if (isShow(s.reveal) && ctx.now < s.reveal.until) s.reveal = null;`. A match that ends during a show (someone leaves while picking, or during the cast) shows the podium at once. A guess reveal still holds the podium as today.
- **`leave`** back to the lobby from voting or theming: also `s.reveal = null` (gap 1).
- `matchRecord`: unchanged (`playStartedAt != null`; `timeMs` already clamps to ≥ 0). A match given up during the cast is still recorded, so its picks count for the theme stats, and `server.test` "saves a finished match" keeps passing.
- `VOTE`, `SET_THEME`, `PICK` and `DRAFT` stay unguarded. A guard would turn a click that lands a few ms early (clock skew ≤ RTT/2) into an error, and acting during a show is harmless: the next show just queues.

Back-compat: a room saved mid-picking before the deploy has a `theme` reveal without `beats`. The view fills in `beats: [{ kind: "theme", startsAt, until }]` and `first: false`. Assignments without `draft` work unchanged.

### 2.3 (b) Pick drafts

**Types:**

```ts
/** What a picker has on the card while editing; the clock picks it if time runs out. Only the picker ever sees it. */
export type PickDraft =
  | { kind: "library"; character: Character }
  | { kind: "custom"; name: string; origin: string | null; imageUrl: string | null };

export interface Assignment {
  pickerId: PlayerId;
  character: Character | null;
  auto?: true;            // the clock drew it (empty card): left out of theme stats
  draft?: PickDraft | null;
  drafted?: true;         // the clock took the picker's draft: a real choice, counts in stats
}

// GameEvent
| { type: "DRAFT"; playerId: PlayerId; draft: PickDraft | null }
| { type: "TIMEOUT"; themes?: Theme[]; fallbackCharacters?: Character[];
    /** Custom drafts the server saved in the library, by target player. */
    drafted?: Record<PlayerId, Character> }
```

**Engine:**

```ts
function draft(s: RoomState, playerId: PlayerId, d: PickDraft | null) {
  if (s.phase !== "picking") fail("wrong_phase");
  const a = Object.values(s.assignments).find((x) => x.pickerId === playerId) ?? fail("not_member");
  if (a.character) fail("already_done");
  a.draft = d && cleanDraft(d);
}
// cleanDraft: library → clone character (aliases copied); custom → name trimmed, spaces squashed,
// 0..MAX_CHARACTER_NAME (an empty name is allowed so a picture alone survives a reload), origin
// ≤ MAX_CHARACTER_NAME or null, imageUrl as given (only server actions build it, never the browser).

// pick(): after setting the character, `a.draft = null`.

// timeout, "picking":
for (const [target, a] of Object.entries(s.assignments)) {
  if (a.character) continue;
  const mine = fromDraft(s, target, a, e.drafted);
  if (mine) { a.character = mine; a.drafted = true; }
  else { a.character = clone(takeFallback()); a.auto = true; } // fallback pool skips ids already used, drafts included
  a.draft = null;
}
return startTurns(s, ctx);

function fromDraft(s, target, a, made?: Record<PlayerId, Character>): Character | null {
  const d = a.draft;
  if (!d) return null;
  if (d.kind === "library") return clone(d.character);
  if (!d.name) return null; // a picture alone is an empty card
  // The server saves it in the library; if that failed, the card still plays as typed.
  return clone(made?.[target] ?? {
    id: `draft-${s.code}-${s.round}-${target}`,
    lang: findPlayer(s, a.pickerId)?.lang ?? "en",
    name: d.name, origin: d.origin, imageUrl: d.imageUrl, aliases: [],
  });
}
```

`swapPlayer` already spreads the assignment, so drafts survive a guest signing in. `pickKey()` in theme-picks.ts should return null for `draft-` ids, as it does for `emergency-`.

**Server side** (engine-adjacent, needed for (b) to work):

- **`dispatch(code, build, { quiet?: boolean })`:** a quiet write skips `notify.roomChanged` and the listing check. Nobody else's view changes, and their next real ping brings them up to date. This keeps typing from refetching everyone's room. Pings are explicit broadcasts (`supabase/notify.ts`), not `postgres_changes`, so `quiet` really is quiet. Contention: debounce drafts in the browser (~700 ms idle, immediately on choosing a row, suggestion, random draw or picture) and rate-limit `draft:<id>` (for example 120/min). The 5-try compare-and-swap absorbs the rare collision.
- **Actions** (sketch):
  - `saveDraft(code, input: { characterId } | { name, origin? } | null)`: library ids load through `characters.get`. For custom drafts, the `build` callback merges the `imageUrl` already in the stored draft.
  - `saveDraftImage(code, form)`: `readImage` → `files.put("characters")` → a custom draft with that URL. URLs are never taken from the browser. For a library card, keep today's `replaceCharacterImage` (library-wide, as the prototype notes say) and then save the library draft.
  - `randomPick` should also save the drawn character as the draft, so "Random" without "Confirm" is not lost.
  - `confirmDraft(code, latest?)`: flush the latest input, resolve (library get, or the idempotent create below), then `PICK`. Keep `confirmPick(code, id)` for the tests and the hand of suggestions.
- **Timeout** (`applyDueTimeouts`, picking): build `drafted` before dispatching. For each custom draft with a name, call `characters.ensure({ id, lang: picker.lang, name, origin, imageUrl, createdBy: pickerId })`:
  - `id = "u-" + uuidV5(code:round:target:normalizeName(name))`;
  - reuse a library entry with the same normalized name, as `createCharacter` does;
  - insert-if-absent, so every client firing `applyDueTimeouts` at `deadline + 300 ms` lands on **one** row.

  Ask `fallbackCharacters` only for assignments with no usable draft. For the random fallback, try the Random button's draw for the theme (`drawPopular`) before global `randomPopular` and `EMERGENCY` (gap 4). `CharacterStore` needs `ensure`, or `create` with an optional id plus on-conflict-do-nothing (local: map check; Supabase: upsert, then select).
- An orphaned picture from an abandoned custom draft stays in storage. That is acceptable for now; cleanup can come later.

### 2.4 (c) Vote 13 → 20 s

`VOTE_SECONDS = 20` (types.ts:124). The vote's `stepStartsAt` becomes `opening.until`: 8.7 s after START on the first match, 3.2 s later, 1.7 s after a theming fallback. Docs: `PRODUCT.md:14` (add "the theme vote 20 s") and `ARCHITECTURE.md:21` ("3 themes, 8 s" → 20 s; describe the shows instead of "the theme stays up 3 s"). `ROADMAP.md:169` gets checked when it ships.

### 2.5 (d) What the view adds (`types.ts` + `view.ts`)

```ts
export interface ShowView {
  kind: ShowKind; n: number; startsAt: number; until: number;
  beats: Beat[]; first: boolean;
}
export type RevealView = ShowView | /* answers */ ... | /* guess */ ...; // the bare "theme" member goes

export type DraftView =
  | { kind: "library"; card: CardView }
  | { kind: "custom"; name: string; origin: string | null; imageUrl: string | null };

export interface PlayerView {
  // ...
  /** Whom this player picks for (the ring), from picking to the podium. */
  picksForId: PlayerId | null;
  /** Who picked this player's character, from picking to the podium, your own included ("Rafa picked yours"). */
  pickedById: PlayerId | null;
  /** How the card was picked, whenever `card` is shown: the "Time!" stamp, the hover. */
  cardSource: "picker" | "draft" | "clock" | null;
}
export interface PickView {
  // ...
  /** Your card as you left it (reload-safe); null once confirmed. Never in anyone else's view. */
  draft: DraftView | null;
}
```

- `pickedById` and `picksForId`: visible in `picking`, the turn phases and `finished`. The ring is already derivable from `turnOrder`, so nothing new leaks. Your own card stays hidden (`card: null`, `cardHidden`).
- `reveal()`: show kinds pass through with `beats` and `first`, plus the back-compat fallback. `voteView` stays as it is (non-null during the theme show, so the vote screen can run `tie_spin` and `theme`).
- During the cast (`asking`) the UI already has everything for "received" and "order": others' cards (`CARDS_OPEN`), your own `pickedById`, `turnOrder`, and the first player as `isTurn` / `turn.playerId`. That is not necessarily `order[0]`, since a first player who gave up is skipped. Your confirmed card during the `picked` beat is the card of `picksForId`'s player, with `cardSource` for the stamp.
- "Round N" uses `reveal.n` of the opening.
- **Not engine** (server action or route, no secrecy in state):
  - `pickSuggestions(code)`: the theme's top characters by `drawWeight` in the viewer's language. Use the same `popularPicks` and `getMany` path; factor a `rankPopular()` out of `drawPopular`. Leave out only characters already confirmed for **other** players, never the one picked for the viewer (gap 3). Return an empty list for a typed theme or a theme without history (the hand hides).
  - `GET /api/themes/examples?theme=<themeId>&lang=` returns `{ fits: CharacterDTO[2], misfit: CharacterDTO | null }`. `fits` are the top two by weight; `misfit` is a deterministic pick from a distant set. It is cacheable, prefetched for all 3 options during the vote (images preloaded), and the same for everyone, since library ids are language-free. Fewer than 2 fits → the rule plays as the sentence alone.
- Chat system lines ("Match started", "Theme: …", "Order: …") are not engine state. A pure `systemLines(before, after)` in `src/game`, called from `dispatch`'s post-commit (where `saveMatch` already runs), would write them once, in order, testably.

### 2.6 What the engine change forces on the UI (for the UI stage)

- `room-screen` routing goes by beat:
  - `intro` / `round` → the stage;
  - `vote_entrance` → vote screen in entrance mode;
  - `tie_spin` → vote roulette;
  - `theme`, `rule`, `draw`, `target` → stage (the theme beat may stay on the vote or theme screen's winner card);
  - `picked` → pick card;
  - `received`, `order` → stage.

  While `now < reveal.startsAt` (a show queued behind another), keep the previous screen.
- `RevealOverlay`: render only `answers` and `guess`. Today it renders anything that is not `theme`, so it would catch `opening` and `cast`.
- `VoteScreen`: take the spin length from the `tie_spin` beat, not `REVEAL_TIMING`.
- `ThemeScreen`: "reveal" only during the `theme` beat.
- `GameHeader` `Timer`: **hide it during a show** and pop it in at `stepStartsAt`. Otherwise it "recharges" across up to 13 s, against "only then the clock appears".
- Every scene must seek to `now − beat.startsAt` rather than play from mount. Late fetches (local polling is 1 s; a lazily applied timeout lands ~300 ms after the deadline) and reloads mid-show must land on the right frame, as the prototype's `tl.time(t)` does.
- Tab alerts (`picking`, `asking`) fire while a show is on. Hold them until `stepStartsAt`.
- `player-strip`, `turn-screen` and `result-screen` read `pickedById`. Your own hover can now say who picked yours, which is intended.

---

## 3. Tests

### 3.1 Existing tests that depend on timings or on what changes

**engine.test.ts**

| Lines | Test | Why it breaks | Fix |
|---|---|---|---|
| 223–235 | starts with three themes and a short clock | `deadline == now + VOTE*1000` | `stepStartsAt == reveal.until` (opening intro + entrance), `deadline − stepStartsAt == 20 000` |
| 237–256 | most voted wins… | expects `until == now + REVEAL_TIMING.theme`; votes land during the opening, so the theme show queues | make `voting()` skip the opening; assert the beats `[theme, rule, draw, target]` and `stepStartsAt == until` |
| 258–267 | tie… longer reveal | `theme + themeTieSpin` | beats start with `tie_spin` 2000 |
| 312–318 | host typing, 30 s | `deadline == now + 30 000` | `+ intro` |
| 320–342 | only the host sets it… | `until == now + REVEAL_TIMING.theme` | typed first-match beats `[theme, rule(sentence), draw, target]` |
| 344–351 | host runs out → vote | `deadline == now + VOTE*1000` | `+ voteEntrance` |
| 424–431 | starts the turns once everyone picked | `deadline == now + ASK` | `== cast.until + ASK`; `reveal.kind == "cast"` |
| 467–472 `started()`, 481–486 `timed()` | helpers | every `ASK` right after picks → `too_early` (`guardStep` runs **before** the `not_your_turn` / `invalid_input` checks) | add `g.skipReveal()` after `pickAll()` |
| 488–508 | each step runs on its own clock | `deadline == now + 40 000` after `pickAll` | after skip, or `stepStartsAt + 40 000` |
| 510–557 | answer cuts | `ASK` too early | fixed by `timed()` |
| 559–585 | old single time | `deadline == now + ASK` | `stepStartsAt + ASK` |
| 588–663, 800–830, 888–910 | a turn / the clock / leaving | `ASK` too early | fixed by `started()` |
| 941–975 | 4 players play again | `reveal` is `null` after the second `START` (968) | expect an `opening` with `[round, vote_entrance]`; round 2 theme show without `rule` |
| 992–999 | never mutates | `reduce(ASK)` throws `too_early` | fixed by `started()` |

Unaffected: tie/placing, validation, the podium waiting for the last guess reveal (949–951), `isExpired`, presence.

**view.test.ts**

- 12–17 `started()`: add skip.
- 31–46: expects `pickedById: null` for yourself. It now becomes the picker's id; also assert `picksForId`.
- 74–87, 114–126, 130–146, 148–166: `ASK` right after `started()`, fixed by the skip.
- 288–317: votes land during the opening. It still passes, but skip the opening for clarity.

**simulation.test.ts**

- Lines 88–90: the invariant "only the theme holds the clock" → every show holds it, in voting and theming too.
- Lines 115–129: the allowed reveal lengths `[guessHit, guessMiss, theme, theme+tieSpin]` → for shows, check that the beats are contiguous (`beats[0].startsAt == startsAt`, each `until` equals the next `startsAt`, the last `until` equals `until`) and that each beat's length matches `SHOW_TIMING` for `first`.
- Add `lobby → reveal === null`.

**record.test.ts**

- Lines 11–13: `startedAt == g.now` right after `pickAll` → `== g.state.stepStartsAt` (cast end).

**server.test.ts**

- 62–79 `voteAll` + `skip(6000)`: the first-match theme show is 13 s (15 s on a tie). Picks are unguarded, so they still pass. Replace `skip` with "skip to `view.stepStartsAt`" anyway.
- 148–168: `askQuestion` right after the last `confirmPick` → `too_early` during the cast (9.3 s). Skip to `stepStartsAt`.
- 195–240: gives up during the cast. It still records the match (keep `matchRecord` as proposed); assert `timeMs ≥ 0`.

**theme-picks.test.ts:** add `pickKey("draft-…") === null`.

### 3.2 New tests

**Engine: shows**

- First `START` (vote mode): `opening` `[intro 7000, vote_entrance 1700]`, `n == 1`, `first`, the vote clock from `until` for 20 s.
- Later `START`: `[round 1500, vote_entrance 1700]`, `n == round + 1`.
- Host mode: `[intro]` then 30 s. The theming timeout gives `[vote_entrance]` only.
- A vote that closes during the opening: the theme show starts at `opening.until` (no overlap; `stepStartsAt` after both).
- Theme show variants: first or later × voted or typed × tie or no tie. The pick clock starts at `until` and stays 120 s.
- Cast after the last `PICK` and after the pick `TIMEOUT`: first or later lengths; `ASK` before `until` → `too_early`; `turnPlayerId` is the first active player in order; `playStartedAt == until`.
- `GIVE_UP` by the first player during the cast → the next player's clock still starts at `until`.
- `LEAVE` during the theme show or the cast leaving fewer than 2 → `finished`, the show dropped, the podium starts now.
- `LEAVE` back to the lobby during the opening → `reveal === null`.
- `SWAP_PLAYER` keeps shows and drafts.
- Old room: a `theme` reveal without `beats` still holds the clock, and the view gives one `theme` beat.

**Engine: drafts**

- `DRAFT` errors:
  - outside picking → `wrong_phase`;
  - a non-picker → `not_member`;
  - after confirming → `already_done`;
  - name > 60 → `invalid_input`.
- `null` clears the draft; `PICK` clears it too.
- Timeout:
  - a library draft becomes the pick (`drafted`, not `auto`);
  - a custom draft uses `e.drafted[target]`, or the provisional `draft-<code>-<round>-<target>` when it is missing;
  - an empty name or no draft → fallback with `auto`;
  - drafts never consume fallbacks;
  - a mix of all of these.
- The record: drafted picks have `autoPicked: false`.

**View**

- `ShowView` passes beats and `first`.
- `picksForId` and `pickedById` are present for everyone from picking on, your own included; your card is still null.
- `PickView.draft` appears only for the picker. **The target's JSON never contains the draft's name or image**: add this to `checkSecrecy` in the simulation, with random `DRAFT` events and the `drafted` map in random `TIMEOUT`s.
- `cardSource` for picker, draft and clock.

**Server**

- `saveDraft` and `saveDraftImage`: validation, rate limit, no notify (quiet).
- A pick timeout with a custom draft creates **one** library row even when `applyDueTimeouts` runs twice concurrently (deterministic id).
- `randomPick` stores the draft.
- `pickSuggestions` never leaves out the character picked for the caller.
- The examples route is deterministic.

---

## 4. Open points and risks (no decision reopened)

1. Beat lengths are the chart's values plus `picked` 1 s. They are all in `SHOW_TIMING` and can be tuned without touching logic. The prototype's own scene lengths are longer because they include exits.
2. "Round N" is the match number. The prototype also uses "Rodada" for turn rounds ("Rodada 1 · vez de Bia"), so pick distinct words in the 3 languages.
3. Quiet draft writes still rewrite the whole room row on Supabase (a few KB) per debounced edit. That is fine at 2–4 players. If it ever shows up, drafts can move to their own store and the server can pass them in `TIMEOUT`, with the same engine logic.
4. An optional `SHOW_LEAD_MS` (~300 ms in the future for `opening` and `theme`) would let pings land before frame 0. With seekable scenes it is not required.
5. Existing gap, out of scope: a player who leaves during picking makes everyone wait for the 120 s clock. Once drafts exist, the server could end picking early with an "only away pickers left" fill.
