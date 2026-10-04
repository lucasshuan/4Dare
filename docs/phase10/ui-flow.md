# Phase 10 · Current match UI flow and conventions (read-only map)

Repo: `C:/Desenvolvimento/Guessing Game` at `36fa787`. Versions: next 16.3.8, react 19.2.8, motion 13.4.6 (framer-motion 13.4.6 underneath), next-intl 4.14.8, @base-ui/react 1.8.0, tailwindcss 4.3.3.
Paths below are repo-relative. Line numbers are from this commit.

---

## 0. Key findings

1. **The server moves on first, and a reveal holds the old screen on top.** When the vote closes, `view.phase` is already `"picking"` (and `view.pick` is filled). `reveal.kind === "theme"` plus `stepStartsAt = reveal.until` keeps the vote screen up, and `PhaseScreens` maps that to the `"voting"` key. Every stage scene should work the same way: a timed reveal on the server, with beats computed from `now - reveal.startsAt` on the client.
2. **Fixed layers must not live inside the per-phase `motion.div`.** `PhaseScreens` wraps each screen in a `motion.div` with a `y` transform, and a `position: fixed` element inside a transformed parent moves with it. That is why `TurnBackdrop` portals to `<body>`. The stage layer, the new backdrop and the chat must be **siblings inside `<RoomProvider>`** (room-screen.tsx:134-143) or portals.
3. **`RevealOverlay` assumes every non-theme reveal is answers or guess.** It does `r.kind === "answers" ? <AnswersReveal/> : <GuessReveal/>` (reveal-overlay.tsx:101-105). Any new reveal kind would render `GuessReveal` and break. It must allow only `answers` and `guess`.
4. **The engine only delays a step's clock for theme reveals.** `startStep` (engine.ts:132-138) only waits for the reveal when `reveal.kind === "theme"` or the phase is not a turn phase. A stage before the first `asking` (your character, turn order) needs that rule extended. Also `VOTE` and `PICK` never call `guardStep`, so votes or picks during an intro or draw would go through. Add the guard.
5. **`Timer` refills while `now < stepStartsAt`** (it shows the recharge). The proposal wants the clock **hidden** until the cards are dealt, then popping in. `Timer` or `GameHeader` needs a "hidden until start" mode for stage reveals.
6. **The header is part of each screen** (`GameFrame` → `GameHeader`), so an opaque stage at `inset-0` would cover Leave and the clock. In the prototype there is one persistent header above the scenes. Recommendation: hoist a phase-aware `MatchHeader` to RoomScreen level, above the stage. Otherwise the stage must start below the header.
7. **Chat placement constraints:** it must sit outside `<main>`, because `RevealOverlay` focuses `main input/textarea` on a typed key. It must also be outside the phase `motion.div`, layered above the reveal scrim (z-30) and below dialogs and popovers (z-50). Toasts (`bottom-6`, centred, z-50) will collide with the phone chat bar. `RevealOverlay` closes on any keydown, including keys typed in the chat. `ImageDrop` takes over `paste` across the whole window while picking.
8. **Server Actions are dispatched one at a time per client** (Next 16 docs). Draft autosave on the pick card and chat sends must not queue behind each other or behind `confirmPick`. Use route handlers (like `/api/rooms/[code]/gone`) or debounce carefully.
9. **Motion tokens say "Nothing bounces"** (src/lib/motion.ts:2), but the approved proposal uses `back.out` overshoots throughout. The proposal wins for stage scenes. GSAP easings are mapped to motion easings in §7.
10. **motion 13 can drive a scene like a GSAP timeline.** `useAnimate()` with a sequence (`animate([[el, kf, {at}], …])`) returns controls whose `time` (in seconds) can be set. Setting `controls.time = (now - reveal.startsAt)/1000` works like the prototype's `tl.time()` seek, which handles late joiners and reloads in the middle of a scene.

---

## 1. Room page tree today

```
app/[locale]/r/[code]/page.tsx (Server Component; params is a Promise, PageProps<"/[locale]/r/[code]">)
└─ <RoomScreen code>                         features/room/room-screen.tsx (client)
   ├─ early returns: InMatchElsewhere | RoomProblem | MovedElsewhere | RoomLoading(+PasswordDialog)
   └─ <RoomProvider code view offset refresh apply>   features/data/room-context.tsx (no DOM)
      ├─ <PhaseScreens/>      AnimatePresence mode="wait" → motion.div key=phase → screen
      │    lobby    → LobbyScreen   (Screen + HubBrand/HubActions; NOT GameFrame)
      │    theming  → ThemeScreen   (GameFrame hideTheme)
      │    voting   → VoteScreen    (GameFrame hideTheme)
      │    picking  → PickScreen    (GameFrame)
      │    asking/answering/guessing/validating → TurnScreen (key "turn"; GameFrame actions=GiveUp after=History sidebar=History)
      │         └─ TurnBackdrop (portal → body, fixed -z-10)
      │    finished → ResultScreen  (own header + ThemeTag, no GameFrame/Timer)
      │    finished-wait → null     (a winning hit's reveal still on screen)
      │    closed   → RoomProblem not_found
      └─ <RevealOverlay/>     fixed inset-0 z-30, answers/guess reveals only
```

The layout `<body>` has no wrapping DOM between it and RoomScreen (layout.tsx:81-88, `Providers` = QueryClient → next-themes (`data-theme`, `enableSystem=false`) → `MotionConfig reducedMotion="user"` → `ToastProvider`). Siblings of `PhaseScreens` are therefore not inside any transformed parent.

Room-level hooks that run in `PhaseScreens`: `useRoomTab()` (tab title), `useStepSound(view.phase)` (pop on every turn-step change), `usePreloadCards(view)` (`new Image().src` for every card URL), and `useServerClock(offset, 250)`.

### Data and timing plumbing
- `useRoom(code)` (features/data/use-room.ts): React Query `["room", code]`. It polls every 1 s in local mode and every 10 s with Supabase (realtime pings on `room:${code}`, event `"changed"` with `{version}`). It refetches at `deadline + 300 ms` because the server applies timeouts on read. `apply(view)` drops a view older than the current `version`. `offset = view.serverNow − midpoint(request)`.
- `RoomContext`: `{ code, view, offset, refresh, apply, serverTime(), me, playerById }`.
- `useRoomAction().act(fn)` runs a server action and immediately shows the returned `RoomView`. `pending` stays true until the new state is on screen. `useAction` turns `Result` errors into toasts, except `too_early`, which is silent and means a reveal is still showing.

---

## 2. How RoomScreen picks and animates the screen (room-screen.tsx:170-225)

```ts
const now = useServerClock(offset, 250);
const revealing = view.reveal !== null && now < view.reveal.until;
const phase =
  view.phase === "finished" && revealing ? "finished-wait"
  : view.reveal?.kind === "theme" && revealing ? (view.vote ? "voting" : "theming")
  : view.phase;
const key = TURN_STEPS.includes(phase) ? "turn" : phase;
<AnimatePresence mode="wait">
  <motion.div key={key}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.soft } }}
    exit={{ opacity: 0, transition: { duration: dur.base, ease: ease.soft } }}>
```

- **Swaps are sequential.** With `mode="wait"` the old screen fades out over 0.26 s, then the new one rises over 0.48 s. There is a visible gap of about 0.75 s. Wanted handoffs, like the slip becoming the "for whom" screen or the order cards becoming the player strip, cannot cross this boundary as shared elements. They need a persistent layer (see §10).
- **The four turn steps share the `"turn"` key**, so the turn screen is not remounted per step. Inside it, `AnimatePresence mode="wait"` on `${phase}-${turn.n}-${mode}` swaps the step panel (rise 14px, dur.slow), and the focus card swaps with a small `rotateY` (−12° → 0 → 12°).
- **The swap lags by up to 250 ms** because the clock ticks every 250 ms: the derived phase changes on the first tick after `until`. `Timer` ticks every 100 ms. If a stage handoff needs to be exact, schedule a `setTimeout` to `until - serverTime()` instead of waiting for the poll.
- **Everything re-renders 4 times a second.** `useServerClock` sets state at its interval, and the screen elements are created inside `PhaseScreens`, so the whole active screen re-renders at 4 Hz. `VoteScreen` adds its own 50 ms clock, so it renders at 20 Hz. Stage scenes should keep clock reads in small leaf components, or seek a motion sequence, instead of re-rendering big trees.

---

## 3. Server clock, reveals and the Timer

### Engine (src/game/engine.ts)
- `startStep(s, ctx, ms)` (132-138): `waits = reveal?.kind === "theme" || !TURN_PHASES.has(phase)`, then `start = max(now, waits ? reveal.until : 0)`, `stepStartsAt = start`, `deadline = start + ms`, `stepMs = ms`. Turn steps start right away, under answers or guess reveals.
- `guardStep` throws `too_early` while `now < stepStartsAt`. Only ASK, ANSWER, GUESS, PASS and VALIDATE call it. **VOTE, PICK and SET_THEME do not.**
- The flow today, timed by the server:

| Moment | Server state | Client shows |
|---|---|---|
| host clicks Start | `beginVote` (198-212): phase `voting`, reveal null, clock 13 s (`VOTE_SECONDS`, types.ts:124) | VoteScreen, cards dealt on mount, Timer counting at once |
| everyone voted or timeout | `closeVote` (215-228) → `beginMatch` (phase `picking`, shuffled `order`, circular `assignments`: `order[i]` picks for `order[i+1]`) → `revealTheme` (231-239): reveal `theme` for 3 s, +2 s on a tie; pick clock (120 s) starts at `reveal.until` | VoteScreen stays (key "voting"): roulette, spotlight, winner and confetti; Timer refills to 2:00 |
| host typed the theme | `setTheme` → `beginMatch` → `revealTheme(3 s)` | ThemeScreen stays (key "theming"): `Revealed` |
| reveal over | — | PickScreen enters (after the AnimatePresence wait) |
| all confirmed or timeout | `startTurns` (446-450): `playStartedAt = now`, `goToTurn(order.at(-1))`, so `order[0]` plays first; **no reveal**, asking starts at once | TurnScreen |
| pick timeout | (869-885) every empty assignment gets a `fallbackCharacters` entry, `auto: true` | — |

- Timing constants: `REVEAL_TIMING` (types.ts:140-152): answers 6-10 s, guess miss 4 s, hit 5 s, theme 3 s, tie spin 2 s. Also `PICK_SECONDS = 120`, `HOST_THEME_SECONDS = 30`, `RESULT_SECONDS = 15`.

### View (src/game/view.ts)
- `reveal()` (239+) only includes the reveal while `now < until`. Theme reveals carry just `{kind, n, startsAt, until}`.
- `voteView` (207-226) stays present while the theme reveal is on, even though the phase is already `picking`.
- `pick()` (188-204): `targetId`, `confirmed`, `character`, `confirmedIds`, `total`. It does not include the circle. The client has `turnOrder` for every player during the match (view.ts:323), and the picker of the player with `turnOrder = k` is the player with `k-1` (mod n). The "who picks for whom" ring can be computed on the client.
- `pickedById` (328-331) is **null for your own card until `finished`**, and the turn card says "picked secretly". The "Rafa picked yours" scene contradicts this. Either expose it in the view, or derive it from `turnOrder`. That is a product decision, because today the picker is formally a secret.

### Client sync
- `useServerClock(offset, everyMs)` (lib/hooks/use-server-clock.ts) returns `Date.now() + offset`, re-rendering every `everyMs`.
- **`RevealOverlay`** (reveal-overlay.tsx:30-115):
  - It uses a 100 ms clock and `active = r && now < r.until && closed !== \`${kind}-${n}\``.
  - It closes on its button, a click on the backdrop (`e.target === e.currentTarget`) or any non-modifier key. A typed letter then focuses `FIELD = "main textarea…, main input…"`.
  - Entrance: the scrim fades in and blurs to 6px (dur.slow), and the card goes `y:40, scale:.94 → 0/1` (0.6 s, ease.soft). Exit: `y:-24, scale:.98` (dur.base).
  - `Progress` is a `scaleX((until-now)/(until-startsAt))` bar with a 100 ms linear CSS transition.
  - Content timing is **local and not seeked**. `AnswersReveal` staggers words 0.03 s from 0.25 s and answers 0.5 s from 0.75 s. `GuessReveal` uses `setTimeout(800)` before the flip and confetti. Someone who joins mid-reveal sees it play from the start.
- **VoteScreen** (vote-screen.tsx:75-87) is the model to copy:
  - `elapsed = now - reveal.startsAt` is mapped to a stage: `voting` → `spinning` (`< themeTieSpin`) → `spotlight` (+700 ms) → `winner`.
  - `rouletteAt(v, elapsed, spinMs)` is a pure function, so every screen lands on the same frame.
  - A `celebrated` ref stops confetti from firing twice.
  - Reduced motion skips the spin and the spotlight.
- **Timer** (components/ui/timer.tsx), fed by `GameHeader` (game-header.tsx:41-48) with `deadline`, `stepStartsAt`, `rechargeFrom = view.reveal?.startsAt`, `offset`, `totalMs = view.stepMs` and `tick`:
  - It renders nothing when `deadline` or `stepStartsAt` is null.
  - While `now < stepStartsAt` it is **recharging**: the bar fills from `rechargeFrom` to `stepStartsAt` with a sky border, and the digits count up to the full step.
  - After that it counts down. `isLowClock` (last 20 s, or the last third of a short step) turns it `no`-red, and with `tick` the `"tick"` sound loops.
  - When the deadline moves earlier within the same step (answers cut it), a "−18 s" chip drops for 1.8 s.
  - `LobbyCountdown` on the podium is its own small bar (250 ms clock).
- **`useTabTitle`** shows no clock while `now < stepStartsAt`, so stage reveals stay clock-free in the title for free.

---

## 4. Screens, one by one

### GameHeader / GameFrame (features/room/game-header.tsx)
- Header row, left: `ThemeTag` (butter pill, set emoji or ✍️ for a typed theme; the label is `sr-only` on phones), hidden by `hideTheme`. Right: `LeaveMatchButton`, then `actions` (GiveUp), then `Timer`, then `after` (History).
- `GameFrame` layout: `flex min-h-dvh flex-col gap-6 px-4 pt-4 pb-8 sm:px-8 sm:pt-6`, with short-window variants. Below the header: `<div flex><main flex-1/>{sidebar}</div>`, so **today the sidebar is on the right, below the header**.
- Phase 10 needs: a History button **left of the theme tag**, and a sidebar that is **full height on the left and pushes the screen** (scrim on phones). GameFrame has to be restructured to `[aside | (header + main)]`.

### LeaveMatchButton (leave-match-button.tsx)
- Base UI `Popover` with a secondary sm button (h-10, icon only on phones). The popup is z-50, scales 95% in and out, and asks "sure?" with a danger and a ghost button. It is hidden when `me.away`. After `useLeaveMatch().leave(code)` it does `router.push(GAME_PATHS[game])`. It must stay reachable while a stage scene is playing.

### PasswordDialog (brief)
- Base UI `Dialog` with a backdrop (z-40 scrim) and a popup (z-50, scale 95). A wrong password shakes the form with `x: [0,-8,8,-5,5,0]` over 0.35 s, keyed by the try count. This is the shake to copy for small "nope" feedback.

### VoteScreen (features/vote/vote-screen.tsx)
- `GameFrame hideTheme`. The column is `max-w-[1040px]`, vertically centred with `sm:min-h-[calc(100dvh-8rem)]`.
- `Heading` swaps title and subtitle by stage with blur-in (`y:14, blur 4px → 0`, dur.slow) under a constant kicker pill. The `h1` has `id="vote-title"` and labels the group: e2e finds it with `getByRole("group", {name: /vote for the theme/i})`.
- `OptionCard`:
  - Colours: `TONES` (butter / sky-soft / apricot-soft, with bars).
  - The deal: `initial {y:64, rotate: TILT[i] (-7/0/7), scale:.9}` → spring `{stiffness 320, damping 32}`, delayed `i*0.09`; reduced motion uses opacity only.
  - Hover lifts it (`y:-8`, rotate `(i-1)*0.8`) and tap presses it (`scale .97`).
  - Your vote lifts it `y:-6` with a ring `0 0 0 3px canvas, 0 0 0 6px ink`.
  - During the spin: a radial glow sweep, the others dim (`opacity .35, scale .95, saturate .4`), and the lit card grows to 1.04.
  - The winner card stays and grows (`layout`, text `clamp(40px,5.6vw,72px)`) and gets a crown badge.
  - Voter avatars use `layoutId voter-${id}` and pop in with the spring. The share bar is a spring `scaleX`.
- `Footer` shows a dot per seat, "x of y voted" and the waiting names via `useWithNames`.
- Confetti fires once at `winner`.
- Phase 10 additions: the line "Now, choose a theme together" alone for about 0.8 s, which then rises and shrinks into this heading; then the deal; then the clock appears. The theme then "grows in the middle" followed by the rule scene. The roulette and spotlight can stay as they are.

### ThemeScreen (features/theme/theme-screen.tsx), the host typing a theme
- A butter form card with `layout`, entering `y:48, rotate:-2, scale:.94`. Inside, `AnimatePresence mode="popLayout"` switches between typing, waiting (`HostAtWork`: ripple rings and a typing-dots bubble) and reveal.
- `Revealed` (375-401): a ✍️ pops in (spring), and the theme text blurs in (`y:24, blur 6px`, dur.reveal, delay .15). This is reusable for "theme grows in the middle".
- Ideas are pill buttons, staggered, with a "More ideas" shuffle.
- A typed theme gets "only the sentence" of the rule scene.

### PickScreen (features/pick/*), to be rebuilt
- Today it is a two-column layout. The left column has a big butter theme card, "Pick for <Name>" via `withNames`, and progress avatars. The right column switches with `Mode = "search" | "chosen" | "create" | "image"`, using `AnimatePresence mode="wait"` and `riseIn`.
- Search: an instant in-browser search over `useCharacterIndex(lang)` (the library plus extras, prefetched in the lobby by `usePrefetchCharacterIndex`), with `useDeferredValue`. A remote `/api/characters` query is the fallback until the index loads. Results are rows with `Portrait thumbUrl(…,96)`.
- Random: `randomPick(code, exclude?)` flips the card in (`rotateY -80 → 0`, dur.reveal) and shows `DrawFeedback` (a 👍 / 👎 / ✕ bubble, spring 420/34; 👎 rerolls, and `rateRandomPick` is fire-and-forget). If there is no history, `not_enough_picks` shows a note. Random is hidden for typed themes.
- Create: the name, origin and `ImageDrop ref` (`exportCrop()` at submit) → `createCharacter(form)` → chosen.
- Changing a picture: `ImageDrop onDone` → `replaceCharacterImage`.
- Confirm: `confirmPick(code, id)`. When confirmed, a `CharacterCard` with `layoutId="pick-card"` (pick-screen.tsx:236/260).
- Phase 10 rebuild: one centred card that **is** the form (name field with autocomplete, live preview from the first result, the picture changed inline, a "New!" seal when the name is unknown), a hand of suggestions below it, and big Random and Confirm side by side. On timeout the server uses the **draft**, so drafts have to be saved on the server while the player edits. Confirming grows the card to 1.08, straight, from its top.
- The e2e flow in `e2e/helpers.ts:72-83` (`pickAll`: fill, `create “hero`, `save and pick`, `confirm pick`) and `e2e/picture.spec.ts` click buttons that will disappear. They need rewriting.

### TurnScreen and friends (features/turn/*)
- `TurnScreen` uses `GameFrame` with `actions=<GiveUpButton/>`, `after=<HistoryButton/>` and `sidebar` (the wide-window `HistorySidebar` in `AnimatePresence`). Inside: `<TurnBackdrop seat>`, `<PlayerStrip>`, the focus card (`CharacterCard`, or the phone `FocusRow`), and `Step`.
- `TurnBackdrop` (turn-backdrop.tsx):
  - It portals to `body`, fixed at `-z-10`. A crossfade keyed by seat lasts 1.4 s.
  - `Wash` = a 7% even tint, 3 blurred radial blobs wandering on 22-32 s loops, and 7 "?" marks bobbing (`y [0,-16,0]`, `rotate [-8,8,-8]`) at `MARKS` positions. Those positions are nearly identical to the prototype's `SPOTS`.
  - Reduced motion makes it static.
  - **This is the base to generalise into the per-step backdrop.**
- `PlayerStrip`:
  - Sorted by `turnOrder`, a 2-column grid on phones and a flex row on `sm+`, `motion.li layout`.
  - A seat-colour ring `0 0 0 2px seatColor(seat)` marks the current turn.
  - Each row: avatar, name and status (the status line re-keys to pop), and a card thumbnail ("?" for your own).
  - Visible cards open a Base UI hover popover with a big portrait framed in the seat colour.
  - This is the target the "order" scene shrinks into.
- `HistoryButton`, `HistorySidebar`, `HistoryDrawer` and `HistoryBody` (history-panel.tsx):
  - `WIDE = (min-width:1024px)`.
  - Sidebar open state is kept in localStorage `ludodare:history-sidebar`.
  - The sidebar animates `width 0 → auto` (dur.slow), sticky, `h-[calc(100dvh-7.5rem)]`, `w-[clamp(320px,26vw,420px)]`.
  - Narrow windows use a bottom drawer: fixed z-40, scrim button, `y:100% → 0`, `h-85dvh`.
  - Body: player filter tabs (`PlayerName` and counts), kind filter, caption, entries.
  - Icons today are `PanelRightOpen` and `PanelRightClose`; they become the left-panel icons.
- `GiveUpButton`: danger popover, hidden once you are out.

### ResultScreen (brief)
- It has its own header (ThemeTag only). The podium plinths rise in order (`height 0 → px`, 0.7 s), cards land with `rotateX 25 → 0`, and at 1.2 s comes `fireConfetti("big") + playSound("complete")`. `LobbyCountdown` runs on the server clock.
- It is a "match" screen, so the chat tab belongs here too.

### LobbyScreen
- It uses `Screen` (wordmark, `HubActions`: language, theme toggle, user menu). Bottom padding is `pb-8 sm:pb-12`. The Start and Ready actions use `keyClass`.
- It stays as it is and only gains the chat. Check that the chat tab (bottom right) and the phone bar don't cover the bottom of the lobby's content. The page needs bottom padding equal to the folded chat height.

---

## 5. UI kit inventory (src/components/ui)

| Piece | API / notes | Stage use |
|---|---|---|
| `Screen`, `Wordmark`, `ThemeTag`, `UNDER_TOPBAR` | page shell; ThemeTag `{label, theme, emoji}` | theme tag in the header; fly the chosen theme into it |
| `Timer` | see §3; `compact`, `tick`, `totalMs`, `rechargeFrom` | needs a "hidden until start" mode and a pop-in (`scale .6 → 1`) |
| `Avatar` | `{avatar, isGuest, name, size: 20/28/32/36/40/44/48/64, ring: sky/apricot}`; critter on pastel / image / initial | the stage needs 52/68/120/150: override with `className="size-[…] text-[…]"` (as PlayerName does) or extend `SIZE` |
| `PlayerName`, `useWithNames()` | name with an em-sized avatar; `withNames(n => t(key, {name: n(p, isYou)}))` | **every name**, including "You pick for {name}", "{name} starts!" and chat authors and system lines |
| `CharacterCard` | `{card, hidden, label, title, meta, tone, found, layoutId}`, `layoutSpring` | the "your character received" card, cards on the order table |
| `Portrait` | 4:5, silhouette while loading, fades in, tone neutral/you/other | the pick card picture, hand of suggestions, slip |
| `Logo` (logo.tsx) | `FOUR` and `QUESTION` paths and the `Mark` group are **not exported**; the brand blue bubble has a butter "?" (`BRAND`); `use-tab-title.ts` has another copy of `FOUR` | the draw jar needs the inverse (butter bubble, blue "?", like the prototype's `K.mark("#F6E3A1","#2B69C8")`): export `FOUR`, `QUESTION` and a `LogoMark({bubble, mark})` |
| `AnswerChip`, `ResultChip` | six answers, `small`, `pressed`, `wrap` | cold open answers ("Am I from Marvel?") |
| `fireConfetti(size)` | canvas-confetti, palette from CSS tokens, `zIndex 60`, `disableForReducedMotion` | theme chosen, "starts!" |
| `buttonClass`, `Button` | primary/secondary/ghost/danger × sm/md/lg | — |
| `keyClass(color, {pressed, bounce})` | key with a lip `shadow-[0_6px_0_var(--key-lip)]`, hover lift, press sink, `animate-boing` (4 s squash, motion-reduce off); colours sky/yes/apricot | big **Random** and **Confirm** on the pick card (add butter or other colours if the design needs them) |
| `ImageDrop` | `onDone` (button mode) or `onChange` (live) and `ref.exportCrop()`; owns window `paste`; 640×800 WebP; react-easy-crop | the inline picture on the pick card. Its UI is block-sized (220/320 px), so export `cropToWebp`, `fromTransfer`, `download` and `accept`, or add an inline variant |
| `Loader` / `PageLoader` | three "?" cards shuffling in a hand (`SLOTS`, wrap-around keyframes) | the motion pattern for the "cards shuffle into order" scene |
| `ToastProvider`, `useToast` | fixed `bottom-6` centred z-50 `riseIn` | must sit above the phone chat bar |
| `critterUri`, `TextField`, `TextArea`, `ChoiceGroup`, `HintLabel`, `RoomQr` | — | TextField: chat input styling reference |

Other reusable pieces outside `ui/`:
- `WhoAmIBanner` (features/who-am-i/who-am-i-banner.tsx): a table of critters with cards held up, answers popping per seat, a "?" card flip and a burst. It is the visual seed for the **cold open**, but it is driven by local `setTimeout` steps and fake critters. The stage version must be driven by the server clock and use the real players.
- `ThemeScreen.Revealed` and `HostAtWork`, `VoteScreen.OptionCard` and `TONES` and `TILT`, `DrawFeedback`, `useCharacterIndex`, `searchItems`, `thumbUrl`, `PlayerStrip`, `TurnBackdrop.Wash`.
- `seatColor(seat)` (lib/seats.ts) gives `var(--seat-N)` (4 colours, in join order).
- `themeSetEmoji(set)` gives **one** emoji per set (game/theme-sets.ts). The prototype's backdrop uses ~7 symbols per set (🦸 ⚡ 🛡️ …), so a symbol list per set will need to be added.

---

## 6. Tokens: what the prototype uses that globals.css lacks

`src/app/globals.css` has light values on `:root` and dark ones on `[data-theme="dark"]` (next-themes). The **system theme is not followed** (`enableSystem={false}`), unlike the prototype's `prefers-color-scheme` block. There are custom variants `dark`, `short` (`max-height:820px`) and `tiny` (`max-height:700px`). It has `--seat-1..4` and `--on-*` for ink/sky/apricot/butter/yes/no/avatar, plus `--sky-deep`, `--yes-deep` and `--apricot-deep`.

Missing, from the prototype's flow.css:
- `--on-seat-1..4`. Light: `#fff, #2a1707, #fff, #fff`. Dark: `#0f1b30, #2a1707, #06211f, #1d0f2e`.
- `--brand-stage` (light `#2b69c8`, dark `#1d4a93`), `--brand-butter #f6e3a1` and `--on-brand #fff`.
- `--wash-mix` (light 20%, dark 26%).

Map them in `@theme inline` as `--color-*` if they are used as Tailwind classes.

The prototype's wash is a step colour mixed into the canvas at `--wash-mix`, plus two radial blobs drifting over 22 s, with a `.solid` variant (brand blue, for the cold open and draw). The 7 bobbing glyphs sit at 16% opacity, 22% for emoji. That is close to `TurnBackdrop`'s 7% tint plus blobs, but **stronger**. Reuse the `Wash` structure and change the mix.

---

## 7. Motion conventions

- **Tokens** (src/lib/motion.ts, mirrored as CSS vars in globals.css):
  - `dur` = fast .14 / base .26 / slow .48 / reveal .7 s.
  - `ease.soft` = `[0.22,1,0.36,1]` (`ease-soft` in CSS), `ease.swap` = `[0.65,0,0.35,1]`.
  - `riseIn` (y 12 → 0, base, exit fade fast), `stagger` (40 ms), `layoutSpring` (`{duration: .48, ease soft}`), used by `CharacterCard` layoutId moves.
- **Springs in use:**
  - vote: 320 / 32
  - theme: 320 / 30
  - draw-feedback: 420 / 34
  - who-am-i pop: 420 / 26
  - timer cut chip: 520 / 26
- **Recurring patterns:**
  - Headings swap with blur-in via `AnimatePresence mode="wait" initial={false}`.
  - Lists swap with `mode="popLayout"`.
  - Cards are dealt tilted.
  - `layout` / `layoutId` for cards and voter avatars.
  - Loops use `repeat: Infinity` with keyframe arrays: dots pulsing, rings rippling.
- **Reduced motion, in three layers:**
  1. `MotionConfig reducedMotion="user"` (providers.tsx): motion skips transforms and keeps opacity.
  2. A global CSS rule under `prefers-reduced-motion` forces animation and transition durations to 1 ms.
  3. Components check `useReducedMotion()` and drop loops and showpieces: VoteScreen `still` (no spin or spotlight, opacity-only deal), `HostAtWork`, `Loader`, `TurnBackdrop`, `WhoAmIBanner` (still frame). `keyClass` uses `motion-reduce:animate-none`, and confetti uses `disableForReducedMotion`.
  - Stage scenes need an explicit **still** version per scene. The prototype's player jumps to the pick scene and shows end states. Give each beat a final frame, show them as cuts, and keep the server timing so that everyone stays in sync.
- **"Nothing bounces"** (motion.ts:2) is already broken by `keyClass` boing and springy pops. The proposal leans on overshoot, so for stage scenes follow the proposal.
- **GSAP → motion easing map:**

  | GSAP | motion |
  |---|---|
  | `power3.out` | `ease.soft` (close), or `[0.215,0.61,0.355,1]` |
  | `power3.inOut` | `[0.645,0.045,0.355,1]` |
  | `power2.in` | `"easeIn"` / `[0.55,0.085,0.68,0.53]` |
  | `back.out(1.3–2.6)` | `"backOut"`, `[0.34,1.56,0.64,1]`, or a spring (stiffness 300-500, damping 14-22) |
  | `sine.inOut` | `"easeInOut"` |

  `keyframes` with an inner `ease` map to keyframe arrays plus `times` and `ease` per segment. `stagger` maps to `delay: stagger(…)` or variants.
- **Timeline equivalent:**
  - `const [scope, animate] = useAnimate()`, then `const controls = animate([ [el, {…}, {at: 0.2, duration: .6}], … ])`.
  - Seek with `controls.time = elapsedSeconds` and `controls.play()` / `pause()`.
  - Rebuild if the layout changes (resize, rotation). The prototype measures rects with `ctx.rect`, so measure with refs and `getBoundingClientRect()` at build time.

---

## 8. Sounds (src/lib/sound.ts)

- `SOUNDS` has 3 entries: `tick` (looped by Timer while the clock is low), `complete` (podium) and `step` (any turn-step change, room-screen.tsx:150-157).
- `playSound(name)` restarts the clip and fails silently before the first user gesture. `useLoopSound(name, on)` loops it.
- Files live in `public/sounds/*.mp3`. To add more (jar shake, slip pop, card deal, chat message), add an entry and a file. Respect the autoplay block: the first match start follows a click (Start or Ready), so sounds will usually be allowed.

## 9. Tab title (src/lib/hooks/use-tab-title.ts + room-screen.tsx:323-366)

- The title is `"<clock> · <phase label | alert> · 4Dare"`.
- `TAB_PHASE` maps phases to `meta.tab.*`. `TAB_ALERT` maps statuses (`theming`, `voting`, `picking`, `asking`, `answering`, `guessing`, `validating`) to `meta.tab.alert.*` when the move is the viewer's.
- Away tabs (hidden or blurred) swap every favicon for an inline SVG of the 4 bubble with "!" (apricot, or red when the clock is low). It ticks every 250 ms.
- There is no clock while `now < stepStartsAt`, so stage reveals are already safe.
- A new chat could add an unread count, e.g. `"(2) …"`. Keep `e2e/tab.spec.ts` patterns in mind: `^\d:\d\d · Vote for a theme! · 4Dare$` and `^Lobby · .+'s room · 4Dare$`.

---

## 10. Where the stage layer should mount

**Recommended: a persistent stage layer as a sibling inside `RoomProvider`** (room-screen.tsx:134-143):

```tsx
<RoomProvider …>
  <MatchBackdrop />   {/* NEW. Portal → body, fixed -z-10. Generalises TurnBackdrop (moved out of TurnScreen):
                         colour per step (brand/butter/theme-red/seat of target while picking/seat of turn),
                         glyphs from the theme's set. One instance, so washes crossfade across phase swaps. */}
  <MatchHeader />     {/* OPTIONAL but recommended. GameHeader hoisted out of GameFrame so it persists above the stage
                         (Leave stays usable, Timer can pop in at stepStartsAt, History button appears only in turns).
                         Everything it needs is derivable from view.phase/reveal (+ history sidebar state lifted here). */}
  <PhaseScreens />    {/* unchanged switch, but the derived phase picks the screen that sits UNDER the stage:
                         intro/line → VoteScreen; theme+rule → VoteScreen/ThemeScreen (as today);
                         draw/for-whom → PickScreen (already "picking": index + suggestions load, inert);
                         yours/order → TurnScreen (already "asking": PlayerStrip is the order scene's target, inert). */}
  <MatchStage />      {/* NEW. fixed inset-0 z-20 (or top = header height if MatchHeader is not hoisted).
                         Renders only while a stage reveal is active; beats from (serverTime − reveal.startsAt);
                         opaque scene paper over the screen beneath, then dissolves to hand over
                         (slip → for-whom face/name; order cards → measured PlayerStrip rows). */}
  <RevealOverlay />   {/* z-30. Whitelist kind "answers" | "guess". */}
  <ChatDock />        {/* see §11 */}
</RoomProvider>
```

Why this shape:
- It sits outside the transformed `motion.div` (findings 2), so fixed layers behave.
- It persists across the `AnimatePresence mode="wait"` gap, so the handoffs the proposal demands become possible: the slip *is* the for-whom screen, the cards shrink into the strip, and the theme flies to the tag.
- It matches the prototype, where scenes are layers over one persistent shell (`.s-main`, `.s-head` z-5 above scenes, washes behind).
- Keep the stage's interactive parts minimal. Block clicks on the screen beneath with `inert` or `aria-hidden` on `<main>` while a scene plays. Don't autofocus fields beneath: `Ask` and `Guess` use `autoFocus`, and `ThemeScreen` focuses its input.

Contract the server and data side must provide (for whoever builds it):
- **Reveal kinds or a composite stage reveal.** Proposal timings: first match intro 7 s + line 1 s, vote 20 s, theme + rule 6 s, draw 4.5 s, target 2.5 s, pick ≤120 s, yours 4.3 s, order 4 s. Later rounds: intro card 1.5 s, theme 3 s, draw 3 s, target 3 s, yours 3 s, order 3 s. Keep the beat lengths in a shared constant (like `REVEAL_TIMING`) used by both the engine (`until`) and the client (beat boundaries).
- **`startStep` must wait for these reveals too**, including before the first `asking`. `VOTE` and `PICK` need `guardStep`.
- **`RevealView` gains the new kinds.** `RevealOverlay` and `PhaseScreens` (`finished-wait`, the theme mapping) must handle them explicitly.
- The cold open needs "first match of the room": `view.round` is already in the view (round 1 is the first match, since `beginMatch` increments it).
- The "Rafa picked yours" scene needs `pickedById` for self, or a derivation from `turnOrder` (see §3).
- Pick drafts are saved on the server, and the timeout uses the draft. This replaces today's `fallbackCharacters` fill for non-empty cards.

Alternative, not recommended: add the scenes as new keys in `PhaseScreens`. It is simpler, but it pays the exit and enter gap at every boundary, remounts state, and makes the shared-element handoffs impossible.

---

## 11. Where the chat tab should mount

- **Mount:** `<ChatDock />` as a sibling inside `<RoomProvider>` in `RoomScreen`. That covers every phase (lobby, theming, voting, picking, turns, finished) and survives phase swaps, so open/folded state and unread counts persist. Hide it for `phase === "closed"`. It is not shown in the early-return states (loading, password, problem, moved), because there is no membership there.
- **Not inside `<main>`.** `RevealOverlay`'s `FIELD` selector would steal the chat input as the "step field" otherwise.
- **Not inside the phase `motion.div`.** It is `position: fixed`.
- **Layering:** z-40 (above `RevealOverlay` z-30 so chat is readable during reveals; equal to the history drawer and dialog backdrops; below popovers, dialogs and toasts at z-50). In the prototype the history panel (z-13) sits above the chat (z-12).
- **Interactions to fix around it:**
  - `RevealOverlay`'s window keydown closes the reveal on any key. Ignore keys whose target is inside the chat or any editable element.
  - `ImageDrop` listens to window `paste`. An image pasted into the chat field would go to the pick card picture. Ignore paste targets inside the chat.
  - Toasts sit at `bottom-6`. Lift them above the folded tab and the phone bar, e.g. a `--chat-dock` CSS variable that ChatDock sets on `:root` and that Toast and the screens' bottom padding read. The prototype uses `--dock` and `--peek` the same way.
  - The phone `HistoryDrawer` also rises from the bottom (z-40). On phones the history becomes a left panel over a scrim anyway.
- **Geometry from the proposal and the prototype:**
  - Desktop: right inset 16px, 340px wide; folded head 56px; open to 62% of the window height.
  - Phone: full-width bar (prototype inset 8px each side), 60px; opens to 66%.
  - The head click toggles. Unread: the head turns `sky` / `on-sky` with a count and the senders' faces, a 3 s bubble pops above the tab, and a nudge loops (CSS `s-nudge` 3.6 s starting at 1.2 s) until opened.
- **Data:**
  - Supabase: piggyback the existing room channel `room:${code}` with a new broadcast event, because `subscribeRoom` only listens to `"changed"`.
  - Local mode has no push, so poll. `useRoom` polls every 1 s, and chat can fetch with it or alongside it.
  - Send through a **route handler**, not a server action, so that chat never queues behind pick or draft actions (findings 8).
  - Rate limit with `src/server/rate-limit.ts`.
  - System lines ("Match started", "Theme: X") are typed message rows.
  - Author names use `PlayerName`.

---

## 12. Things that will break or need updating

- `e2e/helpers.ts`:
  - `voteAll` uses the group name "vote for the theme" (from `#vote-title`) and the heading "the theme is…".
  - `pickAll` and `e2e/picture.spec.ts` use the create, "save and pick" and "confirm pick" buttons.
  - The turn helpers wait for "send question", which now arrives after the stage.
  - The stage adds about 30 s to the first match (≈14 s later), within Playwright's 120 s test timeout but it adds up across `playToEnd`.
- `src/game/engine.test.ts`: `VOTE_SECONDS` (234, 350), theme reveal `until` (251-265, 338-340). `src/game/simulation.test.ts`: 84-126 (stepStartsAt ≥ reveal.until, theme + tie spin).
- `VOTE_SECONDS = 13 → 20` (types.ts:124). PRODUCT.md line 14 lists step times but **does not mention the vote length yet**, so add "the theme vote lasts 20 s".
- `history-panel.tsx`: `PanelRight*` icons and the right-side sidebar, `after` slot usage in TurnScreen.
- `TurnBackdrop` mounts inside TurnScreen today. Moving it to a room-level `MatchBackdrop` means TurnScreen stops rendering it.

---

## 13. Next.js 16 conventions implementers must heed (from node_modules/next/dist/docs)

1. **Version 16.3.8, App Router, React 19.2 canary built in.** Turbopack is the default for `dev` and `build`; a custom `webpack` config fails the build unless you pass `--webpack`.
2. **`middleware` is now `proxy`.** The file is `src/proxy.ts`, which exports `proxy` and the `config.matcher`. It always runs on the Node.js runtime; `runtime` cannot be set and edge is not supported. The matcher here excludes `api|auth|_next|_vercel|files with dots`, so new `/api/...` chat or draft routes get no locale or session refresh from the proxy. Server Functions are POSTs to the page route, so they *do* pass through the proxy. Always authorise inside each action or route.
3. **Request APIs are async.** `params`, `searchParams`, `cookies()`, `headers()` and `draftMode()` return Promises, and so do image-generator props and the `sitemap` id. Use the global typegen helpers: `PageProps<"/[locale]/r/[code]">`, `LayoutProps<"/[locale]">` and `RouteContext<"/api/rooms/[code]/gone">` (see `app/api/rooms/[code]/gone/route.ts`). `pnpm typecheck` runs `next typegen && tsc --noEmit`, so new routes need typegen before tsc.
4. **Server Actions are dispatched sequentially per client** (guides/server-actions.md, "Sequential dispatch"). `Promise.all` over actions does not run them in parallel. Chat sends, draft autosaves, `rateRandomPick` and `confirmPick` would queue. Use Route Handlers for high-frequency, non-UI-blocking calls. Action bodies are capped at 1 MB by default; this repo raises it to `4mb` in next.config.ts for cropped images.
5. **Actions are public POST endpoints.** Validate (the repo uses zod), authenticate, rate-limit and shape the return values. Action IDs rotate between deploys ("Failed to find Server Action"), so surface a retry.
6. **Caching APIs changed.**
   - `revalidateTag(tag, profile)` now needs a second argument.
   - New `updateTag` (read-your-writes, actions only) and `refresh()` (refetch the current route from an action).
   - `cacheLife` and `cacheTag` are stable without the `unstable_` prefix.
   - `'use cache'` works only with `cacheComponents: true`, which this repo does **not** enable. Don't add `'use cache'` or rely on Activity-preserved routes ("Preserving UI state" assumes cacheComponents).
   - Route Handlers are not cached by default; GET can opt in.
   - Room data goes through `/api/rooms/[code]` with `cache: "no-store"` plus React Query, so none of this changes the room flow.
7. **`after()` from `next/server`** keeps background work alive past the response on Vercel. The repo wraps it in `server/background.ts`; use it for realtime pings or chat fan-out.
8. **Client and server boundary as usual.** `"use client"` at the top of interactive modules, and everything a client module imports joins the client bundle. Every feature screen here is already a client component; the server pages only parse params and set metadata.
9. **React 19.2 additions are available** (`<ViewTransition>`, `<Activity>`, `useEffectEvent`). `ViewTransition` triggers only inside transitions or navigation, not on plain `setState`, and the room screens update through React Query state. Stay with `motion/react` for the stage, as the user decided.
10. **Repo-local caveats:**
    - `NEXT_DIST_DIR` (the e2e server uses `.next-e2e`) makes `next dev` rewrite `tsconfig.json`. Restore it after test servers.
    - The `AGENTS.md` header block is regenerated by `next dev`.
    - Lint is Biome (`pnpm lint`) with the `next` and `react` domains.
    - Tests: `pnpm test` (vitest) and `pnpm test:e2e` (Playwright, local backend on :3100, Edge).
