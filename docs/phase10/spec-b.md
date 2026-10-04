# Phase 10 · Spec B — scenes 5 to 8 (draw, for whom, pick, new name + timeout)

Source: `docs/phase10/prototype/scenes-b.js` (scenes 5-8 and `pickTable`), `kit.js`, `stage.css`, `shell.js`, `player.js` of the approved "4Dare em cena" prototype. Compared against `src/features/pick/*`, `src/components/ui/{logo,character-card,portrait,image-drop,text-field,button}.tsx` and the game/server code they rely on.

## 0. Conventions used below

- **Stage sizes.** Desktop device 1280×800; the scene area starts under a 76 px header, so it is **1280×724**. Phone device 390×844; the scene area starts at y=90 (40 status bar + header at top 26, 64 tall), so it is **390×754**. Sizes are written `desktop / phone`.
- **t** = seconds from the scene's own start. Scene lengths in the prototype: draw 5.4, target 4.6, pick 13.8 (demo-paced), new 9.6 (demo-paced).
- **Eases** are GSAP names. GSAP's default when none is given is `power1.out`. Exact formulas for motion/react are in §9. "yoyo" = there and back, the way back uses the same curve mirrored (so `power2.out` up, `power2.in` down).
- **Origins**: GSAP default `transformOrigin` is `50% 50%`; once a tween sets an origin it persists on that element.
- "Demo" = only exists to make the prototype play (pointer, ripple, fixed players, drawn portraits, chat lines). "Real" = must come from the room view.
- Tokens: the prototype uses `--sunken`; the repo calls it `--surface-sunken` (Tailwind `sunken`). Everything else maps 1:1 to `src/app/globals.css`, except the three brand stage tokens in §1.1.

---

## 1. Shared pieces (kit.js, stage.css)

### 1.1 Tokens these scenes need that globals.css does not have yet

| Token | Light | Dark | Used by |
|---|---|---|---|
| `--brand-stage` | `#2b69c8` | `#1d4a93` | draw background (solid wash) |
| `--brand-butter` | `#f6e3a1` | `#f6e3a1` | draw "?" glyphs, shake marks |
| `--on-brand` | `#ffffff` | `#ffffff` | draw sentence |
| `--wash-mix` | `20%` | `26%` | stage washes (backdrop spec) |

`--on-seat-N` is declared in the prototype and even aliased in scenes-b (`onSeat`) but **never used** in scenes 5-8, so these scenes do not need it.

### 1.2 `K.mark` → the urn (logo "4" speech bubble)

```
K.mark(fill = "#2B69C8", q = "#F6E3A1") =
<svg viewBox="-10 -10 840 850" aria-hidden>
  <path fill={fill} d={FOUR}/>
  <path class="q" fill={q} d={QUESTION} style="transform-box:fill-box;transform-origin:center"/>
</svg>
```

- The draw scene calls it **inverted**: `K.mark("#F6E3A1", "#2B69C8")` → butter 4, brand-blue "?". Fixed hex in both themes (brand colours, like `BRAND` in `logo.tsx`).
- Paths `FOUR` and `QUESTION` are byte-identical to `src/components/ui/logo.tsx` (checked).
- `.s-urn { position: relative }`, `.s-urn svg { width:100%; height:100%; overflow:visible; display:block }`. Box: `width u`, `height u × 1.01` with `u = 230 / 170`.
- The "?" is animated on its own (`.q`). Its x/y values are in **viewBox units** (GSAP writes SVG transforms in user space; CSS transforms on an SVG child behave the same), so on screen they are ×0.274 desktop / ×0.202 phone: the "?" hop of `y:-18` is ~5 px / ~3.6 px.

### 1.3 Critter avatars (`K.av`, `K.critter`, `K.pname`)

Demo only: four hand-drawn critters for Caio (you, seat 1), Bia (2), Leo (3), Rafa (4). In the app: `<Avatar>` (`critterUri(seed, color)` or picture), and names through `PlayerName` / `useWithNames`. `.s-av` = round, `overflow:hidden`, inline-flex, no ring.

Avatar sizes the scenes use, none of which are in `Avatar`'s `SIZE` map except 28/32/36/40: **68/52** (draw row), **150/120** (slip and target face), **40/34** (ring), **32/26** (pick title), **36** (done row), **28** (chat). `Avatar` accepts `className`, and `cn` (tailwind-merge) lets `size-[150px] text-[60px]` override the map, so no change to `Avatar` is strictly needed; adding the sizes to the map is cleaner.

### 1.4 Portraits (`K.portrait`) and `K.chars` / `K.cards`

- All portraits (spider, iron, iron2, iron3, hulk, wonder, panther, storm, chapolin, shrek) are **demo** flat illustrations, 4:5, `preserveAspectRatio="xMidYMid slice"`. In the app: `<Portrait src={thumbUrl(imageUrl, w)}>`.
- `blank` = silhouette in `--line` on `--sunken`. `Portrait tone="neutral"` paints the silhouette in `--line-strong` (a bit darker); pass `className="text-line"` to match the prototype's empty card.
- `K.chars` (demo data): name, origin, likes. Spider-Man Marvel 42, Iron Man Marvel 37, Wonder Woman DC 31, Hulk Marvel 27, Black Panther Marvel 19, Storm X-Men 12, Chapolin Colorado "Personagem novo", Shrek DreamWorks.
- `K.cards` (demo): `{ leo: "iron", bia: "wonder", rafa: "hulk", you: "panther" }`: what each one ends up with, consistent with scene 7 (you pick Iron Man for Leo).
- Demo turn order `K.order = ["bia","rafa","you","leo"]`; `targetOf(id)` = next in order (cyclic), `pickerOf(id)` = previous. This is exactly `beginMatch` in `src/game/engine.ts` (`assignments[order[i+1]] = { pickerId: order[i] }`).

### 1.5 `K.mini` (hand card, also used by scenes 4 and 9)

`.s-mini`: surface, radius 16, padding `6 6 8`, `shadow-card`, column, gap 5. Inside: `.s-portrait` radius 11; `b` 12.5 px / 700 / lh 1.15 / padding `0 3` / one line with ellipsis; `small` 11 px / 600 / ink-muted / padding `0 3` / flex gap 3. Width set by the caller. → One shared `MiniCard` component (spec A and C need it too).

### 1.6 stage.css classes used by scenes 5-8

| Class | Exact style | Notes |
|---|---|---|
| `.s-center` | flex column, items and justify centre, `text-align:center` | layout helper |
| `.s-big` | display font, 800, `letter-spacing:-0.03em`, `line-height:1.02`, `text-wrap:balance`, margin 0 | size set per use |
| `.s-sub` | ink-muted, `text-wrap:balance`, margin 0 | |
| `.s-shake` | `position:absolute; width:22px; border:5px solid transparent; border-radius:50%; opacity:0; pointer-events:none` | only the outer side's border is coloured (`border-left-color` on the left marks, `border-right-color` on the right) → a curved comic motion line ")" |
| `.s-paper` | `position:absolute; background:surface; border-radius:24px; shadow-pop; pointer-events:none` | the slip's paper left behind to dissolve |
| `.s-slip` | `position:absolute; surface; radius 24; shadow-pop; flex column, centred, gap 10` | gap/padding overridden inline |
| `.s-ring`, `.s-ring svg.arrows` | relative box; svg `absolute; inset:0; overflow:visible` | circle of who picks for whom |
| `.s-pname` | `inline-flex; align-items:center; gap:0.32em; nowrap; vertical-align:-0.12em` | name with avatar |
| `.s-card` | surface, radius 28, padding `12 12 16`, shadow-pop, column, gap 10, relative | the pick card |
| `.s-portrait` | relative block, `width:100%`, `aspect-ratio:4/5`, radius 18, `overflow:hidden`, bg sunken | card picture |
| `.s-fill` | `position:absolute; inset:0` | stacked picture layers |
| `.s-corigin` | 500, 13 px, ink-muted, margin `-6px 6px 0` (overridden inline to `0 4px`, `min-height:18px`) | line under the field |
| `.s-field` | relative flex, items centre, h 52, padding `0 14`, radius 14, border 1.5 `line-strong`, surface; display font 700 22 px, `-0.01em` | `.focus`: border sky + `0 0 0 4px color-mix(sky 22%, transparent)` |
| `.s-field .ph` | ink-muted, opacity .6, 600 | placeholder |
| `.s-caret` | 2.5×26, sky, margin-left 2, blink `1s steps(1)` (50% → opacity 0) | a real input has its own caret |
| `.s-drop` | absolute, `left:0; right:0; top:calc(100% + 8px)`, surface, radius 18, shadow-pop, padding 6, z 6, column, gap 2 | autocomplete list |
| `.s-row` | flex, items centre, gap 10, padding 6, radius 12, left aligned | `.hi` → bg sky-soft |
| `.s-row .s-portrait` | width 38, radius 8, flex none | |
| `.s-row b` / `small` / `mark` | 16/700/lh 1.2 · 12.5/500 ink-muted · `mark`: transparent bg, sky, 800 | matched part of the name |
| `.s-sticker` | absolute, z 4, padding `6 12`, radius 10, display 800 15 px, `letter-spacing:0.02em`, **uppercase**, nowrap | "Novo!" seal and "Tempo!" stamp |
| `.s-swap` | absolute `right:10; bottom:10`, z 3, inline-flex gap 6, h 36, padding `0 12`, pill, bg `color-mix(ink 82%, transparent)`, on-ink, 700 13 px, `backdrop-filter:blur(6px)`, icon 16 | "Trocar imagem" pill |
| `.s-tray` | absolute, z 7, surface, radius 20, shadow-pop, padding 10, flex gap 8 | picture tray |
| `.s-tray .s-portrait` | width 64, radius 12 | selected: `box-shadow: 0 0 0 3px surface, 0 0 0 5px sky` |
| `.s-tray .s-up` | width 64, radius 12, `2px dashed line-strong`, column centred, gap 2, 11 px 700 ink-muted, lh 1.15, icon 20 | "Enviar a sua" |
| `.s-dropzone` | absolute inset 0, radius 18, `2.5px dashed line-strong`, column centred gap 8, ink-muted 700 15 px, padding 18, bg sunken; icon 34; `small` 500 12.5 | `.hot`: border sky, colour sky, bg sky-soft |
| `.s-key` (+`.yes`) | inline-flex centred, gap 10, pill, display 800 `-0.01em`, `bg var(--k)`, `color var(--k-on)`, `box-shadow:0 6px 0 var(--k-lip)`, margin-bottom 6, icon 22; `.yes` = yes / on-yes / yes-deep | = `keyClass("yes")` |
| `.s-btn` | inline-flex centred, gap 8, h 44, padding `0 18`, pill, border 1.5 `line-strong`, surface, 600 15 px, icon 18 | Random |

---

## 2. Scene 5 — Draw ("Sorteio", 5.4 s)

**What it says:** "Everyone picks a character for someone else." The players hop into the logo's 4, it is shaken like a jar, swells, squeezes and spits out a slip that already is the next screen.

### 2.1 Layout

The scene is `s-center` (content centred in the scene area), text colour `--on-brand`.

```
column (gap 30 / 26), centred, z-index 1
├─ line   h2.s-big 46 / 28 px, max-width 700 / 330  "Cada um escolhe o personagem de outra pessoa."
├─ urnBox (relative)
│   ├─ urn  .s-urn  230×232.3 / 170×171.7  = K.mark(butter 4, blue "?")
│   └─ 4 shake marks .s-shake (2 per side, outside the bubble so they don't tilt with it)
└─ row    flex, gap 60 / 26: avatars 68 / 52 in TURN ORDER
slip (absolute, centred at 50%/50% of the scene, translate -50% -50%; hidden until launch)
```

Shake marks, k = 0 (inner), 1 (outer), on each side:
- horizontal: `left` (or `right`) = `-(30 + 16k) px` desktop, `-(22 + 12k) px` phone;
- `top: (26 + 6k)%`; `height: (34 − 10k)%` of the urn box; coloured side border `--brand-butter`.

Slip (`.s-slip`, `width:max-content`, colour ink): padding `30px 44px 26px` / `24px 30px 22px`, gap 14 / 12. Children, **written exactly like the next screen's top** so nothing changes size later:
1. "Você escolhe para": 700, 24 / 19 px, ink-muted;
2. target's avatar 150 / 120 with `outline: 6px solid <target seat colour>; outline-offset: 6px`;
3. target's name: `h2.s-big` 96 / 64 px (ink).

Rough desktop geometry (for sanity checks): line ≈ 94 px (2 lines), urn top ≈ y 259, urn bottom ≈ 491, mouth ≈ y 305 (scene coords). Phone similar, centred in 754.

### 2.2 Colours

- Backdrop: **solid brand wash** (`--brand-stage`) with two soft highlights: `radial-gradient(closest-side at 70% 30%, rgba(255,255,255,.14), transparent)`, `radial-gradient(closest-side at 20% 85%, rgba(0,0,0,.16), transparent)`, inset −20%, drifting `translate(4%,−3%) scale(1.08)` over 22 s alternate.
- Glyph layer: seven "?" at the shared spots (§7.4), colour `--brand-butter`, opacity .16, bobbing.
- Sentence `--on-brand` (white). Urn butter `#F6E3A1` with `#2B69C8` "?". Shake marks `--brand-butter`. Slip: surface, ink, ink-muted. Avatars on their own pastel.
- At t 5.0 the wash crossfades to the **target's seat colour** (`seatColor(target.seat)`; Leo = seat 3 teal in the demo) and the glyphs switch to the theme set's symbols in ink (opacity .22, emoji `saturate(.9)`).

### 2.3 Timeline (t from scene start)

| t | Element | Animation | Dur | Ease | Origin |
|---|---|---|---|---|---|
| 0.00 | backdrop | previous wash → brand (crossfade) | 0.7 | sine.inOut | |
| 0.00 | glyphs | "?" layer in, others out; glyph colour → brand-butter | 0.8 | power1.out | |
| 0.20 | line | opacity 0→1, y 24→0 | 0.5 | power3.out | |
| 0.30 | urn | scale 0.3→1, opacity 0→1, rotate −12°→0 | 0.7 | back.out(1.7) | 50% 50% |
| 0.60 | avatars | y 40→0, opacity 0→1, stagger 0.07 | 0.45 | back.out(2) | |
| 1.40 + 0.22·i | avatar i (turn order) | **hop**: x `[0, dx/2, dx]`, y `[0, dy−90, dy]` (linear between stops), scale 1→0.35 | 0.6 | power1.inOut over the whole tween | |
| 1.90 + 0.22·i | avatar i | opacity → 0 | 0.12 | power1.out | |
| 1.95 + 0.22·i | urn | **swallow** squash: scaleY 1→0.92→1, scaleX 1→1.06→1 (yoyo) | 0.08 + 0.08 | power1.out / mirrored | 50% 100% |
| 1.95 + 0.22·i | "?" | y 0→−18→0 (viewBox units, yoyo) | 0.1 + 0.1 | power2.out / mirrored | |
| 2.45 | urn | **anticipation**: scaleX→0.9, scaleY→1.1 ("takes a breath") | 0.22 | power2.out | 50% 100% |
| 2.67 | urn | **shake** (keyframes below) | 1.15 | none overall, `sine.inOut` per segment | **50% 92%** (its tail tip) |
| 2.70 | shake marks | opacity `[0,1,.2,1,.3,1,0]`, scale `[.6,1,.9,1.05,.9,1,.8]` | 1.1 | none overall, power1.inOut per segment | |
| 2.75 | "?" | **slosh** (keyframes below), a beat behind the jar | 1.15 | none overall, `sine.inOut` per segment | 50% 50% (fill-box) |
| 3.40 | line | opacity →0, y →−16 | 0.3 | power1.out | |
| 3.85 | urn | **swell**: scale →1.16 (both axes), rotate →0, x →0 | 0.28 | power2.in | 50% 92% |
| 3.85 | "?" | scale →1.35 | 0.28 | power2.in | 50% 50% |
| 4.13 | urn | **squeeze**: scaleX →1.22, scaleY →0.82 | 0.10 | power3.out | 50% 92% |
| 4.13 | "?" | scale →0 | 0.12 | power2.in | |
| 4.13 | slip | **launch** (§2.4) | 0.6 | back.out(1.4) | 50% 50% |
| 4.20 | avatar row | opacity →0, scale →0.85 (safety; avatars are gone already) | 0.4 | power1.out | |
| 4.30 | slip | z-order: behind the bubble box until now, in front from now ("it rises from behind the bubble") | instant | | |
| 4.30 | urn | scaleX, scaleY →0.8, opacity →0 | 0.45 | power2.in | 50% 92% |
| 5.00 | backdrop | brand → target seat colour | 0.8 | sine.inOut | |
| 5.00 | glyphs | theme set symbols, ink | 0.8 | power1.out | |
| 5.40 | | handoff to scene 6 | | | |

Hop geometry (measured before anything moves): `dx = urn.cx − avatar.cx`, `dy = (urn.top + 0.32·urn.h) − avatar.cy` (into the bubble's upper body). The y path is a "tent": straight up to 90 px above the landing point at the halfway mark, then straight down; the tween's power1.inOut eases the whole trip. Avatars hop at 1.40, 1.62, 1.84, 2.06 (4 players).

Shake keyframes (9 stops, evenly spaced, 8 segments of 0.14375 s):

```
urn rotate  [0, -11, 10, -9,  8, -6,  5, -3, 0]   deg
urn x       [0, -10, 10, -9,  8, -6,  4, -2, 0]   px
urn scaleX  [0.9, 1.06, 0.95, 1.06, 0.96, 1.04, 0.98, 1.02, 1]
urn scaleY  [1.1, 0.94, 1.05, 0.94, 1.04, 0.96, 1.02, 0.99, 1]
"?" rotate  [0, 16, -15, 13, -11,  9, -6,  3, 0]   deg
"?" x       [0, 10, -10,  9,  -8,  6, -4,  2, 0]   viewBox units
```

The jar tilts on its tail, faster then slower, squashing on every swing; the "?" sloshes 0.08 s behind.

**Overlap to handle in the port:** with 4 players the last swallow squash (2.61–2.77) overlaps the anticipation (2.45–2.67) and the shake start (2.67). GSAP lets the later-starting tween win each frame, so the glitch is invisible. In a motion sequence, overlapping segments on the same property misbehave: skip the squash of the last avatar when it would end after 2.45, or start the anticipation at `max(2.45, lastSquashEnd)`. Using `50% 92%` as the single urn origin for everything is fine (the 50% 100% squash origin differs by under 2 px).

### 2.4 The slip landing (`c.slipLand`)

How the prototype does it:
1. The draw scene lays the slip out centred (`left/top 50%`, `xPercent/yPercent −50`) and records where its card and its three pieces (pre, face, name) sit: `c.slipEnd`.
2. `mouth = urn.top + 0.2·urn.h − sceneCentreY`: where the slip comes out (the top of the bubble), as a y offset from the scene centre.
3. It registers `c.slipLand(dx, dy)`. The **target scene** measures its own face, computes `dx, dy = targetFace.centre − slipFace.centre` and calls `slipLand(dx, dy)`. That creates the launch tween at draw t 4.13: `fromTo(slip, {x: dx, y: mouth, scale: 0.15, opacity: 0}, {y: dy, scale: 1, opacity: 1, 0.6 s, back.out(1.4)})`. x is fixed at dx, so the slip comes out **straight**, no rotation, and lands with its face exactly on the target screen's face. If no target scene follows, the player calls `slipLand(0, 0)` (lands centred).
4. At the scene swap (5.4) the target scene shows the same pre/face/name in the same pixels, plus a `.s-paper` rectangle at the landed slip's card rect that dissolves. Only the paper goes; the words stay.

"Already at its final size" means its layout is final: the launch grows it from 0.15 to 1 while it flies, but it lands at scale 1 in its final place and never moves or resizes afterwards.

**For React:** do not hand off between components. Build draw and "for whom" as **one component** (`PickIntro`) whose persistent element is the target header (pre, face, name) placed at its final spot from the first frame (the hint and the ring below it are laid out from the start at opacity 0, so the header never shifts). The draw parts (line, urn, row) are an absolutely centred overlay. The slip = the header plus a paper layer behind it (padding `30 44 26 / 24 30 22`, radius 24, shadow-pop). Launch: `y: (mouthY − headerCentreY) → 0`, `scale 0.15 → 1`, `opacity 0 → 1`, x 0 (both are horizontally centred). Measure in `useLayoutEffect`; rebuild on resize. Rough desktop numbers: mouth ≈ y 305, header centre ≈ y 190 → the slip rises ~115 px.

### 2.5 Real data vs demo

| Piece | Real source |
|---|---|
| Avatar row and hop order | `view.players` sorted by `turnOrder` (all players, you included) |
| Slip name and face | the target: `playerById(view.pick.targetId)`; display name via `useDisplayName`; seat colour `seatColor(target.seat)` |
| Number of players | 2 to 4. The row, the hops and the schedule scale with n |
| Same show for everyone | yes: the same clock; only the slip's content and the colour after 5.0 differ per viewer |
| Header | theme tag stays visible (set in the theme scene); **no step clock** during draw and target (the pick clock appears at pick t 0.4) |

### 2.6 Reduced motion

Keep the server timing (everyone stays in sync). Show line, still urn and row from t 0 with fades only; no hops, shake, swell or marks; glyphs still. At 4.13 crossfade: line, urn and row fade out (0.3 s) while the slip fades in **in place** (no flight, no scale). The colour change at 5.0 stays (it is a crossfade).

---

## 3. Scene 6 — For whom ("Para quem", 4.6 s)

**What it says:** who you pick for comes before any field. Big face, big name, a ring in their colour, one hint ("pick someone Leo knows"), and a small circle showing everyone picks for someone, yours highlighted.

### 3.1 Layout

```
wrap: column centred, gap 26 / 20, padding-bottom 30, z 1
├─ box: column centred, gap 14 / 12
│   ├─ pre   "Você escolhe para"  700, 24 / 19 px, ink-muted
│   ├─ face  target avatar 150 / 120, outline 6px solid <target seat colour>, outline-offset 6px
│   ├─ name  h2.s-big 96 / 64 px, ink
│   └─ hint  p.s-sub 22 / 18 px, 600, colour INK (not muted), max-width 560 / 300
│            "Escolha um personagem que Leo conheça."
└─ ringBox: column centred, gap 4
    ├─ ring (.s-ring) size × size
    └─ caption "Todo mundo escolhe para alguém."  600, 14 px, ink-muted
```

Desktop estimate: header block ≈ 312 px, wrap ≈ 652 px, centred in 724 (top ≈ 36). The scene keeps the target's wash from the draw (no colour change here).

**Name rule:** the big name sits right under the big face (the avatar), so it complies. The hint contains the name: render it with `useWithNames` (inline avatar). The prototype has no inline avatar in the hint; the project rule wins.

### 3.2 The ring of who picks for whom

Geometry (prototype is fixed at 4; generalised here for 2-4):

```
R = 74 / 62   (circle radius)        A = 40 / 34   (avatar size)
size = 2R + A + 24  → 212 / 182      cx = cy = size / 2
order = players by turnOrder; seat i at angle θi = −90° + i·360°/n
  (4 players: order[0] top, [1] right, [2] bottom, [3] left; clockwise)
avatar i: absolute, centre at (cx + R cosθi, cy + R sinθi)
GAP = 0.44 rad (≈25.2°) kept clear around each avatar
arc i: from order[i] to order[(i+1) % n] (the one they pick for), clockwise
  a1 = θi + GAP,  a2 = θ(i+1) − GAP          (unwrap so a2 > a1)
  d  = M p(a1) A R R 0 0 1 p(a2)             p(a) = (cx + R cos a, cy + R sin a)
  arrowhead at p(a2), rotated (a2·180/π + 90)° (tangent, clockwise)
  head path (w = stroke width): M −(w+3) −(w+2.5) L (w+1.5) 0 L −(w+3) (w+2.5)
  stroke-linecap round, stroke-linejoin round, fill none
```

- Each arc spans `360°/n − 50.4°`: 39.6° (n 4), 69.6° (n 3), 129.6° (n 2). Large-arc flag stays 0. Desktop 4-player arc length ≈ 51 px.
- **Base arcs**: one per player, stroke `--line-strong`, width 2 (head `M-5 -4.5 L3.5 0 L-5 4.5`).
- **Mine arc**: the same geometry as the base arc that starts at **you**, drawn on top, stroke = the **target's seat colour**, width 4.5 (head `M-7.5 -7 L6 0 L-7.5 7`).
- The ring is in the turn order, the same circle the "turn order" scene uses later.

### 3.3 Timeline

| t | Element | Animation | Dur | Ease |
|---|---|---|---|---|
| 0.00 | paper (only when the slip landed) | opacity 1→0, scale 1→1.12 | 0.35 | power2.out |
| 0.65 | hint | opacity 0→1, y 14→0 | 0.5 | power3.out |
| 1.30 (T) | ringBox | opacity 0→1 | 0.2 | power1.out |
| T | ring faces in turn order | scale 0→1, stagger 0.07 | 0.35 | back.out(2.6) |
| T + 0.22 + 0.13·i | base arc i | drawn (dashoffset length→0) + opacity 0→1 | 0.16 | linear |
| T + 0.36 + 0.13·i | base head i | scale 0→1 (origin centre) | 0.2 | back.out(3) |
| lit = T + 0.22 + 0.13·n + 0.15 (2.19 at n 4) | mine arc | drawn + opacity 0→1 | 0.3 | power2.out |
| lit + 0.26 | mine head | scale 0→1 | 0.25 | back.out(3) |
| lit | your ring face | box-shadow `0 0 0 0` → `0 0 0 3px <target colour>` (0.25 s, power1.out) + pulse scale 1→1.15→1 (0.12 + 0.12, power2.out mirrored) | | |
| lit + 0.26 | target's ring face | the same, same colour (the target's) | | |
| 4.20 | wrap | opacity →0, scale →0.94 | 0.4 | power1.out |
| 4.60 | | pick scene starts | | |

Fallback entrance (no slip: direct load, or when the draw was skipped): pre opacity 0, y 10 → 1, 0 (t 0, 0.4 s, power1.out); face scale 0.2, rotate −20° → 1, 0 (t 0.1, 0.7 s, back.out(2)); name opacity 0, scale 1.6 → 1 (t 0.45, 0.45 s, power3.out). Then hint and ring as above.

Reduced motion: no paper scale, no pulses; the ring fades in (0.3 s) with every arc already drawn; mine arc and the two face rings fade in at `lit`.

### 3.4 Real data vs demo

- Target, face, name, seat colour: real (`view.pick.targetId`).
- Ring: `view.players` by `turnOrder` plus the rule "each picks for the next". `turnOrder` is already in `PlayerView` during picking, so nothing new leaks. Cleaner: add `order: PlayerId[]` to `PickView` so the client does not encode the rule. Note: the ring shows who picks for **you** (the arc into your face). That is intended (scene 9 says "Rafa picked yours"), but today's pick subtitle says "someone else is picking yours, in secret" and `pickedById` hides your picker until the end. That copy goes away with this scene.
- No badges ("Para Leo", "De Rafa") anywhere. Confirmed: scenes-b has none.

---

## 4. The pick table (shared by scenes 7 and 8)

**Idea:** the card is the form. There are no modes ("search", "create", "change image"): one field, one card, always visible. The card's picture previews while you type; the picture changes in place; a name that does not exist gets a "Novo!" seal. Under it, a hand of the theme's most picked characters. "Sortear" big beside "Confirmar".

### 4.1 Layout

```
col: absolute, left 0, right 0, top 4 / 0; column centred, gap 22 / 16
├─ title: row centred, gap 10; display 700, 28 / 21 px, letter-spacing −0.015em
│         "Um personagem para" + [avatar 32 / 26] "Leo"   (.s-pname, PlayerName)
└─ center
     desktop: row, items centre, gap 40:  [spacer 210] [card 270] [actions column 210]
     phone:   column, gap 14:             [card 224] [actions row]
handBox: absolute, left 0, right 0, bottom −70 / −60 (bleeds off the bottom edge); column centred, gap 8
├─ label: 700 13 px ink-muted, filled heart 14 px in --no + "Os mais escolhidos em Super-heróis"
└─ row of 5 mini cards (fan)
done row: absolute, left 0, right 0, bottom 34 / 78; column centred, gap 10 (hidden until confirm)
```

The empty 210 px spacer on desktop balances the actions column, so the card sits in the exact centre.

**The card** (`.s-card`, width W = 270 / 224, z 5):
1. `pic`: `.s-portrait` (4:5, radius 18; desktop 246×307.5, phone 200×250). Stacked layers, back to front: blank silhouette · `ghost` (live preview, opacity 0 → .45) · `pic2` (chosen picture) · `pic3` (picture swapped through the tray, crossfades in) · `drop` (dropzone, opacity 0) · `swap` pill (opacity 0).
2. `fieldWrap` (relative): `field` (`.s-field`, phone 19 px and 48 px tall) with the typed text, caret, placeholder "Digite um nome…"; `ddown` (`.s-drop`, hidden: opacity 0, visibility hidden).
3. `origin` (`.s-corigin`, margin `0 4px`, min-height 18): empty, or "Marvel · da biblioteca", or "Personagem novo · fica salvo no tema".
4. `sticker` "Novo!" (`.s-sticker`, `right:-16px; top:20px`, butter / on-butter, `rotate(8deg)`, opacity 0). Rendered uppercase: "NOVO!".

Card height ≈ 307.5 + 10 + 52 + 10 + 18 + 28 ≈ 426 desktop; ≈ 364 phone.

**Actions:**
- Confirm: `.s-key.yes`, h 64 / 56, padding `0 30` / `0 22`, font 21 / 19, check icon 22, "Confirmar". = `keyClass("yes", { className: "h-16 px-[30px] text-[21px] [&_svg]:size-[22px]" })`.
- Random: `.s-btn`, h 44, padding `0 18`, 600 15 px, dice icon 18, "Sortear".
- Rule (desktop only): `small`, 600, 13 px, ink-muted, lh 1.4, max-width 190, flex gap 6: "⏱" + "Acabou o tempo? Vai a carta do jeito que estiver."
- Desktop: column, gap 14, `align-items:flex-start`, width 210: Confirm, Random, rule. Phone: row, gap 10, centred: Confirm, Random (no rule).

**The hand:** mini cards of width 92 / 70, margin `0 −6px` / `0 −9px` (they overlap); card i of 5 gets `rotate((i−2)·6°) translateY(|i−2|·8px)`, i.e. −12°, −6°, 0, 6°, 12° and 16, 8, 0, 8, 16 px, a fan. Each mini: portrait, name, then `small` with a filled heart 11 px in `--no` and a number (demo: likes; see §8.3). For n cards use `k = i − (n−1)/2`.

**Done row:** avatars 36 in turn order, gap 10. Finished: opacity 1 plus a tick (18 px circle at `right:-4; bottom:-4`, bg yes, on-yes check 11 px). Not finished: opacity .45, no tick. Text `b` 700 16 px: "Feito! Esperando Bia e Rafa" → "Feito! Esperando Rafa" → "Todo mundo escolheu!". The names in this sentence need inline avatars (`useWithNames`, `Intl.ListFormat` conjunction for "Bia e Rafa").

Rough vertical budget, desktop: col bottom ≈ 4 + 42 + 22 + 426 = 494; hand top ≈ 600; done row top ≈ 630. Phone: col bottom ≈ 488 (actions included), hand top ≈ 645.

### 4.2 Card states

| State | Field | Picture | Origin line | Dropdown | Extras |
|---|---|---|---|---|---|
| **Empty** | placeholder "Digite um nome…" | blank silhouette | empty | hidden | Confirm disabled |
| **Typing** | `.focus` ring, text as typed | `ghost` = portrait of the **highlighted** result at opacity .45 over the silhouette (0.3 s in; 0.15 s out when the highlight moves) | empty | up to ~5 rows: 38 px thumb, name with the matched part in `<mark>` (sky 800), `small` "Marvel · 42 escolhas"; first row `.hi` | ↑/↓ moves `.hi`, Enter or click picks, Esc closes |
| **Picked** (row, hand, random, exact match on blur) | full name, not focused | `pic2` = the character's picture; the picture **flips in**: rotateY −70°→0, 0.6 s, back.out(1.5) (no perspective in the prototype: reads as a horizontal unfold) | "{origin} · da biblioteca" | hidden | hover shows the "Trocar imagem" pill |
| **Changing picture** | unchanged | pill → click → **tray** pops out | unchanged | hidden | tray: current picture (selected ring) + "Enviar a sua"; picking crossfades `pic3` (0.45 s) |
| **New name** (no exact match) | the typed name | `drop` zone visible: icon, "Solte, cole ou busque uma imagem", small "ou fica sem, tudo bem"; `.hot` while a file is dragged over | "Personagem novo · fica salvo no tema" | while typing, a single muted row: "Não tem no tema ainda. Vira um personagem novo." (600 14 px, padding `10 12`) | "Novo!" seal slams in |
| **New name + picture** | the name | the dropped picture (pop: scale 1.06→1, 0.5 s, back.out(2)), pill on hover | same | hidden | seal stays |
| **Confirmed** | read-only | frozen | frozen | hidden | card scale **1.08**, `transform-origin: 50% 0%` (grows down from its top, straight, centred); hand and actions leave; done row in |
| **Timeout** | read-only | frozen as is | frozen | hidden | stamp "Tempo! Foi esse." + the same 1.08 growth |

Positions of the popups: the tray hangs off the card at `left: calc(100% − 40px); top: 150px` desktop (it overlaps the card's right edge and covers the actions column, z 7) and `left: 6px; top: 140px` phone (inside the card). Tray pop: autoAlpha 0→1 0.2 s, plus from scale 0.8, y 10, origin top-left, 0.35 s, back.out(2). Tray close: autoAlpha →0, 0.25 s.

---

## 5. Scene 7 — Pick ("Escolha", proto 13.8 s, real up to 120 s)

### 5.1 Entrance (real; plays when the pick screen mounts)

| t | Element | Animation | Dur | Ease |
|---|---|---|---|---|
| 0.00 | title | opacity 0→1, y 10→0 | 0.4 | power1.out |
| 0.10 | card | scale 0.8→1, rotate −5°→0, opacity 0→1, y 30→0 | 0.7 | back.out(1.6) |
| 0.40 | header clock | appears and starts at 2:00 (= `stepStartsAt`) | | |
| 0.60 | hand cards | y 160→0, opacity 0→1, stagger 0.06 (on an inner wrapper so the fan transform stays) | 0.6 | back.out(1.4) |
| 0.80 | actions | opacity 0→1, x 20→0 (desktop) / 0 (phone) | 0.5 | power1.out |
| 0.90 | hand label | opacity 0→1 | 0.4 | power1.out |

### 5.2 Demo beats → the real interactions they show

| Proto t | Demo action | Real behaviour to implement |
|---|---|---|
| 1.1 | field focuses | field focus (click, or autofocus on desktop when the pick starts) |
| 1.6 to 2.16 | types "Homem" (9 chars/s) | user typing; search answers every keystroke from `useCharacterIndex` |
| 1.9 | dropdown in: autoAlpha 0→1 0.2 s + y −8→0 0.3 s power3.out | open the list once the query is non-empty and has rows |
| 2.0 | ghost Spider-Man at .45 (0.3 s) | live preview of the highlighted row |
| 2.7 to 3.2 | pointer moves to row 2; highlight moves r1→r2; ghost fades (0.15 s) | hover or arrows move the highlight; the ghost follows it |
| ≈3.55 (tap) | picks "Homem de Ferro" | on pick: list fades 0.2 s; field gets the full name; origin "Marvel · da biblioteca"; `pic2` shows at once and the picture flips (§4.2); caret and focus ring go |
| 4.6 to 5.0 | pointer over the picture; "Trocar imagem" pill fades in (0.25 s) | hover / focus-within on the picture (phone: pill always shown on a filled picture) |
| ≈5.8 (tap) | tray opens | click on the pill |
| ≈7.0 (tap) | third picture chosen; selection ring moves; `pic3` crossfades (0.45 s) | choose a tile (real tiles: §8.4) |
| +0.7 / +0.9 | tray fades (0.25 s), pill fades (0.25 s) | close after choosing, or on outside click / Esc |
| 7.0 | chat: Leo "pelo amor de deus algo fácil 😅" | demo (chat spec) |
| ≈8.7 (cfAt) | Confirm pressed: key y 6 px and back (0.09 + 0.09) | `keyClass` active state already does this |
| cfAt + 0.1 | hand y →+200, opacity →0 (0.5 s, power2.in); actions opacity →0 (0.3 s) | on confirm |
| cfAt + 0.15 | card scale →1.08, origin 50% 0% | 0.5 s back.out(2) |
| cfAt + 0.5 | done row opacity 0→1, y 16→0 | 0.4 s power1.out |
| 10.2 / 11.6 | Bia, then Rafa finish: their avatar opacity →1 (0.2 s); tick in instantly, scale 0→1 (0.4 s, back.out(3)); text updates | driven by `pick.confirmedIds` |
| 10.6 | chat: Rafa "kkkkk calma tô pensando" | demo |
| 13.4 | the scene fades (0.4 s) | when the post-pick reveal starts (spec C): hold "Todo mundo escolheu!" about 2 s, then fade 0.4 s |

The demo clock runs 4× fast (`c.clockFast(4)`; shell.js's comment says 12×, but the code sets 4). The real clock is 2:00 at normal speed, turning red at ≤ 20 s (`isLowClock`, same as the prototype's `min(20, total/3)`). It keeps running after you confirm, for the others.

---

## 6. Scene 8 — New name and the clock running out ("Nome novo", 9.6 s, a variation)

| t | Element | Animation | Dur | Ease |
|---|---|---|---|---|
| 0.00 | col, hand | opacity 0→1 (quick variation entrance) | 0.4 | power1.out |
| 0.00 to 2.5 | field | focused, caret visible | | |
| 0.30 | clock | shows 0:08 of 2:00 (bar 8/120, already red) | | |
| 0.60 to 1.91 | field | types "Chapolin Colorado" (13 chars/s) | | |
| 1.30 / 2.40 | dropdown | in with one muted row "Não tem no tema ainda. Vira um personagem novo." / out | 0.2 | power1.out |
| 2.20 | drop zone | opacity 0→1 | 0.3 | power1.out |
| 2.40 | "Novo!" seal | opacity 1 at once; from scale 2.2, rotate −20° → scale 1, rotate 8° (a slam) | 0.45 | back.out(2.4) |
| 2.40 | origin line | "Personagem novo · fica salvo no tema" | | |
| 3.0 to 4.3 | (demo) a `chapolin.png` file card (`.s-mini` 88 px, rotate 10°) appears at the bottom right and is dragged onto the picture (rotate −4°, 0.9 s, power2.inOut) | | | |
| 3.90 | drop zone | `.hot` (sky dashed, sky-soft) + scale →1.02 | 0.2 | power1.out |
| 4.30 | (demo) file card | scale →0.4, opacity →0 | 0.25 | |
| 4.35 | drop zone / picture | zone fades (0.2 s); dropped picture shows at once; picture scale 1.06→1 | 0.5 | back.out(2) |
| 5.20 | chat: Bia "10 segundos gente" | demo | | |
| **8.30** | timeout stamp | `.s-sticker` centred at `left:50%; top:42%` of the scene (translate −50% −50%), z 30, display 800 34 / 26 px uppercase, padding `10 18`, radius 16, bg `--no`, on-no, shadow-pop: "Tempo! Foi esse." → "TEMPO! FOI ESSE."; opacity 1 at once; from scale 2.4, rotate −16° → scale 1, rotate −8° | 0.45 | back.out(2.6) |
| 8.35 | card | scale →1.08, origin 50% 0% | 0.4 | back.out(2) |
| 8.40 | hand | y →+200, opacity →0 | 0.4 | power1.out |
| 9.20 | scene | opacity →0 | 0.35 | power1.out |

Real behaviour:
- The **"new" state commits** when the field holds a name with **no exact match** (normalised name equals a result's `nameKey`), about 600 ms after the last keystroke, or on blur or Enter. Picking a row or a hand card clears it. While results exist but none is exact, show them with the muted row as a footer (a hint, not a button).
- The **stamp** shows for everyone who had not confirmed when the server clock reaches `deadline` (client side, through `useServerClock`); inputs freeze at that moment. `useRoom` already refreshes 300 ms after the deadline, which makes the server fire `TIMEOUT`. The post-pick reveal (spec C) should keep this screen about 0.9 s after the stamp, then fade 0.35 s.
- Players who had confirmed see the remaining ticks pop and "Todo mundo escolheu!".
- An **empty** card at timeout gets a random character (the only case for random). The prototype has no screen for it. Proposal: stamp "Tempo!" alone, then the card flips to the drawn character when the view arrives.

---

## 7. Timing, sync and data the screens need

### 7.1 Where scenes 5-6 sit on the server clock

Today: `closeVote` / `setTheme` → `beginMatch` (phase `picking`) → `revealTheme` sets `reveal.until = now + theme ms` and `startStep(PICK_SECONDS)`, whose clock starts at `reveal.until`.

Proposal: keep a single pick step, start its clock later by the intro, and let the client derive the windows from `stepStartsAt`:

```
PICK_INTRO = {                 // game/types.ts; all in ms, tune here
  draw:   5400,                // scene 5
  target: 4600,                // scene 6 (its last 0.4 s is the exit fade)
  lead:    400,                // pick entrance before the clock starts
}
picking.stepStartsAt = themeReveal.until + draw + target + lead
client: drawAt   = stepStartsAt − (draw + target + lead)
        targetAt = drawAt + draw
        pickAt   = targetAt + target      // pick screen mounts; clock at pickAt + 0.4 s
```

- This works for every path (vote, tie spin, typed theme) because it only uses `stepStartsAt`.
- `guardStep` / `too_early`: picking actions sent before `stepStartsAt` must be accepted, or the UI must not allow them. The pick screen does not exist before `pickAt`, so this is natural.
- **Conflict to settle:** the prototype's timing chart budgets draw **4.5 s** and target **2.5 s** for a room's first match (3 s + 3 s for later rounds), but the scenes as built run 5.4 + 4.6 s. The scenes are the approved choreography, so use 5.4/4.6 (with a short variant for `view.round > 1`) and tune in practice. Jean said he will adjust by testing.
- Short variant for later rounds (suggestion, not in the prototype): avatars hop together, a single 0.6 s shake, slip at ≈2.2 s; target with the ring already drawn.

### 7.2 Seeking (everyone sees the same frame)

Build each scene as a motion **sequence** (`animate([[el, keyframes, {at, duration, ease}], …])`, `at` in seconds; available in motion 13.4.6). Set `controls.time = (serverNow − sceneStart)/1000` on mount and on `visibilitychange`; resync when the drift is over 0.25 s. A reload mid-draw lands on the right frame. Discrete switches (the slip's z-index at 4.3) are 0-duration segments. Measured values (dx, dy, mouth) are read in `useLayoutEffect`; on resize, rebuild the sequence at the current time.

### 7.3 Pick drafts (the timeout rule)

"Out of time: whatever is on the card is the pick; random only for an empty card":
- **Client**: `usePickDraft` saves `{ characterId | null, name, imageUrl | null }` debounced ~400 ms after edits, and at once on pick, hand tap, random, image commit and blur. Stop saving at `deadline`.
- **Server action** `savePickDraft(code, draft)`: rate limited; refuses after the deadline. Store it **outside the broadcast room state** (a small `drafts` store, in memory for local mode, a table for Supabase), so typing never bumps the room version for everyone, and the target can never see it.
- **Images** for drafts must exist before the deadline: upload the crop on commit (`uploadPickImage(form) → url`, files store `characters`) and keep the URL in the draft.
- **Timeout**: `applyDueTimeouts` reads the drafts and resolves each non-empty one into a `Character`: library id → `characters.get` (+ `setImage` when a new picture was given); new name → reuse a same-name entry or create one, exactly as `createCharacter` does. It dispatches `TIMEOUT { drafts: Record<pickerId, Character>, fallbackCharacters }`. The engine uses the draft first, without `auto`; it uses the pool (`auto: true`) only for empty cards. A draft-based pick counts as a real pick in the stats (`autoPicked` false).
- For empty cards, draw from the theme's history first (`drawPopular`, like the Random button), then `randomPopular`, then the emergency names.
- `PickView` gains `draft` (the viewer's own only), so a reload restores the card.
- **Confirm** of a new name: one call `confirmPick(code, { name, imageUrl })` that creates and picks on the server (the same resolver as the timeout), instead of `createCharacter` + `confirmPick`.

### 7.4 Backdrop needs (for the backdrop spec)

- Draw: `tone = brand` (solid) + "?" glyphs in brand-butter.
- From draw t 5.0 through target and pick: `tone = seatColor(target.seat)` + glyphs = the theme set's symbol (`themeSetEmoji(theme.set)`; "?" for a typed theme).
- Wash: `color-mix(c var(--wash-mix), canvas)` + radial blobs (c 34% at 18% 22%, c 26% at 82% 70%), inset −20%, drifting 22 s. Today's `TurnBackdrop` uses a 7% tint, so the proposal is much stronger.
- Glyph spots `[left%, top%, px, s]`: `[5,20,44,9] [12,76,30,8] [30,9,24,10] [47,86,36,9.5] [66,13,28,8.5] [82,58,50,10.5] [93,30,24,7.5]`, phone sizes ×0.8, opacity .16 (emoji .22), bob `translateY 0→−16→0`, `rotate −8°→8°→−8°`, delay `−1.3·i` s.
- The prototype's hero layer mixes 🦸 ⚡ 🛡️ 🦸‍♀️ 💥 ⚡ 🦹. The app has **one emoji per set**: repeat it, or add a small symbol list per set (new data).

---

## 8. Compared with today's code

### 8.1 `src/features/pick/pick-screen.tsx` (472 lines): rebuild the UI, keep the wiring

**Keep:**
- data and actions: `useRoomContext`, `pick`/`target`, `useAction` + `useRoomAction`, `confirmPick`, `randomPick` with the `rollId` race guard and `skip` of the last draw, the dice spin (`rotate: rolls·360`);
- the `typedTheme` / `noHistory` logic (Random hidden for a typed theme; `not_enough_picks` message);
- search: `useCharacterIndex` + `useDeferredValue` + `searchItems(…, 6)`, with the remote `/api/characters` fallback while the index loads;
- `toCard`; `replaceCharacterImage` for library pictures; `createCharacter` semantics (moving to the server resolver).

**Rebuild:**
- Layout: two columns with a butter theme banner, title, subtitle and a progress row → one centred card table, the hand at the bottom edge and the done row (§4.1). The theme banner goes (the theme is in the header and the backdrop). Today's subtitle "{name} can't see your choice…" goes (the draw says it).
- `Mode = "search" | "chosen" | "create" | "image"` → no modes. Card state derives from the draft (§4.2).
- The `<ul>` results list under a separate input → a combobox dropdown hanging from the field on the card (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, a listbox of options).
- The create form (name, origin, `ImageDrop`, "Save and pick") → inline new state: seal, drop zone, origin line. **The origin field disappears** (the prototype has none; new characters get `origin = null`).
- The image mode (separate screen with `ImageDrop` and "Use this picture") → swap pill, tray, inline drop and crop on the picture.
- The confirmed view (`CharacterCard` with `layoutId="pick-card"`) → the same form-card frozen at 1.08. `layoutId="pick-card"` is not used anywhere else, so nothing breaks.
- Progress ("2 of 4 picked" + names) → done row with ticks.
- Buttons: Confirm `primary lg` → yes key; Random `ghost sm` → `.s-btn` 44 px beside Confirm; "Pick another" and "Change picture" go.

**New:** `PickIntro` (scenes 5-6), the hand, draft autosave, the timeout stamp, the entrance choreography, the title with `PlayerName`.

i18n: `title`, `doneTitle`, `subtitle`, `progress`, `cardLabel`, `change`, `searchLabel`, `createTitle`, `newName`, `newOrigin`, `newImage`, `save`, `createNamed`, `createNew`, `changeImageTitle` and `back` become unused; `random`, `randomHint`, `rate*`, `changeImage` and `imageHint` stay (`imageHint` could become the tray's tooltip).

### 8.2 `draw-feedback.tsx`: reuse as is

The "Like this pick?" bubble after a Random draw is not in the prototype but works today: keep it, anchored over the card (`top-14`, centred) once the picture's flip ends.

### 8.3 `use-character-index.ts`: reuse as is

Still prefetched in the lobby. Add a helper in `character-search.ts`: `exactMatch(items, name)` (normalised name equals `nameKey`) for the new-name and auto-pick on blur. Leave the empty query with no dropdown (the hand is the empty state's suggestions), even though `searchItems` returns the top items for an empty query.

**Not available today:**
- "N escolhas" per row: `SearchItem` has no theme pick counts.
- The hand: there is no endpoint listing the theme's popular characters; `randomPick` returns one.
- Proposal: `pickSuggestions(code) → { items: (CharacterDTO & { picks; likes })[] }`. It reads `matches.popularPicks(themeId, PICKS_FETCHED)`, sorts by `drawWeight`, resolves in the viewer's language, and the hand shows the top 5. The same counts annotate dropdown rows when known.
- Typed theme or no history → no hand (the prototype's `pickTable({ hand: false })` keeps the layout) and Random hidden/disabled as today.
- The number by the heart is ambiguous: the demo uses one value both as "likes" (heart) and as "escolhas" (rows). Decide: picks (matches the rows), or picks + likes.

### 8.4 `src/components/ui/logo.tsx`: small change

`FOUR`, `QUESTION` and `BRAND` are module-private and `Mark` has the hover tilt baked in. Export the paths (or add `LogoMark({ fill, qFill, qRef })` that renders `<svg viewBox="-10 -10 840 850">` with a `motion.path` for the "?", `transformBox: fill-box`, `transformOrigin: center`). `Logo` stays the same.

### 8.5 `character-card.tsx`: not the pick card

It is a display card: label pill, `rounded-xl` (32), `shadow-card`, `h2` name, origin. The pick card differs: radius 28, padding `12 12 16`, gap 10, `shadow-pop`, an input instead of the `h2`, no label pill. Build `PickCard`; keep `CharacterCard` for the strip and the other screens.

### 8.6 `portrait.tsx`: reuse

Pass radius classes (18 card, 11 mini, 8 row, 12 tray) and `text-line` for the empty silhouette. Its built-in fade-in is fine for `pic2`. Stack the ghost and tray layers as siblings above it.

### 8.7 `image-drop.tsx`: extract, keep the component

The profile uses it (square avatar) and stays unchanged. Extract `fromTransfer`, `download`, `isImage`, `accept` (size, type and decode checks plus error strings), the window paste listener and `cropToWebp`/`coverArea` into a hook, e.g. `useImageIntake({ onPicked })`, used by both.

On the pick card:
- a dropped, pasted or browsed picture shows **at once, centre-cropped** (`coverArea`, as the prototype shows it);
- the picture area becomes a `react-easy-crop` surface (drag and wheel/pinch zoom) while hovered or focused;
- live export uses `onChange` mode, debounced (the existing 250 ms) → upload → draft.

No "Use this picture" button; the zoom slider is optional. `common.image` strings (`wrongType`, `tooBig`, `notDownloadable`) stay as inline errors under the card.

### 8.8 `text-field.tsx`: not reused

It is a labelled column (label, input, hint/counter). The card field is a bare combobox input in the display font, 700, 22 / 19 px, h 52 / 48, radius 14 (`.s-field`). Build `CardNameField`. Visible label: none (the title labels it: `aria-labelledby`). `maxLength` 60 (the `createCharacter` limit).

### 8.9 `button.tsx`: reuse

- Confirm: `keyClass("yes", …)` already has the 6 px lip, `mb-1.5`, the hover lift and the active sink (= the prototype's press). Add the sizes. No `bounce`: the prototype's key does not bounce.
- Random: `buttonClass("secondary", "md", "h-11 px-[18px] text-[15px] [&_svg]:size-[18px]")` (today's md is h-12 px-6 16 px).

### 8.10 Elsewhere

- `GameHeader`/`Timer`: hide the timer during draw and target (today it would show the "recharging" refill); show it at `stepStartsAt` with a small pop.
- `src/lib/motion.ts` says "Nothing bounces". The approved proposal bounces everywhere (`back.out`), so update that comment.
- `PRODUCT.md`: the new timeout rule; "create a new one" without a button.

---

## 9. Porting GSAP to motion/react

```ts
// t in [0, 1]
const linear = (t) => t;
const powIn  = (n) => (t) => t ** (n + 1);                         // power1.in = t², power2.in = t³, power3.in = t⁴
const powOut = (n) => (t) => 1 - (1 - t) ** (n + 1);
const powInOut = (n) => (t) => t < .5 ? (2 ** n) * t ** (n + 1) : 1 - (-2 * t + 2) ** (n + 1) / 2;
const sineInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const backOut = (s = 1.70158) => (t) => { const q = t - 1; return q * q * ((s + 1) * q + s) + 1; };
```

motion accepts easing functions in `ease` and arrays of them per keyframe segment.

- **GSAP `scale` sets both axes**: port as `scaleX` + `scaleY` (motion's `scale` multiplies with them). The urn exit `{scaleX:1, scaleY:1, scale:0.8}` ends at 0.8 on both axes.
- **Keyframes object with an inner ease** (`keyframes:{…, ease:"sine.inOut"}`, outer `ease:"none"`) = motion keyframes with `ease: Array(segments).fill(sineInOut)` and default even `times`. Keyframes **without** an inner ease (the shake marks) use GSAP's `easeEach` default, `power1.inOut` per segment.
- **The hop** (linear tent path, `power1.inOut` over the whole tween) is exactly `x: [0, dx/2, dx], y: [0, dy−90, dy], times: [0, .5, 1], ease: [quadIn, quadOut]`, plus `scale: [1, .35]` with `quadInOut`.
- **Yoyo** `repeat:1` = keyframes `[a, b, a]` with `[ease, mirrored ease]`; avoid `repeat` inside sequences.
- **Arc drawing**: use `motion.path` with `pathLength 0→1` (motion manages the dasharray) plus opacity.
- **Ring box-shadow**: animate the `box-shadow` string, or an outline-free inner span.
- **SVG "?"**: `motion.path` with `style={{ transformBox: "fill-box", transformOrigin: "center" }}`. x/y are in viewBox units (§1.2).
- `immediateRender: true` on `fromTo` = put the "from" values in the initial style, so nothing flashes before its beat.

---

## 10. Every text (pt from the prototype; en/ja proposed)

| Key (suggested) | pt (prototype) | en | ja |
|---|---|---|---|
| `draw.line` | Cada um escolhe o personagem de outra pessoa. | Everyone picks a character for someone else. | みんな、ほかの誰かのキャラクターを選びます。 |
| `draw.youPickFor` | Você escolhe para | You pick for | あなたが選ぶ相手 |
| `target.hint` | Escolha um personagem que {name} conheça. | Pick a character {name} knows. | {name}さんが知っているキャラクターを選びましょう。 |
| `target.ring` | Todo mundo escolhe para alguém. | Everyone picks for someone. | 全員が誰かのために選びます。 |
| `pick.title` | Um personagem para {name} | A character for {name} | {name}さんのキャラクター |
| `pick.placeholder` | Digite um nome… | Type a name… | 名前を入力… |
| `pick.rowPicks` | {origin} · {count} escolhas | {origin} · picked {count} times | {origin}・{count}回選ばれた |
| `pick.fromLibrary` | {origin} · da biblioteca | {origin} · from the library | {origin}・ライブラリから |
| `pick.newOrigin` | Personagem novo · fica salvo no tema | New character · saved for this theme | 新しいキャラクター・テーマに保存 |
| `pick.notFound` | Não tem no tema ainda. Vira um personagem novo. | Not in this theme yet. It becomes a new character. | まだこのテーマにいません。新しいキャラクターになります。 |
| `pick.newSeal` | Novo! | New! | 新規！ |
| `pick.drop` | Solte, cole ou busque uma imagem | Drop, paste or browse for a picture | 画像をドロップ・貼り付け・選択 |
| `pick.dropOptional` | ou fica sem, tudo bem | or leave it blank, that's fine | なくても大丈夫 |
| `pick.changeImage` (exists) | Trocar imagem | Change picture | 画像を変える |
| `pick.upload` | Enviar a sua | Upload yours | 自分の画像 |
| `pick.confirm` | Confirmar | Confirm | 決定 |
| `pick.random` (exists) | Sortear | Random | ランダム |
| `pick.rule` | Acabou o tempo? Vai a carta do jeito que estiver. | Out of time? The card goes as it is. | 時間切れなら、そのときのカードで決定。 |
| `pick.handLabel` | Os mais escolhidos em {theme} | Most picked in {theme} | {theme}でよく選ばれたキャラクター |
| `pick.doneWaiting` | Feito! Esperando {names} | Done! Waiting for {names} | 完了！{names}さんを待っています |
| `pick.doneAll` | Todo mundo escolheu! | Everyone has picked! | 全員選び終わりました！ |
| `pick.timeUp` | Tempo! Foi esse. | Time! That's the one. | 時間切れ！これで決定。 |

Demo only (no keys): the chat lines, `chapolin.png`, the 4 player names, the character names and counts. `{count}` needs ICU plural (`one`/`other`). "Novo!" and "Tempo!…" render uppercase through the sticker style (no effect on Japanese).

---

## 11. Gaps and things to decide (not settled by the prototype)

1. **Name colour on "For whom":** ROADMAP says "name in their colour"; the prototype draws it in **ink** (the colour is in the face ring, the wash and your arc). Suggest following the prototype.
2. **Durations:** scenes 5.4 + 4.6 s versus the chart's 4.5 + 2.5 s (3 + 3 later). Constants in one place (§7.1).
3. **Phone chat bar over the hand:** the folded 60 px bar covers the lower half of the visible hand (hand at bottom −60, about 109 px visible, 60 under the bar). The done row (bottom 78) clears it. Suggest lifting the hand by the bar height on phones.
4. **Phone keyboard:** typing in the field opens the on-screen keyboard over the dropdown (the field sits ≈ y 460 of 844). Not in the prototype. Suggest shrinking the picture (or moving the column up) while the field is focused on phones.
5. **Short desktop windows** (≈ 650 px viewport): the table needs ≈ 632 px of scene. Shrink W: `W = clamp(200, (sceneH − 360)/1.25 + 24, 270)`, or use the `short:`/`tiny:` variants; the hand may sink further (bottom −90).
6. **Long names** in the slip and on "For whom" (`MAX_NAME` 16, e.g. "CapitãoCorajoso") overflow at 96 / 64 px on phones. Fit the text by measuring before the launch (same size in slip and screen, so it is still "final size").
7. **Tray pictures:** the demo shows three alternatives for Iron Man. There is no such data (one picture per character; `setImage` replaces it). Real tray: current picture + "Enviar a sua" (+ the library's original if it was swapped, optional).
8. **The new character's origin:** the prototype has no origin field. New characters get `origin = null`, unless an optional field is wanted.
9. **"Não tem no tema ainda"** is not literally true: the search covers the whole language library, not the theme. Maybe "Não está na biblioteca ainda…".
10. **Hand number** semantics (likes vs picks), hover and tap feedback (suggestion: lift y −16 and straighten on hover; on tap the main picture runs the picked flip), and whether a used hand card stays.
11. **Timeout with a half-typed name:** the rule makes it a new character (e.g. "Hom"). Suggest a minimum of 2 characters, otherwise treat it as empty (random).
12. **Empty card at timeout:** stamp copy and card animation (§6).
13. **Names in sentences** (hint, done row) need inline avatars by project rule; the prototype omits them.
14. Copy change: Confirm becomes "Confirmar" (today "Confirmar escolha").
