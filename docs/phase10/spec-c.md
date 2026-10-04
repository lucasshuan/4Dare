# Phase 10 · Spec C: scenes 9-10, chat, history, backdrops, mocks and timing

Source: the approved prototype "4Dare em cena" in `docs/phase10/prototype/`. Files used here: `scenes-c.js` (scenes 9-10 and `gameScreen`), `shell.js` (`Chat(ctx)`, `History(ctx)`, washes and glyphs, header, clock), `stage.css` (in-device CSS), `kit.js` (players, avatars, `order` and `pickerOf`), `player.js` (mocks and timing chart), `flow.html` (sections "Chat e histórico", "Tempo" and "No código"), `flow.css` (tokens).
Compared against: `src/features/turn/{turn-screen,turn-backdrop,player-strip,history-panel,give-up-button}.tsx`, `src/features/room/{game-header,room-screen}.tsx`, `src/features/lobby/lobby-screen.tsx`, plus `src/game/{engine,view,types}.ts`, `src/components/ui/{player-name,avatar,timer,screen,toast}.tsx`, `src/lib/{seats,motion,realtime}.ts` and `globals.css`.

Units: the prototype draws a 1280x800 desktop and a 390x844 phone in logical px, so every px value below is a real CSS px. Times are seconds from the start of the scene. GSAP's default ease (used whenever none is given) is `power1.out`.

---

## 0. Key findings (read first)

1. **Scene 9 breaks a secrecy rule that exists today.** "Rafa picked yours" (and "Picked by Rafa" on your card in the game screen) needs `PlayerView.pickedById` for **your own** card once the turns start. Today `view.ts:328-331` returns `null` for `isYou` until `finished`, and `view.test.ts:31-45` ("nobody sees their own card while playing") asserts `pickedById: null`. The picker can already be worked out from `turnOrder` (the picker of `order[i]` is `order[i-1]`), so showing it gives nothing new away. Change: `pickedById: pickedOpen ? picker : null` for everyone, update the test, and the turn card meta then reads `card.pickedBy` instead of `card.pickedSecretly` with no other code change.
2. **The scenes 9-10 window needs its own server delay, and "No código" does not mention it.** `startTurns` → `goToTurn` → `startStep` starts the first asking clock at `ctx.now` (`engine.ts:132-138, 327-338, 446-450`). `startStep` only waits on a theme reveal or a non-turn phase. The first `stepStartsAt` must move later by the intro length, and the `waits` rule must learn the new window (for example `s.intro?.until`). The "No código" card only describes a presentation step *before* picking.
3. **The timing chart and the animated scene disagree on scene 10.** The chart gives "Ordem 4 s". The scene hands over to the game at +4.4 s and starts the clock at **+5.4 s**. Options are in §2.6. My recommendation is to follow the animated beats, so the first match costs 4.3 + 5.4 = 9.7 s and later matches 3 + 3 = 6 s.
4. **History moves to the left, and so does its button.** Today the button sits *right of the clock* in the `after` slot (`game-header.tsx:49`, `turn-screen.tsx:136`), with a sidebar card on the right (desktop) or a bottom sheet (narrow). After the change, the button sits **left of the theme tag**. The panel is a full-height, flat 360 px bar on the left that **pushes the whole frame, header included** (≥1024 px), or slides over a scrim from the left (narrow screens). The body (filters, list, chips) stays as it is.
5. **The chat is entirely new:** no chat code exists in `src`. Mount it once in `RoomScreen` inside `RoomProvider`, next to `RevealOverlay`, so the lobby and every match phase share it and its unread state survives phase changes. Four conflicts need fixing with it:
   - `RevealOverlay` closes on *any* keydown, which includes typing in the chat. It should ignore keys aimed at the chat.
   - Step fields with `autoFocus` (Ask, Guess) steal focus from a chat draft.
   - Toasts (`fixed bottom-6 z-50`, centred) sit on top of the phone bar.
   - Page bottoms need a safe padding so the folded tab or bar never hides the last controls.
6. **Every player name needs an avatar beside it, and the prototype misses three places.** Avatars must go into the phone bar's last-message line (`<b>Bia:</b> …`), the system lines with names ("Ordem: Bia, Rafa, você, Leo", "Rodada 1 · vez de Bia") and the small "de Rafa"/"por Leo" lines under the table cards.
7. **The backdrop has to change.** The current `TurnBackdrop` (`seat` → 7% tint plus 3 blurred blobs plus "?" marks at 0.14) is a *subset* of the prototype's wash system (20%/26% mix plus 2 radial glows drifting, a "solid" brand variant and glyph layers that are either "?" or the theme set's emojis). Generalise it into one room-level backdrop that persists across phases and crossfades. Two things are missing: tokens in `globals.css` (`--brand-stage`, `--brand-butter`, `--on-brand`, `--wash-mix`, `--on-seat-1..4`) and per-set glyph lists (`THEME_SETS` has one emoji per set).

---

## 1. Shared pieces from `kit.js` that scenes 9-10 use

- Players in **seat order** (join order): `SEAT_ORDER = ["you","bia","leo","rafa"]`, seats 1-4 with colours `--seat-1..4`. In the app that is `PlayerView.seat` and `seatColor(seat)`.
- **Turn order** = the circle of who picks for whom: `K.order = ["bia","rafa","you","leo"]`. The picker of X is the one *before* X in the order (`pickerOf`), and the target is the one after. This matches the engine: `beginMatch` shuffles `s.order` and sets `assignments[order[i+1]].pickerId = order[i]` (`engine.ts:263-280`), and `startTurns` begins with `order[0]`. In the app that is `PlayerView.turnOrder`.
- Example cards: `leo: Iron Man, bia: Wonder Woman, rafa: Hulk, you: Black Panther (hidden)`.
- `K.label(p)` = "Caio (você)" maps to `useDisplayName()(p, true)`, which gives "{name} (you)". `K.pname` = avatar plus name maps to `PlayerName`.

---

## 2. Scenes 9-10: "your character" and "turn order into the game"

### 2.1 The table (`tableRow`, used by both scenes)

One column per player. In scene 9 the columns follow seat order. In scene 10 the same columns shuffle into turn order.

| part | desktop | phone |
|---|---|---|
| card (`.s-mini`) width | 150 | 80 |
| card padding | 8 8 10 | 4 4 6 |
| card radius | 20 | 14 |
| card shadow | `--shadow-pop` | same |
| face radius | 16 | 10 |
| your face (`.s-qface`): "?" on `--sky-soft`, `--sky`, display 800, 4:5 | font 84 | 46 |
| others' face: portrait 4:5 (`Portrait`) | | |
| name (`b`, 700, ellipsis) | 15 px | 11 px |
| small line under the name (`small`, 11 px, 600, muted) | yours: "de Rafa" (from Rafa); others: "por você" / "por Leo" | **hidden** |
| number badge: circle `--ink` / `--on-ink`, display 800, top -18 (phone -14), centred, z 2, starts at opacity 0 | 36 px, 19 px font | 28 px, 15 px |
| label under the card: avatar plus name ("você" for you), 700, nowrap | avatar 26, 15 px | avatar 20, 12 px |
| column gap (badge, card, label) | 12 | 8 |
| row gap between columns | 26 | 8 |

`.s-mini` base: `background: var(--surface); border-radius: 16px; padding: 6px 6px 8px; box-shadow: var(--shadow-card); display:flex; flex-direction:column; gap:5px` (the table overrides padding, radius and shadow as above). `.s-mini b { font-size:12.5px; font-weight:700; line-height:1.15; padding:0 3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }`, `.s-mini small { font-size:11px; color:var(--ink-muted); font-weight:600; padding:0 3px; display:flex; align-items:center; gap:3px }`.

App mapping:
- your face: `t("turn.card.whoAreYou")`
- others: `card.name`
- small line: reuse `turn.card.pickedBy` ("Picked by {name}") and `turn.card.youPicked`
- **names in the small line need `PlayerName`** (project rule)
- label: `<Avatar size=…>` plus `name(p)`, with `common.you` for you

`Avatar` has no sizes 24, 26, 30 or 34 (its `SIZE` map holds 20, 28, 32, 36, 40, 44, 48, 64). Add them, or pass `className="size-[26px]"` the way `PlayerName` does.

**Decision check:** the user said no "Para Leo"/"De Rafa" *badges* anywhere. The small muted "from Rafa"/"by Leo" lines on the table are not badges (no sticker, no colour chip). They match the turn card's meta and the notes bullet "each card says who picked it, like the game card already does". I recommend keeping them, as text with an avatar.

### 2.2 Scene 9 "Seu personagem" (Your character)

- Prototype duration 6.9 s, which includes demo filler. Product budget: **4.3 s** on the room's first match and **3 s** on later ones (timing chart).
- Chapter colour: `--seat-4` (Rafa, the picker of yours).
- Layout: centred column with `gap` 56 (phone 40) and `padding-bottom` 20. It holds:
  - **titles**, two lines stacked in the same grid cell (`grid-area: 1/1`)
  - the **table** in seat order

Copy:

| id | pt (prototype) | en (proposed key) | style |
|---|---|---|---|
| t1 | "[av] Rafa escolheu o seu." | `intro.yours.pickedBy`: "{name} picked yours." | `.s-big` 44 / phone 28, avatar 48 / 34, flex gap 12, wraps, centred |
| t2 | "Você vê o dos outros. O seu, você descobre." | `intro.yours.rule`: "You see everyone else's. Yours, you find out." | `.s-big` 44 / 28, max-width 720 / 330 |

`.s-big { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.03em; line-height: 1.02; text-wrap: balance; margin: 0 }`.

Beats (first match):

| t | element | from → to | dur | ease |
|---|---|---|---|---|
| 0.0 | backdrop | wash → **seat colour of whoever picked yours** (prototype: purple = seat 4 = Rafa); glyph layer unchanged (theme set) | 0.8 | sine.inOut |
| 0.0 | t2, the other columns, your label | hidden (opacity 0) | | |
| 0.1 | t1 | opacity 0→1, y 14→0 | 0.45 | power1.out |
| 0.3 | your card | starts **centred in the scene** at x = scene centre and y = 64% of scene height (phone 60%), scaled ×1.45 (phone ×1.65), falling from 520 px higher; y −520→0, rotate −16°→−3° | 0.8 | **bounce.out** |
| 1.0 | your "?" face | scale 1→1.06→1→1.06→1 (yoyo, 4 halves of 0.25) | 1.0 | sine.inOut |
| (1.5) | chat "boa sorte com esse kkkk" | demo only, not product | | |
| 2.3 | t1 | opacity→0, y→−12 | 0.3 | power1.out |
| 2.4 | your card | to its table slot: x,y→0, scale→1, rotate→0 | 0.7 | power3.inOut |
| 2.55 | t2 | opacity 0→1 (0.5, power1.out) and y 16→0 (0.5, power3.out) | 0.5 | |
| 2.9 | your label | opacity 0→1 | 0.3 | power1.out |
| 2.9 + i×0.18 | each other column (seat order, you skipped) | shows; card rotateY 180°→0, y 30→0 | 0.6 | back.out(1.6) |
| ≈3.86 | last flip lands | | | |
| 4.3 | end (chart); scene 10 takes over **with the table still in place** | | | |

Notes:
- The flip has no back face in the prototype: the front simply spins in mirrored. Optionally add `backface-visibility:hidden` plus a card back (the "4" mark on `--sky-soft`). That is a polish item, not part of the proposal.
- With 2 or 3 players the row is just shorter, and nothing else changes.

### 2.3 Scene 10 "Ordem e jogo" (Turn order into the game)

- Prototype duration 11.0 s, which includes the history demo from 7.6 to 10.2.
- Chapter colour: `--seat-2` (Bia, who plays first).

**Continuity with scene 9:** the table is laid out in **turn order**. Each column starts translated by `dx = seatSlot.x − orderSlot.x`, so on the first frame every card sits exactly where scene 9 left it. Same element, same position. In React, keep one table component across both scenes and animate its columns' `x`.

Copy:

| id | pt | en | style |
|---|---|---|---|
| kick | "Ordem dos turnos" | `intro.order.kicker`: "Turn order" | `.s-kicker`: `background: var(--sunken); border-radius: 999px; padding: 4px 12px; font-weight: 600; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-muted)` |
| call | "[av] Bia começa!" | `intro.order.starts`: "{name} starts!" | `.s-big` 64 / phone 40, avatar 64 / 44, flex gap 14, centred |

The kicker and call share one grid cell, above the row. The box is `gap` 52 (phone 40) and `padding-bottom` 20.

Beats:

| t | element | from → to | dur | ease |
|---|---|---|---|---|
| 0.1 | kick | opacity 0→1, y 8→0 | 0.3 | power1.out |
| 0.5 + i×0.05 (i = turn order index) | column i | x: dx→0 along an **arc**, y keyframes [0, −46, 0] for even i and [0, +46, 0] for odd i (linear keyframes) | 0.9 | power2.inOut (on x) |
| 1.6 + i×0.16 | badge i ("i+1") | opacity on; scale 0→1, rotate −40°→0 | 0.45 | back.out(3) |
| 2.4 | kick | opacity→0 | 0.25 | power1.out |
| 2.5 | first player's column | scale 1→1.1 | 0.45 | back.out(2.4) |
| 2.5 | first player's card | box-shadow → `0 0 0 4px <seat colour @ 90%>, 0 24px 56px rgba(30,36,51,.2)`. The prototype hard-codes `rgba(207,112,36,.9)` = seat 2; use `color-mix(in oklab, seatColor(first) 90%, transparent)` | 0.3 | power1.out |
| 2.5 | the other columns | opacity→0.55 | 0.4 | power1.out |
| 2.5 | backdrop | wash → **first player's seat colour**; glyphs → "?" coloured with that seat colour | 1.0 (glyph 0.8) | sine.inOut |
| 2.55 | call | appears; scale 1.7→1 | 0.5 | back.out(2) |
| 2.8 | chat | system line "Order: [av]Bia, [av]Rafa, [av]you, [av]Leo" | | |
| **4.4** | table box (kicker, call and row) | scale→0.32, y→−330 (phone −300), opacity→0: it shrinks **up into the strip's place** | 0.7 | power3.in |
| **4.9** | game screen | visible. Strip items drop in: y −30→0, opacity 0→1, **stagger 0.06** | 0.5 | back.out(1.6) |
| 5.2 | **history button** (left of the theme) | appears; scale 0.3→1, opacity 0→1 | 0.5 | back.out(2.4) |
| 5.3 | game body (your card and the step column) | y 24→0, opacity 0→1 | 0.6 | power3.out |
| **5.4** | **step clock** | appears and starts counting (`askSeconds`, 80 s by default) | | |
| 5.6 | chat | system line "Round 1 · [av]Bia's turn" | | |
| (6.6) | chat "vai bia 👀" | demo | | |
| (7.6 to 10.2) | history open, then closed | demo of the history bar (see §4) | | |

This is **not** a layout morph: the table shrinks and fades upward while the real strip drops in on its own. With motion that is easy to do and robust. A `layoutId` morph from table card to strip row would change the look, so it should not be used.

### 2.4 `gameScreen` (the end frame) vs the real `TurnScreen`

`gameScreen()` is described as "the turn screen as it is today, simplified". **Do not port it.** The real `TurnScreen` lands in its place. For reference, the stand-in has:

- **Strip:** `.s-strip`, flex, gap 10; on phones a 2-column grid with gap 8.
  - Each cell: `flex:1 1 0; gap:9px; padding:8px (phone 6); border-radius:16px; background:var(--surface)`, plus the 2 px seat ring on the turn player.
  - Cell content: avatar 32 (phone 24), name 14 px 700 (phone 12.5), status 12 px muted, card thumbnail 36 px (none on phone).
  - This matches `PlayerStrip` (avatar 32 or 24, thumb `w-10`, the ring `0 0 0 2px seat`).
- **Your card:** 250 px wide (phone: a row with a 70 px face). It carries a "Seu personagem" chip on `--sky-soft`, a "?" at 120 px, "Quem é você?" and **"Escolhido por Rafa"**. That last line is today's card meta *once `pickedById` is exposed* (finding 1).
- **Waiting column:**
  - kicker "Pergunta 1"
  - h1 "[av] Bia está pensando na pergunta" (26 / 32 px)
  - a typing bubble: avatar 44 plus `.s-typing`, which is a pill of 3 bobbing dots (`s-dot` 0.9 s, delays 0.15 and 0.3)
  - a hint "Enquanto isso, olhe as cartas dos outros na faixa de cima."

  Today's `Waiting` shows 3 fading dots and no hint. The proposal says the turn screen "stays as it is", so these are **not** changes. The hint ("Meanwhile, look at the others' cards in the strip above.") could be added as an optional extra.
- **Root:** absolute, left/right 32 (phone 16), column gap 24 (phone 16).

### 2.5 Short variant for later matches (chart: received 3 s, order 3 s)

The prototype gives only the durations. The choreography below is **derived** to keep the same story in less time. Confirm it when testing.

- **Received (3.0):**
  - 0.0 wash
  - 0.1 t1 in
  - 0.2 your card drops **at table size straight into its slot** (y −240→0, rotate −8°→0, 0.6 bounce.out)
  - 0.5 + i×0.12 the others flip (0.5 back.out(1.6))
  - no t2 (the rule is known by now)
  - hold until 3.0
- **Order (3.0):**
  - 0.0 t1 out (0.2) and kicker in (0.25)
  - 0.2 + i×0.05 shuffle (0.7)
  - 0.9 + i×0.12 badges (0.35)
  - 1.4 spotlight, wash and call
  - 2.0 table leaves (0.6)
  - 2.4 strip
  - 2.6 history button and body
  - **3.0 clock**

### 2.6 Server and view contract for scenes 9-10

- Add a window after picking: `intro = { kind: "turns", startsAt, until, full: round === 1 }`, or reuse a general presentation field shared with the pre-pick scenes (spec A/B). It is set when picking ends, whether by the last `pick` or by the `picking` timeout (`engine.ts:742-745, 869-882`).
- `startsAt` = when picking ended, plus a **lead** that lets the last confirm (the card grows to 1.08) or the timeout stamp "Tempo! Foi esse." play out. In scene 8 the stamp lands at +8.3 and the page fades out by +9.55, so ≈1.2 s.
- The first asking step: `stepStartsAt = intro.startsAt + clockBeat` and `deadline = stepStartsAt + askSeconds`. This needs `startStep`'s `waits` rule to include the intro.
  - **Option A (recommended, follows the animation):** `clockBeat` = 4.3 + 5.4 = **9.7 s** on the first match and 3 + 3 = **6 s** on later ones.
  - **Option B (follows the chart):** 4.3 + 4.0 = 8.3 s. This compresses scene 10's spotlight hold from 1.9 s to 0.5 s: the table leaves at 3.0, the strip comes at 3.5, the clock at 4.0.
- `pickedById` for your own card is exposed from the first turn phase on (finding 1). Update `view.test.ts` "secrecy" accordingly.
- System lines "Order: …" and "Round 1 · X's turn" are written by the server with a **show time** (`startsAt + 2.8 + received` and `+ 5.6 + received`) so that chat shows them in sync and never early (see §3.7).
- During the window the header hides the **Timer**. Today's Timer would show its recharge animation (`now < stepStartsAt`). The proposal wants the clock to *appear* at the clock beat, like the vote.

### 2.7 Building it with motion/react (synced by the server clock)

- `motion@13.4.6` (installed) supports **sequences with absolute `at`** (`SequenceTime = number | …`) and settable `controls.time` (`AnimationPlaybackControls.time`, in seconds). Build each scene as `animate([[el, keyframes, { at, duration, ease }], …])` and set `controls.time = (serverNow − startsAt)/1000`. This gives the same seek-anywhere property as the prototype's GSAP timeline plus "tracks". A reload or a late joiner lands on the right frame.
- Easings to define once (motion accepts functions):
  - `power1.out = t => 1-(1-t)**2`
  - `power2.in = t => t**3`. GSAP's "power2" is quadratic in name but **cubic** in shape (`power2.in = t³`). Be careful here: GSAP `powerN` = Penner degree N+1, so `power1.out = 1-(1-t)²`, `power2.inOut` = cubic inOut and `power3.*` = quartic.
  - `power3.in = t => t**4`
  - `power3.out = t => 1-(1-t)**4`
  - `power3.inOut = t => t<.5 ? 8*t**4 : 1-8*(1-t)**4`
  - `power2.inOut = t => t<.5 ? 4*t**3 : 1-4*(1-t)**3`
  - `sine.inOut = t => -(Math.cos(Math.PI*t)-1)/2`
  - `back.out(s) = t => 1 + (s+1)*(t-1)**3 + s*(t-1)**2`
  - `bounce.out` = Penner `easeOutBounce` (n1 = 7.5625, d1 = 2.75)
- The scene lives **inside `TurnScreen`'s `<main>`** (below the real `GameHeader`), not in a fixed overlay. Until +4.9, `main` shows the table. After that the real `PlayerStrip` and body render with their entrance (strip: stagger 0.06; body: delay 0.4). The header stays put: theme tag, leave, give up, timer hidden, history button hidden until +5.2.
- Polish: `PhaseScreens` re-keys from `"picking"` to `"turn"`, which fades the whole `GameFrame`, header included. The prototype keeps the header still. Consider keying the header outside the animated container.

### 2.8 Reduced motion, phones, edge cases

- **Reduced motion:** keep the server timing but swap movement for crossfades.
  - Scene 9: t1 plus the full table with every card face up at once; at 2.4 t1 fades into t2.
  - Scene 10: the columns appear already in turn order with their numbers; at 2.5 the call fades in and the others dim; at 4.4 the table fades out; at 4.9 strip and body fade in.
  - No bounce, no flip, no arc, no scale-up.
- **Phone:** the sizes in §2.1. With 4 cards: 4×80 + 3×8 = 344 px, which fits 390 − 2×16.
- **Away player:** their column stays, at the 0.55 dim. Turn order skips them anyway.
- **Gave up during the window:** cannot happen yet, because the give up popover only acts once the turns start. Keep `GiveUpButton` but disable it until the clock beat.

---

## 3. Chat (`shell.js` `Chat(ctx)` and `stage.css` `.s-chat*`)

### 3.1 Where it lives and its sizes

- **One chat** for the lobby and the whole match, separate from the history.
- **Desktop:** a tab fixed to the bottom right: `right: 16px; bottom: 0; width: 340px`.
  - **Folded height 56.**
  - **Open height** `round(H × 0.62)`, i.e. `62dvh`.
- **Phone:** a full-width bar: `left: 8px; right: 8px; width: auto`.
  - **Folded 60.**
  - **Open 66dvh.**
  - It opens from the bottom the same way. Breakpoint: use `max-sm` (<640 px) for the bar; from `sm` up, the 340 px tab.
- **Overlays, never pushes:** screens stay big and centred, and the open chat covers them.
- **Stacking in the app** (the prototype has chat 12, history 13, scrim 10, header 5, confetti 30):

  | layer | z |
  |---|---|
  | backdrop | `-z-10` |
  | content | auto |
  | sticky TopBar, `RevealOverlay` | 30 |
  | **chat** | **35** (`z-[35]`) |
  | phone history drawer and dialog backdrops | 40 |
  | popovers, dialogs, toasts | 50 |

  On top of `RevealOverlay`'s scrim, the folded tab stays usable.
- **Safe area:** on phones add `env(safe-area-inset-bottom)` to the bar's bottom padding. Folded height is 60 plus the inset.
- **Page clearance:** while the chat is mounted, pages need bottom padding so their last controls can scroll clear: desktop 56 + 16, phone 60 + 16 plus the inset. The prototype's phone lobby kept 74 px for it (`room = H − 74 − 90`). Suggested: set `--chat-safe` on `<html>` and use `pb-[calc(var(--chat-safe)+2rem)]` in `Screen` and `GameFrame`. **Toasts:** `bottom: calc(var(--chat-safe,0px) + 24px)`.

### 3.2 Anatomy

```
aside.s-chat [.open] [.unread]
  div.s-chathead            ← the whole head is the toggle (a <button>, aria-expanded)
    span.s-cic              chat bubble icon 21px (lucide MessageCircle)
    desktop: b "Chat"       display 800 18px
    phone:   span.s-cline   last message "<av> Bia: cheguei!! 👋" (default "Chat da sala" = "Room chat")
    desktop: span.s-cfaces  up to 3 sender avatars (24px)
    span (flex:1)
    span.s-ccount           unread count
    span.s-cchev            chevron-up 18px in a 32px circle; rotates 180° when open
  div.s-chatbody            (border-top)
    div.s-msgs              messages, bottom-aligned
    div.s-compose
      div.s-input           pill: text + placeholder "Mandar mensagem…" ("Send a message…") + b (send, arrow-up)
div.s-chatpop               desktop only: stack of 3 s bubbles above the tab
```

### 3.3 States

| state | head | count | faces | chevron | other |
|---|---|---|---|---|---|
| folded, nothing new | `--surface`, `--ink` | hidden (`visibility:hidden`) | none | up, muted | |
| **unread** (folded, a message came from someone else) | **`--sky` background, `--on-sky` text** (300 ms ease-soft transition) | **visible, inverted**: `--on-sky` background, `--sky` text | last 3 distinct senders, newest first, 2 px `--sky` ring | `--on-sky` | the **nudge** loop runs on the whole tab |
| open | `--surface` | hidden (reset to 0) | cleared | rotated 180° (400 ms ease-soft) | bubbles leave at once |

Opening clears the unread state, the count and the faces. Your own messages never count. **System lines never count and never pop** (in `finishChat` only `say()` events are counted).

### 3.4 Animations

- **Toggle:** height animates 56 ↔ open.
  - Open: **0.5 s back.out(1.15)**, a slight overshoot.
  - Fold: **0.5 s power3.inOut**.
  - `overflow:hidden` reveals the body as it grows.
- **New unread message** (each one):
  1. The whole tab jumps: y keyframes `[0, −14, 0, −5, 0]`, 0.6 s, power1.out.
  2. The count pops: scale 0.3→1, 0.45 s, back.out(3).
  3. **Bubble** (desktop only): an avatar 30 plus a white bubble with the sender's name (12 px 700 muted) above the text.
     - In: from y 16, scale 0.8, opacity 0 (origin 85% 100%) to rest, 0.4 s back.out(1.8).
     - **Out** at `min(t + 3.05, chatOpenedAt − 0.1)`: to y 10, scale 0.9, opacity 0, 0.3 s power2.in.
     - Several bubbles stack in a column aligned right, with gap 8, the newest at the bottom.
- **Nudge loop** while unread (CSS uses `translate` so it composes with the jump's transform):
  ```css
  .s-chat.unread { animation: s-nudge 3.6s var(--ease-soft) 1.2s infinite; }
  @keyframes s-nudge { 0%, 80%, 100% { translate: 0 0; } 86% { translate: 0 -7px; } 92% { translate: 0 0; } 96% { translate: 0 -2px; } }
  ```
- **Message entrance** (open list):
  - y 14→0, opacity 0→1, scale 0.96→1, 0.35 s back.out(1.6)
  - origin bottom-left for others, bottom-right for yours
  - system line: opacity 0→1, y 8→0, 0.3 s
- **Typing your own:** the prototype types 16 chars/s into the box and then sends. That is demo only.
- **Reduced motion:** no jump, no nudge, no overshoot. Toggle with a plain 0.2 s ease. The bubble only fades. The count changes without a pop.

### 3.5 Unread rules (exact, from `finishChat`)

```
for each event in time order:
  toggle: open → unread = 0, senders = [], count "0", unread class off, faces []
  message from p:
    phone line = "<b>{you ? 'Você' : p.name}:</b> {text}"     (the line follows every message, yours included)
    if p is you or the chat is open → skip
    unread++; senders = [p, ...senders without p].slice(0, 3)
    count = unread; unread class on; faces = senders
    jump + count pop; desktop: bubble for 3.05 s (or until opened − 0.1)
```

App: keep `lastReadId` per room in `localStorage` (wrapped in try/catch) so a reload does not count old messages again. Cap the count at "99+" (the 24 px min-width fits 2 digits). The tab starts **folded**. Do not persist open or folded.

### 3.6 Message layout

- **Others:** a grid of `28px | 1fr` with gap 2 px by 8 px. The avatar (28) spans 2 rows and sits at the bottom. Above the bubble the name sits in `small` (12 px 700 muted, padding-left 4). Bubble: `--sunken` background, radius **16 16 16 5**, padding 7 12, 14.5 px / 1.35, `overflow-wrap:anywhere`, left aligned.
- **Yours:** one column aligned right, no name, no avatar. Bubble `--sky` / `--on-sky`, radius **16 16 5 16**.
- **Big emoji** (`.big`): a message made only of emoji (the prototype's "😂") renders without a bubble at 34 px, padding 0 4. This is probably what the planned `room_messages` kind "reaction" was for. The user's decision says *no emoji shortcuts*, so: no reaction buttons, but an emoji-only message still renders big.
- **System line** (`.s-sys`): a centred pill on `--sunken`, 12.5 px 700 muted, padding 4 12, `white-space:nowrap`. With avatars plus names it can get wider than the 312 px list, so in the app allow wrapping (`white-space:normal; text-align:center; border-radius:14px`).
- List: `flex-direction:column; justify-content:flex-end; gap:10px; padding:12px 14px`. In the app: `overflow-y:auto`, and stick to the bottom on a new message when already at the bottom.

### 3.7 System lines (catalogue from the prototype)

| when (prototype) | pt | en | names → `PlayerName` |
|---|---|---|---|
| host starts the match (lobby +6.6) | "▶ Partida começou" | "▶ Match started" | |
| theme reveal +1.0 | "🦸 Tema: **Super-heróis**" | "{emoji} Theme: **{theme}**" (set emoji, or ✍️ for a typed theme) | |
| scene 10 +2.8 | "Ordem: Bia, Rafa, você, Leo" | "Order: {names}" | yes, every name with its avatar |
| scene 10 +5.6 | "Rodada 1 · vez de Bia" | "Round {n} · {name}'s turn" | yes |

Rules for the app:
- System rows store a **message key plus params**, not text, so each viewer reads them in their own language with avatars.
- Each row carries a **`showAt`** (server time). The client hides it until `serverNow ≥ showAt`, so "Theme: …" never spoils the theme before its reveal.
- **Open question:** the prototype posts "Round N · X's turn" only once, at the first turn. A line on every turn would flood the chat. Recommend: only at the start of the turns, and maybe on each new turn round (`turnRound`).

### 3.8 Input

- `.s-input`: height 46, pill, border 1.5 `--line-strong`, padding 0 6 0 16, 14.5 px 500. Placeholder `--ink-muted`.
- Send: a 34 px `--ink` circle with `--on-ink` arrow-up (16 px, stroke 2.5). In the app it is a `type=submit` button that is disabled while the text is empty.
- `maxLength` 280 (ROADMAP). Enter sends. After sending, clear and keep focus.
- When rate limited, use a short inline hint or a toast.
- `.s-compose`: padding 10 12 12, border-top 1px `--line`.
- Focus: on desktop, opening the chat focuses the input. On touch, do not (the keyboard would jump up).
- Phone keyboard: consider `export const viewport = { …, interactiveWidget: "resizes-content" }` in `src/app/[locale]/layout.tsx` (Next 16 supports it, see `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`). Without it the fixed bar can end up under the Android keyboard. iOS needs a `visualViewport` check.

### 3.9 Conflicts to fix alongside the chat

- `RevealOverlay` (`reveal-overlay.tsx` keydown) closes on **any key**. Ignore events whose target is inside `[data-chat]`.
- `Ask` and `Guess` use `autoFocus`. When the step changes while someone is typing in the chat, the field steals focus. Only autofocus if `document.activeElement` is not inside the chat.
- The chat must render **outside `<main>`**. Otherwise `RevealOverlay`'s `FIELD` selector (`main textarea, main input…`) could pick the chat input.
- Toasts and page padding: see §3.1.

### 3.10 i18n keys (proposed, namespace `room.chat` or a new `chat.json`)

`title` "Chat" · `empty` "Room chat" (the phone line before any message) · `placeholder` "Send a message…" · `send` "Send" · `open` "Open chat" · `fold` "Fold chat" · `unread` "{count, plural, one {# new message} other {# new messages}}" · `you` "You" (phone line) · `system.started`, `system.theme`, `system.order`, `system.turn` · `limited` "Slow down a little". Add all of them in pt, en and ja.

Accessibility:
- The head is a `<button aria-expanded aria-controls>` whose label includes the unread count.
- While folded, a polite live region announces "{name}: {text}" for new messages, throttled.
- Escape folds the chat when focus is inside it.

### 3.11 Data (short, from "No código"; full design belongs to the server spec)

- **Table:** `room_messages` (room, author or null, text ≤ 280, kind message/system, key and params for system rows, `created_at`, `show_at`). The `-- reaction` kind has no UI (see §3.6).
- **Delivery:** Realtime on the **room's existing channel** `room:CODE`. Add a `"message"` event next to `"changed"` (`src/lib/realtime.ts`, `supabase/notify.ts`). Keep messages **out of `RoomState`**, because every write to it is a compare-and-swap, so chat would race the game.
- **Local backend:** in memory, polled like the room (local mode has no push).
- **Limits:** `allow(\`chat:${playerId}\`, …)` in `rate-limit.ts`, text only, and messages are deleted when the room closes.

### 3.12 The exact CSS (verbatim from `stage.css`)

```css
/* chat: a tab at the bottom right that grows upwards (a bar along the bottom on phones) */
.s-chat { position: absolute; right: 16px; bottom: 0; width: 340px; z-index: 12; background: var(--surface); border: 1px solid var(--line); border-bottom: 0; border-radius: 20px 20px 0 0; box-shadow: 0 -2px 6px rgba(18, 22, 31, 0.06), 0 -16px 40px rgba(18, 22, 31, 0.14); display: flex; flex-direction: column; overflow: hidden; }
.is-phone .s-chat { left: 8px; right: 8px; width: auto; border-radius: 22px 22px 0 0; }
.s-chathead { position: relative; height: 56px; flex: none; display: flex; align-items: center; gap: 10px; padding: 0 12px 0 16px; transition: background-color 300ms var(--ease-soft), color 300ms var(--ease-soft); }
.is-phone .s-chathead { height: 60px; padding-bottom: 4px; }
.s-chathead b { font-family: var(--font-display); font-weight: 800; font-size: 18px; }
.s-cic { display: flex; }
.s-cic svg { width: 21px; height: 21px; }
.s-cline { min-width: 0; flex: 1 1 auto; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.s-cline b { font-family: var(--font-sans); font-size: 14.5px; font-weight: 700; }
.s-cfaces { display: flex; }
.s-cfaces .s-av { margin-right: -7px; box-shadow: 0 0 0 2px var(--sky); }
.s-ccount { min-width: 24px; height: 24px; padding: 0 7px; border-radius: 99px; background: var(--sky); color: var(--on-sky); font: 600 12px/24px var(--font-mono); text-align: center; visibility: hidden; }
.s-cchev { display: flex; width: 32px; height: 32px; border-radius: 99px; align-items: center; justify-content: center; color: var(--ink-muted); transition: transform 400ms var(--ease-soft); }
.s-cchev svg { width: 18px; height: 18px; }
.s-chat.open .s-cchev { transform: rotate(180deg); }
.s-chat.unread .s-chathead { background: var(--sky); color: var(--on-sky); }
.s-chat.unread .s-ccount { visibility: visible; background: var(--on-sky); color: var(--sky); }
.s-chat.unread .s-cchev { color: var(--on-sky); }
.s-chat.unread { animation: s-nudge 3.6s var(--ease-soft) 1.2s infinite; }
@keyframes s-nudge { 0%, 80%, 100% { translate: 0 0; } 86% { translate: 0 -7px; } 92% { translate: 0 0; } 96% { translate: 0 -2px; } }
.s-chatbody { flex: 1; min-height: 0; display: flex; flex-direction: column; border-top: 1px solid var(--line); }
.s-chatpop { position: absolute; right: 16px; bottom: 68px; width: 340px; z-index: 12; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; }
.s-popmsg { display: flex; align-items: flex-end; gap: 8px; max-width: 300px; }
.s-popmsg p { margin: 0; background: var(--surface); box-shadow: var(--shadow-pop); border-radius: 18px 18px 6px 18px; padding: 9px 14px; font-size: 15px; line-height: 1.35; }
.s-popmsg p small { display: block; font-size: 12px; font-weight: 700; color: var(--ink-muted); }
.s-msgs { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; padding: 12px 14px; overflow: hidden; }
.s-msg { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 2px 8px; align-items: end; }
.s-msg .s-av { grid-row: span 2; align-self: end; }
.s-msg small { font-size: 12px; font-weight: 700; color: var(--ink-muted); padding-left: 4px; }
.s-msg p { margin: 0; justify-self: start; background: var(--sunken); border-radius: 16px 16px 16px 5px; padding: 7px 12px; font-size: 14.5px; line-height: 1.35; max-width: 100%; overflow-wrap: anywhere; }
.s-msg.me { grid-template-columns: minmax(0, 1fr); justify-items: end; }
.s-msg.me p { background: var(--sky); color: var(--on-sky); border-radius: 16px 16px 5px 16px; justify-self: end; }
.s-msg.big p { background: transparent; font-size: 34px; padding: 0 4px; }
.s-sys { align-self: center; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--ink-muted); background: var(--sunken); border-radius: 999px; padding: 4px 12px; white-space: nowrap; }
.s-compose { padding: 10px 12px 12px; border-top: 1px solid var(--line); }
.s-input { display: flex; align-items: center; gap: 8px; height: 46px; border-radius: 999px; border: 1.5px solid var(--line-strong); padding: 0 6px 0 16px; font-size: 14.5px; font-weight: 500; }
.s-input .txt { flex: 1; white-space: nowrap; overflow: hidden; }
.s-input .ph { color: var(--ink-muted); }
.s-input b { width: 34px; height: 34px; border-radius: 99px; background: var(--ink); color: var(--on-ink); display: inline-flex; align-items: center; justify-content: center; flex: none; }
.s-input b svg { width: 16px; height: 16px; }
.s-scrim { position: absolute; inset: 0; background: var(--scrim); z-index: 10; }
```

Changes for the app:
- `absolute` becomes `fixed`.
- `z-index` 12 becomes `35`.
- `--sunken` becomes `--surface-sunken` (Tailwind `bg-sunken`).
- `.is-phone` becomes `max-sm:`.
- `.s-av` becomes `<Avatar>`.
- The nudge keyframes go into `globals.css` `@theme` as `--animate-nudge`, next to `boing`.
- The open and fold height, the jump and the bubbles use motion.

Tailwind sketch of the container: `fixed bottom-0 right-4 z-[35] flex w-[340px] flex-col overflow-hidden rounded-t-[20px] border border-b-0 border-line bg-surface shadow-[0_-2px_6px_rgba(18,22,31,0.06),0_-16px_40px_rgba(18,22,31,0.14)] max-sm:inset-x-2 max-sm:w-auto max-sm:rounded-t-[22px]`.

---

## 4. History (`shell.js` `History(ctx)` and `stage.css` `.s-hist*`)

### 4.1 The button

- **Place:** in the match header, **left of the theme tag** (`head.prepend(histBtn)`). Header order on desktop: `[History (n)] [Theme tag] ··· [Leave] [Give up] [Timer]`. On phone the same, with icon-only buttons.
- **It exists only during the turns.**
  - It is hidden in the lobby, vote and pick.
  - It **pops in at scene 10 +5.2 s** (scale 0.3→1, opacity, 0.5 s back.out(2.4)).
  - On later mounts (reload mid-turn) it is just there, with no pop.
- **Look:** `inline-flex; gap 8; height 40; padding 0 12; pill; border 1.5px var(--line-strong); background var(--surface); 600 14px; flex:none`.
  - Icon: **panel-left** (rect, line at x = 9, chevron right) at 19 px. Lucide `PanelLeftOpen` when closed and `PanelLeftClose` when open, which mirrors today's right-hand icons.
  - Label "Histórico" ("History"), desktop only.
  - Count `.s-hcount`: `min-width 20; height 20; padding 0 6; pill; var(--sunken) bg; var(--ink); 500 12px/20px mono`.
- **On (open):** `--ink` background, `--on-ink` text and `--ink` border. The count goes to `color-mix(--on-ink 18%)` with `--on-ink` text. This equals today's `open && "border-ink bg-ink text-on-ink"` and `bg-on-ink/15`.
- **Phone:** a 40x40 icon button. The count sits on the corner: `top -6; right -6; 18px; 11px; --sky / --on-sky`. That equals today's `max-lg:*` classes.

### 4.2 The panel

- **Desktop (≥1024, `WIDE`):** `position: left 0, top 0, bottom 0` (**full height**, starting from the very top, not under the header). Width **360**. Flat: no radius, `border-right: 1px solid var(--line)`, `background: var(--surface)`, `z 13`. Column, `overflow:hidden`.
  - **It pushes:** the main area's `left` animates 0 → 360 together with the panel's `xPercent` −100 → 0, header included.
  - Open: **0.55 s power3.out**. Close: **0.4 s power3.in**.
  - In React: a sticky full-height wrapper (`sticky top-0 h-dvh self-start shrink-0 overflow-hidden`) whose **width** animates 0 ↔ 360. Inside it, a 360 px panel anchored to the wrapper's right edge (`flex justify-end`), so the panel appears to slide in from the left exactly like the prototype. `GameFrame` becomes a row: `[left sidebar] [column: header + main]`.
- **Phone (narrow, <1024):** the panel is **88% of the width** (343 px at 390) and slides in from the left **over a scrim**. Scrim: `--scrim`, autoAlpha 0.3 s.
  - Panel: `padding-top 40` (the status bar; in the app `env(safe-area-inset-top)`), `border-radius: 0 28px 28px 0`, `box-shadow: var(--shadow-pop)`. Same timings.
  - Close with X, a scrim tap or Escape. Keep `role="dialog" aria-modal` and focus on close, as today.
  - The prototype's scrim (z 10) sits *under* the chat (z 12), so the chat peeks over it. In the app put the drawer at z-40, above the chat (z-35).
- **Remembered open state** (`useHistorySidebar`, localStorage `ludodare:history-sidebar`): keep it, but **never render the sidebar before the history button exists**. During the turns intro it stays closed, then opens if remembered once the clock beat passes. Otherwise a remembered-open bar would push the stage.

### 4.3 Contents (the same as today, restyled lightly)

- **Head** `.s-hhead`: `space-between; padding 18px 16px 10px 22px`. Title "Histórico" display **800 26px** (today `text-2xl` bold). Close: a 40 px circle with a 1.5 border and an X at 18 px.
- **Filters** `.s-hfilters`: column, `gap 10`, `padding 0 22px 14px`, `border-bottom 1px var(--line)`.
  - **People** `.s-hpeople`: segmented, `flex-wrap; gap 2; padding 4; radius 22; var(--sunken); align-self:flex-start`.
    - Items: `h 32; padding 0 10; pill; 600 13px; muted; gap 6`, holding avatar 20, the name ("Caio (você)") and the count `em` (11.5 px, opacity 0.6, tabular).
    - Selected: `--surface` background, `--ink` text, `--shadow-card`.
    - **Order: you first, then the others in turn order.** Today it is you first, then seat order (`history-panel.tsx:189-191`). Align it with the strip.
  - **Kinds** `.s-hkinds`: `gap 6`. Items: `h 30; padding 0 12; pill; border 1.5 var(--line-strong); 600 13px; muted`. Selected: `--ink` background and border, `--on-ink` text. Labels "Tudo/Perguntas/Palpites" with counts, i.e. today's `kinds.all/question/guess`.
  - **Caption** `.s-hcap`: 500 12.5px muted, lh 1.4. "Perguntas e palpites de Bia: 3 de 4 jogadas · a mais recente em cima" is today's `playerCaption` / `mineCaption`.
- **List** `.s-hlist`: `padding 16px 22px; gap 16`, newest first, scrolls (app: `overflow-y:auto`).
  - Row: the number `.s-hn` (28 px circle, mono 500 13px, `--sunken`; yours `--sky-soft`), then a column with gap 5 holding:
    - who: `.s-hwho` "Pergunta · [av18] Bia", 600 13px muted
    - text: 16 px / 1.35, a guess in “quotes”
    - answers: `.s-hans`, wrap, gap 6 by 10, avatar 20 plus a chip
    - or the guess result chip "Acertou" (yes) / "Ainda não" (unknown)
    - the note: `.s-hnote` 14 px muted, "[av16] Leo: “com certeza 😂”"
  - **Empty:** "Nada por aqui ainda. As perguntas aparecem aqui assim que alguém joga." Today's text is "Nothing here yet."; optionally extend it with "Questions show up here as soon as someone plays."
- **Chips** `.s-chip` match today's `AnswerChip small` / `ResultChip`. Keep those components; the CSS below is the reference.

### 4.4 The exact CSS (verbatim)

```css
/* history: button left of the theme, a full-height bar on the left */
.s-histbtn { position: relative; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border-radius: 999px; border: 1.5px solid var(--line-strong); background: var(--surface); font-weight: 600; font-size: 14px; flex: none; }
.s-histbtn svg { width: 19px; height: 19px; }
.s-histbtn.on { background: var(--ink); color: var(--on-ink); border-color: var(--ink); }
.s-hcount { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; background: var(--sunken); color: var(--ink); font: 500 12px/20px var(--font-mono); text-align: center; }
.s-histbtn.on .s-hcount { background: color-mix(in oklab, var(--on-ink) 18%, transparent); color: var(--on-ink); }
.is-phone .s-histbtn { width: 40px; padding: 0; justify-content: center; }
.is-phone .s-hcount { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; line-height: 18px; padding: 0 4px; font-size: 11px; background: var(--sky); color: var(--on-sky); }
.s-hist { position: absolute; left: 0; top: 0; bottom: 0; z-index: 13; background: var(--surface); border-right: 1px solid var(--line); display: flex; flex-direction: column; overflow: hidden; }
.is-phone .s-hist { padding-top: 40px; border-radius: 0 28px 28px 0; box-shadow: var(--shadow-pop); }
.s-hhead { display: flex; align-items: center; justify-content: space-between; padding: 18px 16px 10px 22px; }
.s-hhead b { font-family: var(--font-display); font-weight: 800; font-size: 26px; }
.s-hhead .s-iconbtn svg { width: 18px; height: 18px; }
.s-hfilters { display: flex; flex-direction: column; gap: 10px; padding: 0 22px 14px; border-bottom: 1px solid var(--line); }
.s-hpeople { display: flex; flex-wrap: wrap; gap: 2px; padding: 4px; border-radius: 22px; background: var(--sunken); align-self: flex-start; }
.s-hpeople > span { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 999px; font-weight: 600; font-size: 13px; color: var(--ink-muted); }
.s-hpeople > span.on { background: var(--surface); color: var(--ink); box-shadow: var(--shadow-card); }
.s-hpeople em, .s-hkinds em { font-style: normal; font-size: 11.5px; opacity: 0.6; font-variant-numeric: tabular-nums; }
.s-hkinds { display: flex; gap: 6px; }
.s-hkinds span { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 999px; border: 1.5px solid var(--line-strong); font-weight: 600; font-size: 13px; color: var(--ink-muted); }
.s-hkinds span.on { background: var(--ink); border-color: var(--ink); color: var(--on-ink); }
.s-hcap { font-weight: 500; font-size: 12.5px; color: var(--ink-muted); line-height: 1.4; }
.s-hlist { margin: 0; padding: 16px 22px; list-style: none; display: flex; flex-direction: column; gap: 16px; overflow: hidden; flex: 1; min-height: 0; }
.s-hlist li { display: flex; gap: 12px; }
.s-hlist li > div { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; }
.s-hn { width: 28px; height: 28px; border-radius: 99px; flex: none; display: flex; align-items: center; justify-content: center; font: 500 13px var(--font-mono); background: var(--sunken); }
.s-hn.me { background: var(--sky-soft); }
.s-hwho { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; font-size: 13px; color: var(--ink-muted); }
.s-hlist p { margin: 0; font-size: 16px; line-height: 1.35; }
.s-hlist .s-hnote { font-size: 14px; color: var(--ink-muted); }
.s-hans { display: flex; flex-wrap: wrap; gap: 6px 10px; }
.s-hans > span { display: inline-flex; align-items: center; gap: 6px; }
.s-hempty { color: var(--ink-muted); font-size: 15px; line-height: 1.45; }
.s-chip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px; border-radius: 999px; border: 1.5px solid; font-weight: 600; font-size: 12.5px; white-space: nowrap; }
.s-chip i { width: 9px; height: 9px; border-radius: 99px; box-sizing: border-box; }
.s-chip.yes { border-color: var(--yes); background: var(--yes-soft); }
.s-chip.yes i { background: var(--yes); }
.s-chip.probably_yes { border-color: var(--yes-soft); background: var(--yes-soft); }
.s-chip.probably_yes i { border: 2.5px solid var(--yes); }
.s-chip.no { border-color: var(--no); background: var(--no-soft); }
.s-chip.no i { background: var(--no); }
.s-chip.probably_no { border-color: var(--no-soft); background: var(--no-soft); }
.s-chip.probably_no i { border: 2.5px solid var(--no); }
.s-chip.unknown, .s-chip.irrelevant { border-color: var(--sunken); background: var(--sunken); }
.s-chip.unknown i { background: var(--line-strong); }
.s-iconbtn { width: 40px; height: 40px; border-radius: 999px; border: 1.5px solid var(--line-strong); background: var(--surface); display: inline-flex; align-items: center; justify-content: center; position: relative; }
```

(`.s-chip.irrelevant i` has no rule, so its dot is invisible. `AnswerChip` already defines the real look.)

---

## 5. Backdrops per step (`shell.js` washes and glyphs)

### 5.1 How it is built

- **One wash layer per colour**, all stacked at `inset:0`. They crossfade by opacity (`ctx.wash(t, key, dur)`: the new one goes to 1 and the current one to 0, `sine.inOut`).
- **One glyph layer per glyph set**, crossfaded by opacity (0.8 s). The glyph colour is a single CSS var `--gc` set at the switch time.
- In the prototype both live on the stage, outside `main`, so the history push does not move them. That is the same as today's `TurnBackdrop` portal on `body`.

```css
/* backdrop: one wash per stage colour, crossfaded by the timeline */
.s-wash { position: absolute; inset: 0; opacity: 0; }
.s-wash::before { content: ""; position: absolute; inset: 0; background: color-mix(in oklab, var(--c) var(--wash-mix), var(--canvas)); }
.s-wash::after {
  content: ""; position: absolute; inset: -20%;
  background:
    radial-gradient(closest-side at 18% 22%, color-mix(in oklab, var(--c) 34%, transparent), transparent),
    radial-gradient(closest-side at 82% 70%, color-mix(in oklab, var(--c) 26%, transparent), transparent);
  animation: s-drift 22s ease-in-out infinite alternate;
}
.s-wash.solid::before { background: var(--c); }
.s-wash.solid::after { background: radial-gradient(closest-side at 70% 30%, rgba(255,255,255,0.14), transparent), radial-gradient(closest-side at 20% 85%, rgba(0,0,0,0.16), transparent); }
@keyframes s-drift { from { transform: translate(0, 0) scale(1); } to { transform: translate(4%, -3%) scale(1.08); } }
.s-glyphs { position: absolute; inset: 0; pointer-events: none; }
.s-glyphs span {
  position: absolute; font-family: var(--font-display); font-weight: 800; line-height: 1;
  opacity: 0.16; animation: s-bob var(--t, 9s) ease-in-out infinite; color: var(--gc, var(--ink));
}
.s-glyphs.emoji span { opacity: 0.22; filter: saturate(0.9); }
@keyframes s-bob { 0%, 100% { transform: translateY(0) rotate(-8deg); } 50% { transform: translateY(-16px) rotate(8deg); } }
```

- **Glyph spots** `[left %, top %, size px, seconds]`: `[5,20,44,9] [12,76,30,8] [30,9,24,10] [47,86,36,9.5] [66,13,28,8.5] [82,58,50,10.5] [93,30,24,7.5]`.
  - Sizes ×0.8 on phones.
  - Each span gets `animation-delay: −i×1.3s` and `--t: <seconds>`.
- **Colour keys:**

  | key | colour | solid |
  |---|---|---|
  | brand | `--brand-stage` | **yes** |
  | butter | `--butter` | |
  | theme | `--no` | |
  | sky | `--seat-1` | |
  | apricot | `--seat-2` | |
  | teal | `--seat-3` | |
  | purple | `--seat-4` | |

- **Glyph sets:**
  - `q`: seven "?"
  - `hero`: `🦸 ⚡ 🛡️ 🦸‍♀️ 💥 ⚡ 🦹` (the Heroes set), class `emoji`

### 5.2 Which colour in which step

| step | wash | glyphs (colour) | notes |
|---|---|---|---|
| lobby | none (`--canvas`) | none | the lobby stays as it is |
| match starts (lobby end +0.1) / cold open / "Round 2" card | **brand, solid** (0.7 s) | `?` in `--brand-butter` | text on it in `--on-brand` |
| theme vote (and host typing, by extension) | **butter** (0.8 s) | `?` in `--on-butter` | |
| theme reveal plus rule (+0.9) | **theme = `--no`** (1.1 s) | **theme set emojis** (ink, ignored by emoji) | the notes say "colour and symbols come from the theme set". The prototype uses a fixed colour per step (coral) and set symbols, which matches the user's decision "coloured per step… symbols from the theme's set" |
| draw | **brand, solid** (0.7 s) | `?` in `--brand-butter` | |
| draw end (+5.0) → for whom → pick → new name | **the target's seat colour** (prototype: teal = Leo, seat 3) (0.8 s) | theme set emojis | "while picking, the colour of whoever you pick for": it differs per viewer |
| scene 9, your character | **seat colour of whoever picked yours** (prototype: purple = Rafa, seat 4) (0.8 s) | theme set emojis (unchanged) | inferred: the chapter dot is `--seat-4` and Rafa is seat 4 |
| scene 10, order (+2.5) | **first player's seat colour** (prototype: apricot = Bia, seat 2) (1.0 s) | **`?` in that seat colour** | the same as `TurnBackdrop` for turn 1, so the hand-off is seamless |
| turns | turn player's seat colour | `?` in that seat colour | today's `TurnBackdrop`, crossfading 1.4 s per turn |

### 5.3 Glyphs from the theme set

`THEME_SETS` (`src/game/theme-sets.ts`) holds **one** emoji per set, and `themeSetEmoji(key)` returns it. The prototype shows seven related symbols for Heroes. Two options:
- **(a) Recommended:** add `glyphs: string[]` (5-7 emoji) to each `THEME_SETS` entry. For example heroes `🦸 ⚡ 🛡️ 🦸‍♀️ 💥 🦹`, anime `🍥 🍙 ⛩️ 🌸 🗡️`, games `🎮 👾 🕹️ 🍄 ⭐`.
- **(b)** Repeat the set's single emoji in all 7 spots.

A typed theme (`set === null`) uses `✍️` or falls back to the `?` set.

### 5.4 Tokens missing from `globals.css`

Values from `flow.css`. Light goes on `:root`; dark goes under `[data-theme="dark"]`, because the app's theming uses next-themes `data-theme`, not the media query.

| token | light | dark |
|---|---|---|
| `--brand-stage` | `#2b69c8` | `#1d4a93` |
| `--brand-butter` | `#f6e3a1` | `#f6e3a1` |
| `--on-brand` | `#ffffff` | `#ffffff` |
| `--wash-mix` | `20%` | `26%` |
| `--on-seat-1` | `#ffffff` | `#0f1b30` |
| `--on-seat-2` | `#2a1707` | `#2a1707` |
| `--on-seat-3` | `#ffffff` | `#06211f` |
| `--on-seat-4` | `#ffffff` | `#1d0f2e` |

(`--sky-deep`, `--yes-deep` and `--apricot-deep` already exist. The prototype's `--sunken` is the app's `--surface-sunken`.)

### 5.5 Today's `TurnBackdrop` vs the proposal, and how to generalise it

| | today (`turn-backdrop.tsx`) | prototype |
|---|---|---|
| input | `seat` | any colour key, solid or soft, plus a glyph set and a glyph colour |
| base tint | 7% `color-mix` over transparent | **20% (dark 26%)** `color-mix` with `--canvas` |
| glow | 3 blurred blobs (`blur-3xl`, 62/58/40 vmax, mix 30/24/18%) wandering 22-32 s | 2 radial glows (34% and 26%) at 18%/22% and 82%/70%, layer inset −20%, drifting 22 s alternate |
| glyphs | "?" only, coloured, opacity 0.14, spots `[4,22,44,9] [12,78,30,8] [31,10,22,10] [48,88,36,9.5] [68,14,28,8.5] [84,60,52,10.5] [94,30,24,7.5]` | "?" at 0.16 or set emoji at 0.22 with saturate(0.9), spots in §5.1 (nearly the same) |
| crossfade | 1.4 s easeInOut, keyed by seat | 0.7-1.1 s sine.inOut |
| mount | inside `TurnScreen` (portal to body), `AnimatePresence initial={false}` | always present, one layer per colour |
| reduced motion | blobs and marks still | (CSS 1 ms) |

Proposal:
- **`StageBackdrop`**, mounted **once in `RoomScreen`** (portal to `body`, `fixed inset-0 -z-10`). It takes `{ color, solid, glyphs, glyphColor }` from a small selector over the view: phase, presentation beat, target seat, picker seat, first player and turn player.
- It crossfades layers keyed by `color + solid` and by glyph set, so moving from pick to turns or from vote to theme fades instead of cutting. Keep the reduced-motion branch.
- **Open point:** use the proposal's 20% wash on turn screens too, or keep today's 7% plus blobs for turns. The proposal draws the game end frame on the 20% wash, but says the turn screen "stays as it is". Recommend one recipe (the proposal's) everywhere and a check of turn-screen contrast in light and dark. The fallback is a `strength: "turn"` variant at today's 7%.

---

## 6. `player.js`: mocks and timing chart

### 6.1 The five chat and history mocks

Each mock is the same `Shell`, frozen at one moment, with the cursor, touch and ripple hidden (`flow.css:280`). Each is pre-seeded with:
- `say(0.02, bia, "cheguei!! 👋")`
- `say(0.04, leo, "bora que hoje eu ganho")`
- `sys(0.06, "▶ Partida começou")`
- a wash (`butter` for the vote, `teal` otherwise)
- outside the vote: `sys(0.08, "🦸 Tema: Super-heróis")` and the visible theme tag

| id | device | chat | scene @ time | what it shows |
|---|---|---|---|---|
| `mock-shut` | desktop | folded | pick @ 7.75 | **Unread**: blue head, count **3** (Bia, Leo, Leo), faces [Leo, Bia], bubble "Leo: pelo amor de deus algo fácil 😅" (sent at 7.0, visible until 10.05). Caption: "Folded chat, new message: the tab hops, turns blue, shows who sent it and how many are unread. The bubble with the message stays 3 s above it." |
| `mock-open` | desktop | open | vote @ 6.75 | open to 62%: seeded lines plus "desenhos pfv 🙏" (Rafa 2.1), "heróis!!!" (Leo 5.7), "rafa perdeu kkkk" (Bia 6.4). Caption: "Open chat: one click on its top and it rises to about 60% of the height, over the screen. Another click on the top folds it." |
| `mock-hist` | desktop | folded | order @ 9.3, `history: true` | history **open** (tapped at +7.6, opening from 8.3, fully open at 8.85), main pushed 360 px. Filled with SAMPLE through **Bia's** filter: people you 0 · **Bia 3** · Rafa 1 · Leo 0; kinds All 3 · Questions 2 · Guesses 1; caption "Perguntas e palpites de Bia: 3 de 4 jogadas"; list #9 guess "Tempestade" → "Ainda não", #5 "Eu sou uma mulher?" all yes plus note "[av]Leo: “com certeza 😂”", #1 "Eu sou da Marvel?" (Rafa no, you no, Leo probably no). Button count 4. Chat folded with count 3, bubble "vai bia 👀" (6.6 to 9.65). Caption: "History open: the button left of the theme opens the full-height bar on the left, which pushes the screen. Filters and plays like today's history." |
| `mock-peek` | phone | folded | target @ 2.4 | the phone bar: blue, "Leo: bora que hoje eu ganho", count 2. Caption: "Phone, folded: a bar at the bottom with the last message and the count. It turns blue when there is something new." |
| `mock-sheet` | phone | open | vote @ 7.6 | the bar opened to 66% from the bottom, holding every message so far. Caption: "Phone, open: rises from the bottom the same way. Tapping the top folds it." |

The mocks match the rules in §3.5: what arrives while folded counts; opening resets.

### 6.2 The timing chart (`chart()`)

The scale is 0-180 s with an axis tick every 30 s. A segment shows its label only when it is ≥10 s. Each row's caption is "{sub} · {fixed} s além da escolha" (beyond the pick).

| row | segments (s) | fixed time beyond the pick |
|---|---|---|
| **Today** ("como está") | vote 13 · theme 3 · pick 120 | **16 s** |
| **Proposal, the room's 1st match** | intro 7 · theme line 1 · vote 20 · theme (+ rule) 6 · draw 4.5 · for whom 2.5 · pick 120 · yours 4.3 · order 4 | **49.3 s** |
| **Proposal, later matches** | intro 1.5 · vote 20 · theme 3 · draw 3 · for whom 3 · pick 120 · yours 3 · order 3 | **36.5 s** |

Segment colours (legend):

| kind | colour |
|---|---|
| Opening | `color-mix(--sky 45%, --surface)` |
| Theme line | `--butter-soft` |
| Vote | `--butter` |
| Theme (+ rule) | `--no-soft` |
| Draw | `--sky-soft` |
| For whom | `color-mix(--seat-3 32%, --surface)` |
| Pick, up to 2 min | `--yes-soft` |
| Your character | `color-mix(--seat-4 32%, --surface)` |
| Order | `--apricot-soft` |

Derived numbers:
- New scenes on the first match: 7 + 1 + (6 − 3) + 4.5 + 2.5 + 4.3 + 4 = **26.3 s** (the text says "about 30 s").
- New scenes on later matches: 1.5 + 0 + 3 + 3 + 3 + 3 = **13.5 s** ("about 14 s").
- Plus the vote: 13 → 20 = **+7 s**.
- Consequences for constants:
  - the theme reveal becomes 6 s on the first match (today `REVEAL_TIMING.theme = 3000`, plus the tie spin 2000) and stays 3 s later
  - the intro window covers 7 + 1 / 1.5
  - scenes 9-10 cover 4.3 + 4 (or 5.4, see §2.6) / 3 + 3

Reduced motion in the player: it starts paused at the pick scene + 9.5 s. Not product.

---

## 7. `flow.html` sections (content, in English)

### 7.1 "Chat e histórico" — *Each in its own corner*

> The chat is a tab in the bottom right corner, in the lobby and in the match. It rises over the screen when called and goes back when nobody needs it. The history is something else: it exists only during the turns and opens a full-height bar on the left.

Layout: two large mocks in a row (`mock-shut` and `mock-open`), then a row with `mock-hist` (wide) and the two phone mocks (250 px each). The captions are in §6.1. After the mocks, four decision blocks:

- **Over, not beside:** the chat reserves no space. Screens stay big and centred, and the open chat passes in front of them.
- **A new message calls:** a blue tab, a counter, the senders' faces, a 3 s bubble and a little hop now and then until someone opens it.
- **History on the left:** separate from the chat, and only during the turns. Its button sits left of the theme; open, it takes the full height.
- **Only the conversation:** no list of who is in the room and no emoji shortcuts. Messages plus system lines ("Theme: Superheroes").

### 7.2 "Tempo" — *What the presentation costs*

> The new scenes add about 30 s on the room's first match and about 14 s on later ones, when the opening becomes a short card and the theme rule is not repeated. The vote also grows from 13 to 20 s. Picking keeps its up-to-2-min and ends sooner if everyone confirms.

This is followed by the chart in §6.2.

### 7.3 "No código" — *What changes underneath*

> The game screen (questions, answers, guesses) does not change. The rest fits what already exists: the shuffled order, the circle of who picks for whom and the server clock that syncs the reveals.

**Callout, "When implementing":**
> The theme vote goes from 13 to 20 seconds: `VOTE_SECONDS = 20` in `src/game/types.ts`, and the times text in `PRODUCT.md` with it. In the test with friends, 13 s ran out before everyone had read the three themes.

Repo check:
- `VOTE_SECONDS = 13` is at `types.ts:124` and is used in `engine.ts:211`. The tests reference the constant (`engine.test.ts:234,350`), so they follow it.
- `PRODUCT.md` **never states the vote time.** Line 14 lists the step times (80/80/60/40, 120 to pick), so add "20 s to vote on the theme" there.
- The ROADMAP line 140 ("13 s (was 11 s)") is history; leave it.

**Card "Match":**
- `VOTE_SECONDS`: 13 → 20.
- `beginMatch` already shuffles `order` and builds the `assignments` circle; the scenes only show it. (Verified.)
- A presentation step before `picking`, with its start delayed like the reveals: full when `round === 1`, short afterwards. (A matching delayed window after picking for scenes 9-10 is **also** needed; see §2.6.)
- The pick draft is saved on the server while editing (name, image, id). On `timeout` the draft becomes the `PICK`, creating the character if it is new. A random pick only for an empty card.

**Card "Screens":**
- A new stage for the opening, draw, "for whom", "your character" and order, driven by the server clock like `RevealOverlay`.
- `PickScreen` without `Mode`: the field on the card itself, a preview of the first result, an image tray and the hand of suggestions.
- `TurnBackdrop` generalised: colour per step or per target player, symbols from the theme's set (`themeSetEmoji`).

**Card "Chat":**
- A `room_messages` table (room, author, text up to 280, kind message/system/reaction), delivered by Realtime on the channel the room already uses.
- A per-player send limit in `rate-limit.ts`, text only, deleted when the room closes.
- The chat as a floating tab in the corner, mounted in `RoomScreen` so it works in the lobby and in the match. The unread counter lives in the browser.
- `HistorySidebar` moves to the left, and `HistoryButton` goes left of the theme in `GameHeader`.

---

## 8. Current code vs the proposal: what stays, moves or is new

### `src/features/turn/turn-screen.tsx`
- **Stays:**
  - the modes and every step (`Ask`, `Answer`, `Guess`, `Validate`, `Waiting`)
  - the focus card (`CharacterCard`, `FocusRow` on phones) and its flip on focus change
  - the `PlayerStrip`, the step `AnimatePresence`
  - `GiveUpButton` in `actions`
- **Moves:**
  - `after={<HistoryButton …/>}` (right of the clock) becomes a new **`lead`** slot (left of the theme)
  - `sidebar={…HistorySidebar…}` becomes **`leftSidebar`** (push)
- **New:**
  - the scenes 9-10 intro rendered in `main` while the intro window is active (§2.3, §2.7), with strip and body entrances on the beats
  - the history button hidden until +5.2, then a pop
  - the timer hidden until the clock beat
  - `TurnBackdrop` replaced by the room-level `StageBackdrop`
- **Changes by data:** your card's meta shows "Picked by {name}" once `pickedById` is exposed (§0.1).
- **Guard:** `autoFocus` must not steal focus from the chat (§3.9).

### `src/features/turn/turn-backdrop.tsx`
- **Becomes** `StageBackdrop`, mounted in `RoomScreen`. It takes `color`, `solid`, `glyphs` and `glyphColor`, uses the proposal's wash recipe (§5.1) and the prototype spots, and keeps its reduced-motion handling.
- During turns it is fed `seatColor(turnPlayer.seat)` and "?" in that colour, which is today's behaviour.

### `src/features/turn/player-strip.tsx`
- **Stays** as it is: turn order, the 2 px seat ring on the turn player, `CardPeek` popover, `layout` on items, 2 columns on phones.
- **New (small):** an entrance after the intro (y −30→0, opacity, back.out(1.6), stagger 0.06), as variants or a prop.

### `src/features/turn/history-panel.tsx`
- `HistoryButton`:
  - **moves** into the header's left group, before `ThemeTag`
  - icons `PanelRightOpen/Close` become **`PanelLeftOpen/Close`** (phone: `PanelLeftOpen` like the prototype, or keep `History`)
  - **new** pop-in at the intro's +5.2
  - look, count and open state **stay**
- `HistorySidebar`:
  - **moves** from the right to the **left**
  - becomes a **full-height flat bar**, `h-dvh`, top 0, `border-r`, no `rounded-xl` card or `shadow-card`, instead of `sticky top-6 … h-[calc(100dvh-7.5rem)] rounded-xl`
  - width **360** instead of `clamp(320px,26vw,420px)`
  - **pushes the header too**
  - open 0.55 power3.out / close 0.4 power3.in, instead of `dur.slow/base` `ease.soft`
- `HistoryDrawer`: a **bottom sheet** (85dvh, `y: 100%`) becomes a **left drawer** (88vw, full height, `x: -100%`, radius 0 28 28 0, shadow-pop, safe-area top). Scrim, focus and Escape **stay**.
- `HistoryBody`:
  - **stays** (filters, captions, list, `AnswerChip` / `ResultChip`, notes with `PlayerName`)
  - small: people order becomes you first, then **turn order**; title 26 px / 800; optional longer empty text
- `useHistorySidebar`: **stays**, but must not open during the intro (§4.2).

### `src/features/turn/give-up-button.tsx`
- **Stays** unchanged, still in the right group left of the clock. (The prototype's header shows only leave and timer, being a mock. Keep everything that works.) Optionally disable it during the intro window.

### `src/features/room/game-header.tsx`
- `GameHeader`:
  - **new** `lead` slot rendered **before** `ThemeTag` in the left group (`flex min-w-0 items-center gap-4`, which could become gap 10 like the prototype's head)
  - `after` becomes unused; keep it or drop it
  - **new** `hideClock` (or a derived "intro" check) for the intro window
  - `ThemeTag` **stays** the butter pill. The prototype draws a 40 px white pill with a shadow (`.s-tagtheme`), but the ROADMAP says the theme stays in the header "as today". Optionally match its height to 40 px so it lines up with the history button.
- `GameFrame`:
  - layout **changes** to `row: [leftSidebar] [column: header + main]` so the bar is full height and pushes the header
  - the right `sidebar` slot goes away
  - **new** bottom padding for the chat (`--chat-safe`)

### `src/features/room/room-screen.tsx`
- **Stays:** joining, password, moved and in-match guards, `PhaseScreens` with its keyed fade, sounds, preloading, tab title, `RevealOverlay`.
- **New**, inside `RoomProvider`, beside `RevealOverlay` and **outside `<main>`:**
  - `<RoomChat />`
  - `<StageBackdrop />`
  - the scenes' presentation stage (spec A/B), if it is an overlay
- **Change:** `RevealOverlay` ignores keydown from the chat.

### `src/features/lobby/lobby-screen.tsx`
- **Stays exactly as it is.** The chat floats over it from `RoomScreen`. The settings editor (`RoomSetup`) is still the lobby, so the chat shows there too.
- The only side effect is the **page bottom padding** from `Screen` so the tab or bar does not hide the bottom of the aside or the player list. On phones the prototype keeps 74 px.

### Elsewhere (touched by this spec)
- `src/game/view.ts` and `view.test.ts`: `pickedById` for your own card (§0.1).
- `src/game/engine.ts` and `types.ts`:
  - the intro window after picking
  - `startStep` waits on it
  - `VOTE_SECONDS = 20`
  - the theme reveal at 6 s on the first match
- `src/app/globals.css`:
  - the tokens in §5.4
  - `--animate-nudge`
  - optionally the wash and glyph keyframes (`s-drift`, `s-bob`)
- `src/components/ui/avatar.tsx`: sizes 16, 18, 24, 26, 30 and 34.
- `src/components/ui/toast.tsx`: lift above the chat bar.
- `src/game/theme-sets.ts`: per-set `glyphs`.
- `src/lib/realtime.ts` and `src/server/backend/*`: chat delivery and storage.
- `PRODUCT.md`: the vote time, plus a line about chat and history.
- Messages (pt, en, ja): the chat, intro and system keys.

---

## 9. Open questions and risks

1. **Scene 10 length:** clock at +5.4 (follows the animation, 9.7 s for scenes 9-10 on the first match) or +4.0 (follows the chart, 8.3 s)? (§2.6)
2. **The short variant for later matches** is derived, not drawn. Validate it in practice. (§2.5)
3. **Turn-screen wash strength:** the proposal's 20% or today's 7%? (§5.5)
4. **Glyph lists per theme set:** new data, or repeat the single emoji? (§5.3)
5. **"Round N · X's turn" system line:** first turn only, or every turn round? (§3.7)
6. **The "reaction" message kind** in "No código" has no UI under the final decisions. Drop it, or use it for emoji-only messages. (§3.6)
7. **Small "from Rafa / by Leo" lines on the table:** keep them as muted text (recommended) or drop them under the "no badges" decision? (§2.1)
8. **Lead time** between the last pick and scene 9, so the confirm grow or "Time's up" stamp is not cut. (§2.6)
9. **Header flicker** on `PhaseScreens` re-key (pick → turn); the prototype keeps the header still. (§2.7)
