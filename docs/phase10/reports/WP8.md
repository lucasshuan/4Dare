# WP8 report: the draw and "for whom" (`PickIntro`)

## Files
- Rewritten: `src/features/stage/pick-intro.tsx` (was WP4's stub).
- New: `src/features/stage/draw-urn.tsx`, `src/features/stage/who-ring.tsx`, `src/features/stage/pick-intro.test.ts` (10 unit tests of the schedule and the ring geometry).
- Unchanged, still owned: `src/game/show-timing/draw.ts` (the plan's numbers fit), `messages/*/stageDraw.json` (the wording fits pt and ja at 390 px), `lab/scenarios/draw.ts` (the lab room already has everything the scenes need).

## What was built
- **`PickIntro({ show })`**: plan 3.1 props unchanged; WP9b mounts it for the `draw` and `target` beats. It is one component with one `useStageTimeline`, whose t = 0 is the draw beat's start. The "for whom" header ("You pick for", the face, the name) is laid out at its final place from the first frame, and the hint and the ring under it start at opacity 0. The draw (the line, the urn, the row in turn order, you included) is an overlay centred over it. The slip *is* that header plus a paper layer (radius 24, `shadow-pop`, padding 30/44/26, or 24/30/22 on phones). It rises straight from the bubble's mouth (`urn.top + 0.2·h`, measured with `layoutRect`) at 4.13: y goes to 0 and scale goes 0.15→1 in 0.6 s with `backOut(1.4)`, with no x and no rotation. It stays behind the bubble until 4.30 (a callback segment sets z-index 0 → 2). At the target beat only the paper dissolves (opacity →0, scale 1.12, 0.35 s). Then come the hint (0.65), the ring (1.3), your arc lit at `T + 0.22 + 0.13·n + 0.15`, and the exit 0.4 s before the beat's end. There is no badge.
- **Name**: the name is drawn in `var(--seat-n-ink)` of the target's seat, under a face with a 6 px outline (offset 6) in `seatColor`. It is one element, so the slip and the screen show it at the same size. A long name shrinks until it fits inside the paper. The size is measured in `build`, before anything else is measured. The hint goes through `withNames`. The ring faces and the hopping avatars have no labels.
- **`draw-urn.tsx`**:
  - `DrawUrn`: an inverted `LogoMark` at 230×232.3 / 170×171.7, origin `50% 92%`, with the 4 shake marks.
  - `drawTimes(n, first)`: the schedule.
  - `hopFrames(dx, dy)`: the hop's tent path, sampled under power1.inOut.
  - `drawSequence(scope, { times, reduced, map })`.
  - The urn and the "?" use the exact shake and slosh keyframes. The "?" offsets are in viewBox units.
- **`who-ring.tsx`**:
  - `ringGeometry(n, phone)`: R 74/62, A 40/34, size 212/182, first player at the top, clockwise, gap 0.44 rad, arcs of `360°/n − 50.4°`.
  - `WhoRing` draws the base arcs in `--line-strong` w 2 and your arc in the target's colour at w 4.5. The heads follow spec B. Your face and the target's face light up through a 3 px ring that fades in, plus a 1→1.15→1 pulse.
  - `ringTimes`, `ringSequence`, `TimeMap`.
- **Later matches**:
  - Draw, 3.0 s: the line, the urn and the row arrive by 0.7 s. The avatars hop together at 0.72, one squash, a 0.12 s breath, then one 0.6 s shake. The swell is at 2.15 and the slip launches at 2.35 and lands at 2.95. The wash changes at 2.6 (`stageLook`).
  - Target, 2.6 s: the ring is already drawn when it fades in at 0. The hint comes at 0.3, your arc lights at 0.5, and the scene exits at 2.2.
- **No slip**: when the scene mounts after the draw (a reload mid-target), the header comes in on its own (pre at 0, face at 0.1, name at 0.45, spec B §3.3), with no paper and no overlay.
- **Reduced motion**: the same beat times, with fades only. At 4.13 the draw fades out while the slip fades in where it stays. The ring fades in already drawn, and your arc and the two face rings fade in at `lit`.

## Deviations from the plan
1. **The slip follows the artifact's code (`scenes-b.js:89-93`), which is what Jean watched.** It rises at scale 0.15→1 in 0.6 s, straight up, already at its final place, and it does not move or resize after landing. The draw notes' phrase "que vira no ar" (that turns in the air) is stale. Nobody should later "fix" the code to match the notes, or the notes to match the code. If "already at its final size" was meant as no growth at all, `scaleX/scaleY: [0.15, 1]` in `drawSequence` is the one line to change (plan §8.4).
2. **With 3-4 players the shake is a little faster.** The anticipation starts at `max(2.45, lastSquashEnd)`, as accepted: 2.77 with 4 players, 2.55 with 3. The shake follows it, 0.22 s later, and has to end before the swell at 3.85 (the swell and the squeeze at 4.13 are fixed). So with 4 players its 9 keyframes play over 0.86 s instead of 1.15 s, and with 3 players over 1.08 s. The marks and the slosh are compressed by the same factor. With 2 players every time is exactly the prototype's. The keyframe values and the origins are unchanged. The only other option was to drop the last squashes.
3. **Beats shorter than their defaults play the scene faster, whole.** The factor is `k = min(1, beat / DRAW.*)`, so only e2e's `DARE_SHOW_SCALE` triggers it. If Jean retunes a constant in `draw.ts`, k stays 1 and the target's exit stays 0.4 s before the beat's end.
4. **The stage lab's stopped clock always shows the slip version**, which is what a player who watched the draw sees, so every target still is the real frame. The fallback can be seen with `play=1` starting inside the target beat (shot `fallback-target.png`).
5. GSAP's transform order is rotate-then-scale and motion's is scale-then-rotate. The difference is under a pixel at these angles (at most 11°, ±6%), so I left it.

## Requests
- The size of `PickIntro` comes from `min-h-[calc(100dvh − header − gap − padding − var(--dock))]`, which mirrors `MatchFrame`'s paddings (112 px, `short:` 88 px, `sm:` 120 px). If WP12 changes the frame's header height or paddings, these numbers change too (`pick-intro.tsx`, the root class).
- WP9b already renders `PickIntro` alone during draw and target, which is what the scene needs. Keep it that way.
- No shared files needed.

## Verification
- `pnpm exec vitest run src/features/stage/pick-intro.test.ts`: 1 file, 10 tests passed.
- `pnpm typecheck`: passes. `pnpm exec biome check` on my 4 files: no fixes.
- Contrast of the name (`--seat-n-ink`), measured in the browser:
  - light: on the paper 7.74–10.45:1, on the wash 5.78–7.32:1;
  - dark: on the paper 7.14–8.60:1, on the wash 5.16–5.88:1.
  - The name is centred, away from the corner glows (WP2's dark low point is 2.8:1).
- Screenshots are in `.data/shots/WP8/`, in the lab at 4 players unless noted, and I looked at each:
  - draw at 0.4, 1.6, 2.2, 3.0, 3.4, 4.0, 4.3, 4.8, 5.2;
  - target at 0.1, 0.8, 1.6, 2.5, 4.0;
  - desktop and phone, dark, pt with long names (phone and desktop), ja on the phone;
  - the later match at 1.0 and 2.4 (draw) and 1.3 (target);
  - 2 and 3 players, reduced motion, the fallback.
  - Contact sheets: `sheet-*.png`.
- The shots show the 4 swallowed in the hop row, the slip rising translucent over the bubble at 4.3 and landing at 4.8, the wash turning at 5.0, "GatoAconchegante" shrunk to fit at 390 px, and pt and ja hints wrapping within 300 px.

## Notes for Jean
- The slip grows from 0.15 to full size as it flies, as in the prototype you watched. If you wanted no growth at all, it is a one-line change (deviation 1).
- With 4 players the shake is about 0.3 s quicker than in the prototype, because the bubble now finishes swallowing the last avatar before it takes its breath (deviation 2).
