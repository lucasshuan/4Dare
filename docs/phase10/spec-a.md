# Phase 10 spec A: scenes 1-4 and the stage shell

Source: the approved prototype in `docs/phase10/prototype/`: `scenes-a.js` (scenes 1-4), `shell.js` (stage, backdrops, header, clock, chat, history), `stage.css` (in-device styles), `flow.css` (tokens and board), `player.js` (durations, mocks, timing chart), `kit.js` (players, portraits, logo).
Targets in the repo: `src/features/lobby/lobby-screen.tsx`, `src/features/vote/vote-screen.tsx`, `src/features/theme/theme-screen.tsx`, `src/features/room/reveal-overlay.tsx`, `src/features/room/room-screen.tsx`, plus `game-header.tsx`, `timer.tsx`, `turn-backdrop.tsx`, `screen.tsx` (ThemeTag), `engine.ts`, `types.ts`, `view.ts`, `globals.css`, `lib/motion.ts`.

---

## 0. Key findings (read first)

1. **The vote clock has to start late.** Today `START` puts the room in `voting` with `deadline = now + 13 s` at once. The proposal plays a lobby exit, the cold open (7.6 s, or a 1.5 s "Rodada N" card) and the line-plus-deal beat (1.7 s) **before** the 20 s clock starts. The engine already supports a late start (`startStep` waits for `reveal.until`), so the smallest change is a new reveal kind `intro` set by `START`, plus a 1.7 s lead. `vote()` must then call `guardStep` (today it does not).
2. **"First match" is `round === 0` during the intro**, not `round === 1`. `round` goes up in `beginMatch`, which runs only when the theme is chosen. The proposal's code card ("full when `round === 1`") holds at picking time, not at the cold open.
3. **The header Timer must be hidden, not refilling.** With a late `stepStartsAt`, today's `Timer` shows its refill animation (counting up to 0:20) during the whole intro, and during the theme reveal it refills toward the 2:00 pick clock. The proposal shows no clock until the cards are on the table; then the clock pops in (scale 0.6 to 1, 0.4 s, back.out(2.5)). `GameHeader` needs a "clock from" prop and a "theme tag from" prop.
4. **The vote cards, votes, share bar, roulette and dimming already match the proposal** (same tones, same `[-7, 0, 7]` deal tilt, same 0.09 s stagger, same 0.35 / 0.95 / saturate(0.4) dimming, same 1.04 lit scale). What changes in the vote is the entrance (the line alone, then rising), the clock entrance, the butter backdrop, and the end (the winner leaves for scene 4 instead of growing in place).
5. **The "Tema: X" chat line and the header tag must wait for the reveal beat.** A system message written when the vote closes would reach every chat through Realtime before the theme is shown on stage. Store it with a `visible_at` (server time) and hide it until then. The same goes for the header tag (it pops at theme scene +2.3 s).
6. **Theme backdrops need a per-set look table.** The prototype only defines heroes (`--no` wash, glyphs 🦸 ⚡ 🛡️ 🦸‍♀️ 💥 ⚡ 🦹). The other 18 sets and the typed theme (`set: null`) need a colour and 7 glyphs each (proposal in section 2.2).
7. **The rule examples need server data that is the same for everyone.** Two ✓ cards come from the theme's most picked characters (`backend.popularPicks(themeId, n)` exists) and one ✗ card from a very different theme. Fetch them for all 3 options at `START` (the server already passes `themes` into `START`) so the pure engine can keep them in state.
8. **Bottom space for the chat.** The chat tab (56 px, 60 px on phones) sits over the bottom of every screen. In the prototype the phone vote footer (bottom 14 px) actually ends up under the 60 px chat bar. Screens need about 76 px of bottom padding on phones; the lobby (which otherwise stays as is) needs it too, and toasts (`bottom-6`) must move above the bar on phones.
9. **Every name next to its avatar.** The phone chat bar line ("**Bia:** cheguei!!") has no avatar in the prototype; the project rule needs `PlayerName` there. The "Ainda votando: …" list already uses `useWithNames`.

---

## 1. Conventions

### 1.1 Logical sizes and offsets
- Desktop stage 1280 x 800, phone 390 x 844 (`shell.js` `SIZES`). The phone has a 40 px status bar mock (`.s-statusbar`, `.s-notch`): demo only.
- Match header `.s-head`: 76 px tall on desktop (padding 0 28 px); on phones 64 px tall at top 26 px (padding 0 16 px).
- Scene area `.s-scene`: top 76 px desktop / 90 px phone, to the bottom. `.s-scene.full` (lobby) starts at 0.
- Times below are seconds from the scene's own `t0`, unless marked as `S+`, `R+`, `T+` (server times, section 4).

### 1.2 GSAP to motion/react
The prototype is GSAP; the implementation uses `motion/react` with the same durations (seconds) and these eases. GSAP's default ease (no `ease` given) is `power1.out`.

| GSAP | motion `ease` (exact function) | cubic-bezier fallback |
|---|---|---|
| `power1.out` (default) | `t => 1 - (1 - t) ** 2` | `[0.25, 0.46, 0.45, 0.94]` |
| `power2.in` | `t => t ** 3` | `[0.55, 0.055, 0.675, 0.19]` |
| `power2.out` | `t => 1 - (1 - t) ** 3` | `[0.215, 0.61, 0.355, 1]` |
| `power3.out` | `t => 1 - (1 - t) ** 4` | `[0.165, 0.84, 0.44, 1]` |
| `power3.in` | `t => t ** 4` | `[0.895, 0.03, 0.685, 0.22]` |
| `power3.inOut` | `t => t < 0.5 ? 8 * t ** 4 : 1 - 8 * (1 - t) ** 4` | `[0.77, 0, 0.175, 1]` |
| `sine.inOut` | `t => -(Math.cos(Math.PI * t) - 1) / 2` | `[0.445, 0.05, 0.55, 0.95]` |
| `back.out(s)` | `t => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2` | none (overshoot) |
| `none` | `"linear"` | |

Suggestion: add `gs = { p1Out, p2In, p2Out, p3Out, p3In, p3InOut, sineInOut, backOut(s) }` to `src/lib/motion.ts` next to `dur` and `ease`. The file's comment "Nothing bounces" no longer holds for the stage scenes; update it.

`yoyo: true, repeat: n` = keyframes going back and forth `n + 1` times, each leg `duration` long.

### 1.3 Sync model
The prototype keeps non-tween state in "tracks" (pure functions of the playhead) so seeking anywhere lands on the right frame. The game equivalent is the server clock: every beat is `startsAt + offset`, every client computes `elapsed = serverNow - startsAt` (`useServerClock(offset, 50)`, as `VoteScreen` does for the roulette), and a client that mounts late (reload, slow network) jumps straight to the right state.
Recommended pattern per animated element: on mount read `e0 = elapsed` once; if `e0 >= at + duration` render the end state with `initial={false}`; if `at <= e0 < at + duration` start now with the full duration; else use `transition.delay = at - e0`. Text and class switches (counts, "Confirmou") are plain functions of `elapsed`.

---

## 2. The shell (shell.js, stage.css, flow.css)

### 2.1 Tokens to add to `globals.css`
The repo has every colour in the prototype except these (values from `flow.css`). Dark mode in the repo is `[data-theme="dark"]` only (next-themes), so put the dark values there; also map them in `@theme inline`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand-stage` | `#2b69c8` | `#1d4a93` | solid blue stage (cold open, draw) |
| `--brand-butter` | `#f6e3a1` | `#f6e3a1` | "?" glyphs and your "?" card on the blue stage |
| `--on-brand` | `#ffffff` | `#ffffff` | text on the blue stage |
| `--wash-mix` | `20%` | `26%` | strength of a step wash |
| `--on-seat-1..4` | `#fff`, `#2a1707`, `#fff`, `#fff` | `#0f1b30`, `#2a1707`, `#06211f`, `#1d0f2e` | text on a seat colour (later scenes) |

Names differ in one place: the prototype's `--sunken` is the repo's `--surface-sunken` (Tailwind `bg-sunken`). `--sky-deep`, `--yes-deep`, `--apricot-deep`, shadows, seats, `--scrim` already exist with the same values.

### 2.2 Backdrop: wash + glyphs (`ctx.wash`, `ctx.glyph`)
One layer per colour, crossfaded. Fixed behind everything (like `TurnBackdrop`, portaled to `<body>`, `-z-10`).

- **Wash** (`.s-wash`): `::before` fills with `color-mix(in oklab, C var(--wash-mix), var(--canvas))`. `::after` sits at `inset: -20%` with two radial gradients, `closest-side at 18% 22%` C 34% and `closest-side at 82% 70%` C 26%, drifting `22s ease-in-out infinite alternate` from `translate(0,0) scale(1)` to `translate(4%,-3%) scale(1.08)`.
- **Solid wash** (`.s-wash.solid`, brand only): `::before` is C itself; `::after` is a white highlight `rgba(255,255,255,.14)` at 70% 30% and a shade `rgba(0,0,0,.16)` at 20% 85%.
- **Crossfade** `ctx.wash(t, key, dur)`: the new layer opacity 0 to 1 and the previous 1 to 0, both `dur`, `sine.inOut`.
- **Glyphs** (`.s-glyphs`): 7 symbols at fixed spots `[left %, top %, size px, bob s]`: `[5,20,44,9]`, `[12,76,30,8]`, `[30,9,24,10]`, `[47,86,36,9.5]`, `[66,13,28,8.5]`, `[82,58,50,10.5]`, `[93,30,24,7.5]`; sizes x0.8 on phones; animation delay `-i * 1.3 s`. Font display 800, line-height 1. Text glyphs at opacity 0.16 coloured `var(--gc)`; emoji glyphs at opacity 0.22 with `saturate(.9)`. Bob: `0%,100%: translateY(0) rotate(-8deg)`, `50%: translateY(-16px) rotate(8deg)`, ease-in-out infinite.
- `ctx.glyph(t, key, color, dur = 0.8)`: the chosen glyph layer to opacity 1, the others to 0, `dur`, power1.out; `--gc` switches to `color` at `t` (no tween).
- Today's `TurnBackdrop` is almost the same idea (its "?" marks sit at nearly the same spots, opacity 0.14; its tint is 7% plus blurred blobs). Generalize it into one `StageBackdrop({ color, solid, glyphs, glyphColor })` mounted once in `RoomScreen` (so colours crossfade across screens). Whether turns move to the stronger 20% wash is a later-scene call; scenes 1-4 use the prototype wash.

Backdrop per step (scenes 1-4):

| Step | Wash | Glyphs | Starts |
|---|---|---|---|
| Lobby | none (canvas) | none | |
| Cold open / "Rodada N" | `brand` solid `--brand-stage` | "?" in `--brand-butter` | lobby exit +0.1 s (0.7 s) / +0.2 s (0.8 s) |
| Theme vote | `butter` (`--butter`) | "?" in `--on-butter` | vote scene t0 (0.8 s each) |
| Theme reveal | the theme set's colour | the set's 7 glyphs | theme scene +0.9 s (wash 1.1 s, glyphs 0.8 s) |

The scene "dots" in the chapter rail use the same colours: lobby `--surface`, cold open `--brand-stage` (ink `#fff`), vote `--butter` (ink `--on-butter`), theme `--no` (ink `--on-no`).

Proposed set look table (only "heroes" is from the prototype; the rest is a proposal to review, avoiding butter and solid brand, which belong to the vote and the draw):

| Set | Colour | Glyphs (7, spot order) |
|---|---|---|
| heroes 🦸 | `--no` (prototype) | 🦸 ⚡ 🛡️ 🦸‍♀️ 💥 ⚡ 🦹 (prototype) |
| screen 🎬 | `--apricot` | 🎬 🍿 🎥 ⭐ 🎞️ 🍿 🎬 |
| cartoons 🧸 | `--seat-4` | 🧸 🎈 🪀 🧸 🎨 🎈 🪁 |
| anime 🍥 | `--no` | 🍥 ⛩️ 🌸 🍜 🗡️ 🌸 🍥 |
| games 🎮 | `--sky` | 🎮 👾 🕹️ ⭐ 🍄 👾 🎮 |
| books 📚 | `--yes` | 📚 📖 ✒️ 🐉 📜 📖 📚 |
| powers ⚡ | `--seat-4` | ⚡ ✨ 🔮 🌀 🪄 ✨ ⚡ |
| myths 🐉 | `--yes` | 🐉 🦄 🧜‍♀️ 🔱 🧚 🐉 👻 |
| scifi 🚀 | `--sky` | 🚀 👽 🤖 🛸 🪐 🚀 🌌 |
| warriors ⚔️ | `--no` | ⚔️ 🏴‍☠️ 🥷 🛡️ 🗡️ ⚔️ 🏹 |
| animals 🐾 | `--yes` | 🐾 🦁 🐶 🐱 🐸 🐾 🦊 |
| music 🎤 | `--seat-4` | 🎤 🎸 🎵 🥁 🎧 🎶 🎤 |
| celebs ⭐ | `--apricot` | ⭐ 🌟 🎬 📸 🎤 ⭐ 💫 |
| sports ⚽ | `--yes` | ⚽ 🏀 🏆 🎾 🏈 ⚽ 🥇 |
| history 🏛️ | `--apricot` | 🏛️ 👑 📜 🗿 ⚱️ 🏛️ 🎨 |
| world 🌎 | `--sky` | 🌎 🗺️ ✈️ 🗼 🏝️ 🌍 🧭 |
| jobs 💼 | `--sky` | 💼 🩺 🔍 🧑‍🍳 👮 💼 🧑‍🏫 |
| family 👪 | `--apricot` | 👪 💞 👶 👵 👫 👪 🎂 |
| quirks 🎭 | `--seat-4` | 🎭 💬 🤪 🎭 😎 🗯️ 🤓 |
| looks 🕶️ | `--no` | 🕶️ 👗 💇 👒 💄 🕶️ 👟 |
| typed theme (`null`) | `--sky` | ✍️ and "?" alternating, "?" in `--sky` |

Put it in `src/game/theme-sets.ts` beside `emoji` (for example `look: { color, glyphs }`), since later scenes (picking) reuse the glyphs.

### 2.3 Match header (`.s-head`) and the lobby hand-off (`ctx.lobby`)
Prototype header, left to right: `[History button (hidden in scenes 1-4)] [theme tag] [spacer] [Sair] [timer]`.
- Theme tag `.s-tagtheme`: 40 px pill, padding 0 16 0 12, `--surface` with `--shadow-card`, 700 15 px; set emoji, then `Tema:` (600 13 px muted, hidden on phones), then the theme name. Hidden (`visibility`) until theme scene +2.3 s.
- Leave `.s-ghostbtn`: 40 px pill, 1.5 px `--line-strong` border, `--surface`, 600 14 px, out icon 18 px + "Sair" (icon only, 40 x 40, on phones). Today's `LeaveMatchButton` already matches.
- Timer `.s-timer`: see 2.4.

`ctx.lobby(tEnd)` = the lobby top bar (logo, language, theme toggle, user) leaves and the match header arrives:
- Top bar: `yPercent 0 to -100` and opacity 1 to 0, 0.45 s `power2.in`, at `tEnd`. (On phones the top bar scrolls with the page; on desktop it is fixed.)
- Match header: hidden until `tEnd + 0.4`, then opacity 0 to 1, 0.4 s.

Today: `GameHeader` shows `ThemeTag` (butter pill) on the left and `LeaveMatchButton`, `actions`, `Timer`, `after` on the right; `GameFrame hideTheme` keeps the tag off on the vote and theme screens.
Changes:
- `GameHeader` gets `themeFrom?: number` (server ms; the tag is hidden before it and pops in at it: scale 0.4 to 1 and opacity 0 to 1, 0.5 s, back.out(2.2)) and `clockFrom?: number | false` (no timer before it, then the 0.6 to 1 pop; `false` = no timer at all, used during the theme reveal).
- The prototype tag is a `--surface` pill with a card shadow, not butter. It will sit on coloured washes for the whole match (and a butter pill would disappear into the butter vote wash and butter-ish themes), so switch `ThemeTag` to the prototype look.
- History moves to the left of the tag (other spec); hidden in scenes 1-4.

### 2.4 Step clock (`ctx.clock`)
Prototype: `ctx.clock(t, secs, until, total)` shows the timer from `t` to `until`, counting `secs` down; digits `m:ss` with `Math.ceil`; a 3 px bar along the pill's bottom edge, `scaleX(left / total)`, `--sky`; `.low` (text, border and bar in `--no`) when `left <= min(20, total / 3)`. Pill: 40 px, padding 0 16, `--surface`, 1 px `--line`, DM Mono 500 18 px, tabular numbers.
- Today's `Timer` has the same low rule (`isLowClock`), plus refill, cut ("-18 s") and tick sound, with an inner 72 px bar in `--ink`. Keep today's `Timer` (it carries behaviour the prototype only mocks). Add only the entrance: hidden while `now < clockFrom`, then scale 0.6 to 1, 0.4 s, back.out(2.5). No refill animation for vote and theme (the refill stays for turn reveals).
- Vote clock in the prototype: `c.clock(t0 + 1.7, 20, t0 + 8)`, real speed (the prototype only speeds up the pick clock with `clockFast`).

### 2.5 Type and pieces used by scenes 1-4 (stage.css)
| Class | Look | Tailwind in the repo |
|---|---|---|
| `.s-big` | display 800, letter-spacing -0.03em, line-height 1.02, `text-wrap: balance`, size per use | `font-display font-extrabold tracking-[-0.03em] leading-[1.02] text-balance` |
| `.s-h1` | display 700, -0.02em, 1.05 | lobby title (already `titleClass`) |
| `.s-sub` | `--ink-muted`, balance | `text-ink-muted text-balance` |
| `.s-kicker` | pill, `--sunken`, padding 4 12, 600 12 px, 0.08em uppercase, muted | same as today's vote/theme kicker span |
| `.s-opt` | flex 1, radius 32, padding 22, column, left text, overflow hidden, `--shadow-card` | today's `OptionCard` (`rounded-xl p-4 sm:p-6`) |
| `.s-optlab` | 600 12 px, 0.08em uppercase, opacity .75, emoji + set name | today's label row |
| `.s-optname` | flex 1, display 800 38 px, line-height 1.06, -0.02em, margin 10 0 | today `clamp(30px,3vw,40px)` (38.4 px at 1280) |
| `.s-votes` | row, space-between, min-height 32, 600 14 px; voters 32 px, -8 px overlap, 2 px `--surface` ring | today's row |
| `.s-share` | 6 px bar at the bottom, `scaleX(share)` from the left; colours `--on-butter`, `--sky`, `--apricot` | today's bar (`h-1.5`) |
| `.s-opt.mine` | `0 0 0 3px var(--canvas), 0 0 0 6px var(--ink)` | today's ring |
| `.s-tone-0/1/2` | butter / sky-soft / apricot-soft | today's `TONES` |
| `.s-dots i` | 10 px dots, gap 5, `--ink`, opacity .3, scale .7 (1 and 1 when voted) | today's footer dots |
| `.s-mini` | `--surface`, radius 16, padding 6 6 8, `--shadow-card`, column gap 5; portrait 4:5 radius 11; name 700 12.5 px, ellipsis | new (cold open, rule cards) |
| `.s-portrait` | 4:5, radius 18, `--sunken`, cover | `Portrait` component |
| `.s-qface` | 4:5, radius 18, display 800 "?" | the "?" card |
| `.s-answer` | 40 px pill, padding 0 16, 700 16 px, 1.5 px `--yes` border, `--yes` fill, `--on-yes` text | `AnswerChip pressed` |

### 2.6 Confetti (`ctx.confetti`)
46 pieces 10 x 14 px, radius 3, colours `--sky, --apricot, --butter, --yes, --no, --seat-4`; each launched from `y = 0.35 H` up to `0.05 H - (i % 7) * 18`, then down to `H + 40` (linear keyframes), drifting `x = ((i * 37 % 100) / 100 - 0.5) * 0.9 W`, rotating `540 + 20 i` deg, `2.2 + (i % 5) * 0.25 s`, power1.out; gone at +3.6 s.
Today `fireConfetti()` (canvas-confetti, 30 pieces from 50% / 30%, theme colours, skipped for reduced motion) already fires when the winner shows. Keep `fireConfetti()` and fire it at theme scene +0.9 s; there is no need to port the DOM confetti.

### 2.7 Chat (`Chat(ctx)`)
One chat for the lobby and the match, mounted once in `RoomScreen` (inside `RoomProvider`, beside `RevealOverlay`).

**Desktop tab** (`.s-chat`): `position: fixed; right: 16px; bottom: 0; width: 340px`; `--surface`, 1 px `--line` border with no bottom border, radius 20 20 0 0, shadow `0 -2px 6px rgba(18,22,31,.06), 0 -16px 40px rgba(18,22,31,.14)`; column, overflow hidden. Height 56 px folded; `round(0.62 * viewport height)` open (496 px at 800).
**Phone bar**: `left: 8px; right: 8px`, radius 22 22 0 0, 60 px folded (head padding-bottom 4 px), `round(0.66 * height)` open (557 px at 844). Add the bottom safe-area inset in the real app.

**Head** (`.s-chathead`, the click target for open and fold): 56 px (60 phone), row, gap 10, padding 0 12 0 16, background and colour transition 300 ms ease-soft. Contents:
- chat icon 21 px;
- desktop: "Chat" (display 800 18 px); phone: the last message line instead (14.5 px, ellipsis; "**Bia:** cheguei!! 👋", or "Chat da sala" before any message). **Add the sender's avatar** before the name (project rule; the prototype has none here);
- desktop: faces of up to 3 unread senders (24 px avatars, -7 px overlap, 2 px `--sky` ring), newest first;
- spacer, then the count (24 px pill, DM Mono 600 12 px, hidden unless unread), then the chevron (32 px circle, up icon 18 px, `--ink-muted`; rotates 180 deg when open, 400 ms ease-soft).

**Unread** (a message from someone else while folded; your own messages and system lines never count): the head turns `--sky` / `--on-sky`, the count shows inverted (`--on-sky` fill, `--sky` text), the chevron goes `--on-sky`, and the whole tab nudges: `3.6 s var(--ease-soft) 1.2 s infinite`, keyframes `0%, 80%, 100%: translate 0`, `86%: -7px`, `92%: 0`, `96%: -2px`. On each new unread message:
- the tab hops `y: [0, -14, 0, -5, 0]` (linear keyframes) over 0.6 s;
- the count pops, scale 0.3 to 1, 0.45 s, back.out(3);
- desktop only: a bubble pops above the tab (`.s-chatpop`, `right: 16px; bottom: 68px; width: 340px`, column aligned to the end, gap 8, no pointer events). Bubble `.s-popmsg`: 30 px avatar + text box (max 300 px, `--surface`, `--shadow-pop`, radius 18 18 6 18, padding 9 14, 15 px / 1.35, sender name above it in 700 12 px muted). In: from `y 16, scale .8, opacity 0`, origin 85% 100%, 0.4 s back.out(1.8). Out after 3.05 s, or 0.1 s before the chat opens, whichever comes first: to `y 10, scale .9, opacity 0`, 0.3 s power2.in.
Opening the chat clears the count, the faces and the blue at once.

**Open and fold**: a click on the head. Height tween 0.5 s: opening back.out(1.15), folding power3.inOut. It overlays the screen (no push).

**Body**: 1 px `--line` top border. Messages column (justify end, gap 10, padding 12 14, scrolls):
- someone else: grid `28px 1fr`, avatar 28 px spanning two rows, name (700 12 px muted, padding-left 4), bubble (`--sunken`, radius 16 16 16 5, padding 7 12, 14.5 px / 1.35, wraps anywhere);
- you: right aligned, no avatar or name, `--sky` / `--on-sky`, radius 16 16 5 16;
- a message that is only emoji ("😂"): 34 px, no bubble;
- in: from `y 14, opacity 0, scale .96`, origin bottom-left (yours bottom-right), 0.35 s back.out(1.6);
- system line `.s-sys`: centred pill, `--sunken`, padding 4 12, 700 12.5 px muted, no wrap; in from `opacity 0, y 8`, 0.3 s.

**Compose**: padding 10 12 12, top border; field 46 px pill, 1.5 px `--line-strong`, padding 0 6 0 16, 500 14.5 px, placeholder "Mandar mensagem…"; send button 34 px circle `--ink` / `--on-ink` with an up arrow (16 px, stroke 2.5).
**No** "who is in the room" list, **no** emoji shortcuts.

Data (from `flow.html`): table `room_messages` (room, author, text up to 280 chars, kind message/system), Realtime on the room's channel, per-player rate limit in `rate-limit.ts`, deleted when the room closes; the local backend needs the same in memory. Add `visible_at` for staged system lines (finding 5).

Layering: today the reveal overlay is `z-30`, history drawer `z-40`, toasts and popovers `z-50`, confetti `z-60`. Put the chat at `z-40` (above reveals so people can type during them; under popovers, dialogs and toasts). Toasts at `bottom-6` collide with the phone bar: lift them by the bar height on phones.

### 2.8 History (`History(ctx)`), not used by scenes 1-4
Only for reference: a button left of the theme tag (hidden until turns start) opens a full-height panel on the left: 360 px desktop (it pushes the screen: main area `left` 0 to 360, 0.55 s power3.out; back 0.4 s power3.in), 88% of the width on phones over a `--scrim` (radius 0 28 28 0). Filters by player and by kind as today. Specified elsewhere.

---

## 3. The scenes

Prototype durations: lobby 8.6 s, cold open 7.6 s, vote 8.5 s, theme 7.4 s (scene starts at 0, 8.6, 16.2, 24.7; end 32.1). The prototype squeezes the 20 s vote into 6.3 s of votes, so those numbers are not the game's lengths (section 4).

### Scene 1: Lobby ("Sala", "a de hoje, com o chat no canto", 8.6 s)

**Decision**: the lobby stays exactly as it is; it only gains the chat. The prototype redraws today's `lobby-screen.tsx` (host's view, first round) to show the chat and the hand-off to the match.

**Layout** (as today): back link "Sair da sala", title "Sala do Caio", greeting "Sala criada. Agora convide alguém.", sub "Mande o link ou dite o código. Você começa a partida quando quiser, com 2 jogadores ou mais.", QR (not on phones), code cells "K7Q2M", "Copiar link", "Jogadores · 4/4" with player rows (Caio (você) / crown "Anfitrião"; Bia "Confirmou" ✓; Leo "Confirmou" ✓; Rafa "Ainda não confirmou" ✗), and the side card: game thumb, "Quem sou eu?", the "Começar partida" key, "Pública: qualquer um entra", "Até 4 jogadores", times "Perguntar 1:20 · Responder 1:20 · Palpitar 1:00 · Conferir 0:40", "Todos votam · todos os conjuntos", "Editar configuração". Top bar: logo, language ("Português"), theme toggle, user ("Caio"). (The prototype's narrower 300 px side card is left over from an older layout; ignore it, keep today's.)
Desktop: the chat tab bottom right. Phone: the chat bar along the bottom; the page scrolls under it.

**Timeline**

| t | What | Tween | Real or demo |
|---|---|---|---|
| 0.00 | player rows | from `y 12, opacity 0`, 0.4 s power3.out, stagger 0.06 | demo (today: `riseIn` on rows that join later) |
| 0.40 | Bia: "cheguei!! 👋" (chat folded) | tab hop, count 1, blue, bubble 0.40-2.80 | demo message, real behaviour |
| 1.40 | Leo: "bora que hoje eu ganho" | count 2, faces Leo, Bia | demo message, real behaviour |
| 2.30 | pointer to the tab head (40 px left of its centre), 0.6 s power3.inOut | ripple on click | demo |
| 2.80 | both bubbles leave (0.1 s before opening) | 0.3 s power2.in | real |
| 2.90 | chat opens, 56 to 496 (phone 60 to 557) | 0.5 s back.out(1.15); unread cleared | real |
| 3.40 | Rafa: "😂" (big emoji) | open: no unread | demo |
| 3.70 | Rafa gets ready: mark ✗ to ✓ (`--no-soft`/`--no` to `--yes-soft`/`--yes`), "Ainda não confirmou" to "Confirmou" | mark scale 0.5 to 1, 0.4 s back.out(3) | demo of a real feature (today: 300 ms colour transition, no pop) |
| 3.90 | you type "começando!" at 16 chars/s, placeholder hides | sent at about 4.68 (end + 0.15) as your sky bubble | demo |
| 4.80 | pointer to the open head, 0.5 s | | demo |
| 5.30 | chat folds, 496 to 56 | 0.5 s power3.inOut | real |
| 5.20 | phone only: the page scrolls so the Start key clears the bar | 0.7 s power3.inOut | demo |
| 5.70 | pointer to "Começar partida", 0.6 s; press at 6.30 | key `y 6` and back, 0.09 s each | demo (real key has its own press) |
| 6.60 | chat system line "▶ Partida começou"; pointer hides (0.25 s) | sys line in 0.3 s | line real (server writes it on `START`) |
| 7.00 | lobby content: opacity 0, scale 0.97 | 0.45 s power2.in | real (lobby exit) |
| 7.00 | top bar: `yPercent -100`, opacity 0 | 0.45 s power2.in | real |
| 7.10 | brand wash in | 0.7 s sine.inOut | real |
| 7.20 | "?" glyphs in, `--brand-butter` | 0.8 s | real |
| 7.40 | match header (with "Sair") in | opacity 0 to 1, 0.4 s | real |

**Leaves into**: the blue stage, empty, until the cold open starts (1.6 s after the exit begins).

**Today vs proposal**
- Stays: everything in `lobby-screen.tsx` (layout, strings, ready flow, StartDialog, settings editor).
- Changes: (1) the chat tab/bar is mounted by `RoomScreen`, so it is there in the lobby; (2) the lobby page gets bottom padding so the tab never hides the last row: about `pb-[76px]` on phones (bar 60 + 16), about `pb-[72px]` on desktop (the right column's "Editar configuração" can land under the 340 px tab when the page is short); (3) the lobby exit: today `PhaseScreens` fades the lobby out in 0.26 s and fades the next screen in with `y 16`. New: the lobby leaves with opacity 0 + scale 0.97 (0.45 s power2.in) while its top bar slides up; the next screen comes in with opacity only. Use exit variants on the lobby root so `AnimatePresence` drives both the header and the content.

### Scene 2: Cold open ("Abertura", "o jogo em duas frases", 7.6 s)

Before the theme vote, on the solid blue stage, like a show's title card. Full version only on the room's first match; later matches get a short "Rodada N" card (1.5 s, choreography not in the prototype, see below).

**Layout** (scene area, a centred column; text `--on-brand`; padding 0 60 40 desktop, 0 22 40 phone)
- Two lines in the same grid cell (they swap in place), max width 760 / 340 px, `.s-big` 58 / 34 px:
  - L1 "Cada um ganha um personagem secreto."
  - L2 "Só você não vê o seu. Descubra perguntando."
- Row of people, 104 / 78 px under the lines: centred, gap 72 / 30 px, aligned to the bottom. Each person is a column (gap 10 / 6 px):
  - card `.s-mini`, 104 / 62 px wide, padding 6 / 4, radius 18 / 12, `transform-origin: 50% 100%`;
    - yours: "?" face (`.s-qface`), 72 / 44 px, `--brand-butter` fill, `#2B69C8` text (fixed brand colours, both themes);
    - others: a portrait;
  - a stick: 3 x 16 px (10 px phone), `rgba(255,255,255,.5)`, radius 3, margin-top -6;
  - avatar 64 / 46 px;
  - name, 700 16 / 13 px: "você" for you, the name for others.
- Order in the prototype: Bia, **you**, Leo, Rafa (you second). Rule for n players: you at index `floor((n - 1) / 2)`, the others in turn order around you.
- Bubble "Eu sou da Marvel?": white, `#1e2433` text, radius 20, padding 12 18 (8 12), 700 20 / 15 px, shadow `0 12px 30px rgba(0,0,0,.25)`, a tail (18 / 14 px square rotated 45 deg, radius 3, at bottom -8 / -6 px, centred). Centred over your card, its bottom `0.12 * card height + 16 px` (12 phone) above the card's top, so it clears the card after the 1.12 grow.
- Answer chips, each centred over a card, 12 / 8 px above it: "Sim" (`.s-answer`, 40 / 32 px, 16 / 13 px) over the first player after you; "Provavelmente sim" (`#e7fbf8` fill, `#0b7a75` text; just "Sim" on phones) over the second.

**Timeline** (t0 = scene start)

| t | What | Tween |
|---|---|---|
| 0.15 | L1 in | from `y 30, opacity 0`, 0.6 s power3.out |
| 0.55 | each person column in | from `y 60, opacity 0`, 0.55 s back.out(1.5), stagger 0.09 |
| 1.00 | cards turn face up | from `rotateY 90, scale .6`, 0.55 s back.out(1.8), stagger 0.12 (yours lands 2nd at 1.12) |
| 2.00 | your card wiggles | rotate 0, -7, 0, -7, 0, -7, 0: 6 legs of 0.18 s sine.inOut (ends 3.08) |
| 3.40 | L1 out | to `y -24, opacity 0`, 0.35 s power2.in |
| 3.65 | L2 in | from `y 26, opacity 0`, 0.55 s power3.out |
| 3.70 | others' cards step back | to `opacity .55, scale .92`, 0.4 s power1.out |
| 3.70 | your card grows | to `scale 1.12`, 0.45 s back.out(2), from its bottom |
| 4.40 | bubble pops | from `opacity 0, scale .4`, origin `0% 100%`, 0.45 s back.out(2) |
| 5.20 | chips pop | from `opacity 0, scale .4, y 10`, 0.4 s back.out(2.4), stagger 0.25 |
| 7.10 | everything out | whole box to `y -40, opacity 0`, 0.45 s power2.in |
| 7.60 | scene ends | |

The header shows only "Sair" (no tag, no timer). The chat stays where it is.

**Real vs demo**: the people row is real (the room's players, avatars, names, seat order, "você"). The cards over the others' heads are illustrative: nobody has a character before the vote. The prototype reuses the match's cards (Iron Man, Wonder Woman, Hulk); the game should use illustrative portraits that need no copyrighted art, for example the critter "held cards" of the "Who am I?" banner (`HeldCard` / `critterUri` with fixed seeds in `who-am-i-banner.tsx`). The question and the answers are fixed, translated texts. Use `AnswerChip` (`yes`, `probably_yes`, `pressed`, small sizes) for the chips if its colours read well on the blue; otherwise keep the prototype's fixed colours.

**Edge cases**: 2 players: you plus one, only the "Sim" chip. 3 players: you in the middle, both chips. Phone at 4 players: 4 x 62 + 3 x 30 = 338 px fits 346 px.

**Short version** (later matches, 1.5 s; the prototype only describes it: "Nas seguintes vira um cartão curto de 1,5 s: 'Rodada 2'"). Proposal: same blue stage; "Rodada {n}" as `.s-big` 58 / 34 px: in at 0.15 (from `y 30, opacity 0`, 0.6 s power3.out), out at 1.05 (`y -24, opacity 0`, 0.35 s power2.in). `n = view.round + 1`.

**Today vs proposal**: entirely new; nothing like it exists. Put it in a `ColdOpen` component that `VoteScreen` (and `ThemeScreen`, for host-typed themes) render inside their own `GameFrame` while the intro lasts, so the header does not remount between the cold open and the vote. Announce L1 and L2 to screen readers in an `output aria-live="polite"`.

### Scene 3: Theme vote ("Votação do tema", "a frase sobe, os temas entram", 8.5 s)

**Layout**
- Title "Agora, escolham juntos um tema." `.s-big` 58 / 34 px, max width 720 / 340 px, `transform-origin: 50% 0`. Final scale `k = 0.7` desktop (40.6 px), `0.84` phone (28.6 px).
- Sub "O mais votado vence. Empate vai pra roleta.", 17 / 15 px, muted, 8 px under the title.
- Heading block: top 64 px (8 px phone) inside the scene, padding 0 20 px, centred.
- Card row: left/right 40 px (16 px phone), top = title top + `title height * k` + sub height + 36 px (22 phone); a row with gap 16 on desktop, a column with gap 10 on phones. Desktop cards min-height 250 px. Phone cards: min-height 118, padding 16, radius 26, name 27 px, margin 6 0.
- Card content: label "🦸 Heróis e vilões" (emoji 16 px + set name), name ("Super-heróis", "Desenhos dos anos 90", "Vilões da Disney"), voters + count ("Nenhum voto", "1 voto", "N votos"), share bar.
- Footer: bottom 40 px (14 px phone), centred, gap 4: dots + "0 de 4 votaram" (600 14 px), then "Ainda votando: todo mundo" (500 13 px muted), later "Ainda votando: Leo, Rafa…", "Todo mundo votou!".
- Approximate desktop positions: the two-line title is about 118 px tall at full size, so its solo position is about 239 px lower than its final one (the scene centre); the cards start near y 284 and end near 534.

**Timeline**

| t | What | Tween | Real or demo |
|---|---|---|---|
| 0.00 | butter wash, "?" glyphs in `--on-butter` | 0.8 s each | real |
| 0.20 | title in, alone, at the scene's vertical centre | from `y = centre + 30, opacity 0` to `y = centre`, 0.6 s power3.out | real |
| 1.00 | title rises and shrinks into the heading | to `y 0, scale k`, 0.7 s power3.inOut | real |
| 1.30 | cards dealt | from `y 90, opacity 0, rotate [-7, 0, 7]`, 0.7 s back.out(1.3), stagger 0.09 | real |
| 1.50 | sub in, under the shrunken title | from `opacity 0, y = -shrink + 8` to `y = -shrink` (shrink = title height x (1 - k)), 0.4 s | real |
| 1.70 | **clock appears and starts** (0:20) | header timer scale 0.6 to 1, 0.4 s back.out(2.5) | real: `stepStartsAt` |
| 1.90 | footer in | opacity, 0.4 s | real |
| 2.10 | chat: Rafa "desenhos pfv 🙏" | | demo |
| 2.50 | Bia votes 1 | | demo vote, real rendering |
| 2.80 | pointer to card 1, click at 3.40: `.mine` ring, card `y -6` (0.3 s back.out(2)) | | demo click, real ring |
| 3.40 | you vote 1 | | |
| 4.30 | Rafa votes 2 | | |
| 5.20 | Leo votes 1: "Todo mundo votou!" | | |
| 5.70 | chat: Leo "heróis!!!" | | demo |
| 6.40 | chat: Bia "rafa perdeu kkkk" | | demo |
| 6.50 | losers dim; winner grows | losers `opacity .35, scale .95, saturate(.4)`; winner `scale 1.04`; 0.4 s | real (vote closed) |
| 8.00 | heading and footer out; clock gone | opacity 0, 0.3 s | real |
| 8.00 / 8.05 | losers drop away | `opacity 0, y 30`, 0.35 s each | real |
| 8.50 | scene ends: the winner card stays, scene 4 takes it | | |

Each vote: a 32 px avatar joins the card's voters (from `scale .3, y 10, opacity 0`, 0.45 s back.out(2.2)); the count text changes; the share bar goes to `votes / players` (0.5 s back.out(1.4)); the next footer dot lights (`opacity 1, scale 1`, 0.3 s back.out(3)); the progress and waiting texts update.

**Real vs demo**: options, set labels and emoji, votes, voters, counts, share, dots, "who is still voting", the roulette on a tie: all real (`view.vote`). The pointer, the timing of the votes and the chat lines are demo.

**Today vs proposal** (`vote-screen.tsx`)
- Stays: `OptionCard` (tones, tilt deal, stagger 0.09, voters with `layoutId`, count, share bar, ring, `y -6` for your vote, hover and tap), optimistic voting, `Footer` (dots, progress, names with avatars, " · clique em outro tema pra mudar o voto"), the tie roulette (`rouletteAt`, 2 s spin, light sweep) and the spotlight, the `aria-live` announcement. Today's tones, radius, padding and font sizes already match the prototype.
- Changes:
  1. **Heading**: the kicker pill "Votação do tema" and the h1 "Vote no tema" become one big title "Agora, escolham juntos um tema." that plays the solo beat (0.2 to 0.8 s centred), then rises and shrinks to `k` (1.0 to 1.7 s). Keep the natural font at 58 / 34 px and scale it down (crisp text), and reserve its final height with a measured wrapper (`useLayoutEffect` + `ResizeObserver`: height = title height x k), so the cards sit right under it. The tie title "Deu empate!" keeps today's swap, in the new heading.
  2. **Deal timing**: today the cards deal on mount; now they deal at +1.3 s, after the title has started to rise. Cards are not clickable before the clock starts (+1.7 s); the server rejects early votes too (`guardStep`).
  3. **Clock**: hidden until `stepStartsAt`, then pops (2.3, 2.4).
  4. **Backdrop**: butter wash + "?" glyphs (none today).
  5. **End**: today the losers leave (`opacity 0, scale .9`) and the winner grows in place to 720 px with a crown, under "O tema é…" and "Escolhido pela maioria." / "A roleta decidiu.". Now: losers dim (as today), then heading, footer and losers leave at R+2.8, and the winner card travels to the centre as scene 4's hero (shared `layoutId`). No crown in the prototype. "O tema é…" becomes scene 4's kicker; "chosenByVotes" and "chosenByDraw" are not shown in the prototype (keep "A roleta decidiu." in the `aria-live` text after a tie, or drop it).
  6. **Width**: the prototype row spans the stage minus 40 px each side (about 1200 px at 1280); today's column is capped at 1040 px. Widen to about 1200 px.
  7. **Phones**: the footer must clear the 60 px chat bar (bottom padding about 76 px); in the prototype it sits under the bar.
  8. **Strings**: new `title` text (en "Now, choose a theme together.", the ROADMAP wording), new "Ainda votando: todo mundo" for nobody-voted-yet (`waitingEveryone`); the prototype's sub drops "tema" from today's "O tema mais votado vence. Empate vai pra roleta." (optional).
- `VOTE_SECONDS` 13 to 20 (`src/game/types.ts`), and the vote time in `PRODUCT.md` (today it lists the turn steps only; add "the theme vote lasts 20 s"). Tests in `engine.test.ts` (lines 234 and 350) expect `deadline = now + VOTE_SECONDS * 1000`; they change with the intro and the lead.

### Scene 4: Theme chosen + the rule ("Tema escolhido", "e a regra, mostrada", 7.4 s)

**Layout** (a centred column)
- Hero (gap 18, padding-bottom 40):
  - kicker `.s-kicker` "O tema é…";
  - the card: the winner's tone (prototype: tone 0, butter), 620 x min 290 px (phone 330 x 190), padding 30 / 20, radius 36, `--shadow-pop`. Inside: label "🦸 Tema escolhido" (emoji 18 px), name "Super-heróis" 84 / 50 px centred, voters (30 px avatars: Bia, you, Leo) + "3 votos".
- Rule box (over the same area, `inset: 0`, centred column, gap 26 / 18, padding-bottom 40):
  - "Todo personagem tem que ser deste tema." `.s-big` 34 / 23 px, max width 620 / 320;
  - a frame 520 x 196 (330 x 150), radius 28, 3 px dashed `color-mix(in oklab, var(--no) 70%, transparent)` (use the theme's wash colour, not always `--no`), a centred row with gap 18 / 10;
  - three `.s-mini` cards 112 / 84 px wide: "Homem-Aranha" ✓, "Tempestade" ✓, "Shrek" ✗; each with a badge (30 px circle at top/right -10 px; `--yes`/`--on-yes` check, or `--no`/`--on-no` x; icon 17 px).

**Timeline** (t0 = scene start = T)

| t | What | Tween |
|---|---|---|
| 0.00 | kicker in | from `opacity 0, y 10`, 0.4 s |
| 0.05 | the card flies to the centre and grows | from `scale .55`, `x -260` desktop / `y -40` phone (where the winner was), `opacity .6`, to `1, 0, 0, 1`, 0.9 s back.out(1.2). Real: shared `layoutId` from the winner's actual place |
| 0.90 | confetti | `fireConfetti()` |
| 0.90 | theme wash (1.1 s) and the set's glyphs (0.8 s) | sine.inOut / power1.out |
| 1.00 | chat system line "🦸 Tema: **Super-heróis**" | 0.3 s |
| 2.20 | hero out, up towards the header | to `scale .6, y -290` (phone -260), `opacity 0`, 0.55 s power3.in |
| 2.30 | header theme tag pops | from `scale .4, opacity 0`, 0.5 s back.out(2.2); stays all match |
| 2.60 | rule sentence in | from `opacity 0, y 20`, 0.5 s power3.out |
| 2.90 | frame in | from `opacity 0, scale .9`, 0.4 s |
| 3.30 | ✓ card 1 rises in | from `y 240, rotate -14, opacity 0` to `y 0, rotate -3`, 0.6 s back.out(1.6) |
| 3.75 | ✓ card 2 | from `y 240, rotate 12` to `rotate 2`, 0.6 s back.out(1.6) |
| 4.30 | ✗ card | from `y 240, rotate 10` to `rotate 4`, 0.55 s back.out(1.4) |
| 4.00 / 4.45 / 4.90 | badges pop | from `scale 0`, 0.35 s back.out(3), stagger 0.45 |
| 5.40 | ✗ card falls out | to `x 90` (40 phone), `y 300, rotate 50, opacity 0`, 0.8 s power2.in |
| 7.00 | rule box out | to `opacity 0, y -20`, 0.4 s |
| 7.40 | scene ends (the draw starts on the blue stage) | |

**Real vs demo**: real: theme name (in the viewer's language), set emoji, winner tone, voters and count; typed theme: "Escolhido por {host}" with the host's avatar instead of the votes (today's `chosenBy`), butter tone, ✍️. The rule examples come from data (finding 7): the two ✓ cards are the theme's most picked characters (`Portrait` + name), the ✗ card a popular character of a theme from another set. The prototype's portraits (Spider-Man, Storm, Shrek) are demo drawings.
- Typed theme, or a theme with fewer than two known picks: **only the sentence** (no frame, no cards). Proposal: sentence in at 2.6, out at 5.0 (0.4 s), scene ends at 5.4.
- Later matches of the room: no rule at all (the prototype's chart: "theme 3" in later rounds). The hero leaves at 2.2 and the scene ends at about 3.0, which matches today's `REVEAL_TIMING.theme` of 3000 ms.

**Today vs proposal**
- `vote-screen.tsx`: today the "winner" stage (only the winner left, grown to 720 px, crown, "Tema escolhido", heading "O tema é…") lasts the rest of the 3 s reveal, with confetti when it starts. Replace with the theme scene (`ThemeStage`), shared with the host path. Keep `celebrated` (confetti once) and the `announce` text.
- `theme-screen.tsx`: the host's typing, the others' waiting ("HostAtWork") and the ideas stay. The "reveal" stage (butter card with ✍️ and the theme, "Escolhido por …" under it) becomes the same `ThemeStage` (butter tone, ✍️, "Escolhido por {host}" with avatar, sentence-only rule on the first match).
- `room-screen.tsx`: `PhaseScreens` already keeps the vote or theme screen on stage while the theme reveal lasts (`finished-wait` logic untouched); keep it.
- `reveal-overlay.tsx`: unchanged for answers and guesses; it already skips `kind === "theme"`. It must also skip the new `intro` kind. Its server-clock pattern (`useServerClock`, `now < until`, keyed `AnimatePresence`) is the model for the scenes, but the scenes cannot be closed early (they are synced for everyone).
- `GameHeader`: theme tag pops at T+2.3 (`themeFrom`), no timer during the whole theme reveal (`clockFrom={false}`); today the timer refills toward the pick clock during the reveal.

---

## 4. Server timeline (engine, types, view)

Server times: `S` = `START`, `V` = vote scene start, `C` = vote closed (`reveal.startsAt` of the theme reveal), `T` = theme scene start.

| Moment | Time | Notes |
|---|---|---|
| lobby exit starts | when the view arrives (about S + latency) | client only |
| cold open starts | `S + 1.6 s` | the prototype's gap between the exit and the intro |
| vote scene starts | `V = S + 1.6 + 7.6 = S + 9.2 s` (first match, `round === 0`); `S + 1.6 + 1.5 = S + 3.1 s` later | |
| vote clock starts | `stepStartsAt = V + 1.7 s` | line alone, rise, deal |
| vote deadline | `stepStartsAt + 20 s` | `VOTE_SECONDS = 20` |
| vote closes | `C` (everyone voted, or the deadline) | `closeVote`, `beginMatch` (round + 1, order, assignments), reveal `theme` |
| tie spin | `C` to `C + 2.0 s` (+ today's 0.7 s spotlight) | only on a tie |
| losers dim, winner 1.04 | settle start + 1.3 s (0.4 s) | prototype: 1.3 s after the last vote |
| heading, footer, losers out | settle start + 2.8 s (0.35 s, 0.05 s apart) | |
| theme scene | `T = C + (tie ? 2.0 : 0) + 3.3 s` | |
| tag in header, "Tema:" chat line | `T + 2.3 s`, `T + 1.0 s` | `visible_at` for the chat line |
| end of scene 4 | `T + 7.4` (rule), `T + 5.4` (sentence only), `T + 3.0` (later rounds) | then the draw (spec of scenes 5-10); the pick clock starts after those scenes |

Engine changes (minimal):
- `Reveal.kind` gains `"intro"`; `START` (and the host-typed path) sets `s.reveal = { kind: "intro", n: s.round + 1, startsAt: S, until: S + 1600 + (s.round === 0 ? 7600 : 1500) }` before `beginVote` / `beginTheming`. `beginVote` and `beginTheming` must not clear that reveal (today they set `s.reveal = null`).
- `startStep` gains a lead: the vote's `stepStartsAt = max(now, reveal.until) + 1700`. The host-timeout path (`theming` to `voting`) has no intro but keeps the 1.7 s lead.
- `vote()` calls `guardStep` (rejects votes before `stepStartsAt`, `too_early`).
- `REVEAL_TIMING`: keep `themeTieSpin: 2000`; add `themeSettle: 3300`, `themeHero: 3000` (hero only), `themeRule: 7400` (first match with examples), `themeSentence: 5400` (first match, typed or without examples). Today `theme: 3000`. `closeVote` uses `tie + settle + (rule | sentence | hero)`; `setTheme` (typed) uses `themeSentence` on the first match and `themeHero` later (no settle: there are no losing cards).
- `view.ts`: expose the `intro` reveal (`{ kind: "intro", n, full, startsAt, until }`); `voteView` already covers the `voting` phase. Add the rule examples to the view during the theme reveal (for example `themeRule: { fits: CardView[]; misfit: CardView } | null`).
- Rule examples: the engine is pure, so the server action that sends `START` fetches, for each of the 3 options, `popularPicks(themeId, 2)` plus one misfit, and passes them in with the themes (as it passes `themes` today). Store them on `vote.options[i]`.
- Tests: `engine.test.ts` deadline expectations, early votes rejected, intro length by round, the theme reveal length (tie, rule, typed); `view.test.ts` for the new reveal; `simulation.test.ts` if bots vote at once.
- Tab title (`useRoomTab`): stays "Votação" during the intro; check that `useTabTitle` shows no countdown before `stepStartsAt`.

Chart numbers vs prototype numbers: the chart budgets the intro at 7 s (the scene is 7.6 s including its 0.5 s exit), the line at 1 s (the prototype's lead is 1.7 s, and the chart only budgets it on the first match; the ROADMAP and the decisions give no round limit, so play it every round) and the theme at 6 s (the scene is 7.4 s, plus a 3.3 s settle that the chart counts inside the vote's 20 s). Follow the prototype's beats; the chart is an estimate.

---

## 5. Timing chart (player.js `chart()`)

Axis 0 to 180 s, ticks every 30 s; the label shows "N s além da escolha" = the sum without `pick`.

| Row | Segments (s) | Fixed time without the pick |
|---|---|---|
| Hoje ("como está") | vote 13, theme 3, pick 120 | 16 s |
| Proposta, "1ª partida da sala" | intro 7, line 1, vote 20, theme 6, draw 4.5, target 2.5, pick 120, yours 4.3, order 4 | 49.3 s |
| Proposta, "rodadas seguintes" | intro 1.5, vote 20, theme 3, draw 3, target 3, pick 120, yours 3, order 3 | 36.5 s |

Scenes 1-4 part: first match 7 + 1 + 20 + 6 = 34 s (today 16 s); later matches 1.5 + 20 + 3 = 24.5 s.
Legend colours: intro `color-mix(in oklab, var(--sky) 45%, var(--surface))` "Abertura"; line `--butter-soft` "Frase do tema"; vote `--butter` "Votação"; theme `--no-soft` "Tema (+ regra)"; draw `--sky-soft`; target `color-mix(--seat-3 32%, --surface)`; pick `--yes-soft` "Escolha, até 2 min"; yours `color-mix(--seat-4 32%, --surface)`; order `--apricot-soft`.
`flow.html` text: the new scenes add "uns 30 s" on the room's first match and "uns 14 s" on later ones; the vote grows from 13 to 20 s.

Mocks (`player.js MOCKS`) touching these scenes: desktop chat open over the vote at 6.75 s (losers dimmed); phone chat open over the vote at 7.6 s. Both seed the chat with Bia "cheguei!! 👋", Leo "bora que hoje eu ganho" and "▶ Partida começou".

---

## 6. Strings

New keys (pt from the prototype; en and ja are proposals; reuse existing keys where noted).

| Use | pt | en | ja |
|---|---|---|---|
| cold open L1 | Cada um ganha um personagem secreto. | Everyone gets a secret character. | みんなに秘密のキャラクターが配られる。 |
| cold open L2 | Só você não vê o seu. Descubra perguntando. | Only you can't see yours. Ask to find out. | 自分のだけは見えない。質問して当てよう。 |
| label under your avatar | você | you | あなた |
| sample question | Eu sou da Marvel? | Am I from Marvel? | 私はマーベルのキャラ？ |
| sample answers | Sim / Provavelmente sim | existing `common.answers.yes` / `probably_yes` | existing |
| short card | Rodada {n} | Round {n} | 第{n}ラウンド |
| vote title (replaces `room.vote.title`) | Agora, escolham juntos um tema. | Now, choose a theme together. | さあ、みんなでテーマを選ぼう。 |
| vote sub (optional change) | O mais votado vence. Empate vai pra roleta. | existing | existing |
| nobody voted yet | Ainda votando: todo mundo | Still voting: everyone | 投票中：全員 |
| theme kicker | O tema é… | existing `chosenTitle` | existing |
| card label | Tema escolhido | existing `chosen` | existing |
| rule | Todo personagem tem que ser deste tema. | Every character must be from this theme. | キャラクターはすべてこのテーマから。 |
| chat title | Chat | Chat | チャット |
| phone bar, empty | Chat da sala | Room chat | ルームのチャット |
| placeholder | Mandar mensagem… | Send a message… | メッセージを送る… |
| system: start | ▶ Partida começou | ▶ Match started | ▶ 試合開始 |
| system: theme | {emoji} Tema: **{theme}** | {emoji} Theme: **{theme}** | {emoji} テーマ：**{theme}** |
| header tag label | Tema: | existing `room.theme` | existing |

System lines should be stored as a kind plus parameters (not text) so each viewer reads them in their own language.

---

## 7. Phone, dark, reduced motion, a11y
- **Phone**: sizes in each scene section; chat as a full-width bar; history over a scrim; bottom padding for the bar on every screen (lobby included); toasts above the bar.
- **Dark**: brand stage `#1d4a93`; washes at 26%; the "?" card and the bubble keep their fixed brand colours; the chips on the blue stage keep their fixed colours.
- **Reduced motion** (`useReducedMotion`): keep the same beat times (sync) but replace every move with a 0.2 s opacity fade to the end state: no flips, wiggle, rises, deal tilt, roulette spin (today's `still` path already skips the spin and spotlight), no glyph bob or wash drift, no tab hop or nudge (colour and count only), no confetti (`fireConfetti` already skips it), the clock appears without the pop.
- **Screen readers**: cold open lines and the rule sentence in `aria-live="polite"` outputs; theme announced as today (`announce`); chat with a `log` role and an unread count in the tab's label.

---

## 8. File by file

| File | Change |
|---|---|
| `src/game/types.ts` | `VOTE_SECONDS = 20`; `Reveal.kind` + `"intro"`; `RevealView` + intro; `REVEAL_TIMING` additions; intro constants (gap 1600, full 7600, short 1500, vote lead 1700); rule examples types |
| `src/game/engine.ts` | intro reveal on `START`; `beginVote` / `beginTheming` keep it; vote lead; `guardStep` in `vote()`; theme reveal length by tie / round / examples |
| `src/game/view.ts` | intro reveal and rule examples in the view |
| `src/game/theme-sets.ts` | per-set look (colour, 7 glyphs) |
| `src/app/globals.css` | tokens of 2.1 |
| `src/lib/motion.ts` | GSAP-equivalent eases; comment update |
| `src/features/room/room-screen.tsx` | mount `StageBackdrop` and `Chat`; lobby exit and opacity-only entrance for the next screen |
| `src/features/room/reveal-overlay.tsx` | skip `intro` too |
| `src/features/room/game-header.tsx` | `themeFrom`, `clockFrom` with the pop entrances |
| `src/components/ui/screen.tsx` | `ThemeTag` in the prototype look (surface pill, shadow) |
| `src/features/turn/turn-backdrop.tsx` | generalized into `StageBackdrop` (turns keep their look unless decided otherwise) |
| `src/features/vote/vote-screen.tsx` | `ColdOpen` during the intro; new heading beat; deal at +1.3; clock pop; settle; hand-off to `ThemeStage` |
| `src/features/theme/theme-screen.tsx` | `ColdOpen` during the intro; reveal through `ThemeStage` |
| new `ColdOpen`, `ThemeStage`, `Chat` components | as specified |
| `src/features/lobby/lobby-screen.tsx` | bottom padding for the chat; exit variants (no other change) |
| `messages/{pt,en,ja}/*.json` | strings of section 6 |
| `PRODUCT.md`, `ROADMAP.md` | vote 20 s |
| server: actions, backends, migrations | rule examples at `START`; `room_messages` with `visible_at`; rate limit |

## 9. Open points
1. Set colours and glyphs for the 18 sets other than heroes and for typed themes (section 2.2 is a proposal).
2. The short "Rodada N" card and the sentence-only rule have no prototype choreography (proposals in scenes 2 and 4).
3. The 3.3 s settle between the last vote and the theme scene follows the prototype and makes the reveal longer than the chart's estimate; shortening it is a tuning knob (`themeSettle`).
4. Turns: stronger prototype wash or today's 7% tint (outside scenes 1-4).
