# WP2 report: design kit and all strings

## Files

Changed:
- `src/app/globals.css`
- `src/lib/motion.ts`
- `src/game/theme-sets.ts`
- `src/components/ui/avatar.tsx`
- `src/components/ui/logo.tsx`
- `src/components/ui/screen.tsx`
- `src/components/ui/toast.tsx`
- `src/features/turn/turn-screen.tsx`: the backdrop line and its import only
- `src/i18n/request.ts`
- `messages/{en,pt,ja}/turn.json`: only `history.nothing`

Created:
- `src/components/ui/mini-card.tsx`
- `src/features/stage/stage-backdrop.tsx`
- `src/i18n/messages.test.ts`
- `messages/{en,pt,ja}/{stageOpening,stageDraw,stageCast,pickCard,chat}.json`

I touched no other file. `tsconfig.json` was rewritten by my test server twice and was restored both times; it is now identical to HEAD. I removed my temporary `.next-wp2` and `.data/wp2` folders.

## What was built (API for later WPs)

### Tokens (`globals.css`)
Each token below is defined in `:root` and again under `[data-theme="dark"]`:
- `--brand-stage` (#2b69c8, dark #1d4a93), `--brand-butter` #f6e3a1, `--on-brand` #fff.
- `--wash-mix` (20%, dark 26%).
- `--on-seat-1..4` (prototype values).
- `--seat-1..4-ink`: light `color-mix(in oklch, var(--seat-n), black 30%)`, dark `var(--seat-n)`.
- `--dock: 0px`.
- `--shadow-dock-value` (light per plan; dark heavier: `0 -2px 6px rgba(0,0,0,.4), 0 -16px 40px rgba(0,0,0,.45)`).

Tailwind (`@theme inline`):
- Classes `bg-/text-brand-stage`, `brand-butter`, `on-brand` and `shadow-dock`.
- Seat tokens have no Tailwind class, the same as the seat colours. Use them as `var(--seat-n-ink)` or `var(--on-seat-n)`.

CSS loops (`@theme`), keyframes from `stage.css`:
- `animate-drift`: 22s, alternating.
- `animate-bob`: 9s by default. Each glyph sets its own `animation-duration` and `animation-delay` inline.
- `animate-nudge`: 3.6s, starts after 1.2s.
- `animate-dot`: 0.9s.
- `animate-blink`: 1s `steps(1)`.
- A comment says every user must add `motion-reduce:animate-none`.

### `src/lib/motion.ts`
- `gs` = `{ p1In, p1Out, p1InOut, p2In, p2Out, p2InOut, p3In, p3Out, p3InOut, sineInOut, backOut(s = 1.70158), bounceOut }`. These are exact GSAP functions.
- `mirror(e)` gives the way back of a yoyo, e.g. `mirror(gs.p2Out) === p2In`.
- `type EaseFn`.
- The header comment no longer says "Nothing bounces". It now names the stage exception.

### `src/game/theme-sets.ts`
- `glyphs` (7 per set) on every `THEME_SETS` entry, from the spec A §2.2 lists.
- `TYPED_GLYPHS = ["✍️","?","✍️","?","✍️","?","✍️"]`.
- `themeGlyphs(set)` returns the set's glyphs, or `TYPED_GLYPHS` when the set is null.

### `Avatar` sizes
Added 16, 18, 24, 26, 30, 34, 52 and 68 (the map is now sorted). Larger faces still use a `className` override.

### `logo.tsx`
- `FOUR`, `QUESTION` and `BRAND` are now exported.
- New `LogoMark({ bubble = BRAND.blue, mark = BRAND.butter, className })`:
  - A plain decorative svg (`viewBox="-10 -10 840 850"`, `aria-hidden`).
  - The "?" path carries `data-q` and `transform-box: fill-box; transform-origin: center`, so a scene can animate it.
  - The urn is `<LogoMark bubble={BRAND.butter} mark={BRAND.blue} />`.
- `Logo` is unchanged.

### `MiniCard` (`src/components/ui/mini-card.tsx`)
Props: `image` (URL or null), `face?`, `name`, `sub?`, `width` (px), `badge?`, `className`, `style`, plus any `div` props.
- The look is `.s-mini`: surface, radius 16, padding 6 6 8, `shadow-card`, gap 5, portrait radius 11, name 12.5/700 truncated, sub line 11/600 muted.
- `face` replaces the picture (for "?" cards).
- `badge` is pinned at top −10, right −10, for the rule's ✓ and ✗.
- The picture goes through `thumbUrl(image, width * 2)`.

### `StageBackdrop({ look, set })` (`src/features/stage/stage-backdrop.tsx`)
Exports: `type Look = { tone, glyphs, glyphColor, fade }`, `type Tone`, `type Glyphs`, `NO_LOOK`, and `seatLook(seat, fade = 1)` (the turn look).

How it renders:
- A portal to `<body>`, `fixed inset-0 -z-10`.
- One wash layer per tone and one glyph layer per glyph kind (`q`, `set-<key>` or `typed`). Each layer crossfades with `look.fade` and `gs.sineInOut`. The layer that leaves uses the new look's length, through AnimatePresence `custom`.

The wash follows the prototype recipe:
- The base is `color-mix(in oklab, C var(--wash-mix), var(--canvas))`. The brand tone is solid.
- A glow span at inset −20% holds the two radial gradients and drifts.

Glyphs:
- 7 fixed spots, sizes ×0.8 under `sm`, delay −1.3·i s.
- Text glyphs: 0.16 opacity, drawn in `glyphColor`.
- Emoji: 0.22 opacity with `saturate(.9)`.
- Reduced motion turns off the drift and the bob (`motion-reduce:animate-none`). The crossfade stays.

### Other components
- `ThemeTag` (`screen.tsx`) now matches the prototype `.s-tagtheme`:
  - 40 px surface pill with `shadow-card`, padding 0 16 0 12, gap 8, 700 15 px ink.
  - The "Theme:" label is 600 13 px muted and hidden on phones (`sr-only`).
  - The name truncates.
  - It is used in the header and the podium.
- `Screen`: both layouts use `pb-[calc(2rem+var(--dock))] sm:pb-[calc(3rem+var(--dock))] sm:short:pb-[calc(1.5rem+var(--dock))]`.
- Toasts sit at `bottom-[calc(1.5rem+var(--dock))]`.
- `turn-screen.tsx` renders `<StageBackdrop look={seatLook(turnPlayer?.seat ?? null)} set={null} />` in place of `TurnBackdrop`.

### i18n
- Every key in plan §4, in en, pt and ja, as five new namespace files.
- `NAMESPACES` now also lists `stageOpening`, `stageDraw`, `stageCast`, `pickCard` and `chat`.
- `turn.history.nothing` has the longer sentence. The pt wording comes from the prototype (`shell.js:382`).
- `src/i18n/messages.test.ts` checks three things:
  - Each language folder holds exactly one file per registered namespace, so an unregistered file fails.
  - The key trees are identical across en, pt and ja.
  - The ICU arguments match. A translation may not add an argument. It may only drop a plural selector that is never displayed (ja has no plurals; `lobby.confirmStart.waiting` is such a case).

## Deviations from the plan
1. **Hand label:** `pickCard.handLabel` is "Popular in {theme}" (pt "Populares em {theme}", ja "{theme}で人気"), not §4's "Most picked in {theme}". This follows the lead's instruction and plan 1.6: the hand is now based on `theme_starters`.
2. **`Look` type location:** `Look` (and `Tone`, `Glyphs`) are defined and exported in `stage-backdrop.tsx`, because `stage.ts` does not exist yet and the backdrop needed its prop types. The shape is exactly the one in plan §3.1. WP3 should `export type { Look } from "./stage-backdrop"` in `stage.ts` (a type-only import, safe in vitest) instead of redefining it. `seatLook` and `NO_LOOK` are small extras WP3 may reuse.
3. **Extra eases:** `gs` also has `p1In` and `p1InOut`. Spec B needs them: the shake marks use GSAP's default `power1.inOut`, and the hop uses quad in and out.
4. **`MiniCard` extras:**
   - `face?: ReactNode` for the "?" cards of the cold open and the cast.
   - Pass-through `div` props (data attributes and refs for scene timelines).
5. **Dock shadow token:** `--shadow-dock` is built like `--shadow-card` and `--shadow-pop`: `--shadow-dock-value` in `:root` and dark, plus `--shadow-dock` in `@theme inline`. Use the class `shadow-dock` or `var(--shadow-dock-value)`.
6. **Glyph colour changes within one layer fade instead of cutting.** Examples: the "?" in brand butter turning to on-butter, or from one seat to the next during turns. They use a CSS `color` transition over `look.fade`, where the prototype switched `--gc` instantly. Changes between glyph kinds crossfade the layers as in the prototype.
7. **Bob duration and delay per glyph are inline styles.** A CSS variable inside `--animate-bob` would be resolved at `:root`, so per-element values would not work there.
8. **The dark `--seat-n-ink` is the seat colour itself, as planned.** It passes 3:1 on its wash everywhere except the centres of the two corner glows. The centred "for whom" name stays outside them, so WP8 should keep it centred.

   | Theme | On its wash | At the centre of the strongest glow |
   |---|---|---|
   | Light | 5.78–7.32:1 | ≥ 4.23:1 |
   | Dark | 5.16–5.89:1 | 2.79–2.98:1 |

   Script: `scratchpad/wp2/contrast.mjs`.
9. **My own translations:**
   - The ja text for `turn.history.nothing`.
   - The ja text for every key the specs gave no ja proposal for: `stageCast.cast.from`/`by`/`byYou`/`orderKicker`/`starts`, all of `chat` except the strings in spec A §6, the new `pickCard` keys, and `stageOpening.rule.fits`/`misfit`.
   - In pt: `stageOpening.rule.fits` "Combina com o tema" and `misfit` "Não combina", `stageDraw.target.ringLabel`, and every `chat` key the prototype doesn't have.
10. **Where the screenshots are:** in the scratchpad, not `test-results/`. Every Playwright run empties `test-results/`, and WP1's e2e run deleted my first set.

## Verification
- `pnpm test`: **14 files, 174 tests passed**, including the 16 of `src/i18n/messages.test.ts`.
  - Once, while WP1's e2e server on 3100 was loading the machine, the `server.test.ts` setup hook timed out at 10 s.
  - Alone with `--hookTimeout=90000` it passes 11 of 11, and the final full run passed.
- `pnpm typecheck`: **0 errors**. Earlier, the only errors were in WP1's `simulation.test.ts` while it was in progress.
- `pnpm lint`: **0 errors**, 3 warnings, the same `!important` warnings that already exist at HEAD in the reduced-motion clamp.
- The compiled CSS (dev server) contains:
  - `calc(2rem + var(--dock))`, `calc(3rem + var(--dock))` and `calc(1.5rem + var(--dock))`.
  - `inset: -20%`, `saturate(.9)` and `--glyph-k: .8`.
  - `--animate-drift` and `--animate-bob`.
- Reduced motion, emulated on the live turn screen: all 9 backdrop spans have `animation-name: none`. With motion allowed they run `drift` and `bob`. No flicker.
- Crossfade (harness, butter to theme, 0.45 s in): the two wash layers and the two glyph layers are both partly visible (opacities 0.61/0.39, 0.64/0.36, 0.55/0.45, 0.51/0.49).
- Live flow: a local-mode `next dev` on :3200 with `DARE_SHOW_SCALE=0.25` played one 2-player match (desktop host, phone guest). Vote, pick, turn and podium all worked on top of WP1's in-progress engine.

## Screenshots
All in `docs/phase10/shots/wp2/`:
- **Live turn (seat backdrop, new `ThemeTag`):** `turn-{desktop,phone}-{light,dark}.png`.
- **Podium tag:** `podium-{desktop,phone}-{light,dark}.png`.
- **Every look in an isolated harness:** `backdrop-{brand,butter,theme,typed,seat-3,seat-4,crossfade}-{desktop,phone}-{light,dark}.png`. These also show `MiniCard` (with badge), `LogoMark` (urn and brand), the 8 new avatar sizes and `ThemeTag` truncation.
  - The harness renders the real components, bundled with esbuild, against the app's compiled CSS: `scratchpad/wp2/harness/`.
  - Next fonts are missing there, so the type uses system fonts.

## Requests for WP12 (shared files I could not edit)
- `src/lib/hooks/use-tab-title.ts` keeps its own copy of the "?" path. It can now import `QUESTION` from `logo.tsx` (optional cleanup).
- `src/features/turn/turn-backdrop.tsx` is no longer imported. WP4 deletes it, as planned.
- The header comment of `src/game/theme-sets.ts` still says "`about` tells the AI what fits". AI code belongs to ROADMAP_BUILD, so I left it.

## Notes for Jean
- **Glyph lists:** only heroes comes from the prototype. The other 19 sets use the spec A proposal; tune them in `THEME_SETS[i].glyphs`.
- **Turn screen look:** turns already use the new recipe: a 20% wash (26% in dark) with "?" marks at 0.16. Before, it was a 7% tint with blurred blobs, so it is visibly stronger. Plan §1.9 asks WP12 to check contrast.
- **Hand label:** it reads "Popular in {theme}" / "Populares em {theme}".
- **Japanese:** the ja strings for the new scenes are my proposals.
