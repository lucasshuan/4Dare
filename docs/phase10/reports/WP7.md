# WP7 report: opening and theme scenes

## Files
- Rewritten: `src/features/stage/cold-open.tsx`, `src/features/stage/theme-stage.tsx`, `src/features/vote/vote-screen.tsx`, `src/features/theme/theme-screen.tsx`.
- New (internal parts): `src/features/stage/theme-rule.tsx` (rule scene), `src/features/stage/scene-kit.ts` (+ `scene-kit.test.ts`).
- Changed: `src/features/who-am-i/who-am-i-banner.tsx` (exports only: `Critter`, `HeldCard`, `SEATS`, `YOU`), `src/features/stage/lab/scenarios/theme.ts` (rule cards with pt names, ✗ card without ja).
- Unchanged: `show-timing/{opening,theme}.ts` (plan defaults), `messages/*/stageOpening.json`, `lab/scenarios/opening.ts`.

## What was built
- `ColdOpen({ show })`: intro beat = cold open (spec A scene 2 timeline, exit at `len − 0.5`); round beat = "Round {n}" (in 0.15, out `len − 0.45`); curtain draws nothing. Row via `peopleRow` (you at `floor((n−1)/2)`, the next players to your right), critter held cards (`SEATS` seeds), "?" card, bubble, chips over the first two after you (phone: "Yes" twice). Labels truncate at card+gap (`max-w-[92px]/[176px]` with negative margins, so the column stays card-wide). L1/L2 and "Round N" in a sr-only `output aria-live="polite"`.
- `VoteScreen`: `ColdOpen` during curtain/intro/round, `ThemeStage` during theme/rule, else the vote. Two timelines: entrance (t0 = opening `entrance`: line alone 0.2–0.8 at the measured centre, rises to k 0.7/0.84 at 1.0, deal 1.3 stagger 0.09 tilt −7/0/7, sub 1.5, footer 1.9; a measured wrapper keeps `titleH × k`) and theme show (t0 = show start: roulette steps from the `tie_spin` beat, settle dim/leave at `settleDim`/`settleLeave` clamped into the beat). Cards `disabled` until `useStepStarted()`; group is a `fieldset aria-label="Vote for the theme"`; "Still voting: everyone" before the first vote; `max-w-[1200px]`. No per-frame clock any more (the 20 Hz `useServerClock` is gone).
- `ThemeStage({ show, from })`: hero (kicker `h1` "The theme is…", card 620/330, winner tone, voters + count, or butter ✍️ "Chosen by {host}" via `useWithNames`); `layoutId="theme-card"` on the outer wrapper (0.9 s `backOut(1.2)`), the timeline on the hero box inside (out at `min(2.2, len − 0.4)`: scale .6, y −290/−260); a hero mounted late (reload, lab, typed) pops from scale .55 instead. Confetti at `themeWash` when crossing live. `RuleScene`: sentence 0, frame 0.3, ✓ 0.7/1.15, ✗ 1.7, badges 1.4 + 0.45i, ✗ falls 2.8, out `len − 0.4`; `misfit: null` → ✓✓ only; `rule: null` → sentence only. Theme announce / rule title in its `output`.
- `ThemeScreen`: `ColdOpen`, then the form (submit disabled until the step starts, autofocus only when `focusIsFree()`), then `ThemeStage from="typed"`; the old in-form reveal is gone.
- Exports later packages may reuse: `scene-kit.ts` `Timeline` (sequence builder with the reduced rule: entrances jump while hidden and fade 0.2 s, `"fade"`, `"skip"`), `marked`, `useAfter(at)` (one timer, lab-safe), `useFireAt`, `showOf(view, kind)`, `beatSeconds`, `SCENE_MIN_H`, `BIG`, `peopleRow`, `rouletteSteps`; `theme-stage.tsx` `TONES`, `THEME_CARD`, `usePreloadRule`; `theme-rule.tsx` `cardName` (ja → en fallback), `RULE_CARD`.

## Deviations from the plan
1. Two new files beside `theme-stage.tsx` (`theme-rule.tsx`, `scene-kit.ts`): the shared builder and hooks serve three of my screens; no other package's file imports them.
2. The tie roulette, settle dim and leave are timeline segments (seekable, reload-safe) instead of clock-driven props; the lit card gets the glow sweep and 1.04, no ink ring (only your vote keeps it).
3. The flight only plays when the hero mounts live within 0.3 s of the theme beat on the vote screen; otherwise the card pops in place. Its layout animation runs in real time (not seekable), so the frozen lab shows the pop.
4. `who-am-i-banner.tsx`: also exported `HeldCard`/`YOU` (unused for now) beside `Critter`/`SEATS`.
5. Hero name sizes step down with length (>14, >24 characters) so long pt themes fit 620/330.
6. Reduced motion: the vote line appears directly as the heading at 0.2 (no solo beat), cards fade together at 1.3, the cold open's cards are face up when the people fade in; no wiggle, grow, roulette or flight.

## Requests
- WP12: tailwind-merge drops `leading-*` when a later `text-[…]` size follows in `cn()`; put the size before the leading (fixed here, worth a grep elsewhere).
- WP12 e2e: the vote cards are `disabled` until `stepStartsAt` (`voteAll` already waits for enabled); the theming submit too.
- WP11: none needed; scenes keep `pb` for `--dock` through `SCENE_MIN_H`.

## Verification
- `pnpm exec vitest run src/features/stage/scene-kit.test.ts src/features/stage/lab/scenarios.test.ts src/i18n/messages.test.ts`: 3 files, 46 tests passed.
- `pnpm typecheck`: passes. `pnpm exec biome check` (my 9 files): clean.
- Shots in `.data/shots/WP7/` (lab, desktop/phone, light/dark): cold open 2.1/6.4 (intro +1.3/+5.6), round card, vote entrance −0.1, vote 1, tie 1.0, settle 1.8/3.0, hero 3.8/4.8, rule 7.9/9.3, sentence 6.9, typed 1.0, pt `names=long` (cold open, typed hero), ja (rule with the en fallback, cold open). `flight-*.png`: live run at speed 0.25 showing the winner flying to the centre.
- Not run (by the lead's rule): e2e, the full unit suite.

## Review fixes

One review after the commit: passed, two lows. Fixed: `SCENE_MIN_H` now uses the match frame's real sizes (as `PickIntro`), so the scenes no longer scroll 8 px on phones. Left for WP12: on a reload or late join during `tie_spin`, the vote title's reserved height is measured from the one-line tie title, so the card row sits ~24 px high and drops when the settle starts (measure an invisible copy of the line instead).
