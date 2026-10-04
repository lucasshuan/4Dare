# WP8 review: the draw and "for whom" (`PickIntro`), commit 004095f

## Verdict
Passed. No high, medium or low defects found.

## What was checked
- `pnpm exec vitest run src/features/stage/pick-intro.test.ts`: 10 of 10 tests pass. `pnpm typecheck` passes. Biome finds nothing to fix in the 4 files.
- I compared each acceptance criterion (brief, "Your package") with the code in `pick-intro.tsx`, `draw-urn.tsx` and `who-ring.tsx`:
  - **Row and hops.** The row is in turn order and includes you (`view.players` sorted by `turnOrder`). Hops start at `1.40 + 0.22·i`. A hop is a tent path sampled under `p1InOut`, its scale goes 1→0.35, and the avatar fades out at hop + 0.5. The swallow squash and the "?" hop come at hop + 0.55.
  - **Anticipation.** It starts at `max(2.45, lastSquashEnd)`. The shake follows 0.22 s later and ends by the swell at 3.85. With 3-4 players the shake is compressed; this is reported as deviation 2.
  - **Shake values.** The shake and slosh keyframes match spec B §2.3 value for value. The urn's origin is `50% 92%`. The "?" keeps `fill-box`/centre, and motion writes SVG transforms as CSS (`build-attrs`), so the "?" offsets are in viewBox units.
  - **Segment continuity.** On every property, each segment starts at the value where the previous one ended (squash → anticipation → shake → swell → squeeze → out), so the sequence never jumps.
  - **Slip.**
    - It launches at 4.13 from `urn.top + 0.2·h`, measured with `layoutRect`.
    - Only y moves; x and rotation stay fixed. Scale goes 0.15→1 with `backOut(1.4)` over 0.6 s.
    - It stays behind the bubble until 4.30, through a function segment; motion 13 turns that into a MotionValue (`animate/sequence.mjs`).
    - The slip is the target header element itself, so nothing moves or resizes after it lands.
    - At the target start only the paper dissolves. There is no badge.
  - **Name.** It is drawn in `--seat-n-ink` with the same seat mapping as `seatColor`. It is a single element, so the slip and the screen show the same size, and it shrinks to fit inside the paper. The face has a 6 px outline at offset 6 in the seat colour. The hint goes through `withNames`.
  - **Ring.**
    - The geometry is right for 2-4 players: R 74/62, A 40/34, gap 0.44 rad, first player at the top, clockwise.
    - Your arc is drawn in the target's colour, and your face and the target's face light up.
    - The ring's rule (each player picks for the next in turn order) matches `beginMatch` (`assignments[order[i+1]].pickerId = order[i]`).
    - Players who leave mid-match keep their seat, so the indices stay aligned.
  - **Later matches.** The draw takes 3.0 s and the target 2.6 s: the avatars hop together, there is one 0.6 s shake, and the ring is already drawn. The wash change at 2.6 comes from `DRAW_MARKS`.
  - **Fallback.** When the scene mounts after the draw (`useState` captures the beat at mount), it plays the fallback entrance from spec B §3.3.
  - **Reduced motion.** It keeps the same beat times and uses fades only.
  - **Strings.** The `stageDraw` keys are present in en, pt and ja.
- **Secrecy.** The scene shows only your target, the ring and the draw. Nothing about your own character reaches the DOM.
- **Clock.** The timeline's t = 0 is the draw beat's `startsAt`. The beats' scale factor (`k`) only applies to e2e's `DARE_SHOW_SCALE`. The exit is scheduled 0.4 s before the beat ends.
- **Layout.** The root's `min-h` matches `MatchFrame`'s header and paddings (112 / 88 / 120 px). I read the engineer's shots in `.data/shots/WP8/` instead of taking new ones:
  - the phone sheet;
  - pt long names on the phone (GatoAconchegante fits at 390 px, and the hint wraps cleanly);
  - dark;
  - ja;
  - 2 players;
  - the fallback.

## Note, not a defect
At 004095f alone, the old `pick-screen.tsx` still renders `<Scenes/>` above the pick table. During draw and target, the full-height scene pushes the table down. WP9b's change, still uncommitted in the working tree, renders `PickIntro` alone (`if (show) return <PickIntro show={show} />`), which is what WP8's report asks for. Check that it lands with WP9b.
