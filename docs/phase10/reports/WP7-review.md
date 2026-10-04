# WP7 review (da540da)

Verdict: **passed** (no high or medium defect). Two low defects below, both cheap to fix.

## Checks run
- `pnpm exec vitest run src/features/stage/scene-kit.test.ts`: 3 tests passed.
- `pnpm typecheck`: passes. `pnpm exec biome check` on the 9 files of the commit: clean.
- Lab measurements at 390x844 (`/en/dev/stage?...&ui=0`): `document.documentElement.scrollHeight` for opening@5.6, vote@2, theme@1.5, typed vote@2 and pt `names=long` opening@5.6 are all 852 against an 844 viewport; pick@1 (WP8's scene) is 844.
- Screenshots (scratchpad, not committed): phone pt `names=long` cold open (dark) at 6.4, phone pt `names=long` vote at 1, desktop dark hero. The engineer's live `flight-*.png` show the winner flying to the centre.

Every acceptance item of the brief was checked against the code: the people row (`peopleRow`, you at `floor((n-1)/2)`, the chips on the two players after you, a single chip with 2 players), the critter held cards, L1/L2 and the rule in `output aria-live="polite"`, the vote entrance times (0.2/1.0/1.3 + 0.09i with tilt -7/0/7/1.5/1.9), the measured wrapper (`titleH * k`, k 0.7/0.84), cards `disabled` until `stepStartsAt`, "Still voting: everyone", the 1200 px width, the roulette from `tie_spin`, settle at `settleDim`/`settleLeave` (clamped into the beat), the `layoutId` on the outer wrapper with the timelines on other elements, confetti at `themeWash`, hero out at 2.2, the rule times (0.7/1.15/1.7, badges 1.4 + 0.45i, the ✗ falling at 2.8, out at `len - 0.4`), the sentence-only and typed paths, rule image preloading, label truncation for long names, reduced-motion builds, and the e2e group name / "The theme is…" heading. All match.

## Defects

### 1. Low: phone scenes are 8 px taller than the screen
- File: `src/features/stage/scene-kit.ts:13-14` (`SCENE_MIN_H`).
- Problem: on phones the match frame takes 64 px of header + 16 px gap (`gap-4`) + 32 px bottom padding (`pb-[calc(2rem+var(--dock))]`) = 112 px = 7rem. `SCENE_MIN_H` only subtracts `6.5rem`, so the cold open, "Round N", the vote, the theming form and the theme/rule scene all make the page scroll by 8 px, and their content sits 4 px below the centre.
- Evidence: at 390x844 in the lab, `scrollHeight` is 852 for opening, vote, theme and typed; WP8's `pick-intro.tsx`, which uses `112px`, gives 844.
- Fix: `min-h-[calc(100dvh-7rem-var(--dock))]` for phones. The `sm:short` value (6rem, actual frame 5.5rem) could also become `5.5rem` so scenes centre exactly there.

### 2. Low: the vote heading has no reserved height when the vote mounts during the tie roulette
- File: `src/features/vote/vote-screen.tsx:103-117`.
- Problem: `holdTitle.current = spinning` is set during render, so on a mount during `tie_spin` (a reload or a late join), `measure()` skips the first measurement and the ResizeObserver's first call too. `titleH` stays 0, the wrapper gets no height and takes the 1-line tie title's natural height instead of `lineHeight * k`. The cards sit about 24 px higher than on the screens that watched it live. When the settle starts, the title swaps back to the 2-line text, the observer measures, and the card row jumps down about 24 px while the losers dim.
- Fix: measure the line's height from an invisible copy of the line text that never swaps (for example an `aria-hidden` `invisible` span in the same grid cell as the visible text), not from the live `h1`. Measuring the `h1` while it is held would capture the 1-line tie title, which is also wrong.
