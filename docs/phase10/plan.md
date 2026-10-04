# Phase 10 implementation plan: "4Dare em cena"

Lead architect's plan, final version after the adversarial review (`plan-critique.md`; every finding is answered in the "Critique log" at the end). Inputs: `spec-a.md`, `spec-b.md`, `spec-c.md`, `engine.md`, `server-data.md`, `ui-flow.md`, `ui-turn-lobby-style.md`, ROADMAP Phase 10, AGENTS.md, ROADMAP_BUILD.md, the prototype in `docs/phase10/prototype/`, and the repo at `288542b` (two docs commits after `36fa787`: AGENTS.md now protects the library, bans `data/*.json` reads and AI calls).
Where the readers disagreed, this plan picks one answer and says so (marked **Decision**). The user's decisions listed in the task are not reopened.

Ground rules for every work package (WP):
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (route handlers and `RouteContext`, async `params`, `notFound`, `generateViewport`). Next 16.3.8: `proxy.ts` (not middleware), Turbopack, `pnpm typecheck` = `next typegen && tsc --noEmit`.
- Use `motion/react` (motion 13.4.6), never GSAP. Tailwind 4 tokens from `src/app/globals.css`. Biome lint.
- Every player name shown anywhere has its avatar beside it: `PlayerName` / `useWithNames` (`src/components/ui/player-name.tsx`). Plain-string contexts (aria-labels, inputs) use `useDisplayName`.
- Repo docs in English. **Do not commit.**
- Migrations are run by the agent without asking, **one file at a time with the Supabase MCP `apply_migration`** (project `zooqjsrhjupqghuuipon`); never Docker, never `pnpm setup:supabase` (it re-runs every migration, the library ones included) and **never `pnpm seed`**. Migrations stay idempotent anyway. The library tables (`characters`, `character_names`, `origins`, `origin_labels`, storage pictures) are hand-fed: Phase 10 only **inserts** into `characters` (as `createCharacter` does today); no migration of Phase 10 touches them.
- No new code, build step or test reads `data/*.json` (AGENTS.md; ROADMAP_BUILD Phase 1 removes the last uses). Fixtures live in test code; library facts are checked read-only through the Supabase MCP (`execute_sql`).
- No AI calls anywhere (AGENTS.md "AI"): no generated themes, examples or suggestions.
- After any run of the e2e server (`NEXT_DIST_DIR=.next-e2e`), restore `tsconfig.json` if `next dev` rewrote it. Keep the AGENTS.md header block that `next dev` writes. Stop any e2e server already listening on 3100 before a run (`reuseExistingServer: true` would reuse one started without the new env).
- Each WP keeps `pnpm test`, `pnpm typecheck` and `pnpm lint` green at its end.
- ROADMAP_BUILD runs alongside: don't touch `src/server/themes.ts` AI code, `data/`, or the local-mode data sources beyond what a WP lists. If ROADMAP_BUILD Phase 4 (`LazyMotion` + `m`) lands first, scenes use `m` and load full features only where `layoutId` is used.

---

## 1. Architecture decisions

### 1.1 Shows: the server times every scene (engine)

**Decision:** adopt `engine.md`'s "shows" model. `Reveal` becomes the carrier for three shows (`opening`, `theme`, `cast`). Each show is a list of back-to-back **beats** with absolute server times, computed once by the pure engine when the show is staged. No new phase. Clients derive everything from `serverTime() − beat.startsAt`, exactly like the existing tie roulette (`rouletteAt`).

- `opening`: staged by `START` (and by the theming → vote fallback). Beats: `curtain` (lobby leaves, blue stage, header in) · `intro` (cold open, first match) or `round` ("Round N", later matches) · `entrance` (the vote's line-rise-deal, or the theme form landing). The vote / theming clock starts at the show's `until`.
- `theme`: staged when the theme is decided (vote closed, or the host typed it). Beats: `tie_spin` (tie only) · `settle` (vote only: losers dim, then leave) · `theme` (winner to the centre, wash, tag) · `rule` (first match only; cards or sentence) · `draw` · `target` ("for whom") · `entrance` (pick table lands). The pick clock starts at its `until`.
- `cast`: staged when picking ends (last `PICK`, or the pick `TIMEOUT`). Beats: `picked` (last confirm grows / "Time!" stamp) · `received` ("Rafa picked yours") · `order` (shuffle, numbers, "Bia starts!", shrink) · `entrance` (strip, history button, body). Turn 1's ask clock starts at its `until`.
- `stage()` queues a show after a running one (`startsAt = max(now, running.until)`), so a vote that closes during the opening (through the API, or with today's enabled cards between WP1 and WP7) never cuts it. The running show is kept as `reveal.prev` until its `until`, so its scene still plays (and a reload during it lands on it); `stageFrame` routes by `prev` while `now < prev.until`.
- `startStep` holds the clock for **any** show (today only for `theme`), in every phase, turn phases included. Answers / guess reveals keep today's rule (turn steps start at once under them).
- Guards: **Decision:** `VOTE`, `SET_THEME`, `PICK`, `DRAFT`, `GIVE_UP` stay unguarded (a click a few ms early under clock skew must not be silently dropped: `useAction` hides `too_early`). The UI disables those controls until `stepStartsAt`. `ASK` and `GUESS` keep `guardStep`, so the first question can't land during the cast, and the UI also disables their submit until `stepStartsAt` (the turn body enters during the cast's `entrance` beat; an early Enter would otherwise vanish as a hidden `too_early`).
- Durations: **Decision:** the room's first match uses the prototype scenes' own lengths where the prototype has choreography (what Jean watched and approved), with the beats the prototype never drew (curtain, picked) cut to the minimum that shows their content. Later matches, which the prototype only budgets in its timing chart, follow that chart ("Round 2" 1.5, theme 3, draw 3, target ≈3, yours 3, order 3). Numbers live in per-scene files under `src/game/show-timing/` (merged into `SHOW_TIMING` / `SHOW_MARKS`), each owned by the WP that builds that scene, so Jean can tune by playing (section 2 shows both columns).
- First match: `opening.first = round === 0` at `START`; `theme.first` and `cast.first = round === 1` (after `beginMatch`).
- e2e speed: `Ctx.showScale` (from env `DARE_SHOW_SCALE`, server only) multiplies every show beat. Clocks (`VOTE_SECONDS`, `PICK_SECONDS`, steps) are never scaled.

### 1.2 Client stage: areas, screens, beats, hand-offs

**Decision:** no global overlay layer. Scenes live **inside the screen that follows them**, and the match frame (header + history) is hoisted to the room level so it never remounts. Reasons: hand-offs become same-tree animations (shared `layoutId`, persistent elements), the header stays still as in the prototype, and there are no stacking or `inert` problems.

New tree (`RoomStage`, extracted from `RoomScreen`; the lab renders the same tree):

```
<RoomProvider>                       (existing; serverTime() now reads the clock context)
  <StageProvider>                    computes StageFrame from (view, serverNow); re-renders exactly at the next boundary
    <StageBackdrop look=… set=…/>    portal to <body>, fixed -z-10, one instance for the whole room
    <AnimatePresence mode="wait">    keyed by AREA
      lobby  → <motion.div exit="leave"><LobbyScreen/></motion.div>     (exit: content opacity 0 + scale .97, top bar slides up; 0.45 s power2.in)
      match  → <MatchFrame>                                              (header + left history; header fades in 0.4 s)
                 <AnimatePresence mode="wait"> keyed by SCREEN, opacity only (in 0.2 s, out 0.15 s)
                   theming → ThemeScreen   (renders ColdOpen during curtain/intro/round, ThemeStage during theme/rule)
                   vote    → VoteScreen    (ColdOpen during curtain/intro/round; heading beat during entrance; roulette, settle, ThemeStage)
                   pick    → PickScreen    (PickIntro during draw/target; the table from entrance on; frozen during picked)
                   turn    → TurnScreen    (CastScene during received/order; strip and body enter during entrance)
               </MatchFrame>
      result → <motion.div …>{finishedWait ? null : <ResultScreen/>}</motion.div>   (as today)
      closed → <RoomProblem code="not_found"/>
    </AnimatePresence>
    <RevealOverlay/>                 answers / guess only (z-30)
    {area !== "closed" && <RoomChat/>}   fixed, z-[35], data-chat, after the screens in DOM order; never on closed / RoomProblem
  </StageProvider>
</RoomProvider>
```

`stageFrame(view, now)` (pure, unit-tested) returns:

```ts
export interface StageFrame {
  area: "lobby" | "match" | "result" | "closed";
  screen: "theming" | "vote" | "pick" | "turn" | null;   // null outside the match area
  finishedWait: boolean;          // a winning hit's reveal still runs before the podium
  show: ShowView | null;          // running show (startsAt <= now < until)
  beat: Beat | null;              // running beat
  themeFrom: number | null;       // header tag visible from (server ms); null = hidden
  clockFrom: number | null;       // header clock visible from; null = no clock
  clockPops: boolean;             // shows: hidden, then pops at clockFrom; answers/guess reveals: today's recharge
  historyFrom: number | null;     // history button and give up visible from; null = not on this screen
  look: Look;                     // backdrop (1.9)
  next: number | null;            // next server ms at which any field above changes
}
```

Screen routing:

| Show / beat | Screen |
|---|---|
| no running show | by phase: `theming`→theming, `voting`→vote, `picking`→pick, turn phases→turn, `finished`→result (finishedWait while a guess reveal runs), `lobby`→lobby, `closed`→closed |
| opening: curtain, intro, round, entrance | `view.vote ? "vote" : "theming"` (the phase may already be `picking` when the opening runs as `prev`) |
| theme: tie_spin, settle, theme, rule | `view.vote ? "vote" : "theming"` |
| theme: draw, target, entrance | pick |
| cast: picked | pick |
| cast: received, order, entrance | turn |
| `reveal.prev` running (`now < prev.until`) | routed as `prev` by the rows above (its beat, its screen) |
| a show queued behind `prev`, after `prev.until` and before its own `startsAt` (no gap by construction) | its first beat's screen with `beat = null` |

Hand-offs:
- Lobby → match: outer `AnimatePresence` plays the lobby's `leave` variant, then `MatchFrame` mounts (header fades in). The backdrop crossfades to brand at `curtain + 0.1 s` independently (portal).
- Cold open → vote: same `VoteScreen`, same header. The cold open runs its own exit (7.1 s); the vote heading beat starts at `entrance`.
- Vote winner → theme hero: same `VoteScreen`; the winner `OptionCard` and the `ThemeStage` hero share `layoutId="theme-card"` **on an outer wrapper**; the seekable timeline (hero out at +2.2: scale .6, y −290) animates an inner element, so layout projection and the timeline never write the same `transform`. The layout transition is explicit: 0.9 s `backOut(1.2)` (`scenes-a.js:306`).
- Rule → draw, target → pick table, picked → cast: each outgoing scene has already faded itself out by the end of its beat (prototype exits), so the 0.15 s screen crossfade shows nothing abrupt; the incoming scene seeks to its current time.
- Draw → "for whom": one component (`PickIntro`); the slip **is** the target header, laid out at its final place from frame 0 (spec B §2.4).
- Order → game: one `TurnScreen`; `CastScene` shrinks the table up (4.4 s) while the real `PlayerStrip` and body enter during the `entrance` beat (not a layout morph).

Rendering cost: `StageProvider` holds the only scheduling timer (setTimeout to `next`, plus a re-check on view change). Scenes never re-render per frame: motion sequences run the animation (1.3). Leaf components that show counts or text from the clock keep using `useServerClock` locally.

### 1.3 Scene runtime: seekable motion sequences

`useStageTimeline` (WP3), the motion equivalent of the prototype's GSAP timeline + `tl.time(t)`:

```ts
export function useStageTimeline<T extends HTMLElement>(opts: {
  /** Server ms of t = 0 (usually a beat's startsAt); null = not started: elements keep their from-styles. */
  startsAt: number | null;
  /** Called after layout with the scope element; returns a motion sequence (absolute `at` in seconds). */
  build: (scope: T, info: { reduced: boolean; phone: boolean }) => AnimationSequence;
  /** Rebuild when these change (players, target, sizes, language). */
  deps: readonly unknown[];
}): React.RefObject<T | null>;
```

Behaviour: `useLayoutEffect` → `build()` → `controls = animate(sequence)` (from `useAnimate` / `animate`) → `controls.pause()` → `controls.time = clamp((serverNow − startsAt)/1000, 0, controls.duration)`; play if inside, schedule play if `elapsed < 0`, stay at the end if past. Re-sync on `visibilitychange` and every second when the drift exceeds 0.25 s. Rebuild (keeping the time) on `ResizeObserver` (debounced 150 ms) and on `document.fonts.ready`. Stop on unmount. When the clock context is frozen (lab), pause at the frozen time. Elements are rendered with their **from** styles inline, so nothing flashes before the build.

Rules for scene authors:
- Port GSAP eases with the exact functions in `src/lib/motion.ts` `gs` (WP2): `p1Out = 1−(1−t)²`, `p2In = t³`, `p2Out`, `p2InOut`, `p3In = t⁴`, `p3Out`, `p3InOut`, `sineInOut`, `backOut(s)`, `bounceOut`, plus `mirror(ease)` for yoyo legs. GSAP `scale` = `scaleX` + `scaleY`. "yoyo" = keyframes `[a, b, a]` with `[ease, mirror(ease)]`. No `repeat` inside sequences.
- Discrete switches (z-index flips, text swaps) are 0-duration segments, or pure functions of elapsed in a leaf.
- Measured values (hop dx/dy, slip mouth, shuffle dx) are read in `build` with `getBoundingClientRect`.
- **Reduced motion:** `build` gets `reduced: true` and returns a still version: same beat times (everyone stays in sync), every move replaced by a 0.2 s opacity fade to the end state; no flips, hops, shakes, wiggles, tilts, bounces, glyph bob, wash drift, tab hop or nudge; no confetti (`fireConfetti` already skips). `MotionConfig reducedMotion="user"` stays.

### 1.4 Engine state changes (exact)

`src/game/types.ts`:

```ts
export const VOTE_SECONDS = 20;            // was 13
export const MAX_CHARACTER_NAME = 60;      // the limit createCharacter already uses
// (no minimum draft length: any non-empty trimmed name is a card, "L" included; random only for an empty card)

// SHOW_TIMING and SHOW_MARKS are re-exported from src/game/show-timing/index.ts, which merges one file per
// scene (owned by the WP that builds that scene, see section 5). Tests read the constants, never literals.
export { SHOW_TIMING, SHOW_MARKS } from "./show-timing";
```

`src/game/show-timing/*.ts` (scene lengths in ms; server-wide: reduced motion changes what a screen draws, never how long a beat lasts):

```ts
// opening.ts (WP7)
export const OPENING = {
  curtain: 800,                                    // lobby leaves (0.45 s), brand wash +0.1, header fades in
  intro: 7600,                                     // cold open (room's first match), prototype scene length
  round: 1500,                                     // "Round N" card (later matches), prototype chart
  entrance: { vote: 1700, theming: 600 },          // vote: line alone 0.2–0.8, rises 1.0–1.7, clock at 1.7 (every match: Jean's rule)
  tieSpin: 2000,                                   // was REVEAL_TIMING.themeTieSpin
  settle: { first: 3300, later: 1500 },            // vote result: losers dim, then leave (marks below)
} as const;
// theme.ts (WP7)
export const THEME = {
  theme: { withRule: 2600, alone: 3000 },          // winner to the centre; tag pops at +2.3 s
  rule: { cards: 4800, sentence: 2800 },           // first match only
} as const;
// draw.ts (WP8)
export const DRAW = { draw: { first: 5400, later: 3000 }, target: { first: 4600, later: 2600 } } as const;
// pick.ts (WP9b)
export const PICK = {
  entrance: 400,                                   // table lands; clock pops at its end
  picked: { confirmed: { first: 1400, later: 1000 }, timeout: 1300 },
} as const;
// cast.ts (WP10)
export const CAST = {
  received: { first: 4300, later: 3000 },
  order: { first: 4900, later: 2400 },
  entrance: { first: 500, later: 600 },
} as const;

// index.ts: SHOW_TIMING = { ...OPENING, ...THEME, ...DRAW, picked: PICK.picked, received, order,
//   entrance: { vote, theming, pick: PICK.entrance, turn: CAST.entrance } }

/** Moments inside a beat (ms from the beat's start), shared by the engine (chat show times) and the screens.
 *  Each mark lives in the file of its scene; index.ts merges them. Marks are clamped into their (scaled) beat. */
export const SHOW_MARKS = {
  curtainWash: 100,                          // curtain: brand wash in
  settleDim: { first: 1300, later: 400 },    // settle: losers dim
  settleLeave: { first: 2800, later: 1100 }, // settle: heading, footer and losers leave
  themeWash: 900,                            // theme: theme colour + set glyphs, confetti
  themeLine: 1000,                           // theme: chat "Theme: …" line
  themeTag: 2300,                            // theme: header tag pops
  targetWash: { first: 5000, later: 2600 },  // draw: wash → your target's seat colour
  orderSpot: { first: 2500, later: 1400 },   // order: first player spotlit, wash → their seat
  orderLine: { first: 2800, later: 1500 },   // order: chat "Order: …" line
  historyIn: 300,                            // turn entrance: history button and give up pop
  turnLine: 200,                             // after the cast: chat "Round n · X's turn"
} as const;
```

```ts
export const BEAT_KINDS = ["curtain", "intro", "round", "entrance", "tie_spin", "settle", "theme",
  "rule", "draw", "target", "picked", "received", "order"] as const;
export type BeatKind = (typeof BEAT_KINDS)[number];
export interface Beat { kind: BeatKind; startsAt: number; until: number }
export type ShowKind = "opening" | "theme" | "cast";

/** A rule-scene card: language-free library id, one picture, names per language. */
export interface ExampleCard { id: string; imageUrl: string; names: Partial<Record<Lang, string>> }
/** ✓✓ and ✗ for the rule scene; decided by the server at START, the same for everyone. */
export interface RuleExamples { fits: [ExampleCard, ExampleCard]; misfit: ExampleCard | null }

export interface Reveal {
  kind: "answers" | "guess" | ShowKind;
  n: number;              // answers/guess: the jogada; shows: the match number (opening: round + 1)
  startsAt: number;
  until: number;
  beats?: Beat[];         // shows only; absent in rooms saved before Phase 10
  first?: boolean;        // shows only: the room's first match (long versions)
  rule?: RuleExamples | null;  // theme show with a rule beat: the cards; null = sentence only
  prev?: Reveal | null;   // shows only: the show that was still running when this one was staged (kept until its `until`)
}

export interface ThemeVote { /* …existing… */ examples?: (RuleExamples | null)[] }   // aligned with options; first match only

/** What is on the picker's card while editing; at timeout it becomes the pick. Only the picker sees it. */
export interface PickDraft {
  characterId: string | null;   // the character the card shows: picked, or the highlighted preview
  name: string;                 // the name field as typed (0..60)
  imageUrl: string | null;      // a picture uploaded for a new character (server-validated URL)
  newId: string | null;         // set by the server: "u-<uuid>" the clock gives a new character
}
export interface Assignment { pickerId: PlayerId; character: Character | null; auto?: true; draft?: PickDraft | null }

// GameEvent changes
| { type: "START"; playerId: PlayerId; themes: Theme[]; examples?: (RuleExamples | null)[] }
| { type: "DRAFT"; playerId: PlayerId; draft: PickDraft | null }
| { type: "TIMEOUT"; themes?: Theme[]; examples?: (RuleExamples | null)[];
    fallbackCharacters?: Character[];
    /** Picker id → the character their draft became (resolved or created by the server before reducing). */
    drafted?: Record<PlayerId, Character> }

export interface Ctx { now: number; random: () => number; /** e2e only: scales show beats. */ showScale?: number }

// Views
export interface ShowView { kind: ShowKind; n: number; startsAt: number; until: number; beats: Beat[]; first: boolean; rule: RuleExamples | null; prev: ShowView | null }
export type RevealView = ShowView | { kind: "answers"; … } | { kind: "guess"; … };   // the bare "theme" member goes
export interface PickView { /* …existing… */ draft: Omit<PickDraft, "newId"> | null }   // the viewer's own only
// PlayerView.pickedById: visible from picking on for every player, your own included ("Rafa picked yours";
// it was already derivable from turnOrder + the ring).
```

`REVEAL_TIMING` keeps `answers*` and `guess*`; `theme` and `themeTieSpin` move into `SHOW_TIMING`.

`src/game/engine.ts`:

```ts
const isShow = (r: Reveal | null): r is Reveal => !!r && (r.kind === "opening" || r.kind === "theme" || r.kind === "cast");
type Part = [BeatKind, number];

function stage(s: RoomState, kind: ShowKind, n: number, first: boolean, parts: Part[], ctx: Ctx, rule?: RuleExamples | null) {
  const scale = ctx.showScale ?? 1;
  const running = isShow(s.reveal) && ctx.now < s.reveal.until ? { ...s.reveal, prev: null } : null;
  let t = Math.max(ctx.now, running?.until ?? 0);
  const startsAt = t;
  const beats = parts.filter(([, ms]) => ms > 0)
    .map(([k, ms]) => ({ kind: k, startsAt: t, until: (t += Math.round(ms * scale)) }));
  s.reveal = { kind, n, startsAt, until: t, beats, first, prev: running, ...(rule !== undefined ? { rule } : {}) };
}

function startStep(s: RoomState, ctx: Ctx, ms: number) {
  const waits = isShow(s.reveal) || !TURN_PHASES.has(s.phase);   // was: reveal.kind === "theme"
  const start = Math.max(ctx.now, waits ? (s.reveal?.until ?? 0) : 0);
  s.stepStartsAt = start; s.deadline = start + ms; s.stepMs = ms;
}
```

- `beginTheme(s, themes, examples, ctx)`: `first = s.round === 0`; `open: Part[] = [["curtain", T.curtain], first ? ["intro", T.intro] : ["round", T.round]]`. Host mode → `beginTheming(s, ideas, [...open, ["entrance", T.entrance.theming]])`; vote mode → `beginVote(s, themes, examples, [...open, ["entrance", T.entrance.vote]])`.
- `beginVote(s, themes, examples, parts, ctx)` and `beginTheming(s, ideas, parts, ctx)`: validate first, set `s.reveal = null`, then `stage(s, "opening", s.round + 1, s.round === 0, parts, ctx)`, then `startStep`. `vote.examples = examples` (cloned) when given. The theming `TIMEOUT` calls `beginVote(s, e.themes, e.examples, [["entrance", T.entrance.vote]], ctx)`.
- `beginMatch`: **stop** setting `s.reveal = null` and **drop** its `startStep(PICK)` (the theme show does both).
- `closeVote` → `beginMatch(...)` then `showTheme(s, { tie: v.tied.length > 1, typed: false, rule: v.examples?.[v.chosen] ?? null }, ctx)`. `setTheme` → `beginMatch(...)` then `showTheme(s, { tie: false, typed: true, rule: null }, ctx)`.

```ts
function showTheme(s: RoomState, o: { tie: boolean; typed: boolean; rule: RuleExamples | null }, ctx: Ctx) {
  const first = s.round === 1, v = first ? "first" : "later", T = SHOW_TIMING;
  const rule = first ? (o.rule && !o.typed ? T.rule.cards : T.rule.sentence) : 0;
  stage(s, "theme", s.round, first, [
    ["tie_spin", o.tie ? T.tieSpin : 0],
    ["settle", o.typed ? 0 : T.settle[v]],
    ["theme", rule ? T.theme.withRule : T.theme.alone],
    ["rule", rule],
    ["draw", T.draw[v]],
    ["target", T.target[v]],
    ["entrance", T.entrance.pick],
  ], ctx, first ? (o.typed ? null : o.rule) : undefined);
  startStep(s, ctx, PICK_SECONDS * 1000);
}

function startTurns(s: RoomState, ctx: Ctx, how: "confirmed" | "timeout") {
  const first = s.round === 1, v = first ? "first" : "later", T = SHOW_TIMING;
  stage(s, "cast", s.round, first, [
    ["picked", how === "timeout" ? T.picked.timeout : T.picked.confirmed[v]],
    ["received", T.received[v]], ["order", T.order[v]],
    ["entrance", T.entrance.turn[v]],
  ], ctx);
  s.playStartedAt = s.reveal!.until;      // when turn 1's clock starts (was: picks done)
  s.turnRound = 0;
  goToTurn(s, ctx, s.order.at(-1) ?? null); // startStep waits for the cast
}
```

- `finish`: `if (isShow(s.reveal) && ctx.now < s.reveal.until) s.reveal = null;` before the podium (a match that ends mid-show shows the podium at once; a guess reveal still holds it as today).
- `leave` back to the lobby (voting / theming down to one player): `s.reveal = null` (fixes the existing gap; otherwise the lobby would replay the opening). `backToLobby` already clears it (`engine.ts:848`).
- `vote()` unchanged (no guard). `everyoneVoted` → `closeVote` as today.
- `DRAFT` reducer: phase `picking` else `wrong_phase`; the assignment with `pickerId === playerId` else `not_member`; `already_done` if it has a character; `deadline !== null && now >= deadline` → `wrong_phase`; `name.length <= MAX_CHARACTER_NAME`, `characterId` ≤ 200, `imageUrl` ≤ 500 else `invalid_input`; `a.draft = draft`.
- `PICK`: after setting the character, `a.draft = null`; when every card is set → `startTurns(s, ctx, "confirmed")`.
- Picking `TIMEOUT`, for each assignment without a character, in this order: `e.drafted?.[a.pickerId]` (a real pick, not `auto`); else a draft with a `characterId` or a non-empty `name.trim()` becomes a provisional character `{ id: a.draft.newId ?? \`draft-${code}-${round}-${target}\`, lang: picker.lang, name, origin: null, imageUrl, aliases: [] }` (resilience if the server could not create it; not `auto`); else the fallback pool (`auto: true`, the pool skips ids already used, drafts included). Clear every draft, then `startTurns(s, ctx, "timeout")`.
- `swapPlayer` already spreads assignments, so drafts follow a guest who signs in.

`src/game/view.ts`:
- `reveal()`: shows pass through as `ShowView` (`beats`, `first`, `rule ?? null`, `prev` while `now < prev.until`, else null). Back-compat: a `theme` reveal without `beats` → `beats: [{ kind: "theme", startsAt, until }]`, `first: false`, `rule: null`, `prev: null`.
- `voteView`: present while voting and while a theme show runs (`now < until`), as today for the theme reveal.
- `pick()`: present while picking **and while a cast show runs** (the `picked` beat keeps the pick screen); `draft` only in the picker's own view.
- `pickedById`: from picking on, for everyone, your own included.

`src/server/rooms.ts`: `ctx()` adds `showScale: Number(process.env.DARE_SHOW_SCALE) || 1`.

### 1.5 Pick drafts

**Decision:** drafts live in `RoomState` (`Assignment.draft`), written by a `DRAFT` event through `dispatch(..., { quiet: true })` (no realtime ping, no listing check). Compare-and-swap orders a save against the `TIMEOUT` write, so the timeout always sees the latest accepted draft; reload restores the card from `PickView.draft`; no table, no local mirror. Writes go through **route handlers**, not Server Actions (Next 16 runs actions one at a time per client, so autosave would queue in front of Confirm and Random).

What the card saves ("whatever is on the card is the pick"):

| Card state | Draft |
|---|---|
| empty (nothing but spaces) | `null` |
| picked (list row, hand card, Random, exact name match on blur) | `{ characterId: id, name: full name, imageUrl: null }` |
| typing while the search has rows (the highlighted row's ghost picture is on the card) | `{ characterId: previewId, name: typed, imageUrl: null }` |
| "New!" (the search has **no rows**, or blur with no highlighted row) | `{ characterId: null, name: typed, imageUrl: uploaded or null }` |

The preview wins while rows exist (prototype scene 7: "Homem" stays typed with rows and no seal), so a timeout never turns a half-typed library name into a new character; "New!" only appears when the dropdown shows nothing but the muted "Not in this theme yet" line (scene 8).

Cadence (client, `usePickDraft`): debounce 600 ms after typing; at once on a row, hand card, Random draw, picture commit or blur; a final flush at `deadline − 1500 ms + jitter(0..400 ms)` (server clock) **only if the card changed since the last accepted save**; `fetch(..., { keepalive: true })` on `pagehide`; stop at the deadline. The server sets `newId` once (keeps the stored one). `dispatch` gets a short randomised backoff between CAS retries (`15–60 ms × attempt`), so last-second Confirms don't exhaust the 5 attempts against the flushes.

Restore: the card fills from `pick.draft` **on mount** (reload, rejoin); later views update it only when the server draft differs from the local one and the name field is neither focused nor dirty, so a quiet draft echo never yanks text back mid-typing.

Server timeout (`applyDueTimeouts`, picking): `drafted` = for each unpicked assignment with a usable draft: `characterId` → `characters.get`; else `getOrCreateCharacter({ id: newId, lang: picker.lang, name, origin: null, imageUrl, createdBy: pickerId })` (reuses a same-name library entry like `createCharacter`; idempotent by id, so racing timeouts create one row). `fallbackCharacters` only for cards still empty, theme first (`drawPopular`), then `randomPopular`, then `EMERGENCY`.

Confirm: new action `confirmCard(code, { characterId } | { name })` resolves and dispatches `PICK` in one call; for a new name the picture comes from the stored draft (`imageUrl` uploaded by the image route), never from a client URL. **Confirm (and Random) are disabled while a picture upload is in flight**, so the stored draft always holds the picture the card shows. `confirmPick` and `createCharacter` stay (tests, hand, Random).

Also: `randomPick` saves its draw as the draft (quiet `DRAFT`) and **keeps today's exclusion** (every character already picked in the match, the caller's own secret included: with a 1–5 character pool, drawing your own secret for your target would make it unguessable). `pickKey()` returns null for `draft-` ids. Accepted trade-off, written in ARCHITECTURE by WP12: the hand and typed names can still duplicate a secret; refusing duplicates would leak who holds what.

### 1.6 Rule examples and the hand of suggestions

**Decision (Jean, 2026-10-03), replaces the earlier `themes.fits` / `misfit` idea:** a new table `theme_starters`, fed by a seed with about 5 famous, common characters for every active theme. It is the base data, kept apart from play statistics (`popular_picks`) and likes (`pick_feedback`). History today is thin (17 matches, 49 picks, 15 of 337 themes with 2+ picks, 0 likes), so without it the ✓✓✗ cards and the hand would almost never appear.

- **Status: done by the lead before wave 2.** `0011_theme_starters.sql` and `supabase/seed/theme_starters.sql` are committed (`feat(data): theme starters…`), applied to the hosted project and seeded: 1663 rows, all 337 active themes, 14 themes with 3-4 starters, 6 rows without a picture. WP5 does not recreate them; it only reads the table.
- **Table** (migration `0011_theme_starters.sql`, idempotent, applied with the Supabase MCP; it only references the library, never changes it):
  `theme_starters (theme_id text not null references themes(id) on delete cascade, character_id text not null references characters(id) on delete cascade, position smallint not null check (position between 1 and 8), primary key (theme_id, character_id), unique (theme_id, position))`; RLS on, no policies, revoke all from anon/authenticated (read by the server like `themes`). Character ids are the language-free library ids (`wd-…`/`al-…`).
- **Seed:** `supabase/seed/theme_starters.sql`, plain `insert … on conflict do nothing` rows (never deletes), generated once from the curated list in `docs/phase10/starters/<set>.json` (curated by hand by agents with read-only SQL against the hosted library: famous across pt/en/ja, clear fit, picture preferred, positions 1-2 the clearest fits). Applied with the Supabase MCP `execute_sql`; re-runnable. A short comment at the top says how to add rows for a new theme. `pnpm seed` is never used. The app never reads the seed file; it reads the table.
- **Backends:** `backend.themes` (or a small `starters` store) gets `starters(themeId): Promise<string[]>` (ordered by position). Supabase reads the table (cached with the themes cache, same TTL); the local backend returns `[]` (local mode has no library; the lab uses fixtures).
- **Rule examples (same for everyone):** at `START` on a room's first match (vote mode), and on the theming → vote `TIMEOUT` of a first match, the server computes `ruleExamples(theme)` for each of the 3 options and passes `examples` in the event. `fits` = the first two starters (by position) that resolve with a picture and names in en and pt (ja when present); if the theme has fewer than two, fill from its best `drawWeight` history picks; still fewer than two → `null` (sentence only). `misfit` = a starter of a theme from a contrasting set kind: fiction sets → a starter of a real-people set (`music, celebs, sports, history`), real-people sets → a starter of a fiction set; chosen by `hash(themeId) % n`, minus this theme's starters. Cross-cutting sets (`world, jobs, family, quirks, looks`, and any set WP5 judges mixed) → `misfit: null` (✓✓ only: a wrong ✗ teaches a wrong rule). Ids that don't resolve are skipped at runtime. The engine stores them on the vote and moves the chosen one to the theme show (`reveal.rule`). Images are preloaded when the theme show starts.
- **Hand:** `GET /api/themes/[id]/picks?lang=` → `{ hand: (CharacterDTO & { picks: number; likes: number })[] }`, up to 8: the theme's starters are the base; history picks with real signal (2+ picks or 1+ like, ranked by `drawWeight`) come first when they exist, then starters fill the rest; deduped, picture first. CDN-cacheable (`s-maxage=60, stale-while-revalidate=600`); no exclusion of characters picked in the match (it would leak). The client shows 5 (4 on phones if needed) **drawn from those 8 with a seed from the viewer's id and the match number**, so the pickers don't all converge on the same card. Fetched when the draw starts. Typed theme → no hand (the layout keeps its place). The number under a card shows **likes** only when > 0 (aria "Liked by N players"); starters with no likes show no number. The label reads "Popular in {theme}".
- The **Random** button keeps today's behaviour (history only, `not_enough_picks` note); starters are not mixed into it.
- Both still degrade gracefully (a theme added later without starters: history, else sentence-only rule and no hand).

### 1.7 Chat: data model and delivery

Shapes (`src/game/chat.ts`, shared by server and UI):

```ts
export const MAX_CHAT = 280;                               // code points ([...text].length)
export type ChatPerson = Pick<Identity, "id" | "isGuest" | "name" | "guestNumber" | "avatar">;
export type SystemLine =
  | { type: "started" }                                    // "▶ Match started"
  | { type: "theme"; theme: Theme }                        // "{emoji} Theme: {theme}" (✍️ for a typed theme)
  | { type: "order"; players: ChatPerson[] }               // "Order: [av]Bia, [av]Rafa, [av]you, [av]Leo"
  | { type: "firstTurn"; n: number; player: ChatPerson };  // "Round {n} · [av]Bia's turn" (n = match number)
export interface ChatMessage {
  id: number; at: number; showAt: number;
  by: PlayerId | null; author: ChatPerson | null;          // null = system line
  text: string | null; system: SystemLine | null;
}
export function systemLines(before: RoomState, after: RoomState, now: number): NewChatMessage[];
```

**Decision (catalogue):** only the four lines of the prototype. No joined/left/finished lines (not asked, and they collide with e2e text matchers). "Round n · X's turn" only once, when the turns start. "Round" means the match number everywhere (the "Round 2" card, this line; the prototype's "Rodada 1 · vez de Bia"); no screen shows turn rounds, so the word is free. The `firstTurn` line names the first player as of the last pick; if that player leaves during the cast the line is stale (accepted: rare, and a fix would need a scheduled write).

| Line | Detected by (in `dispatch`, after a successful CAS) | `showAt` |
|---|---|---|
| started | `before.phase === "lobby"` → `after.phase` voting/theming | `opening.startsAt` |
| theme | `after.round > before.round` | theme beat start + `themeLine` (scaled) |
| order | `before.playStartedAt == null && after.playStartedAt != null` | order beat start + `orderLine[v]` (scaled) |
| firstTurn | same transition | `cast.until + turnLine` |

Storage:
- Supabase: `supabase/migrations/0012_room_messages.sql`, idempotent, as `server-data.md` §2.2 (`room_messages`: identity id, `room_code` FK cascade, `author_id`, `author jsonb`, `body` 1–280, `system jsonb`, `show_at`, `created_at`, kind check, two indexes, RLS on with no policies, revoke from anon/authenticated), plus two `security definer` functions (`set search_path = public`, execute revoked from anon/authenticated):
  - `add_room_message(p_room, p_author, p_author_json, p_body, p_system, p_show_at)`: for a text message, counts the author's rows in that room in the last 10 s (≥ 5) and 60 s (≥ 30) and raises `rate_limited`, else inserts and returns the row. The limit holds across Vercel instances (the in-memory `allow()` is per instance).
  - `reassign_room_messages(p_from, p_to)`: sets `author_id` and rewrites the id inside `author` / `system` jsonb, for a guest who signed in.
- Local: `processSingleton` map, last 200 per room, memory only (one process, so the in-memory limit is exact).
- `ChatStore { add, list(code, since, limit), clear, prune(before), reassign(from, to) }` on `Backend.chat`; `Notifier.chatChanged(code, id)`. `handOverSeats` calls `chat.reassign(from, player.id)` beside the seat swap (as `matches.reassign` does for history), so a guest's older messages stay on the right side with the account's name and face.

Delivery:
- `POST /api/rooms/[code]/messages` (route handler): same-origin check, guest/account identity, `allow(chat:id, 5, 10 s)` and `allow(chat-min:id, 30, 60 s)` as a cheap first line, then the database check above → 429 `rate_limited`, trim, strip control chars except `\n`, collapse 3+ newlines, 1..280 code points, seated and not away → `chat.add` → `background(notify.chatChanged)` → returns the message (the sender replaces its optimistic line).
- `GET /api/rooms/[code]/messages?since=<ms>`: seated only; no `since` → the last 50 (**Decision:** newcomers see the last 50, like any group chat); `since = newest.at − 3000` overlap, merged by id (identity ids can commit out of order). `no-store`.
- Realtime: the existing topic `room:CODE` gets a `"chat"` broadcast `{ id }` (**never the text**: topics are public and codes are listed). `src/lib/realtime.ts` becomes a ref-counted per-topic multiplexer bound with `{ event: "*" }` (today a second `listen` on the same topic would share and then remove the room's channel). On reconnect every listener is called with `{}` (refetch).
- Client `useChat(code)`: React Query `["chat", code]` (map by id); initial fetch on mount; ping → refetch (debounced 100 ms); local mode polls every 1.5 s; Supabase safety poll 20 s + on focus. `send(text)` optimistic with a temp id; failure marks the line failed (tap to retry) and toasts `common.errors.rate_limited` when limited.
- Ordering: by `max(at, showAt)`, then `id`; a line is hidden until `serverTime() >= showAt`.
- Unread (browser only): `localStorage["4dare:chat-seen:<code>"]` (try/catch); first load sets it to the newest id (no flood); unread = visible text lines with `id > seen` and `by !== you`; opening the chat marks all seen. System lines never count or pop. Count capped at "99+".
- Cleanup: `dispatch` sees `→ closed` and runs `background(chat.clear(code))`; `openRoom` runs `background(chat.prune(now − 24 h))` (rooms that died without closing).
- Not in the tab title (e2e anchors whole titles).

### 1.8 History move

- Exists only on the turn screen. The button sits **left of the theme tag**, appears at `historyFrom` (turn entrance + 300 ms after a cast; immediately on later mounts), pops in (scale 0.3→1, opacity, 0.5 s `backOut(2.4)`) only when it crosses live. Icons `PanelLeftOpen` / `PanelLeftClose`; label and count as today.
- Desktop (`WIDE`, ≥1024): `MatchFrame` is a row `[sidebar] [column: header + main]`. The sidebar is `sticky top-0 h-dvh shrink-0 overflow-hidden` whose width animates 0 ↔ 360 (open 0.55 s `p3Out`, close 0.4 s `p3In`), holding a 360 px flat panel (`bg-surface border-r border-line`, no radius) anchored right, so it slides in from the left and **pushes header and main**.
- Phone: a left drawer, 88vw, full height, `x: -100% → 0` over the scrim, `rounded-r-[28px] shadow-pop`, safe-area top padding, z-40 (above the chat), `role="dialog" aria-modal`, Escape and scrim close, focus to close as today.
- `HistoryBody` is reused; people order becomes you first, then **turn order**; title `font-display font-extrabold text-[26px]`; the empty text gets the longer sentence.
- `useHistorySidebar` (localStorage `ludodare:history-sidebar`) keeps its key; the sidebar is never rendered before the button exists, so a remembered-open bar opens after the cast instead of pushing the stage.
- At 1024–1279 px with the bar open, the turn card and step section wrap (as with today's right sidebar): accepted.

### 1.9 Backdrops

`StageBackdrop({ look, set })` (WP2 component, mounted once by WP4): portal to `<body>`, `fixed inset-0 -z-10`. One wash layer per tone and one glyph layer per glyph set, crossfaded by opacity with `look.fade` (`sineInOut`). Recipe from the prototype: `::before` = `color-mix(in oklab, C var(--wash-mix), var(--canvas))` (solid tone: C itself); `::after` at `inset −20%` with the two radial glows (34% at 18% 22%, 26% at 82% 70%; solid: white 14% / black 16%) drifting `22s ease-in-out infinite alternate`. Seven glyphs at `[5,20,44,9] [12,76,30,8] [30,9,24,10] [47,86,36,9.5] [66,13,28,8.5] [82,58,50,10.5] [93,30,24,7.5]` (left %, top %, px ×0.8 on phones, bob s), delay `−1.3·i s`, text glyphs opacity .16 in `glyphColor`, emoji .22 `saturate(.9)`. Reduced motion: no drift, no bob. Every infinite CSS loop (drift, bob, nudge, dot, blink) carries `motion-reduce:animate-none`: the global clamp in `globals.css` (`animation-duration: 1ms !important`) would otherwise turn an infinite loop into a per-frame flicker. **Decision:** one recipe everywhere, turns included (20% light / 26% dark), so the order → game hand-off has no jump; WP12 checks turn-screen contrast in both themes.

**Decision:** the theme step colour is fixed per step (`--no`, as in the prototype); only the glyphs come from the set. `THEME_SETS[i].glyphs` (7 emoji each, spec A §2.2 lists) are new data; a typed theme uses `["✍️","?","✍️","?","✍️","?","✍️"]` with "?" in `--sky`.

`stageLook(view, now)` (pure, WP3):

| Moment | Tone | Glyphs (colour) | Fade |
|---|---|---|---|
| lobby, result, closed | none (canvas) | none | 0.8 s |
| opening: curtain from +100 ms, intro, round | brand (solid `--brand-stage`) | "?" (`--brand-butter`) | 0.7 s |
| opening: entrance; voting; theming; theme show tie_spin, settle; theme beat before +900 ms | butter | "?" (`--on-butter`) | 0.8 s |
| theme beat from +900 ms; rule | theme (`--no`) | set (ink) | 1.1 s |
| draw until `targetWash` | brand | "?" (`--brand-butter`) | 0.7 s |
| draw from `targetWash`; target; pick entrance; picking; cast picked | seat of **your target** | set (ink) | 0.8 s |
| received; order until `orderSpot` | seat of **who picked yours** | set (ink) | 0.8 s |
| order from `orderSpot`; turn entrance | seat of the **first player** (`view.turn.playerId`) | "?" (that seat) | 1.0 s |
| turn phases | seat of the turn player | "?" (that seat) | 1.0 s |
| finished while the last guess reveal runs | seat of the guesser | "?" | 1.0 s |

Per-viewer colours (target, picker) differ by design.

### 1.10 Header (`MatchHeader` in `MatchFrame`)

Left: `[HistoryButton]` (turn screen, from `historyFrom`) `[ThemeTag]` (from `themeFrom`; pops scale 0.4→1, opacity, 0.5 s `backOut(2.2)` when crossing live). Right (`ml-auto`): `LeaveMatchButton` · `GiveUpButton` (turn screen, from `historyFrom`) · `Timer`. Height 76 px desktop, 64 px phone.
- `themeFrom`: during a theme show = theme beat start + `themeTag` (clamped into the beat); after it, always; null while `view.theme` is null.
- Clock: during a show the `Timer` is not rendered before `stepStartsAt`, then pops (scale 0.6→1, 0.4 s `backOut(2.5)`); with an answers/guess reveal it keeps today's recharge; after mount past the moment, no animation (`AnimatePresence initial={false}`).
- `ThemeTag` look (WP2): the prototype's 40 px `bg-surface shadow-card` pill, set emoji, "Theme:" in 600 13 px muted (hidden on phones), the name 700 15 px.

### 1.11 Lobby exit, bottom dock, focus guards

- The lobby keeps its layout and strings. Its only changes: the dock term added to **each** of `Screen`'s bottom paddings (`pb-[calc(2rem+var(--dock))] sm:pb-[calc(3rem+var(--dock))] sm:short:pb-[calc(1.5rem+var(--dock))]`, today `pb-8 sm:pb-12 sm:short:pb-6`), and the `leave` exit variant (content opacity 0 + scale .97, top bar `y −100%` + opacity 0, 0.45 s `p2In`) played by the outer `AnimatePresence` when the match starts.
- `--dock` defaults to `0px`; `RoomChat` sets it on `<html>` while mounted: 56 px (desktop) or `60px + env(safe-area-inset-bottom)` (phone). Used by `Screen`, `MatchFrame` bottom padding and the toast offset (`bottom-[calc(1.5rem+var(--dock))]`).
- Phone keyboard: the viewport keeps the default `interactiveWidget` (a global `resizes-content` would reflow every `dvh` layout whenever any field is focused). While the chat input has focus, the open sheet is lifted by `innerHeight − visualViewport.height − visualViewport.offsetTop` (listening to `visualViewport` resize/scroll). While any **other** editable element has focus on a phone (`focusin`/`focusout`), the folded bar hides and `--dock` drops to 0, so it never rides the keyboard over the pick, ask or guess field.
- `RevealOverlay`: renders only `answers` / `guess`; its window keydown ignores **only** events whose target is inside `[data-chat]`. Everything else stays as today: any key closes the reveal and a typed letter lands in the step's field (the Guess field is `autoFocus`ed under the reveal; ignoring editable targets would leave the scrim over it while the player types). `Ask` / `Guess` `autoFocus` only when `document.activeElement` is not inside `[data-chat]` (helper `focusIsFree()` in `src/lib/focus.ts`). `ImageDrop` / the pick card's paste listener ignores paste targets inside `[data-chat]`.
- `Ask` / `Guess` submit disabled until `stepStartsAt` (1.1).
- Tab alerts (`useRoomTab`): held until `stepStartsAt` while a show runs.

### 1.12 e2e speed

`playwright.config.ts` webServer env gains `DARE_SHOW_SCALE: "0.25"` (first-match opening 2.5 s, theme show ≈ 5.3 s, cast ≈ 2.8 s). Client marks clamp into their (shorter) beats, scenes cut at beat ends: fine for functional tests. Visual verification uses the dev lab (WP3) at scale 1 and live `pnpm dev`.
Rule for every spec: **never assert on text that only lives inside one beat** (at this scale a beat can be 400–650 ms, and local mode learns of a change through a 1 s poll); wait for what persists after the show (header tag, the step's field, the enabled cards). Stop any server already on 3100 before a run (it may lack the env).

---

## 2. Timing table

All times in seconds. "Server field" = what drives it; every beat is `view.reveal.beats[i]` of the named show (`startsAt`/`until`), so a reload lands on the right frame. First match = the room's first match (prototype choreography); later = the prototype's timing chart. Numbers live in `src/game/show-timing/*.ts`.

| # | Segment | 1st match | Later | Server field | Prototype (scene / chart) | Today |
|---|---|---|---|---|---|---|
| 1 | Lobby leaves (0.45), brand wash +0.1, header fades in | 0.8 | 0.8 | opening `curtain` (starts at `START`) | lobby exit 0.45 + wash 0.7 / — | 0.75 crossfade |
| 2 | Cold open | 7.6 | — | opening `intro` | 7.6 / 7 | — |
| 3 | "Round N" card | — | 1.5 | opening `round` (`reveal.n`) | — / 1.5 | — |
| 4 | Vote entrance: line alone 0.2–0.8, rises 1.0–1.7, cards dealt 1.3, sub 1.5, clock pops at 1.7 | 1.7 | 1.7 | opening `entrance` | 1.7 / 1 (1st only) | — |
| 4h | Theme form lands (host types) | 0.6 | 0.6 | opening `entrance` | — | — |
| 5 | Theme vote (ends early when all voted) | ≤ 20 | ≤ 20 | `stepStartsAt` = opening `until`, `deadline` | 20 | ≤ 13 |
| 5h | Host typing (falls back to a vote with only #4) | ≤ 30 | ≤ 30 | `stepStartsAt`, `deadline` | — | ≤ 30 |
| 6 | Tie roulette (+ spotlight) | 2.0 | 2.0 | theme `tie_spin` (tie only) | — | 2.0 |
| 7 | Settle: losers dim (+1.3 / +0.4), heading, footer and losers leave (+2.8 / +1.1) | 3.3 | 1.5 | theme `settle` (vote only) | 3.3 after the last vote / in vote | (in 3.0) |
| 8 | Theme hero: card to centre, confetti + wash +0.9, chat line +1.0, hero out +2.2, tag +2.3 | 2.6 | 3.0 | theme `theme`; chat `showAt` | 2.6 / 6 with rule, 3 | 3.0 |
| 9 | Rule: cards (✓ 0.7/1.15, ✗ 1.7 falls 2.8, out 4.4) / sentence only (typed theme or no examples) | 4.8 / 2.8 | — | theme `rule`, `reveal.rule` | 4.8 / in 6 | — |
| 10 | Draw: hops 1.40+0.22i, shake 2.67, slip 4.13, wash → target 5.0 (later: hops together, one 0.6 s shake, wash 2.6) | 5.4 | 3.0 | theme `draw` | 5.4 / 4.5, 3 | — |
| 11 | For whom: paper dissolves, hint 0.65, ring 1.3, lit ≈2.2, exit 4.2 (later: ring pre-drawn) | 4.6 | 2.6 | theme `target` | 4.6 / 2.5, 3 | — |
| 12 | Pick table lands; clock pops at its end | 0.4 | 0.4 | theme `entrance` | 0.4 (clock) / — | — |
| 13 | Pick (ends early when all confirmed) | ≤ 120 | ≤ 120 | `stepStartsAt` = theme `until`, `deadline` | 120 | ≤ 120 |
| 14 | Picked: last card grows + "Everyone has picked!" / "Time!" stamp | 1.4 / 1.3 | 1.0 / 1.3 | cast `picked` | ≈1.3 (stamp to fade) / — | — |
| 15 | Your character: "Rafa picked yours", others flip | 4.3 | 3.0 | cast `received` | 4.3 / 4.3, 3 | — |
| 16 | Turn order: shuffle 0.5, numbers 1.6, spotlight + call 2.5, table shrinks 4.4 | 4.9 | 2.4 | cast `order`; chat `showAt` | 4.9 / 4, 3 (with #17) | — |
| 17 | Turn entrance: strip, history + give up +0.3, body; ask clock at its end | 0.5 | 0.6 | cast `entrance` | in order | — |
| 18 | First ask | room setting (80) | | `stepStartsAt` = cast `until` | | at once |

Totals of the fixed parts (no tie, everyone votes and confirms; vote and pick clocks excluded):

| | Opening | Theme show | Cast | Fixed total | Prototype chart (same basis) | Today |
|---|---|---|---|---|---|---|
| 1st match, rule cards | 10.1 | 21.1 | 11.1 | **42.3** | 29.3 | 3.0 |
| 1st match, sentence only (no examples yet: the common case today) | 10.1 | 19.1 | 11.1 | 40.3 | — | 3.0 |
| 1st match, typed theme | 9.0 | 15.8 | 11.1 | 35.9 | — | 3.0 |
| later matches | 4.0 | 10.5 | 7.0 | **21.5** | 16.5 | 3.0 |

A tie adds 2.0; a pick timeout makes `picked` 1.3. In later matches the segments the chart counts (round, theme, draw, target, yours, order) add up to 16.1 s, on the chart; the other 5.4 s are transitions the chart doesn't list (curtain, vote entrance, settle, pick entrance, picked). The first match runs longer than the chart because it keeps the scene lengths Jean watched (cold open 7.6, theme + rule 7.4, draw 5.4, target 4.6, order 4.9). Knobs if he finds it slow (one constant each; scenes schedule exits relative to their beat end, so a shorter beat trims holds, not choreography): `target.first` 4.6→3.6, `settle.first` 3.3→2.3, `rule.cards` 4.8→4.2, `order.first` 4.9→4.2, `curtain` 0.8→0.6.

---

## 3. File-level design

### 3.1 New files

| Path | WP | Responsibility | Exported API |
|---|---|---|---|
| `src/features/stage/stage.ts` | 3 | pure stage logic | `stageFrame(view, now): StageFrame`, `stageLook(view, now): { look: Look; next: number \| null }`, `beatOf(show, kind)`, `markAt(beat, ms)` (clamped), `type Look = { tone: "none"\|"brand"\|"butter"\|"theme"\|"seat-1".."seat-4"; glyphs: "none"\|"q"\|"set"\|"typed"; glyphColor: string; fade: number }` |
| `src/features/stage/stage.test.ts` | 3 | unit tests of routing, marks and looks (engine-built views) | — |
| `src/features/stage/stage-context.tsx` | 3 | `StageProvider` (one timer to `next`), `useStage(): StageFrame` | |
| `src/features/stage/use-stage-timeline.ts` | 3 | seekable motion sequences (1.3) | `useStageTimeline` |
| `src/game/show-timing/{opening,theme,draw,pick,cast,index}.ts` | 1 (creates, defaults of section 2) → wave 4: `opening`+`theme` WP7, `draw` WP8, `pick` WP9b, `cast` WP10 | per-scene beat lengths and marks; `index.ts` merges them | `SHOW_TIMING`, `SHOW_MARKS` |
| `src/features/stage/lab/scenarios.ts` | 3 | builds real room states with the pure engine for any show/beat/time; a registry importing one file per scene | `labRoom(params): { state, view(now), viewer }` |
| `src/features/stage/lab/scenarios/{opening,theme,draw,pick,cast,chat}.ts` | 3 (stubs) → wave 4: each owned by its scene WP (chat: WP11) | scene fixtures (rule cards, hand, long names, demo chat) | `scenario(params)` |
| `src/features/stage/lab/lab-screen.tsx` | 3 | the lab UI: renders `RoomStage` with a mock provider and a frozen or running clock; scrubber; URL params `show, at, players(2-4), you(0-3), match(first\|later), rule(cards\|sentence), typed, tie, set, play, names(short\|long), theme(light\|dark)` (`names=long`: pt guest names up to 16 characters, e.g. "CapivaraCorajosa") | `LabScreen` |
| `src/app/[locale]/dev/stage/page.tsx` | 3 | dev-only route (`notFound()` in production) | default page |
| `e2e/stage-shots.spec.ts` | 3 | screenshot matrix from the lab (runs only with `STAGE_SHOTS=1`), output `test-results/stage-shots/` | — |
| `src/features/room/room-stage.tsx` | 3 (extract) → 4 | the tree inside `RoomProvider` (1.2) | `RoomStage` |
| `src/features/room/match-frame.tsx` | 4 | hoisted frame: left history sidebar/drawer + `MatchHeader` + `<main>` | `MatchFrame`, `MatchHeader` |
| `src/lib/focus.ts` | 4 | chat focus guard | `focusIsFree(): boolean`, `insideChat(target)` |
| `src/features/stage/stage-backdrop.tsx` | 2 | backdrop layers (1.9) | `StageBackdrop({ look, set })` |
| `src/components/ui/mini-card.tsx` | 2 | `.s-mini` card | `MiniCard({ image, name, sub?, width, badge?, className })` |
| `src/features/stage/cold-open.tsx` | 4 stub → 7 | cold open + "Round N" | `ColdOpen({ show }: { show: ShowView })` |
| `src/features/stage/theme-stage.tsx` | 4 stub → 7 | hero + rule (cards/sentence), vote and typed paths | `ThemeStage({ show, from }: { show: ShowView; from: "vote" \| "typed" })` |
| `src/features/stage/pick-intro.tsx` (+ `draw-urn.tsx`, `who-ring.tsx`) | 4 stub → 8 | draw + for whom | `PickIntro({ show }: { show: ShowView })` |
| `src/features/stage/cast-scene.tsx` | 4 stub → 10 | your character + turn order | `CastScene({ show }: { show: ShowView })` |
| `src/features/chat/room-chat.tsx` | 4 stub → 11 | the chat tab / phone bar | `RoomChat()` |
| `src/features/chat/*` (head, list, compose, bubbles) | 11 | chat UI parts | internal |
| `src/features/chat/use-chat.ts` | 6 | chat data hook | `useChat(code): { messages, send, retry, status }` |
| `src/game/chat.ts` (+ `chat.test.ts`) | 6 | chat types, `systemLines` | see 1.7 |
| `supabase/migrations/0012_room_messages.sql` | 6 | chat table, `add_room_message` (rate limit), `reassign_room_messages` | — |
| `supabase/migrations/0011_theme_starters.sql` | 5 | `theme_starters` table (references `themes` and `characters`, changes neither) | — |
| `supabase/seed/theme_starters.sql` | 5 | ~5 curated starters per active theme, `insert … on conflict do nothing`, generated from `docs/phase10/starters/*.json` | — |
| `src/server/backend/local/chat.ts`, `supabase/chat.ts` | 6 | `ChatStore` | — |
| `src/app/api/rooms/[code]/messages/route.ts` | 6 | GET / POST | — |
| `src/server/http.ts` | 5 | `sameOrigin(request)`, JSON helpers for routes | |
| `src/server/images.ts` | 5 | `readImage` moved out of `actions.ts` | |
| `src/server/characters.ts` | 5 | `getOrCreateCharacter({ id?, lang, name, origin, imageUrl, createdBy })` | |
| `src/server/rule-examples.ts` (+ test with fixtures, no `data/` reads) | 5 | `ruleExamples(theme): Promise<RuleExamples \| null>` (starters → history; misfit = a starter of a contrasting set kind) | |
| `src/app/api/rooms/[code]/draft/route.ts` | 5 | `PUT` JSON draft or `null` → quiet `DRAFT` | |
| `src/app/api/rooms/[code]/draft/image/route.ts` | 5 | `POST` multipart image → upload → quiet `DRAFT` with `imageUrl` → `{ imageUrl }` | |
| `src/app/api/themes/[id]/picks/route.ts` | 5 | the hand | `{ hand }` |
| `src/features/pick/pick-card.tsx` | 9a | the card that is the form | see WP9a |
| `src/features/pick/card-name-field.tsx` | 9a | combobox name field | |
| `src/features/pick/card-picture.tsx` | 9a | picture stack, drop zone, inline crop, swap pill, tray | |
| `src/components/ui/use-image-intake.ts` | 9a | picked/pasted/dropped/downloaded image checks + crop export, shared with `ImageDrop` | `useImageIntake({ onPicked })`, `cropToWebp`, `coverArea` |
| `src/app/[locale]/dev/pick-card/page.tsx` | 9a | dev-only page to build the card in isolation | |
| `src/features/pick/pick-hand.tsx`, `done-row.tsx`, `use-pick-draft.ts`, `draft-api.ts` | 9b | the hand, done row, autosave | |
| `e2e/chat.spec.ts` | 11 | chat e2e | |

### 3.2 Changed files

| File | WP | Change |
|---|---|---|
| `src/game/types.ts`, `engine.ts`, `view.ts` | 1 | 1.4 (`types.ts` re-exports `SHOW_TIMING` / `SHOW_MARKS` from `show-timing/`) |
| `src/game/engine.test.ts`, `view.test.ts`, `simulation.test.ts`, `record.test.ts`, `test-utils.ts` | 1 | section 6 |
| `src/server/rooms.ts` | 1 (ctx scale) → 5 (`dispatch` `{ quiet }` + randomised CAS backoff, `applyDueTimeouts` drafts/examples, theme-aware fallback) → 6 (system lines + `chat.clear` in `dispatch`, `chat.prune` in `openRoom`, `chat.reassign` in `handOverSeats`) | |
| `src/server/server.test.ts` | 1 → 5 → 6 | timing fixes, then new tests |
| `src/features/room/reveal-overlay.tsx` | 1 (whitelist answers/guess) → 4 (chat key guard) | |
| `src/features/vote/vote-screen.tsx` | 1 (`SHOW_TIMING.tieSpin`) → 4 (no `GameFrame`) → 7 (scenes) | |
| `e2e/helpers.ts`, `e2e/theme.spec.ts`, `e2e/tab.spec.ts`, `playwright.config.ts` | 1 | scale env; robust waits (6.3) |
| `PRODUCT.md` | 1 → 12 | "the theme vote lasts 20 s" (1); new flow lines (12) |
| `src/app/globals.css` | 2 | tokens `--brand-stage` (#2b69c8 / dark #1d4a93), `--brand-butter` #f6e3a1, `--on-brand` #fff, `--wash-mix` 20% / 26%, `--on-seat-1..4`, `--seat-1..4-ink` (the seat colour as text on its wash: light `color-mix(in oklch, var(--seat-n), black 30%)`, dark `var(--seat-n)`), `--dock: 0px`, `--shadow-dock` (light `0 -2px 6px rgba(18,22,31,.06), 0 -16px 40px rgba(18,22,31,.14)`, heavier dark); `@theme inline` colours for brand tokens; `--animate-drift`, `--animate-bob`, `--animate-nudge` (keyframes from spec C §3.12), `--animate-dot`, `--animate-blink` |
| `src/lib/motion.ts` | 2 | `gs` eases + `mirror`; the header comment no longer says "Nothing bounces" (stage scenes overshoot by design) |
| `src/game/theme-sets.ts` | 2 | `glyphs: string[]` (7) per set, `TYPED_GLYPHS`, `themeGlyphs(set)` |
| `src/components/ui/avatar.tsx` | 2 | sizes 16, 18, 24, 26, 30, 34, 52, 68 (larger via `className`) |
| `src/components/ui/logo.tsx` | 2 | export `FOUR`, `QUESTION`, `BRAND`, `LogoMark({ bubble, mark, className })` (plain svg, the "?" path has `data-q` and `transform-box: fill-box; transform-origin: center`); `Logo` unchanged |
| `src/components/ui/screen.tsx` | 2 (ThemeTag look, `--dock` padding) → 4 (lobby `leave` variants on header/main) | |
| `src/components/ui/toast.tsx` | 2 | `bottom-[calc(1.5rem+var(--dock))]` |
| `src/features/turn/turn-screen.tsx` | 2 (one line: `StageBackdrop` instead of `TurnBackdrop`) → 4 (no `GameFrame`, no backdrop, autofocus guard, Ask/Guess submit disabled until `stepStartsAt`) → 10 (cast) | |
| `messages/{en,pt,ja}/*.json`, `src/i18n/request.ts` | 2 | every new key (section 4); new files `stageOpening.json`, `stageDraw.json`, `stageCast.json`, `pickCard.json`, `chat.json`; `NAMESPACES` += those five. In wave 4 each new file belongs to its scene WP (section 5); the existing files (`room`, `turn`, `common`) stay WP2's, then WP12's |
| `src/lib/hooks/use-server-clock.ts`, `src/features/data/room-context.tsx` | 3 | `ServerClockContext` (`now()`, `frozen`); `serverTime()` reads it |
| `src/features/room/room-screen.tsx` | 3 (extract `RoomStage`) | joining logic stays; renders `<RoomProvider><RoomStage/></RoomProvider>` |
| `src/features/room/game-header.tsx` | 4 | deleted; replaced by `match-frame.tsx` |
| `src/components/ui/timer.tsx` | 4 | unchanged API; `MatchHeader` decides render/pop (no refill for shows) |
| `src/features/turn/history-panel.tsx` | 4 | button/sidebar/drawer shells (1.8); `HistoryBody` order and title |
| `src/features/turn/turn-backdrop.tsx` | 4 | deleted |
| `src/features/theme/theme-screen.tsx`, `src/features/pick/pick-screen.tsx` | 4 (no `GameFrame`) → 7 / 9b | |
| `src/features/lobby/lobby-screen.tsx` | 4 | only if the `leave` variants need wiring here; no visual change |
| `src/server/actions.ts` | 5 | `startGame` passes `examples` (first match, vote mode); `confirmCard`; `randomPick` saves the draft (exclusion unchanged); `createCharacter` uses `getOrCreateCharacter`; `readImage` moved |
| `src/server/backend/{local,supabase}/themes.ts` | 5 | `starters(themeId)` (Supabase reads `theme_starters`, cached with themes); local returns `[]` |
| `src/server/theme-picks.ts` (+ test) | 5 | `rankPopular()` shared by `drawPopular` and the hand; `pickKey("draft-…") → null` |
| `src/server/backend/types.ts` | 5 (`NewCharacter.id?`, `starters(themeId)`) → 6 (`ChatStore` with `reassign`, `Backend.chat`, `Notifier.chatChanged`) | |
| `src/server/backend/{local,supabase}/characters.ts` | 5 | `create` honours `id`, idempotent (local map check; Supabase upsert ignore-duplicates, then read back) |
| `src/server/backend/index.ts`, `supabase/notify.ts` | 6 | wire chat; `ping(topic, event, payload)` |
| `src/lib/realtime.ts` | 6 | multiplexer; `subscribeRoom` keeps its signature; `subscribeChat` |
| `src/game/character-search.ts` (+ test) | 9a | `exactMatch(items, name)` |
| `src/components/ui/image-drop.tsx` | 9a | uses `useImageIntake`; behaviour unchanged for the profile |
| `src/features/pick/draw-feedback.tsx` | 9b | anchored over the card after the flip |
| `src/features/turn/player-strip.tsx` | 10 | `enter?: { at: number }` prop: items drop in (y −30→0, opacity, 0.5 s `backOut(1.6)`, stagger 0.06) |
| `src/features/who-am-i/who-am-i-banner.tsx` | 7 | export `HeldCard` / seeds if reused by the cold open |
| `ARCHITECTURE.md`, `ROADMAP.md` | 12 | vote 20 s (fix stale "8 s"), shows, chat, drafts, curated theme examples, the duplicate-secret trade-off (1.5); Phase 10 boxes ticked when accepted |

---

## 4. i18n

Rules: add every key in en, pt and ja in the same change. WP2 writes every key below up front. New keys go into **one new namespace file per scene WP** (`stageOpening`, `stageDraw`, `stageCast`, `pickCard`, `chat`), so in wave 4 each scene WP owns its file and can fix its own wording and pt/ja fit without touching a shared JSON; `room`, `turn` and `common` stay WP2's (then WP12's, via the requests list). ja has no plural branches; en/pt use `{count, plural, …}`. Names are always `{name}`/`{names}` placeholders rendered through `withNames`. Keep e2e-matched English strings until WP12. pt wording from the prototype where it exists (spec A §6, spec B §10, spec C).

New namespace `stageOpening` (`messages/*/stageOpening.json`, WP7 in wave 4):

| Key | English |
|---|---|
| `vote.line` | Now, choose a theme together. (the visible heading; `room.vote.title` "Vote for the theme" stays as the group's aria-label, which e2e uses) |
| `vote.waitingEveryone` | Still voting: everyone |
| `coldOpen.line1` | Everyone gets a secret character. |
| `coldOpen.line2` | Only you can't see yours. Ask to find out. |
| `coldOpen.question` | Am I from Marvel? |
| `round` | Round {n} |
| `rule.title` | Every character must be from this theme. |
| `rule.fits` | Fits the theme (badge aria-label) |
| `rule.misfit` | Doesn't fit (badge aria-label) |

New namespace `stageDraw` (`messages/*/stageDraw.json`, WP8):

| Key | English |
|---|---|
| `draw.line` | Everyone picks a character for someone else. |
| `target.youPickFor` | You pick for |
| `target.hint` | Pick a character {name} knows. |
| `target.ring` | Everyone picks for someone. |
| `target.ringLabel` | Who picks for whom (aria-label) |

New namespace `stageCast` (`messages/*/stageCast.json`, WP10):

| Key | English |
|---|---|
| `cast.pickedYours` | {name} picked yours. |
| `cast.rule` | You see everyone else's. Yours, you find out. |
| `cast.from` | from {name} (under your card) |
| `cast.by` | by {name} (under others' cards) |
| `cast.byYou` | by you |
| `cast.orderKicker` | Turn order |
| `cast.starts` | {name} starts! |

Reused: `common.you` (label under your avatar), `common.answers.yes` / `probably_yes` (cold open chips), `turn.card.whoAreYou` (your "?" card label), `room.theme` ("Theme:").

New namespace `chat` (`messages/*/chat.json`, WP11):

| Key | English |
|---|---|
| `title` | Chat |
| `empty` | Room chat |
| `placeholder` | Send a message… |
| `inputLabel` | Message (the input's accessible name; e2e uses it) |
| `send` | Send |
| `open` | Open chat |
| `fold` | Fold chat |
| `unread` | {count, plural, one {# new message} other {# new messages}} |
| `me` | You (phone bar line "You: …") |
| `line` | {name}: {text} (phone bar line and live-region announcement) |
| `log` | Messages (list aria-label) |
| `failed` | Not sent. Tap to try again. |
| `system.started` | ▶ Match started |
| `system.theme` | {emoji} Theme: {theme} |
| `system.order` | Order: {names} |
| `system.firstTurn` | Round {n} · {name}'s turn |

Reused: `common.errors.rate_limited`.

`room.vote`: no new keys (the two vote keys live in `stageOpening`). Reused: `chosenTitle` "The theme is…" (ThemeStage kicker, a heading element), `chosen` "Chosen theme" (card label), `votes`, `progress`, `waitingFor`, `allVoted`, `change`, `tieTitle`, `tie`, `announce`, `room.theming.chosenBy` (typed hero).

New namespace `pickCard` (`messages/*/pickCard.json`, WP9a then WP9b; the old `room.pick` keys stay until WP12 removes the unused ones):

| Key | English |
|---|---|
| `cardTitle` | A character for {name} |
| `placeholder` | Type a name… |
| `rowPicks` | {origin} · picked {count, plural, one {# time} other {# times}} |
| `rowPicksNoOrigin` | Picked {count, plural, one {# time} other {# times}} |
| `fromLibrary` | {origin} · from the library |
| `fromLibraryNoOrigin` | From the library |
| `newCharacterLine` | New character · saved for this theme (a new key name, so the old create form's `newOrigin` keeps working until WP9b) |
| `notFound` | Not in this theme yet. It becomes a new character. |
| `newSeal` | New! |
| `drop` | Drop, paste or browse for a picture |
| `dropOptional` | or leave it blank, that's fine |
| `upload` | Upload yours |
| `uploading` | Sending the picture… |
| `confirmCard` | Confirm |
| `rule` | Out of time? The card goes as it is. |
| `handLabel` | Most picked in {theme} |
| `handLikes` | {count, plural, one {Liked by # player} other {Liked by # players}} (aria of the heart number, shown only when > 0) |
| `doneWaiting` | Done! Waiting for {names} |
| `doneAll` | Everyone has picked! |
| `timeUp` | Time! That's the one. |

Reused from `room.pick`: `searchLabel` "Character for {name}" (field aria-label), `random`, `randomAgain`, `randomHint`, `rate*`, `changeImage`, `imageHint` (tray tooltip), `common.image.*` (errors, zoom).
Unused after WP9b (WP12 removes them from all 3 languages, after checking with a grep): `title`, `doneTitle`, `subtitle`, `progress`, `cardLabel`, `change`, `createTitle`, `newName`, `newOrigin`, `newImage`, `save`, `createNamed`, `createNew`, `changeImageTitle`, `back`, `theme`, `confirm`, `searchPlaceholder`.

`turn.history` (change value): `nothing` → "Nothing here yet. Questions show up here as soon as someone plays." (no test matches it).

`meta`: none. Tab title unchanged.

---

## 5. Work packages

Waves (packages in the same wave may run in parallel; their owned files are disjoint):

| Wave | Packages |
|---|---|
| 1 | WP1 ∥ WP2 |
| 2 | WP3 ∥ WP5 ∥ WP9a |
| 3 | WP4 ∥ WP6 (∥ WP9a if still running) |
| 4 | WP7 ∥ WP8 ∥ WP9b ∥ WP10 ∥ WP11 |
| 5 | WP12 |

Shared-file rules for parallel waves:
- Split by owner so each scene WP can finish its own tuning: in wave 4, `src/game/show-timing/opening.ts` + `theme.ts` belong to WP7, `draw.ts` to WP8, `pick.ts` to WP9b, `cast.ts` to WP10; the namespace files `stageOpening` (WP7), `stageDraw` (WP8), `pickCard` (WP9a, then WP9b), `stageCast` (WP10), `chat` (WP11) in all three languages; `lab/scenarios/<scene>.ts` the same way (chat: WP11). Engine, view and stage tests read the constants, never literals, so a scene WP changing its numbers breaks no other WP.
- `messages/*/{room,turn,common,…}.json` (existing files), `src/i18n/request.ts`, `src/app/globals.css`, `src/lib/motion.ts`, `src/game/theme-sets.ts`: owned by WP2 only. Later WPs that need a change there write it into a "requests" list in their final report; WP12 applies them. (Use motion keyframes instead of new CSS keyframes; a scene-local CSS variable may live in the scene component.)
- `src/features/stage/stage.ts` (look table, routing): owned by WP3, then frozen; its marks come from `show-timing/` (scene-owned), so retiming a wash needs no edit here; other changes go to WP12.
- `src/features/stage/lab/{scenarios.ts,lab-screen.tsx}`: WP3, then WP4 (switch to `RoomStage`); frozen in wave 4 (scene WPs add fixtures in their own `lab/scenarios/<scene>.ts`).
- `e2e/helpers.ts`: WP1, then WP9b (`pickAll` only), then WP12.
- `src/server/rooms.ts`, `server.test.ts`, `backend/types.ts`: WP1 → WP5 → WP6, strictly sequential.

Verification common to all UI WPs ("screenshot matrix"): desktop 1280×800 and phone 390×844, light and dark, at the moments listed in the WP, through `STAGE_SHOTS=1 pnpm exec playwright test e2e/stage-shots.spec.ts` (lab) plus one live run with `pnpm dev` and two or more browser contexts; reduced motion through `page.emulateMedia({ reducedMotion: "reduce" })`; pt and ja through `/pt/...`, `/ja/...` (long texts must fit); `names=long` (4 players with 16-character pt guest names, 390 px) in every scene matrix. Screenshots go to `test-results/` (gitignored); attach paths in the report.

### WP1 — Engine: shows, vote 20 s, drafts, view
- **Goal:** the server times every scene; drafts in state; views expose shows, drafts and `pickedById`. Today's UI keeps working on top of it.
- **ROADMAP:** "stage show … synced by the server clock" (server side), "Theme vote lasts 20 s", "Out of time … saved on the server" (engine side), data for "Rafa picked yours".
- **Owns:** `src/game/{types,engine,view}.ts`, `src/game/show-timing/*` (creates them with the section 2 defaults; hands each file to its scene WP in wave 4), their tests, `simulation.test.ts`, `record.test.ts`, `test-utils.ts`; `src/server/rooms.ts` (only `ctx()`), `src/server/server.test.ts` (timing fixes only); minimal compile fixes: `vote-screen.tsx` (`SHOW_TIMING.tieSpin`), `reveal-overlay.tsx` (whitelist `answers`/`guess`); `e2e/helpers.ts`, `e2e/theme.spec.ts`, `e2e/tab.spec.ts`, `playwright.config.ts`; `PRODUCT.md` (vote line).
- **Depends on:** nothing.
- **Acceptance:** every rule of 1.4; `test-utils` gains `skipShow()` (advance `now` to `reveal.until`) and `started()` / `timed()` use it; existing tests updated per 6.1; new tests per 6.2 pass; `reveal.prev` keeps a running show when another is queued; `ASK`/`GUESS` refused before `stepStartsAt`; `leave()` back to the lobby clears the reveal; `pnpm test:e2e` passes with today's UI at `DARE_SHOW_SCALE=0.25` (votes during the opening are accepted and queue the theme show; the cast holds the first ask); `theme.spec` no longer waits for the one-beat "The theme is…" heading (it waits for "Space pirates" and then the pick field, both of which persist). Report note for Jean: between WP1 and the scene WPs the live app shows today's vote result for the whole theme show and today's turn screen through the cast (Ask refused until it ends); fine for development, not for a deploy.
- **Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint`, full `pnpm test:e2e` (stop any server already on 3100 first).

### WP2 — Design kit and all strings
- **Goal:** tokens, eases, glyph data, avatar sizes, logo mark, mini card, backdrop component, ThemeTag look, dock plumbing, every new i18n key.
- **ROADMAP:** "Each step has its own background colour, with symbols from the theme's set" (component and data), "3 languages", "light and dark".
- **Owns:** `globals.css`, `motion.ts`, `theme-sets.ts`, `avatar.tsx`, `logo.tsx`, `mini-card.tsx` (new), `screen.tsx` (ThemeTag + `--dock` padding), `toast.tsx`, `stage-backdrop.tsx` (new), `messages/{en,pt,ja}/*.json` (+ new `stageOpening`, `stageDraw`, `stageCast`, `pickCard`, `chat` files, handed to their scene WPs for wave 4), `src/i18n/request.ts`; one line in `turn-screen.tsx` (StageBackdrop with today's turn look).
- **Depends on:** nothing (the backdrop takes plain props).
- **Acceptance:** tokens in `:root` and `[data-theme="dark"]`; `StageBackdrop` crossfades between looks, bobs/drifts, static under reduced motion (every infinite CSS loop has `motion-reduce:animate-none`; checked with emulated reduced motion: no flicker); `--seat-n-ink` passes 3:1 on its own 20%/26% wash at 64 px in both themes; turn screen shows the new wash; `ThemeTag` is the 40 px surface pill everywhere (header, podium); all keys of section 4 exist in 3 languages with identical key sets (add a small vitest that compares the key trees of en/pt/ja for every namespace: `src/i18n/messages.test.ts`).
- **Verification:** unit (key parity); typecheck, lint; screenshots: a live turn (backdrop) and the podium tag, desktop/phone, light/dark.

### WP3 — Stage runtime and lab
- **Goal:** the client pieces every scene uses: `stageFrame`, `stageLook`, `StageProvider`, `useStageTimeline`, the clock context, the lab and the screenshot runner.
- **ROADMAP:** "synced for everyone by the server clock" (client), backdrop rules.
- **Owns:** `src/features/stage/{stage.ts, stage.test.ts, stage-context.tsx, use-stage-timeline.ts}`, `src/features/stage/lab/*`, `src/app/[locale]/dev/stage/page.tsx`, `e2e/stage-shots.spec.ts`, `use-server-clock.ts`, `room-context.tsx`, `room-screen.tsx` (extract `RoomStage` into `room-stage.tsx` unchanged in behaviour).
- **Depends on:** WP1 (types, engine), WP2 (backdrop props).
- **Acceptance:** `stageFrame` routes per 1.2 and returns correct `themeFrom`, `clockFrom`, `historyFrom`, `next` for every beat of all show variants (2–4 players, first/later, tie, typed, rule cards/sentence, timeout cast, a show queued behind `prev`, legacy theme reveal); `stageLook` matches 1.9; `useStageTimeline` seeks correctly (a demo sequence in the lab lands on the same frame after a reload at any `at`, resyncs after tab switch, rebuilds on resize); the lab renders today's screens for any scenario and time with a frozen clock, including `names=long`; `lab/scenarios/<scene>.ts` stubs exist for every scene WP; `stage-shots` writes the matrix.
- **Verification:** `stage.test.ts`; typecheck, lint; lab screenshots of each show at 3 times (desktop/phone, light/dark).

### WP4 — Room shell: frame, header, history, lobby exit, backdrop, guards
- **Goal:** the tree of 1.2 with today's screens inside, header and history per 1.8/1.10, lobby exit, dock, focus guards, scene and chat stubs.
- **ROADMAP:** "History only during turns: a button left of the theme opens a full-height bar on the left that pushes the screen (over a scrim on phones)", "The lobby stays as it is" (exit + padding), "everything that works today keeps working".
- **Owns:** `room-stage.tsx`, `match-frame.tsx` (new), `game-header.tsx` (delete), `history-panel.tsx`, `reveal-overlay.tsx`, `timer.tsx` (if needed), `turn-backdrop.tsx` (delete), `src/lib/focus.ts`, `screen.tsx` (exit variants), `lobby-screen.tsx` (only if wiring needs it), the `GameFrame` removal in `vote-screen.tsx`, `theme-screen.tsx`, `pick-screen.tsx`, `turn-screen.tsx` (+ autofocus guard and Ask/Guess submit disabled until `stepStartsAt`), `useRoomTab` alert hold, the stub files (`cold-open.tsx`, `theme-stage.tsx`, `pick-intro.tsx`, `cast-scene.tsx`, `room-chat.tsx`) with the final props of 3.1 and a minimal placeholder (render nothing, so today's screens show), lab switch to `RoomStage`.
- **Depends on:** WP1, WP2, WP3.
- **Acceptance:** header never remounts across theming/vote/pick/turn; tag hidden until `themeFrom` then pops; clock hidden during shows then pops at `stepStartsAt`, recharge kept for answers/guess; history button and give up only on the turn screen from `historyFrom`; sidebar pushes header and main on ≥1024, left drawer over scrim on phones, Escape/scrim/focus behave; remembered-open waits for the button; lobby leaves with the `leave` variant, match header fades in; backdrop is room-level and crossfades across screens (vote butter → theme → brand → target → turns); `RevealOverlay` ignores shows and keys typed inside `[data-chat]` only (with the answers reveal open and the Guess field focused, a typed letter closes it and lands in the field: covered by an e2e assertion); Ask/Guess can't submit during the cast; `RoomChat` stub mounted for lobby, match and result only; full e2e passes.
- **Verification:** typecheck, lint, `pnpm test`, full e2e; screenshots: lobby → match transition (lab `show=opening&at=0.2,0.6,1.2`), turn screen with history open/closed (desktop push, phone drawer), light/dark.

### WP5 — Server: drafts, confirm, examples, hand
- **Goal:** everything the pick table and the rule scene need from the server.
- **ROADMAP:** "Out of time: whatever is on the card … saved on the server while you edit; random only for an empty card", "a hand of the theme's most picked and liked characters", "two cards that fit get ✓, one that doesn't gets ✗" (data), "Random" (fixes).
- **Owns:** (the starters table and seed already exist; read only), `src/server/{actions.ts, rooms.ts (dispatch quiet + backoff, applyDueTimeouts, fallbackCharacters), theme-picks.ts (+test), http.ts, images.ts, characters.ts, rule-examples.ts (+test)}`, `backend/types.ts` (`NewCharacter.id?`, theme examples), `backend/{local,supabase}/{characters,themes}.ts`, the draft routes, the hand route, `server.test.ts` (new tests).
- **Depends on:** WP1.
- **Acceptance:** 1.5 and 1.6 exactly; draft routes: origin check, auth, seated, rate limit `draft:id` 120/min (image shares `upload:id`), validation (name ≤ 60, `imageUrl` only from our uploads), quiet dispatch, 204; a pick timeout with a custom draft creates one library row even when `applyDueTimeouts` runs twice concurrently; `confirmCard` with a name creates-or-reuses then picks (inserts only; no library row is ever updated or deleted); `randomPick` stores the draft and keeps today's exclusion; `dispatch` retries with a randomised backoff; examples deterministic and identical for every viewer, starters first, then history; misfit from a contrasting set's starters, null for cross-cutting sets; unresolved ids skipped at runtime; unit tests use fixtures, never `data/`; hand route returns up to 8 (history with signal, then starters), cacheable, empty for typed themes. Report to Jean: starters per theme after seeding (themes with fewer than 5) and how to add rows.
- **Verification:** `pnpm test` (server tests in local mode), typecheck, lint; manual: `curl` the routes against `pnpm dev`.

### WP6 — Server: chat
- **Goal:** chat storage, routes, system lines, realtime and the client data hook.
- **ROADMAP:** "Chat … up to 280 characters, rate limited, gone when the room closes", system lines.
- **Owns:** `0012_room_messages.sql` (applied to the hosted project with the Supabase MCP, then `list_tables` + `get_advisors(security)`), `src/game/chat.ts` (+test), `backend/types.ts` (chat parts), `backend/index.ts`, `backend/{local,supabase}/chat.ts`, `supabase/notify.ts`, `src/server/rooms.ts` (dispatch hook, prune, `chat.reassign` in `handOverSeats`), the messages route, `src/lib/realtime.ts`, `src/features/chat/use-chat.ts`, `server.test.ts` (chat tests).
- **Depends on:** WP1; after WP5 (shared server files).
- **Acceptance:** 1.7 exactly; system lines once per transition with the right `showAt` (scaled); messages never travel over broadcast; the multiplexer keeps the room's `changed` subscription alive when chat unsubscribes; local polling works; close clears; prune removes old chats; the Supabase limit holds across instances (enforced in `add_room_message`); a guest who signs in keeps their messages (reassigned to the account).
- **Verification:** `chat.test.ts`, server tests (send/list, 280 code points, 6th message in 10 s → 429, non-member 403, theme line `showAt` in the future after a vote, close clears, prune, reassign); typecheck, lint; Supabase advisors clean.

### WP7 — Scenes 1-4: opening, vote, theme and rule
- **Goal:** cold open / "Round N", the vote heading beat and clock-gated deal, the settle, the winner flight, the hero, the rule scene (cards and sentence), the typed path.
- **ROADMAP:** "Cold open … later matches get a short 'Round 2' card", "'Now, choose a theme together' shows alone …", "Chosen theme grows in the middle, then the rule as a scene … a typed theme gets only the sentence".
- **Owns:** `cold-open.tsx`, `theme-stage.tsx` (+ internal rule parts), `vote-screen.tsx`, `theme-screen.tsx`, `who-am-i-banner.tsx` (exports only), `src/game/show-timing/{opening,theme}.ts`, `messages/*/stageOpening.json`, `lab/scenarios/{opening,theme}.ts`.
- **Depends on:** WP3, WP4 (WP5 for real examples; build with lab fixtures first).
- **Acceptance (spec A §3, scenes 2-4):** people row = real players with avatars and names ("you" at index `floor((n−1)/2)`, others in turn order around), illustrative held cards (no copyrighted art), chips over the 1st/2nd player after you (2 players: one chip); L1/L2 and the rule in `output aria-live="polite"`; vote: line alone at the centre 0.2–0.8, rises and shrinks to 0.7 (phone 0.84) with a measured wrapper, deal at +1.3 (tilt −7/0/7, stagger 0.09), sub at +1.5, footer at +1.9, cards disabled until `stepStartsAt`, "Still voting: everyone" before the first vote, width ≈1200 px; tie roulette from the `tie_spin` beat; settle at `settleDim` / `settleLeave` (first +1.3 / +2.8, later +0.4 / +1.1); winner → hero via `layoutId="theme-card"` on an outer wrapper, the timeline on an inner element (1.2); confetti at theme +0.9; hero out at +2.2; rule cards and badges per spec A, ✗ falls; sentence-only variant; typed: butter tone, ✍️, "Chosen by {host}" with avatar; theme-show images preloaded; long names (`names=long`): labels under cards and avatars truncate to their column width (`max-w-[card+gap] truncate`, avatar kept), headings with a name wrap (`flex-wrap`, `text-balance`) and fit on a 390 px phone (cold-open labels: 13 px under 62 px cards on phones); reduced-motion still versions; e2e group name "Vote for the theme" and heading "The theme is…" kept.
- **Verification:** typecheck, lint, e2e `match.spec`, `theme.spec`, `tab.spec`; screenshot matrix: cold open at 0.3, 1.3, 2.5, 4.0, 5.6; round card at 0.6; vote entrance at 0.5, 1.2, 1.6, 2.0; settle at 1.8, 3.0 (later: 0.6, 1.3); tie at 1.0; theme at 0.5, 1.5, 2.4; rule cards at 1.0, 2.0, 3.4, 4.6; sentence at 1.0; typed theme at 1.0; 2/3/4 players; `names=long`; pt and ja.

### WP8 — Scenes 5-6: draw and "for whom"
- **Goal:** `PickIntro`: the urn (inverted `LogoMark`), hops, swallow, shake, slosh, swell, squeeze, the slip that is the target header, the ring.
- **ROADMAP:** "Draw: the avatars hop into the yellow 4 of the logo, it shakes like a jar and spits out a slip, already straight and at its final size and place", "'For whom': the slip becomes the screen (big face, name …, 'Pick a character Leo knows'), with a ring of who picks for whom, yours highlighted".
- **Owns:** `pick-intro.tsx`, `draw-urn.tsx`, `who-ring.tsx`, `src/game/show-timing/draw.ts`, `messages/*/stageDraw.json`, `lab/scenarios/draw.ts`.
- **Depends on:** WP3, WP4.
- **Acceptance (spec B §2-3):** row in turn order (all players, you included); hop schedule `1.40 + 0.22·i`; the last swallow squash never overlaps the anticipation (start it at `max(2.45, lastSquashEnd)`); shake keyframes and origins exact (`50% 92%`, "?" in viewBox units); slip launches at 4.13 from the bubble mouth, straight (x fixed, no rotation), scale 0.15→1 during its 0.6 s rise (`back.out(1.4)`), behind the bubble until 4.30, laid out from frame 0 at the size and place of the target header, which it is (no resize or move after landing). This follows the artifact's code (`scenes-b.js:89-93`), which is what Jean watched; the WP8 report says so, and that the draw notes' "que vira no ar" is stale, so nobody "fixes" either later; the paper alone dissolves at target start; no "For Leo"/"From Rafa" badge; the name in the target's colour (ROADMAP: "name in their colour") through `--seat-n-ink` (a deeper mix on the light wash, the seat colour itself in dark), the same in slip and screen, under a face ringed in that seat colour; 3:1 checked at 64–96 px for all four seats in both themes; hint through `withNames`; ring geometry for 2-4 players (R 74/62, gap 0.44 rad, mine arc in the target's colour, your face and the target's face lit); later-match short variant (3.0 + 2.6 s: hops together, one 0.6 s shake, wash at 2.6, ring pre-drawn); long names shrink to fit (measure once, same size in slip and screen); long names (`names=long`): labels under cards and avatars truncate to their column width (`max-w-[card+gap] truncate`, avatar kept), headings with a name wrap (`flex-wrap`, `text-balance`) and fit on a 390 px phone (the row of hopping avatars has no labels); fallback entrance without the slip (reload mid-target); reduced-motion still.
- **Verification:** typecheck, lint; screenshot matrix: draw at 0.4, 1.6, 2.2, 3.0, 4.0, 4.3, 4.8, 5.2; target at 0.1, 0.8, 1.6, 2.5, 4.0; later variant at 1.0, 2.4 (draw), 1.3 (target); 2/3/4 players; all four target seats, light and dark; `names=long`; pt/ja.

### WP9a — Pick card (the form)
- **Goal:** the card component: name combobox with live preview, picked flip, origin line, "New!" seal, drop zone, inline picture with crop, swap pill and tray, frozen/grown/stamp states.
- **ROADMAP:** "Pick screen is one card in the middle and the card is the form: a name with autocomplete and a live preview, the picture changed right on it, no 'Create character' button; a name not in the library gets a 'New!' seal".
- **Owns:** `pick-card.tsx`, `card-name-field.tsx`, `card-picture.tsx`, `use-image-intake.ts` (new), `image-drop.tsx` (refactor, same behaviour), `character-search.ts` (+ `exactMatch`, test), `src/app/[locale]/dev/pick-card/page.tsx`, `messages/*/pickCard.json` (until WP9b starts).
- **Depends on:** WP2.
- **API (props-driven; WP9b wires data):**

```ts
export type CardContent =
  | { kind: "empty" }
  | { kind: "typing"; text: string; preview: SearchItem | null }
  | { kind: "picked"; card: CardView; via: "list" | "hand" | "random" | "exact" | "restore" }
  | { kind: "new"; name: string; imageUrl: string | null; uploading: boolean };
export function PickCard(props: {
  value: CardContent;
  onChange: (next: CardContent) => void;
  lang: Lang;
  targetName: string;                 // for the aria-label "Character for {name}"
  state: "editing" | "confirmed" | "timeUp";   // confirmed/timeUp: read-only, scale 1.08 from the top
  stamp: boolean;                     // "Time! That's the one."
  onNewImage: (file: Blob) => Promise<string | null>;               // upload for a new character → URL
  onLibraryImage: (characterId: string, file: Blob) => Promise<void>; // replaceCharacterImage
  className?: string;
}): ReactNode;
```

- **Acceptance (spec B §4.2, §5.2, §6):** combobox ARIA (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, listbox of options); ↑/↓, Enter, Esc, click; up to 5 rows with the matched part in `<mark>`; empty query → no dropdown; ghost preview of the highlighted row at .45; picked flip (rotateY −70→0, 0.6 s); Enter picks the highlighted row; while the search has rows the card stays "typing + preview" (no seal, as in scene 7); "New!" appears only when the search has **no rows** (the dropdown shows just the muted "Not in this theme yet…" line) or on blur with no highlighted row, and slams in (scale 2.2/−20° → 1/8°); an exact name match on blur becomes "picked"; drop/paste/browse → centre-cropped at once, then drag/zoom inline (react-easy-crop) with debounced export; swap pill on hover/focus (always on phones), tray with the current picture and "Upload yours"; paste ignored inside `[data-chat]`; image errors inline (`common.image.*`); `maxLength` 60; profile `ImageDrop` unchanged.
- **Verification:** `character-search.test.ts`; typecheck, lint; screenshots of every state on the dev page (desktop/phone, light/dark, pt/ja).

### WP9b — Pick table, drafts, confirm, timeout
- **Goal:** the pick screen around the card: title, actions, hand, entrance, autosave, confirm grow, done row, timeout stamp, picked beat, PickIntro integration, e2e.
- **ROADMAP:** the card items plus "a hand … a tap puts one on the card", "'Random' big beside 'Confirm'", "Out of time: whatever is on the card …", "Confirming makes the card grow a little, straight and centred; then the avatars of who has finished show up".
- **Owns:** `pick-screen.tsx`, `pick-hand.tsx`, `done-row.tsx`, `use-pick-draft.ts`, `draft-api.ts`, `draw-feedback.tsx`, `src/game/show-timing/pick.ts`, `messages/*/pickCard.json`, `lab/scenarios/pick.ts`, `e2e/helpers.ts` (`pickAll` only), `e2e/picture.spec.ts`.
- **Depends on:** WP4, WP5, WP9a (and WP8's `PickIntro` file, consumed through its fixed props).
- **Acceptance (spec B §4-6):** `PickIntro` during draw/target, table from the pick `entrance` beat (title 0, card 0.1, clock 0.4, hand 0.6, actions 0.8, label 0.9); title "A character for [av] Leo"; desktop row `[210 spacer][card 270][actions 210]`, phone column `[card 224][actions row]`, hand bleeding off the bottom (lifted by `--dock` on phones), fan `rotate((i−(n−1)/2)·6°)`; Confirm = `keyClass("yes")` 64/56 px, Random = secondary 44 px with the dice spin, rule line on desktop; Random hidden for a typed theme (e2e checks it), `not_enough_picks` note kept, `DrawFeedback` after a draw; hand: 5 of the route's 8 drawn with a seed from your id and the match number, heart number = likes only when > 0; hand tap puts the character on the card (flip) and saves the draft; drafts per 1.5 (restore on mount only, or when the server draft differs and the field is neither focused nor dirty; final flush only if dirty, with jitter); Confirm and Random disabled while a picture uploads; confirm: hand and actions leave, card 1.08 from its top (0.5 s `backOut(2)`), done row with ticks from `pick.confirmedIds`, "Done! Waiting for [av]Bia and [av]Rafa" (`Intl.ListFormat`, wraps with long names), "Everyone has picked!"; at `deadline` the not-confirmed card freezes and the stamp slams; an empty card shows the stamp alone and flips to the drawn character when the view arrives; during the cast `picked` beat the screen holds, then fades in its last 0.4 s; short windows shrink the card (`W = clamp(200, (sceneH − 360)/1.25 + 24, 270)`); phone keyboard: the picture shrinks while the field is focused; e2e `pickAll` types a name certain to have no rows (e.g. "Zqxj Hero 1"), waits for "New!", confirms; `picture.spec` pastes / drops on the card.
- **Verification:** typecheck, lint, full e2e; live screenshots: entrance, typing with preview, picked, new + picture, tray open, confirmed + done row, timeout stamp, all-picked; desktop/phone, light/dark, pt/ja; manual pick timeouts: a half-typed library name with rows (the previewed character goes), a one-letter name with no rows (a new character goes), an empty card (random).

### WP10 — Scenes 9-10: your character, turn order, into the game
- **Goal:** `CastScene` and the turn-screen hand-off.
- **ROADMAP:** "'Rafa picked yours': your '?' card falls in with who picked it, then the others turn face up", "Turn order: the cards shuffle into the order, get numbers, 'Bia starts!', then shrink into the game's player strip".
- **Owns:** `cast-scene.tsx`, `turn-screen.tsx`, `player-strip.tsx`, `src/game/show-timing/cast.ts`, `messages/*/stageCast.json`, `lab/scenarios/cast.ts`.
- **Depends on:** WP3, WP4.
- **Acceptance (spec C §2):** table per spec C §2.1 (desktop 150 / phone 80 cards, seat order in `received`, turn order in `order` with the arc shuffle `y ±46`); your card falls from 520 px higher at ×1.45 (phone ×1.65), `bounceOut`, pulses, moves to its slot at 2.4; "[av] {name} picked yours." then the rule line; others flip in seat order from 2.9 (+0.18 i); badges 1.6 + 0.16 i; spotlight on `view.turn.playerId` (not necessarily `order[0]`) with a seat-colour ring, others .55, "[av] {name} starts!" at 2.55; table shrinks up at 4.4 (`scale .32, y −330/−300`); strip drops in at the entrance beat (stagger 0.06), body rises at +0.4, clock at `stepStartsAt`; small "from {name}" / "by {name}" lines with avatars on desktop, hidden on phones; your turn card's meta now reads "Picked by {name}"; later-match short variant (3.0 + 2.4 + 0.6 s); away players stay in the table at .55; long names (`names=long`): labels under cards and avatars truncate to their column width (`max-w-[card+gap] truncate`, avatar kept), headings with a name wrap (`flex-wrap`, `text-balance`) and fit on a 390 px phone (table labels: `nowrap` today, 80 px cards with 8 px gaps on phones; "[av] {name} starts!" at 40 px and "[av] {name} picked yours." at 28 px shrink a step on phones); reduced-motion still; reload mid-scene lands on the frame.
- **Verification:** typecheck, lint, e2e `match.spec`; screenshot matrix: received at 0.2, 0.7, 1.5, 2.6, 3.9; order at 0.3, 1.0, 2.0, 2.8, 4.6; entrance at 0.3; later variant; 2/3/4 players; `names=long`; pt/ja.

### WP11 — Chat UI
- **Goal:** the tab (desktop) and bar (phone), unread behaviour, bubbles, list, compose.
- **ROADMAP:** the four chat items, "The lobby stays as it is, plus the chat".
- **Owns:** `src/features/chat/*` (except `use-chat.ts`, which it may extend), `messages/*/chat.json`, `e2e/chat.spec.ts`, `lab/scenarios/chat.ts` (demo chat data).
- **Depends on:** WP4, WP6.
- **Acceptance (spec A §2.7, spec C §3):** desktop tab `right-4 bottom-0 w-[340px]`, 56 px folded, open `round(0.62·innerHeight)` (0.5 s `backOut(1.15)`), fold 0.5 s `p3InOut`, chevron 180°; phone bar `inset-x-2`, 60 px + safe area, opens to 66%; overlays, never pushes; head is a `<button aria-expanded aria-controls>` with the unread count in its label; unread: sky head, inverted count (pop 0.3→1 `backOut(3)`), up to 3 sender faces (desktop), hop `[0,−14,0,−5,0]` 0.6 s per message, CSS nudge loop until opened; desktop bubbles above the tab for 3.05 s (or until opened −0.1 s), stacked; phone line "[av] Bia: text" or "Room chat"; messages: others with avatar 28 + name, yours sky right-aligned, emoji-only big, system pills with avatars (wrap allowed); compose 46 px pill, send disabled when empty, Enter sends, keeps focus, `maxLength` 280, desktop focus on open (not on touch), Escape folds; folded body unmounted (no stray textbox for e2e); `data-chat` on the root; sets `--dock`; mounted only for lobby, match and result; phone keyboard per 1.11 (default `interactiveWidget`; the open sheet lifts by the `visualViewport` gap while the chat input has focus; the folded bar hides and `--dock` drops to 0 while another field has focus); long author names truncate in the head, bubbles and phone bar; z-[35]; live region announces new messages while folded (throttled); reduced motion: no hop, nudge or overshoot; lobby unchanged apart from the tab/bar.
- **Verification:** typecheck, lint; `e2e/chat.spec.ts` (two players in a lobby: message arrives, unread count, open/fold, "▶ Match started" after start, 280-char limit, phone bar); full e2e; screenshots: folded, unread with bubble, open over the vote, phone folded/open, phone with a focused pick field (bar hidden), light/dark, `names=long`, pt/ja.

### WP12 — Integration, polish, docs
- **Goal:** the whole flow end to end, the requests list from other WPs, cleanup, docs.
- **ROADMAP:** "Desktop and phone, light and dark, 3 languages, reduced motion; everything that works today keeps working"; ticks the Phase 10 boxes that pass.
- **Owns:** everything for small fixes (no other WP running); `PRODUCT.md`, `ARCHITECTURE.md`, `ROADMAP.md`, unused i18n keys removal, `e2e/*`.
- **Depends on:** all.
- **Acceptance:** two full live matches (first and second of the same room) on desktop + phone, light + dark, 2, 3 and 4 players, one typed theme, one tie, one pick timeout with a draft and one with an empty card, a reload during each show, a player leaving during the cast, host leaving mid-show, a guest signing in mid-match (their chat lines stay theirs), long guest names; full e2e green; reduced-motion run of the 3-phone spec; contrast of the 20% wash on turn screens checked in both themes; no console errors; tab titles unchanged; docs updated (vote 20 s, shows, chat, drafts, history on the left, the `theme_starters` table and its seed, the duplicate-secret trade-off). The final report hands Jean: the real-phone checks an agent can't run (iOS Safari and Android Chrome: chat open with the keyboard up, typing on the pick card, the folded bar never over a field), the starters coverage (themes with fewer than 5, themes with no ✗), the timing knobs of section 2, and the open questions of section 8.
- **Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`, full `STAGE_SHOTS=1` matrix, live screenshots.

---

## 6. Test strategy

### 6.1 Existing tests that change
- `engine.test.ts` (expectations computed from `SHOW_TIMING` / `SHOW_MARKS`, never ms literals): vote start (`stepStartsAt == reveal.until`, `deadline − stepStartsAt == 20 000`, opening beats `[curtain, intro, entrance]` first match); most-voted / tie (`settle`, `tie_spin` beats, `stepStartsAt == until`, votes cast after `skipShow()`); host typing (`+ curtain + intro + entrance.theming`); host sets the theme (typed beats `[theme, rule(sentence), draw, target, entrance]`); host times out → vote (`[entrance]` only); turns start (`reveal.kind == "cast"`, `deadline == until + ASK`); `started()` / `timed()` helpers call `skipShow()` after `pickAll()` (every `ASK` right after picks is otherwise `too_early`); step clocks and answer cuts measured from `stepStartsAt`; "4 players play again" (second `START` → `[curtain, round, entrance]`, theme show without `rule`); "never mutates" via `started()`.
- `view.test.ts`: `started()` skip; "nobody sees their own card" keeps `card: null` but `pickedById` is now the picker; reveal shape is `ShowView`.
- `simulation.test.ts`: "only the theme holds the clock" → every show holds it; allowed reveal lengths → shows have contiguous beats (`beats[0].startsAt == startsAt`, each `until` = next `startsAt`, last = `until`) with lengths from `SHOW_TIMING` for `first`; lobby → `reveal === null`; random `DRAFT` events and `drafted` maps in random `TIMEOUT`s; `checkSecrecy` asserts the target's view JSON never contains a draft's name or image.
- `record.test.ts`: `startedAt == state.stepStartsAt` (cast end).
- `server.test.ts`: replace fixed `skip(6000)` with "skip to `view.stepStartsAt`"; ask after the cast; give up during the cast still records the match with `timeMs ≥ 0`. No test (old or new) reads `data/*.json` for Phase 10 facts; fixtures live in test code.
- `theme-picks.test.ts`: `pickKey("draft-…") === null`; `rankPopular`.
- e2e: see 6.3.

### 6.2 New tests
- **Engine (WP1):** opening variants (first/later × vote/host; theming timeout → entrance only; `n == round + 1`); a vote closed during the opening queues the theme show at `opening.until` and keeps the opening as `reveal.prev` (dropped once it ends; a third show never nests two levels); theme show variants (first/later × voted/typed × tie/no tie × rule cards/sentence) with the pick clock at `until` for 120 s; cast after last `PICK` (`picked.confirmed`) and after `TIMEOUT` (`picked.timeout`); `ASK` and `GUESS` before `until` → `too_early`; first turn player = first active in order; `playStartedAt == until`; `GIVE_UP` by the first player during the cast → the next clock still starts at `until`; `LEAVE` to fewer than 2 during a show → finished, show dropped, podium now; `LEAVE` back to lobby during the opening → `reveal === null`; `SWAP_PLAYER` keeps shows and drafts; legacy theme reveal without beats holds the clock and views as one `theme` beat; `showScale` scales beats only; drafts: errors (`wrong_phase`, `not_member`, `already_done`, after deadline, too long), `null` clears, `PICK` clears, timeout order (drafted → provisional for any non-empty name or a `characterId`, one-letter names included → fallback `auto` only for an empty card), drafts never consume fallbacks, records count drafted picks (`autoPicked: false`).
- **View (WP1):** `ShowView` fields; `pickedById` for self; `PickView.draft` only for the picker; `PickView` present during the cast; `voteView` during the theme show.
- **Stage (WP3, pure):** routing table of 1.2 (including `prev`), marks clamped into scaled beats, `next` boundaries, looks of 1.9, per-viewer colours.
- **i18n (WP2):** key-tree parity for every namespace across en/pt/ja.
- **Chat (WP6):** `systemLines` for start, theme (with tie offset), order, firstTurn; nothing for `SWAP_PLAYER`, `UPDATE_IDENTITY`, `DRAFT`, `GONE`/`BACK`; server: send/list, limits (the 6th message in 10 s refused by the store, not only by `allow()`), membership, `showAt`, clear on close, prune, `reassign` after `handOverSeats`.
- **Server picks (WP5):** draft route validation and quietness (no `roomChanged`), concurrent timeouts create one character, `confirmCard`, `randomPick` draft + today's exclusion (the caller's own secret is never drawn), `dispatch` backoff, `ruleExamples` determinism, curated-before-history order and sentence fallback (fixtures), hand route (history then curated, up to 8). Misfit pools are checked once against the hosted library with a read-only query (WP5), not in a test.
- **Character search (WP9a):** `exactMatch` with accents, case and aliases; the card's state machine (rows → preview, no rows → "New!", Enter → highlighted row) as a pure reducer test.
- **Reveal overlay (WP4, e2e):** with the answers reveal open and the Guess field focused, a typed letter closes the reveal and lands in the field; a key typed in the chat input does not close it.

### 6.3 e2e
- `playwright.config.ts`: `DARE_SHOW_SCALE: "0.25"` in `webServer.env` (WP1). Restore `tsconfig.json` after runs.
- `helpers.ts` (WP1): `voteAll` waits for the 3 enabled cards with `{ timeout: 15_000 }` and no longer waits for "The theme is…" (a 0.65 s beat at this scale); `pickAll` first waits for the pick field (`{ timeout: 20_000 }`); `nextAsker` also waits until the room view's `stepStartsAt <= serverNow` before returning; text inputs addressed by accessible name where possible (`getByRole("textbox", { name: /character for/i })`, question/guess fields) instead of `.first()`.
- `theme.spec.ts` (WP1): drop the `heading /the theme is/` wait on both pages (it lives in one 650 ms beat at this scale and the guest polls every 1 s); wait for "Space pirates" (header tag, persists) and then the pick field. `tab.spec.ts`: explicit 15 s timeouts for the vote cards and the vote clock title. Every spec follows the 1.12 rule (no text that only lives inside one beat).
- `pickAll` and `picture.spec.ts` rewritten for the card (WP9b).
- `e2e/chat.spec.ts` (WP11).
- `e2e/stage-shots.spec.ts` (WP3): skipped unless `STAGE_SHOTS=1`; visits the lab with a list of `(scenario, at)` and saves desktop/phone × light/dark shots.
- WP12: the 3-phone spec runs once with `reducedMotion: "reduce"`; full suite green.
- Chat stays after `<main>` in the DOM, its folded body is unmounted and it has no `h1` and no text matching `/another round|back in/i`, so existing strict locators keep working.

---

## 7. Risks and how each is handled

| Risk | Handling |
|---|---|
| Breaking today's features with the shell refactor | WP4 is behaviour-preserving (today's screens inside the new frame), runs the full e2e; WP1 keeps today's UI working on the new engine before any scene lands; WP12 runs the checklist of existing features (ready flow, start dialog, settings, reveals, answer cuts, give up, history filters, podium, back to lobby, guests signing in, one-room-at-a-time, tab titles, sounds). |
| Show lengths longer than the chart (first match 42.3 s vs 29.3 s, later 21.5 s vs 16.5 s) | Later matches follow the chart for every scene it lists (16.1 s); the first match keeps the scene lengths Jean watched; per-scene constants with the knobs of section 2; scenes schedule exits relative to their beat end, so trimming a beat trims holds, not choreography. |
| Realtime ordering (pings out of order, late polls, chat before its scene) | Views are applied by `version` (`>=`), pings carry no data; shows are absolute server times, so the order of arrival doesn't matter; chat lines sorted by `max(at, showAt)` then id and hidden until `showAt`; the multiplexer avoids killing the room channel; reconnect triggers refetch. |
| Clock skew | `offset` from each view's `serverNow` (midpoint); timelines seek with 0.25 s hysteresis; actions near boundaries (`VOTE`, `PICK`, `DRAFT`, `SET_THEME`) are unguarded so an early click isn't silently dropped; the UI disables controls until `stepStartsAt`; `ASK` / `GUESS` keep their guard and their submit is disabled until `stepStartsAt` too. |
| Late joiners, reload or rejoin mid-show | Everything derives from `(view, serverNow)`; timelines seek to the current frame; header pops and lobby exit only animate when crossing live (`initial={false}`); `pick.draft` restores the card; local mode's 1 s poll just enters scenes a little later. |
| Host leaving mid-show | Shows don't depend on the host; host hand-over is existing engine behaviour; leaving to fewer than 2 present finishes the match and drops the show (podium at once); leaving back to the lobby clears the reveal. |
| A player leaving during the cast | `goToTurn` skips them; the call reads `view.turn.playerId`; their column stays at .55. |
| Phones | `--dock` padding on every screen (each breakpoint) and the toast offset; chat bar with safe area; 4-player sizes checked (cold open 338 px, table 344 px); long guest names (16 characters) truncate or wrap in every scene, checked with `names=long`; the pick picture shrinks while typing; keyboard: default `interactiveWidget`, the open chat sheet lifts with `visualViewport`, the folded bar hides while another field has focus; real-phone checks listed for Jean (WP12). |
| 2-3 player rings and rows | Ring geometry generalised (arcs 129.6° / 69.6° / 39.6°); cold open chips by count; hop schedule and table widths scale with n; tests and lab shots at 2, 3, 4. |
| Typed theme | Sentence-only rule, no hand, no Random (e2e checks), "Chosen by {host}" hero, ✍️/"?" glyphs, no settle beat. |
| Sparse data (15 of 337 themes with 2+ picks, no likes yet) | `theme_starters` seed (~5 per active theme, Jean's decision) read before history (no AI at runtime, no `data/`); hand 0-5 cards with the layout kept for themes without starters; rule falls back to the sentence; Random keeps its `not_enough_picks` note; the lab shows the full scenes with fixtures. |
| Supabase write churn from drafts | Quiet dispatch (no ping, no listing), client debounce, final flush only if dirty with jitter, rate limit, CAS retries with randomised backoff; drafts could move to their own store later with the same engine logic. |
| Junk library entries from timed-out drafts (the library is hand-fed and may not be bulk-deleted) | The highlighted preview wins while the search has rows, so only names with no match at all become new characters (Jean's rule: whatever is on the card goes); same-name reuse; idempotent ids; inserts only. |
| Secrecy and fairness | Drafts only in the picker's view (simulation check); the hand never excludes match picks (it is cacheable and per-viewer-shuffled); `randomPick` keeps today's exclusion, so it never hands you your own secret; duplicates through the hand or typing stay possible (documented trade-off); `pickedById` for self was already derivable. |
| Server Actions run one at a time per client | Chat and drafts use route handlers with an origin check; `confirmCard` stays an action. |
| Chat text over public broadcast topics | Pings carry ids only; reads go through the authorised route. |
| Chat abuse across Vercel instances | The per-author limit is enforced in the database insert function; `allow()` is only a cheap first line. |
| Guest signs in mid-match | `chat.reassign` beside the seat swap; system lines rewritten too. |
| e2e collisions with the chat | DOM order after `<main>`, folded body unmounted, named locators, no strict-text collisions, no unread count in the tab title. |
| Performance (re-render storms, 20 Hz vote screen) | One stage timer scheduled at boundaries; scenes animate through motion sequences (WAAPI where possible); leaf clocks only; backdrop loops in CSS. |
| motion sequence seeking edge cases | WP3 proves seeking, resync and rebuild in the lab before any scene is built; scenes render from-states inline. |
| Reduced motion | Every scene has a still build with the same beat times; global CSS clamp and `MotionConfig` stay; every infinite CSS loop has `motion-reduce:animate-none` (the clamp would make it flicker); WP12 runs a reduced-motion e2e. |
| Back-compat with rooms saved mid-match before deploy | Legacy `theme` reveal maps to a one-beat show; assignments without `draft` work; `beats` and `prev` optional in state. |
| Interim state between WP1 and the scene WPs | Today's screens run on the new engine (long theme show, Ask held through the cast); fine locally, not deployable; said in the WP1 report. |
| Parallel agents editing the same files | Ownership table per wave; per-scene files for timing, strings and lab fixtures so each scene WP can finish its own tuning; the remaining shared files (existing messages, globals.css, look table, server files) owned by one WP at a time; change requests collected for WP12. |
| Migration safety and the protected library | Two idempotent migrations (`0011_theme_starters`, `0012_room_messages`), neither changing the library tables (the starters only reference them); applied one at a time by MCP (never `pnpm setup:supabase`, never `pnpm seed`) and verified with advisors; RLS on without policies; local mode needs nothing. |
| Overlap with ROADMAP_BUILD | No AI, no `data/*.json` reads, no edits to the AI theme code; if `LazyMotion` lands first, scenes use `m`. |

---

## 8. Open questions for Jean (defaults in place; none blocks the work)

1. **Players who join at match 2 or later** never see the cold open or the rule scene: `first` is per room, as the proposal says ("só na primeira partida da sala"). Alternative: `first = round === 0 || someone seated has not played a match in this room yet`. Default: per room.
2. ~~Curated theme examples~~: settled by Jean: the `theme_starters` table and seed (1.6).
3. **Timing:** first match 42.3 s of fixed scenes (chart 29.3), later 21.5 s (chart 16.5). Knobs in section 2.
4. **The slip** follows the artifact's code: it rises from the bubble at scale 0.15→1 in 0.6 s, straight, laid out at its final size and place. If "already at its final size" means no growth at all, it is a one-line change in WP8.
5. **The target's name** is drawn in the target's colour (ROADMAP item), where the artifact drew it in ink; a deep mix keeps it close to the artifact on light backgrounds.

---

## Critique log

After the log: finding 1 is now **fully applied** by Jean's decision of 2026-10-03, the `theme_starters` table and seed (1.6) replacing `themes.fits` / `misfit`.


Each finding of `plan-critique.md`, checked against the code, the prototype and the hosted data.

| # | Finding | Verdict | What changed / why not |
|---|---|---|---|
| 1 | ✓✓✗ and the hand will almost never appear | **Partly applied** | Diagnosis confirmed (15 of 337 active themes with 2+ picks, `pick_feedback` empty). The AI fix is rejected: AGENTS.md bans AI calls, `288542b` removed the "AI in scripts" allowance, and `data/*.json` may not be read. Instead: optional hand-curated `themes.fits` / `misfit` (migration 0011) read before history, the hand fills from it, the gap is reported (1.6, WP5, 8.2). Cross-cutting sets keep `misfit: null` unless curated (a wrong ✗ teaches a wrong rule). |
| 2 | New overlay key guard breaks typing into the Guess field | **Applied** | Only `[data-chat]` targets are ignored; e2e assertion added (1.11, WP4, 6.2). |
| 3 | "New!" rule contradicts scene 7; `MIN_DRAFT_NAME` contradicts "random only for an empty card" | **Applied** | "New!" only with no rows or blur without a highlight; Enter picks the highlighted row; preview is the draft while rows exist; `MIN_DRAFT_NAME` dropped; `pickAll` uses a no-row name (1.4, 1.5, WP9a, WP9b). |
| 4 | Show lengths well past the proposal | **Partly applied** | Later matches now follow the chart for every scene it lists; first-match invented beats trimmed (curtain 1.6→0.8, picked 2.2→1.4); settle split first/later. Not taken: settle by how the vote ended (no reason the cause changes the result beat), vote entrance 1.0 in later matches (Jean's "line alone, rises, then the clock" is not first-match-only), received 2.4 / order 2.0 later (the chart says 3). Totals 42.3 / 21.5 s, both columns shown (section 2). |
| 5 | `randomPick` change and the shared hand make duplicates and self-secrets likely | **Applied** | Today's exclusion kept; the hand shows 5 of 8 seeded per viewer; trade-off documented by WP12 (1.5, 1.6). |
| 6 | "For whom" name colour contradicts the ROADMAP | **Applied** | Name in `--seat-n-ink`, 3:1 checked for four seats in both themes (WP2, WP8). |
| 7 | `theme.spec` will race once WP7 lands | **Applied** | WP1 rewrites the wait (tag, then pick field) and a "no one-beat text" rule for all specs (1.12, 6.3). The beat floor is rejected: it would skew scaled e2e timing for nothing the robust wait doesn't already give. |
| 8 | Long real names overflow scenes on phones | **Applied** | Acceptance item in WP7, WP8, WP9b, WP10, WP11; lab `names=long` in every matrix. |
| 9 | Phone keyboard vs the fixed chat; `resizes-content` fallback is worse | **Applied** | Default kept; `visualViewport` lift; folded bar hidden and `--dock` 0 while another field has focus; real-phone checks handed to Jean (1.11, WP11, WP12). |
| 10 | Package boundaries freeze what scene WPs must tune | **Applied (mostly)** | Per-scene `show-timing/*.ts`, namespace files and `lab/scenarios/*.ts`, each owned by its scene WP; tests read constants. Not taken: per-scene look registration, since looks are fixed by Jean's decisions and their timing already flows through the scene-owned marks. |
| 11 | A queued show replaces the running one | **Applied** | `reveal.prev` keeps it until its `until`; routing uses it (1.1, 1.2, 1.4). |
| 12 | `layoutId` and the timeline both write `transform` | **Applied** | Wrapper/inner split, explicit 0.9 s `backOut(1.2)` (1.2, WP7). |
| 13 | Draft restore can clobber typing | **Applied** | Restore on mount, or only when different and the field is neither focused nor dirty (1.5, WP9b). |
| 14 | `confirmCard` races the picture upload | **Applied** | Confirm and Random disabled while uploading (1.5, WP9b). |
| 15 | Synchronised final flush makes a write burst | **Applied** | Flush only if dirty, 0–400 ms jitter, randomised CAS backoff in `dispatch` (1.5, WP5). |
| 16 | Chat author ids not reassigned when a guest signs in | **Applied** | `ChatStore.reassign` + `reassign_room_messages`, called from `handOverSeats` (1.7, WP6). |
| 17 | Chat rate limit is per instance | **Applied** | Enforced in the `add_room_message` database function; `allow()` stays as a first line (1.7, WP6). |
| 18 | Chat mounted on closed / RoomProblem | **Applied** | Mounted for lobby, match and result only (1.2, WP4, WP11). |
| 19 | Reduced-motion clamp makes infinite CSS loops flicker | **Applied** | `motion-reduce:animate-none` on every loop, checked in WP2 (1.9). |
| 20 | Ask/Guess can be dropped before `stepStartsAt` | **Applied** | Submit disabled until `stepStartsAt`; `GUESS` guarded too (1.1, 1.11, WP4). |
| 21 | WP1 interim behaviour | **Applied** | Noted in the WP1 report and the risks table. |
| 22 | e2e server reuse | **Applied** | Stop any server on 3100 first (ground rules, 1.12, WP1). |
| 23a | `backToLobby` already clears the reveal | **Applied** | Only `leave()` changes (1.4). |
| 23b | `Screen` padding has three breakpoints | **Applied** | Dock term in each (1.11). |
| 23c | "Round" used for match number and turn round | **Rejected** | No screen shows turn rounds (no "round" string in `turn`/`room`), and the prototype and ROADMAP call the match "Rodada/Round"; one meaning everywhere (1.7). |
| 23d | `firstTurn` line can name a player who left | **Rejected (edge case kept)** | Rare; correcting it needs a scheduled write at `cast.until` (1.7). |
| 23e | Heart shows picks, prototype heart is likes | **Applied** | Heart = likes, shown only when > 0 (1.6, section 4). |
| 24 | Slip "final size" wording vs the code | **Applied** | Code kept (what Jean watched), stated in WP8's report and open question 8.4. |
| 25 | Newcomers at match 2+ never see the rules | **Not changed** | The proposal says "first match of the room"; put to Jean as open question 8.1. |
| — | (found while verifying) AGENTS.md changed after `36fa787` | **Applied** | Ground rules: library protected, inserts only, no `pnpm seed` or `pnpm setup:supabase`, migrations one by one via MCP, no `data/*.json` reads, no AI; chat migration renumbered to 0012. |
