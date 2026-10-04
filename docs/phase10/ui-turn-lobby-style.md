# Phase 10 map: turn screen, lobby, styles, i18n, tests

Read-only survey of the repo at `C:/Desenvolvimento/Guessing Game` (HEAD `36fa787`, tree clean), compared with the prototype in `docs/phase10/prototype/`. Paths are repo-relative unless noted.

---

## 0. Most important findings

1. **Mount point.** `RoomScreen` renders `<PhaseScreens/>` (one `motion.div` keyed by phase, `AnimatePresence mode="wait"`, rise of 16px) and `<RevealOverlay/>` inside `RoomProvider` (`src/features/room/room-screen.tsx:134-143`, `:170-225`). The chat, a step backdrop that crossfades between phases, and any intro layer must mount **next to `RevealOverlay`, outside the keyed `motion.div`**:
   - the keyed div remounts its children on every phase change;
   - it carries a `y` transform while it animates, and a transformed ancestor moves `position: fixed` children with it. `TurnBackdrop` already portals to `<body>` for this reason (`turn-backdrop.tsx:64`).
2. **History today is on the right, and it is wired through `GameFrame` slots.** The button is in `after` (right of the clock) and the sidebar in `sidebar` (after `<main>`). To put it full-height on the left, `GameFrame`/`GameHeader` need a left slot and a new layout: the left bar sits beside a column that holds both the header and `<main>`. See §2.
3. **The lobby can take the chat tab without any visual change.** One thing is missing: bottom space. On phones the 60px bar covers the last ~28px of the lobby (and of every match screen) at the end of the scroll. The fix is a `--dock` CSS variable (the prototype already uses `--dock`) added to the bottom padding of `Screen` and `GameFrame`, plus the bottom offset of the toasts.
4. **Keyboard and focus collisions with the chat:**
   - `RevealOverlay` closes on *any* key pressed on `window` (`reveal-overlay.tsx:39-53`).
   - The `Ask` and `Guess` fields have `autoFocus` (`turn-screen.tsx:351`, `:508`), so a new step steals focus from the chat box.
   - Both need a "this event or focus is inside the chat" guard.
5. **e2e will break in three ways:**
   - **(a) Default 5 s expect timeouts before the vote.** With the cold open (about 7 s) plus the line (about 1 s) before the cards are dealt, these fail: `helpers.ts:62`, `theme.spec.ts:66`, `tab.spec.ts:45`.
   - **(b) Pick selectors that the new card removes:** `create “…`, `save and pick`, `confirm pick`, `choose a picture`, `Zoom`. They are in `helpers.ts:79-81` and `picture.spec.ts:26-37`.
   - **(c) `getByRole("textbox").first()` and text matchers**, which could hit the chat composer or chat system lines. See §6.
   - There is **no way to speed up timers** today. All timings are constants in `src/game/types.ts`. The only seam is `ctx()` at `src/server/rooms.ts:40`.
6. **Engine unit tests pin the vote and theme timings:**
   - `engine.test.ts:234,350` check vote deadline = now + VOTE_SECONDS.
   - `:251,265,338` check theme reveal `until`.
   - `:254,340` check `stepStartsAt === reveal.until`.
   - Any lead-in or longer reveal will make these fail (expected, since the timings change).
7. **Docs drift:**
   - `ARCHITECTURE.md:21` still says the vote is "8 s" (the code has 13).
   - `PRODUCT.md` has **no** vote time at all; its only times line is `PRODUCT.md:14`, the per-step times.
   - Phase 10 should set 20 s in `src/game/types.ts:124`, ARCHITECTURE and PRODUCT (add a sentence).
8. **i18n has no type checking of keys and no parity test.** There is no `AppConfig`/`global.d.ts`, and no test reads `messages/`. A missing key only shows at runtime. A new namespace (for example `chat`) must be added to `NAMESPACES` in `src/i18n/request.ts:6-16` and created for all 3 languages. `messages/*/game.json` is an empty, unused namespace that is already loaded.

---

## 1. Room page tree (where Phase 10 pieces mount)

```
[locale]/layout.tsx  <html data-theme via next-themes> <body> NextIntlClientProvider > Providers
  Providers (src/components/providers.tsx): QueryClient > ThemeProvider(attribute=data-theme, default light, enableSystem=false)
                                            > MotionConfig reducedMotion="user" > ToastProvider (toasts fixed bottom-6 z-50)
    RoomScreen (room-screen.tsx:41)
      RoomProvider(code, view, offset, refresh, apply)        -> useRoomContext(): view, me, code, offset, serverTime(), playerById()
        PhaseScreens (:170)  AnimatePresence mode="wait" > motion.div key = phase | "turn"  (initial y16/opacity0, dur.slow; exit fade dur.base)
            LobbyScreen | ThemeScreen | VoteScreen | PickScreen | TurnScreen | ResultScreen | RoomProblem
        RevealOverlay (:142)  fixed inset-0 z-30 scrim + blur, answers/guess reveals (theme reveal is played by the vote/theme screens)
```

- Phase mapping (`:177-205`):
  - a theme reveal keeps `voting`/`theming` on screen while `now < reveal.until`, even though the server is already in `picking`;
  - a final reveal shows `finished-wait` (null) before the podium.
- Hooks in `PhaseScreens`:
  - `useRoomTab()`: tab title, see §6 for the impact on `tab.spec`;
  - `useStepSound` (`playSound("step")` on turn step changes);
  - `usePreloadCards`;
  - `useServerClock(offset, 250)`.
- **Recommendation.** Add `<RoomChat/>`, `<StageBackdrop/>` and `<StageIntro/>` as siblings of `<RevealOverlay/>`. Render them **after** `PhaseScreens` in DOM order (this matters for e2e `.first()` locators), or portal them to `body`.

---

## 2. Turn screen map

### Files

| File | What | Exports |
|---|---|---|
| `src/features/turn/turn-screen.tsx` (666 l.) | every step of a turn | `TurnScreen` |
| `src/features/turn/history-panel.tsx` (362) | history button, sidebar, drawer, body | `WIDE`, `useHistorySidebar`, `HistoryButton`, `HistorySidebar` |
| `src/features/turn/turn-backdrop.tsx` (142) | seat-colour wash + bobbing "?" | `TurnBackdrop({seat})` |
| `src/features/turn/player-strip.tsx` (168) | table in turn order, card peek popover | `PlayerStrip({players})` |
| `src/features/turn/give-up-button.tsx` (52) | red "Give up" + confirm popover | `GiveUpButton` |
| `src/features/room/game-header.tsx` (82) | match header + page frame | `GameHeader`, `GameFrame` |

### `GameFrame` / `GameHeader` (`src/features/room/game-header.tsx`)

- `GameHeader({hideTheme, actions, after})` (`:13-53`):
  - left: `ThemeTag` (butter pill, set emoji, label "Theme:" hidden below `sm`, bold theme, truncates);
  - right (`ml-auto`): `LeaveMatchButton` · `actions` · `Timer` (`deadline`, `stepStartsAt`, `rechargeFrom = reveal.startsAt`, `offset`, `totalMs = view.stepMs`, `tick`) · `after`;
  - `header` is `flex w-full flex-wrap items-center justify-between gap-3`.
- `GameFrame({children, hideTheme, actions, after, sidebar})` (`:56-82`): `div.flex.min-h-dvh.flex-col.gap-6.px-4.pt-4.pb-8 short:gap-4 short:pb-4 sm:px-8 sm:pt-6 sm:short:pt-4` > `GameHeader` > `div.flex.w-full.flex-1.items-start` > `main.min-w-0.flex-1` + `{sidebar}`.
  - The **sidebar is a right-hand sibling of `<main>` under the header**, so it can never be full height.
  - It is used by the vote (`hideTheme`), pick, turn and theme screens.
- What the prototype header looks like (`flow/shell.js:110-126`):
  - `[history btn][theme tag] … [leave][timer]`; the history button is hidden until turns start;
  - the prototype theme tag is *surface + shadow-card*, 40px tall, small muted "Tema:"; today's `ThemeTag` is a butter pill about 32px tall;
  - the prototype timer has its bar as a 3px line at the bottom; today's `Timer` has an inline 72px bar plus the "−18 s" cut badge.
  - Keep today's `Timer` (it carries the recharge/cut logic) and `GiveUpButton` (not in the prototype header, still needed).
- **Needed for Phase 10:**
  - a `before` slot in `GameHeader` (left of `ThemeTag`) for the history button;
  - a `start` slot in `GameFrame` that renders **left of a column holding header + main**, so the bar is full height:
    ```
    <div class="flex min-h-dvh">
      {start /* sticky top-0 h-dvh, width animates 0 → 360 */}
      <div class="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-4 pb-[calc(2rem+var(--dock))] …"> <GameHeader before=…/> <main/> </div>
    </div>
    ```
  - Intro scenes that are full-screen ("s-scene.full" in the prototype: cold open, draw) need the header hidden or covered. `GameFrame` always renders the header today.

### `TurnScreen` layout (`turn-screen.tsx:105-208`)

```
GameFrame actions=<GiveUpButton/> after=<HistoryButton/> sidebar=<AnimatePresence initial=false>{wide && open && <HistorySidebar/>}</…>
  <TurnBackdrop seat={turnPlayer.seat}/>            (portal to body, fixed -z-10)
  div.flex-col.gap-6 (short:gap-4)
    <PlayerStrip players={view.players}/>
    div.flex.flex-wrap.items-stretch.gap-5 lg:gap-12
      div  w-full  lg:w-[clamp(232px,calc((100dvh_-_330px)_*_0.66),368px)] lg:flex-none     ← card width follows window height
        AnimatePresence mode=wait > motion.div key=focus.id  (rotateY -12→0 / →12, y10, perspective-[1200px])
          <CharacterCard className="max-lg:hidden" …/>   (desktop)
          <FocusRow …/>  (phones: lg:hidden compact row, 80px portrait or "?")
      section.flex-[1_1_360px].flex-col.gap-5
        AnimatePresence mode=wait > motion.div key=`${phase}-${turn.n}-${mode}` (y14 → 0, dur.slow; exit fade dur.fast)
          <Step mode/> → Ask | Answer | Guess | Validate | Waiting
```

- `useMode()` (`:62-76`) maps phase + me to a mode: `ask`/`waitAsk`, `answer`/`waitAnswers`, `guess`/`waitGuess`, `validate`/`waitValidate`.
- Focus card: on your own ask/guess (or while your guess is validated) it is *you*; otherwise it is the turn player. Meta uses `withNames` for "Picked by {name}".
- Step widgets:
  - `Ask`: TextField `autoFocus` with a `?` suffix and `MAX_QUESTION`; primary "Send question".
  - `Answer`: `Bubble(who=asker)`, a 6-chip `AnswerChip` grid (stagger 0.04; `grid-cols-2` on phones, `sm:grid-flow-col sm:grid-cols-3 sm:grid-rows-2`), note `TextArea`, send + progress.
  - `Guess`: bubble with the question + `AnswersList` (Avatar 28 + name + chip + note), heading, TextField `autoFocus`, "Take a guess" / "Pass".
  - `Validate`: bubble with the guess, heading via `withNames`, primary lg "Yes, that's it" / "Not yet".
  - `Waiting`: heading, the question bubble, "Still answering: {names}", 3 pulsing dots (infinite loop).
- **With history pushing from the left on desktop** (prototype 360px): at 1024–1279px the content column becomes about 600–856px. The card (≤368) + `gap-12` + section (`flex-basis 360`) needs ≥776px, so **below about 1200px the step section wraps under the card** while the sidebar is open. Options: push only from `xl`, or narrow the card while it is open. Today's right sidebar (`clamp(320px,26vw,420px)` + `ml-6`) has the same issue.
- `PlayerStrip` (target of scene 10, "cards shrink into the strip"):
  - `ul.grid.grid-cols-2.gap-2 sm:flex sm:gap-3`, sorted by `turnOrder`, each `motion.li layout` with a seat-colour ring (`boxShadow 0 0 0 2px seatColor`) on the turn player;
  - `PlayerRow`: Avatar 32 (`max-sm:size-6`), name via `useDisplayName` (plain, the avatar is beside it), status, 40px thumb or "?";
  - `CardPeek`: base-ui Popover `openOnHover`, z-50.
  - For a shared-element handoff, put `layoutId={`strip-${p.id}`}` on the strip items and on the scene-10 cards **inside the same tree** (the intro must live inside `TurnScreen`, or in a `LayoutGroup` that both share). `AnimatePresence mode="wait"` in `PhaseScreens` makes layoutId handoffs across phase screens impossible, because exit finishes before enter.
- `TurnBackdrop` (`turn-backdrop.tsx`):
  - portal to `body`, `fixed inset-0 -z-10`, crossfade of 1.4 s keyed by `seat`;
  - `Wash`: a 7% even tint + 3 blurred radial blobs that wander (26/32/22 s loops) + 7 bobbing "?" at `opacity-[0.14]`;
  - `useReducedMotion()` stops the loops.
  - Prototype equivalents (`flow/stage.css:14-32`, `shell.js:8-21,75-100`): wash = `color-mix(var(--c) var(--wash-mix), var(--canvas))` with `--wash-mix` 20% light / 26% dark, 2 radial blobs drifting 22 s; glyph layer of "?" or **theme-set emoji** (opacity .16 text / .22 emoji); the same 7 spots as `MARKS`.
  - Wash keys: `brand` (solid `--brand-stage`), `butter` (vote), `theme` (`--no`), `sky/apricot/teal/purple` = `--seat-1..4`.
  - **Generalize into one `StageBackdrop({tone, glyphs})`** mounted once at room level (not inside `TurnScreen`, which unmounts on phase change and would cut the crossfade). `seatColor()` lives in `src/lib/seats.ts`; theme-set emoji are in `THEME_SETS[].emoji` / `themeSetEmoji()` (`src/game/theme-sets.ts:104`).
- `GiveUpButton`: base-ui Popover; returns null when `me.gaveUp || me.discoveredAt !== null || me.away`. `danger sm h-10`, icon-only below `sm`.

### History today (API to change)

- `WIDE = "(min-width: 1024px)"` is exported and used by `TurnScreen` with `useMedia` (false on the server, so the narrow tree renders first on hydration).
- `useHistorySidebar()` returns `[open, set]`. It is remembered per browser in **`localStorage["ludodare:history-sidebar"]`** (`"1"`/`"0"`; old brand prefix, the only `ludodare:` key left). It is read in an effect, so a saved-open sidebar animates in right after mount.
- `HistoryButton({sidebarOpen, onSidebar})`:
  - **wide**: toggles the sidebar; secondary sm h-10; `PanelRightOpen`/`PanelRightClose`; "History" label + count pill (`bg-sunken`, or `bg-on-ink/15` when open, ink fill when open);
  - **narrow**: icon-only (`History`), sky count badge on its corner; opens its own `HistoryDrawer` (internal state);
  - `aria-expanded` in both cases.
- `HistorySidebar({onClose})`: `motion.aside` width 0→auto (`dur.slow`/`ease.soft`, exit `dur.base`), `sticky top-6 self-start`, inner `section.ml-6.w-[clamp(320px,26vw,420px)].h-[calc(100dvh-7.5rem)] short:h-[calc(100dvh-6rem)] rounded-xl bg-surface shadow-card`.
- `HistoryDrawer` (phones): `fixed inset-0 z-40`, a scrim button closes it, a **bottom sheet** (`y:100%→0`, `h-[85dvh] rounded-t-xl shadow-pop`), `role=dialog aria-modal`, Escape closes, focus goes to the close button.
- `HistoryBody({onClose, focusClose})`:
  - h2 title + X;
  - `ChoiceGroup` of players (you first) with `PlayerName` + count;
  - kind `fieldset` all/question/guess with counts;
  - caption via `withNames`;
  - `ol` newest first with `AnimatePresence` + `motion.li layout="position"`;
  - each entry: number circle (`bg-sky-soft` if mine), "Question · {name}" (`PlayerName`), text, answers as `Avatar 20 + AnswerChip small` or `ResultChip`, notes with `PlayerName`.
- **Prototype target** (`flow/shell.js:340-394`, `stage.css:206-235`):
  - button left of the theme, `PanelLeft` icon (lucide has `PanelLeftOpen`/`PanelLeftClose`, checked in node_modules);
  - desktop: **360px** wide, full height, `border-right 1px line`, no rounding, **pushes main** (`left: 360`); open 0.55 s `power3.out`, close 0.4 s `power3.in`;
  - phone: **88% width**, `border-radius 0 28px 28px 0`, `shadow-pop`, slides from the left over the scrim (z above the chat);
  - empty state is longer: "Nada por aqui ainda. As perguntas aparecem aqui assim que alguém joga.";
  - filters identical to today's.
  - `HistoryBody` can be reused as is. Only the button, sidebar and drawer shells change.

---

## 3. Lobby layout and where the chat fits

### Structure (`src/features/lobby/lobby-screen.tsx:177-422`, `src/components/ui/screen.tsx:65-79`)

```
Screen(left=<HubBrand/>, right=<HubActions/>)      div.min-h-dvh.flex-col.gap-6.px-4.pt-4.pb-8  sm:gap-10 sm:px-8 sm:pt-6 sm:pb-12  sm:short:gap-6 sm:short:pt-4 sm:short:pb-6
  header.max-w-[1120px]   (logo + match badge | language, theme toggle, user menu)
  main.mx-auto.max-w-[1120px].flex-1
    div.flex.flex-wrap.items-start.gap-10 lg:gap-16
      section.flex-[1_1_480px].gap-7 (short 5, tiny 4)
        back link "Leave room" · h1 room title (only h1 on the page: rooms.spec.ts:12 depends on it)
        greeting + subtitle  |  <RoomQr> (hidden < sm)
        5 code cells (w-14 sm:w-16, h-20, short:h-16) + "Copy link"
        "Players · n/seats" + ul grid-cols-1 sm:grid-cols-2 (Avatar 44, name, status, ready ✓/✗ badge; dashed empty seats)
      aside.w-full.rounded-lg.bg-surface.p-6 lg:max-w-[416px] lg:flex-[1_1_360px]
        game thumb + name + key button (host "Start match" keyClass yes bounce min-h-14 | guest "I'm ready" apricot→yes pressed)  + <StartDialog/>
        settings list (visibility + password, seats, step-time chips, theme mode)
        host: "Edit settings" link   → editing mode swaps the whole screen for <RoomSetup/> (same Screen)
```

- `StartDialog` (`start-dialog.tsx`): base-ui Dialog with backdrop `z-40` and popup `z-50`; lists who is not ready live with `PlayerName` (avatar-rule compliant); `swap` motion for its texts.
- **Where the tab goes, by width** (tab = fixed `right:16px; bottom:0; width:340px; height:56px`):
  - **≥1024 (lg)**: section and aside are side by side; the aside is the shorter column, so the bottom-right of the viewport is empty unless the page scrolls. At 1280×800, main spans x 80–1200, aside 784–1200, tab 924–1264. The lobby fits about 650px tall at `short` sizes, so usually there is no overlap. **No change needed** beyond the spacer.
  - **640–1023**: 480 + 360 + 40 > width, so the aside wraps **below** the section at full width. At the end of the scroll the tab overlaps the right part of the aside (settings list); the "Edit settings" link is bottom-left. A spacer is needed.
  - **<640 (phones)**: one column, the aside is last, `pb-8` (32px). A 60px full-width bar covers the bottom of the aside / the "Edit settings" link at the end of the scroll. The same happens on every match screen on phones: the `Answer` "Send answer" button and the `Validate` buttons are at the bottom. **A spacer is required.** It also keeps the e2e phone test free of "element intercepts pointer events" retries.
- **Recommended mechanism (no visual change to the lobby):**
  - set `--dock: 0px` on `:root`; the chat sets it to `56px` (desktop) or `60px` (phone) while mounted, for example with a `data-dock` attribute on `<html>` or a style on `body`;
  - `Screen` (non-banner branch) and `GameFrame` use `pb-[calc(2rem+var(--dock))]` (and the `sm:`/`short:` equivalents);
  - `ToastProvider` uses `bottom-[calc(1.5rem+var(--dock))]`.
  - The toast column (centred, `max-w-md`) would otherwise sit on the phone bar, and at 640–1024px it overlaps the desktop tab.
- **Phone vs tab breakpoint.** The prototype only has 390 (phone) and 1280 (desktop). `sm` (640px) is the natural switch: a 340px tab with a 16px inset fits from about 400px. History keeps `WIDE` (1024) for push vs drawer. Note that the prototype's phone bar is **inset 8px left/right** (`left:8px; right:8px`, `border-radius 22px 22px 0 0`), not edge to edge.
- **Z ladder today:**

  | z | Layer |
  |---|---|
  | `-z-10` | `TurnBackdrop` |
  | `z-30` | sticky TopBar (banner pages only, not the lobby), `RevealOverlay` |
  | `z-40` | `HistoryDrawer`, Dialog backdrops |
  | `z-50` | Dialog popups, Popovers, Toasts |

  Prototype order: scrim 10 < chat 12 < history 13. Suggestion: chat **`z-35`** (above reveals, so you can chat during them; below drawers and dialogs). The phone history drawer stays `z-40`, above the chat.
- **Chat dimensions from the prototype** (`flow/stage.css:162-195`, `shell.js:229-338`):
  - head 56px (60 on phone, with `padding-bottom:4px`);
  - open = `H × 0.62` (desktop) / `0.66` (phone); toggle 0.5 s, open ease `back.out(1.15)`, close `power3.inOut`; chevron rotates 180°;
  - unread: head turns `bg-sky text-on-sky`; count pill (mono 12px, inverted colours) pops scale 0.3→1 `back.out(3)`; up to 3 sender faces (24px, ring 2px sky, −7px overlap; desktop only); the tab hops `y [0,-14,0,-5,0]` over 0.6 s on each message, then a CSS `s-nudge` loop (3.6 s, 1.2 s delay) until opened;
  - pop bubble (desktop only): `right:16px; bottom:68px; width:340px`, avatar 30 + `surface` bubble `shadow-pop`, radius `18 18 6 18`; enters `y16 scale .8` with `back.out(1.8)`; leaves after 3.05 s (or at once when opened);
  - phone head shows the last message as "**Name:** text" (needs `PlayerName` for the avatar rule);
  - messages: others = avatar 28 + small name + `bg-sunken` bubble (`16 16 16 5`); mine = `bg-sky text-on-sky`, right-aligned; emoji-only messages are big (34px) with no bubble; system lines are a centred `bg-sunken` pill, 12.5px bold muted;
  - composer: 46px pill input (`border-1.5 line-strong`) + 34px ink send button;
  - chat shell: `surface`, `border 1px line` (no bottom border), radius `20 20 0 0`, upward shadow `0 -2px 6px rgba(18,22,31,.06), 0 -16px 40px rgba(18,22,31,.14)`. This needs a new token with a dark variant.
- **Focus and keyboard:**
  - **(1)** `RevealOverlay` (`reveal-overlay.tsx:39-53`) listens to `keydown` on `window`, closes on any non-modifier key and, if nothing is focused, focuses `main textarea, main input…` (`FIELD`, `:22`). Typing in the chat would close a reveal, so ignore events whose target is inside the chat. The chat must stay outside `<main>` so `FIELD` never targets it.
  - **(2)** `Ask`/`Guess` `autoFocus` would yank focus out of the chat when a step starts. Guard it, for example by skipping autofocus when `document.activeElement` is inside `[data-chat]`.
  - **(3)** `HistoryDrawer` handles Escape. The chat should fold on Escape too.
- **The lobby → match handoff in the prototype** (`shell.js:206-214`, `scenes-a.js:84-89`): the lobby top bar leaves upwards (0.45 s), the lobby content fades and scales to 0.97, the brand wash comes in, the system line "▶ Match started" appears in the chat. Today `PhaseScreens` only crossfades the screens.

---

## 4. Styles (`src/app/globals.css`)

### Theming

- Light tokens are on `:root`, dark ones on `[data-theme="dark"]` (next-themes; **system preference is not followed**: `defaultTheme="light"`, `enableSystem={false}`).
- `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`.
- Custom variants `short` = `max-height: 820px` and `tiny` = `max-height: 700px`. Breakpoints are Tailwind defaults (sm 640, md 768, lg 1024, xl 1280).

### Colour tokens (light / dark) → Tailwind name

| CSS var | light | dark | class |
|---|---|---|---|
| `--canvas` | #f3f5f9 | #12161f | `bg-canvas` (also `body` background) |
| `--surface` | #ffffff | #1b212d | `bg-surface` |
| `--surface-sunken` | #e8ecf3 | #0c1017 | `bg-sunken` (prototype calls it `--sunken`) |
| `--line` / `--line-strong` | #d3d9e4 / #7c879b | #2c3445 / #7b879e | `border-line`, `border-line-strong` |
| `--ink` / `--ink-muted` / `--on-ink` | #1e2433 / #566075 / #fff | #eef1f7 / #a7b0c2 / #12161f | `text-ink`, `text-ink-muted`, `text-on-ink` |
| `--sky` / `--on-sky` / `--sky-soft` | #2b69c8 / #fff / #dce8fa | #86b4f7 / #0f1b30 / #1d3050 | `sky`, `on-sky`, `sky-soft` |
| `--apricot` / on / soft | #cf7024 / #2a1707 / #fce8d6 | #f0a566 / #2a1707 / #472b15 | `apricot…` |
| `--butter` / on / soft | #f6e3a1 / #3a2e05 / #fbf3d3 | #e3cb6e / #2e2506 / #3b3212 | `butter…` |
| `--yes` / on / soft | #0b7a75 / #fff / #d5efec | #5ccfc6 / #06211f / #123b38 | `yes…` |
| `--no` / on / soft | #c2412f / #fff / #fadfd8 | #f28b76 / #2b0d07 / #4a1d14 | `no…` |
| `--on-avatar` | #1e2433 | (same) | `text-on-avatar` |
| `--seat-1..4` | #2b69c8 #cf7024 #0b7a75 #8a4fc4 | #86b4f7 #f0a566 #5ccfc6 #c39bf2 | **no Tailwind class**: used inline through `seatColor(seat)` → `var(--seat-N)` (`src/lib/seats.ts`) |
| `--scrim` | rgba(18,22,31,.45) | rgba(0,0,0,.6) | `bg-scrim` |
| `--sky-deep`, `--yes-deep`, `--apricot-deep` | `color-mix(in oklch, var(--x), black 32%)`, on `:root` only, follow the theme | | key button lips (`[--key-lip:var(--sky-deep)]`) |

- **Prototype tokens missing from the project** (`flow/flow.css:34-47,65-68`). Add them to both theme blocks, plus `@theme inline` if they need Tailwind classes:
  - `--brand-stage` (#2b69c8 / dark #1d4a93), `--brand-butter` #f6e3a1, `--on-brand` #fff;
  - `--wash-mix` 20% / 26%;
  - `--on-seat-1..4` (light #fff #2a1707 #fff #fff; dark #0f1b30 #2a1707 #06211f #1d0f2e);
  - the upward chat shadow;
  - `--dock` / `--peek` (prototype layout vars).
- The logo already hard-codes brand `#2B69C8`/`#F6E3A1` (`src/components/ui/logo.tsx:31`), "the same in both themes". The 4-bubble path `FOUR` and the `?` path `QUESTION` are there and can be reused for the draw "urn" (the prototype's `s-urn`). The alert-icon SVG in `use-tab-title.ts` reuses the same path.

### Type, shape, depth, motion

- **Fonts** (`[locale]/layout.tsx:19-33`):
  - `next/font/google` Bricolage Grotesque (`--font-bricolage`, variable, so `font-extrabold` 800 works), Figtree, DM Mono (400/500), Zen Maru Gothic (500/700, `preload:false`, Japanese fallback);
  - `--font-display` = Bricolage → Zen Maru; `--font-sans` = Figtree → Zen Maru; `--font-mono` = DM Mono.
  - Classes: `font-display`, `font-sans`, `font-mono`.
- **Radii**: `rounded-sm` 10, `-md` 16, `-lg` 24, `-xl` 32, `-pill` 999.
- **Shadows**: `shadow-card` (`0 1px 2px …06, 0 10px 28px …08`), `shadow-pop` (`0 2px 6px …08, 0 24px 56px …16`); dark variants are heavier.
- **Eases**: `ease-soft` = cubic-bezier(0.22,1,0.36,1), `ease-swap` = (0.65,0,0.35,1). Durations `--dur-fast` 140ms, `--dur-base` 260ms, `--dur-slow` 480ms, `--dur-reveal` 700ms.
- **JS twins** in `src/lib/motion.ts`: `dur = {fast .14, base .26, slow .48, reveal .7}`, `ease.soft/swap`, `riseIn` (y12 fade in; exit fade only), `stagger` (0.04), `layoutSpring`. Its header comment says **"Nothing bounces"**, but the prototype uses many `back.out` eases (chat open 1.15, bubbles 1.8, count 3, ready mark 3) and the key buttons already bounce. Update the comment and add a couple of named eases. GSAP → motion equivalents:
  - `power3.out` ≈ `[0.215,0.61,0.355,1]`;
  - `power3.in` ≈ `[0.55,0.055,0.675,0.19]`;
  - `power3.inOut` ≈ `[0.645,0.045,0.355,1]`;
  - `power2.in` ≈ `[0.55,0.085,0.68,0.53]`;
  - `sine.inOut` ≈ `[0.37,0,0.63,1]`;
  - `back.out(s)`: motion's `backOut` or a `cubicBezier(0.34, 1.56, 0.64, 1)`-style curve (tune the overshoot per `s`).
- **Key button** (`src/components/ui/button.tsx:35-68`, `keyClass(color, {pressed, bounce, className})`):
  - colours `sky | yes | apricot`;
  - `font-display font-extrabold rounded-pill mb-1.5`;
  - lip `shadow-[0_6px_0_var(--key-lip)]`; hover lifts 0.5 with an 8px lip; active/pressed `translate-y-1.5` with a 0 lip;
  - `bounce` → `animate-boing` (`motion-reduce:animate-none`).
  - Size comes from the caller (lobby: `min-h-14 grow px-6 text-lg`).
  - The prototype's big "Random"/"Confirm" keys map onto this.
- `buttonClass(variant, size)`: variants `primary` (ink), `secondary`, `ghost`, `danger`; sizes `sm` h-9, `md` h-12, `lg` h-14; pill, border 1.5.
- **Keyframes**: only `boing` (`globals.css:134-153`, `animate-boing` 4s loop). Elsewhere Tailwind's built-in `animate-ping/pulse/spin`. Everything else is motion/react. Prototype CSS loops to port:
  - `s-drift` (22 s alternate, backdrop blobs);
  - `s-bob` (glyphs; already in `TurnBackdrop` via motion);
  - `s-nudge` (chat unread, 3.6 s);
  - `s-dot` (typing dots, 0.9 s);
  - `s-blink`.
  - Put CSS loops in `@theme { --animate-…; @keyframes … }` like `boing`.
- **Reduced motion, three layers:**
  - **(1)** global CSS clamps every CSS animation and transition to 1ms (`globals.css:200-208`);
  - **(2)** `MotionConfig reducedMotion="user"` skips **transform/layout** animations but keeps opacity and colour;
  - **(3)** `useReducedMotion()` stops infinite loops (`turn-backdrop.tsx:93`, `vote-screen.tsx:66` skips the tie roulette, `theme-screen.tsx`, `player-strip.tsx`).
  - Timed choreography (delays, sequences) still runs at full length under (2). The stage show should **jump to the end state** (or a short fade) when reduced. The prototype player itself starts at the pick scene when reduced (`flow/player.js:264`).
- **Other**: `:focus-visible` gets a 3px sky outline with 2px offset; Tailwind 4 resets the button cursor, so `@layer base` restores pointer; `body` transitions its background/colour over `--dur-base`.
- Avatar sizes are a **closed set** (`src/components/ui/avatar.tsx:6-15`: 20, 28, 32, 36, 40, 44, 48, 64). Scene avatars (hop into the urn, "For whom" big face, ring) need new keys or a `className` override (`size-24 text-4xl`). `Avatar` is `aria-hidden`; `PlayerName` sizes the avatar in `em` (`size-[1.4em]`).

---

## 5. i18n conventions

- **Layout**: `messages/<locale>/<namespace>.json`, locales `en` (default), `pt`, `ja`; `localePrefix: "always"` (`src/i18n/routing.ts`).
  - Namespaces are listed in `NAMESPACES` (`src/i18n/request.ts:6-16`): `common, home, profile, lobby, game, result, room, turn, meta`.
  - Every request loads **all** of them.
  - `game.json` is `{}` in all three languages and never used.
  - **A new file (for example `chat.json`) is ignored unless its name is added to `NAMESPACES`.**
- Lines per file are identical across languages (en/pt/ja: common 137, home 133, lobby 50, meta 54, room 104, turn 102…), which is a good sign of key parity. **Nothing enforces it**: no typed messages, no test. Add keys to all 3 files in the same change.
- **Usage:**
  - `useTranslations("turn.history")` / `t("kinds.all")`; nested keys go by dot path;
  - server side `getTranslations({locale, namespace})`;
  - no `t.rich`/`t.markup` anywhere; rich content comes from the name trick below.
- **Where Phase 10 strings belong:**
  - `room.vote.*` (vote title, intro line);
  - `room.pick.*` (pick card, "New!");
  - `turn.history.*` (empty text);
  - a new `chat` namespace;
  - stage scenes either in `room` or in the unused `game` namespace;
  - system lines like "Theme: {theme}" can reuse `room.theme` = "Theme:".
- **Names in messages**:
  - always a plain `{name}` / `{names}` placeholder, never markup;
  - to show avatars: `const withNames = useWithNames(); withNames((n) => t("pickedBy", { name: n(player) }))` returns ReactNode parts with `<PlayerName>` where each name was;
  - lists: `names: players.map((p) => n(p)).join(", ")`;
  - "you": `n(p, true)` → `common.youSuffix` "{name} (you)" / "{name} (você)" / "{name}（あなた）";
  - plain-string contexts (aria-labels, tab title, inputs) use `useDisplayName()` (`src/lib/names.ts:15`); guests get a generated name per viewer language.
  - **The avatar-beside-every-name rule**: chat senders, the phone bar's "Name: last message", "You pick for {name}", "{name} picked yours", "{name} starts!" all go through `withNames`/`PlayerName`.
- **Plurals and ordinals:**
  - en: `{count, plural, =0 {…} one {# …} other {# …}}` (`room.vote.votes`, `home.rooms.count`, `lobby.confirmStart.waiting`);
  - pt: the same categories (`one`/`other`, plus `=0`);
  - **ja: no plural** (`"votes": "{count}票"`), or `=0` + `other` only (`home.json:81,114`);
  - ordinals: **en only** uses `selectordinal` (`result.place`, `turn.reveal.hitPlace`); pt uses `{place}º`, ja `{place}位`.
- **Typography**:
  - en and pt use curly quotes “…” and the single ellipsis character "…" (`room.vote.chosenTitle` "The theme is…");
  - ja uses full-width "："/"（）" and the `{name}さん` honorific;
  - en uses `'` in contractions ("I'm ready", "{name}'s card"). ICU treats `'` as an escape only next to `{`/`}`, so avoid `'{`.
- **Text the e2e tests match** (keep these exact in **en**):
  - `room.vote.title` "Vote for the theme" (the group's accessible name through `aria-labelledby="vote-title"`, `vote-screen.tsx:125-126,202-204`);
  - `room.vote.chosenTitle` / `room.theming.chosenTitle` "The theme is…";
  - `room.theming.waitingTitle` "…is choosing the theme";
  - `room.pick.confirm` "Confirm pick", `createNamed` "Create “{name}”…", `save` "Save and pick", `random` "Random";
  - `turn.ask.send`, `turn.answer.send`, `turn.guess.send`, `turn.validate.no`;
  - `result` "discovered first", `toLobby`;
  - `lobby.titleHostAgain` "Another round?", `titleGuestAgain` "Back in {name}'s room.", "I'm ready", "Start match";
  - `meta.tab.*`.

---

## 6. Tests

### Commands (`package.json`)

| Command | What |
|---|---|
| `pnpm test` | `vitest run`. Config `vitest.config.mts`: `include: src/**/*.test.ts`, `environment: "node"`, alias `@` and `server-only` → `src/test/empty.ts`. **No component or DOM tests** (no jsdom, no .tsx tests). |
| `pnpm test:e2e` | `playwright test` (`playwright.config.ts`): `testDir ./e2e`, timeout 120 s, `workers 1`, not parallel, `channel: "msedge"`, trace on failure. `webServer`: `pnpm exec next dev -p 3100`, `reuseExistingServer`, env `NEXT_DIST_DIR=.next-e2e`, `DARE_DATA_DIR=.data/e2e`, Supabase vars blank (forces the **local in-memory backend**). **No `expect.timeout` → 5 s default; no `actionTimeout` → actions wait up to the test timeout.** |
| `pnpm typecheck` | `next typegen && tsc --noEmit`. `tsconfig.json` already includes `.next-e2e/types/**`. Per project memory, a new `NEXT_DIST_DIR` makes `next dev` rewrite `tsconfig.json`; restore it after a test server. |
| `pnpm lint` | `biome check` (biome 2.4.2: recommended + `next` and `react` domains, 2-space indent, organize imports; ignores `.next*`, `.data`) |
| `pnpm format` | `biome format --write` |

### Unit tests that pin timings (expected to fail when Phase 10 changes them)

- `src/game/engine.test.ts`:
  - `:234` and `:350`: `deadline === now + VOTE_SECONDS*1000`. Breaks with any vote lead-in; the value itself follows the constant.
  - `:249-252`, `:263-266`, `:336-339`: theme reveal `until === now + REVEAL_TIMING.theme (+ themeTieSpin)`. Breaks if the reveal grows to hold the rule scene or the draw.
  - `:254`, `:340`: `stepStartsAt === reveal.until` ("picking clock waits for the reveal"). Keep this invariant.
  - `:488-493`: picking step = `PICK_SECONDS`.
- `src/game/simulation.test.ts:101,117` use `RESULT_SECONDS` and `REVEAL_TIMING`.

### e2e files and how they wait

| Spec | Flow | Phase 10 risk |
|---|---|---|
| `e2e/helpers.ts` | shared steps | see below |
| `e2e/match.spec.ts:13-47` | 2 desktop players, full match, back to lobby (timeout 180 s) | vote/pick helpers; text matchers |
| `e2e/match.spec.ts:49-82` | 3 **phones** (`PHONE` 390×844, isMobile, touch), wrong guess, podium clock → lobby (240 s) | the same, plus the bottom chat bar over buttons |
| `e2e/theme.spec.ts:10-46` | host types the theme, then pick screen | 10 s budget to reach the pick textbox; "Random" must stay absent |
| `e2e/theme.spec.ts:48-69` | vote offers only enabled sets | 5 s to see 3 vote cards |
| `e2e/picture.spec.ts:40-81` | create character with pasted/.jfif picture | pick UI rewritten |
| `e2e/tab.spec.ts:24-59` | tab title + alert icon in lobby/vote | 5 s to see the vote clock in the title |
| `e2e/rooms.spec.ts`, `e2e/home.spec.ts` | lobby, password, rooms list, hub | only chat-in-lobby side effects |

**`helpers.ts`, step by step:**

- `startMatch` `:42-46` waits for all ready (5 s), then clicks "Start match".
- `voteAll` `:56-70`:
  - `:62` `expect(themes).toHaveCount(3)` on `getByRole("group", {name: /vote for the theme/i}).getByRole("button")`, **default 5 s**;
  - then clicks;
  - `:67-69` heading `/the theme is/i` visible, **5 s**.
- `pickAll` `:73-83`:
  - `:76` `getByRole("textbox").first().fill("Hero n")` (waits as long as needed);
  - `:79` button `/create “hero/i`, `:80` `/save and pick/i`, `:81` `/confirm pick/i`.
- `nextAsker` `:86-95` polls 120 × 250 ms = **30 s** for "Send question" (or "Back to rooms").
- `playToEnd` `:101-154`:
  - `:112` `textbox.first()` question;
  - `:118` `send answer` `waitFor 15 s`;
  - `:122` `/^yes$/` chip;
  - `:126-128` "Take a guess" visible **20 s**;
  - `:136` `asker.getByText(cardName)` **count 0** (counts hidden nodes too);
  - `:140`/`:147-150` `textbox.first()` guess;
  - `:144` "Not yet" on the picker's page.
- Reveals are waited for implicitly: `click()` retries while the `z-30` overlay intercepts pointer events, and the server answers `too_early` before `stepStartsAt`.

**Will break or flake, and why** (prototype timing chart, `flow/player.js:227-229`: first match = intro 7 s + line 1 s + vote 20 s + theme 6 s + draw 4.5 s + target 2.5 s + pick + yours 4.3 s + order 4 s; later rounds = 1.5 + 20 + 3 + 3 + 3 + pick + 3 + 3):

1. **Vote cards later than 5 s.** Every e2e room is a fresh room, so every test gets the cold open.
   - Failing expects: `helpers.ts:62`, `theme.spec.ts:66` (`toHaveCount(3)`) and `theme.spec.ts:67-68`.
   - `tab.spec.ts:45` expects `^\d:\d\d · Vote for a theme! · 4Dare$` within 5 s. `useTabTitle` shows the clock only once `now >= stepStartsAt` (`src/lib/hooks/use-tab-title.ts`, "No clock while a reveal is on screen"), so a lead of about 8–9 s fails it.
   - If votes are **rejected** before the clock starts (a `guardStep`; today `VOTE` has none, `engine.ts:253-261`), the clicks during the deal must not be possible.
2. **Theme → pick budget.** `theme.spec.ts:42-44` gives 10 s to see the pick textbox after "The theme is…". Typed theme = sentence only (about 3 s), then draw 4.5 s + "for whom" 2.5 s: about 10 s, so it fails or flakes. The heading `/the theme is/i` must still exist in the theme reveal and rule scene (`helpers.ts:67-69`, `theme.spec.ts:35-37`).
3. **Pick selectors removed by design:**
   - `helpers.ts:79-81` (`create “`, `save and pick`, `confirm pick`);
   - `picture.spec.ts:25-38` (`create “`, `choose a picture`, `Zoom`, `save and pick`, `confirm pick`). The inline picture change replaces the create form; `ImageDrop` + crop + `Zoom` may still exist.
   - `theme.spec.ts:45` requires **no** `/^random$/` button for a typed theme (the new big "Random" must stay hidden for `set: null`, or the test changes).
4. **The chat composer is a textbox.**
   - `getByRole("textbox").first()` is used at `helpers.ts:76,112,140,147`, `picture.spec.ts:26` and `theme.spec.ts:42`. getByRole skips only ARIA-hidden nodes, and a folded chat clipped by `overflow:hidden` is not ARIA-hidden. If the chat comes **before** `<main>` in DOM order, or is the only textbox, `.first()` picks it.
   - Mitigations: render the chat after the screens; make the folded body `inert`/`hidden`; better, give the tests named locators.
5. **Chat text shadowing page text (strict mode or wrong match):**
   - `match.spec.ts:44` `getByText(/another round/i)`, `:45` `getByText(/back in/i)` and `:79` `getByText(/another round|back in/i)` are strict, so a chat system line such as "Back in the lobby" breaks them;
   - `theme.spec.ts:38` `getByText("Space pirates").first()` (a "Theme: Space pirates" line is fine only if it comes later in DOM order or is visible);
   - `helpers.ts:136` (a chat line that names the asker's own card would also be a **secrecy bug**);
   - `rooms.spec.ts:12` `getByRole("heading", {level: 1})` is strict: no `h1` in the chat or the intros in the lobby.
6. **Tab title.** `tab.spec.ts:38,40,45` and `rooms.spec.ts:61` anchor the whole title. Do not add unread chat counts to the tab title (or update the tests).
7. **Phone bar over buttons** (`match.spec.ts:49-82`): the Yes chip, "Send answer", "Take a guess" and "Not yet" sit at the bottom on 390×844. Without the `--dock` spacer, clicks can hit the bar. Playwright retries with other scroll alignments, but the last element of a page cannot scroll above a fixed bar.
8. **Time budget only** (no failures): the first round adds about 26 s, inside the 180/240 s test timeouts. `nextAsker`'s 30 s covers yours + order (about 8.3 s). The 20 s vote is never waited out, since everyone votes and `closeVote` runs at once (`engine.ts:250-261`). The podium wait (`match.spec.ts:78-81`, 25 s for `RESULT_SECONDS` 15) is unchanged.

**Speeding timers: nothing exists today.**

- `VOTE_SECONDS`, `PICK_SECONDS`, `RESULT_SECONDS`, `REVEAL_TIMING` are plain constants (`src/game/types.ts:101-151`), imported by the engine and by the UI (`vote-screen.tsx:22,78`).
- The engine is pure, with `Ctx {now, random}` (`types.ts:346-350`) built in one place: `const ctx = () => ({ now: Date.now(), random: Math.random })` (`src/server/rooms.ts:40`).
- The Playwright `webServer.env` is the natural switch; it already sets `DARE_DATA_DIR`.
- Options, cheapest first:
  - **(a)** raise the waits in the helpers (vote cards about 20 s; tab title about 15 s; `theme.spec.ts:42` about 25 s);
  - **(b)** add a server-side scale for intro windows only (for example `DARE_STAGE_SCALE=0.1` in the playwright env, read where `ctx()` is built, or a `ctx.stage` multiplier). The client must then play scenes **relative to the server window** (`startsAt…until`) and jump to the end when the window is shorter than the designed timeline, which is also the right reduced-motion behaviour;
  - **(c)** `use: { reducedMotion: "reduce" }` in `playwright.config.ts` makes the client skip choreography, but it cannot shorten server-held windows.
  - Playwright's `page.clock` does not help, because sync is by the server clock.

---

## 7. Docs that Phase 10 must touch

- `src/game/types.ts:124` `VOTE_SECONDS = 13` → 20 (also the comment "Theme vote lasts 13 s" in ROADMAP).
- `ARCHITECTURE.md:21` says "3 themes, 8 s, open vote… Then the theme stays up 3 s". It is stale (13 today), so set 20 s and describe the intro lead-in, the rule scene and the draw.
- `PRODUCT.md:14` lists per-step times but **no vote time**. Add "the theme vote lasts 20 s" (the user's decision names PRODUCT.md).
- `ARCHITECTURE.md:26` ("Tab:") mentions "step · code · 4Dare", but the title no longer shows the code (it shows the room name). It is a minor stale line.
- ROADMAP Phase 10 checkboxes (`ROADMAP.md:162-187`) are the source of truth for scope.

---

## 8. Quick checklist for the implementers

- [ ] Mount chat, `StageBackdrop` and intros in `RoomScreen` beside `RevealOverlay`, after `PhaseScreens` in the DOM, outside the transformed keyed div (or portal to `body`).
- [ ] `--dock` var → `Screen` and `GameFrame` bottom padding + toast offset; lobby visuals untouched.
- [ ] Chat `z-35`, outside `<main>`; guard `RevealOverlay`'s keydown and `Ask`/`Guess` `autoFocus` against chat focus; Escape folds.
- [ ] `GameHeader` `before` slot (history button with `PanelLeftOpen`/`Close`); `GameFrame` `start` slot (full-height left bar, 360px, pushes on `lg`/`xl`; phone drawer 88% from the left over the scrim, `z-40`); reuse `HistoryBody`; keep (or migrate) `ludodare:history-sidebar`.
- [ ] Watch the card + step wrap at 1024–1279 with the sidebar open.
- [ ] New tokens: `--brand-stage`, `--brand-butter`, `--on-brand`, `--wash-mix`, `--on-seat-1..4`, dock shadow, with dark values; expose seats in `@theme inline` if classes are wanted.
- [ ] Motion eases for back/power curves in `src/lib/motion.ts`; update the "Nothing bounces" note.
- [ ] Avatar size keys for big faces; every name through `PlayerName`/`withNames`.
- [ ] New strings in en/pt/ja (and `NAMESPACES` if there is a new file); ja without plural branches; keep the e2e-matched en strings or update the tests.
- [ ] e2e: longer waits or a stage-scale env; rewrite `pickAll` and `picture.spec` for the card form; named textbox locators; no chat system text matching `/another round|back in/i`; no h1 in the chat.
