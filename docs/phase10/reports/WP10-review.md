# WP10 review (commit 9009c4d)

Verdict: **not passed**. One medium defect, one low.

Checked: every acceptance item of the brief against `cast-scene.tsx`, `turn-screen.tsx`, `player-strip.tsx` and `lab/scenarios/cast.ts`. Covered: table sizes, seat order then turn order, the arc shuffle, the fall at ×1.45/×1.65 with `bounceOut`, the pulse, the slot at 2.4, t1 then t2, the flips from 2.9 + 0.18 i, the badges, the spotlight on `view.turn.playerId` with the seat ring, the call at 2.55, the shrink at 4.4, the strip stagger 0.06, the body at +0.4, the small lines with avatars on desktop only, the later variant, away players at .55, the reduced build, a reload landing on the frame, and secrecy (your own column only ever draws the "?" face, because `card` is null for you during turns).

Ran:
- `pnpm typecheck`: passes.
- `vitest run` on scenarios, messages and stage tests: 64 passed.
- `biome check` on the 4 files: clean.

Lab measurements were taken at 390×844 and 1280×800.

## Medium: the hidden "{name} starts!" heading scrolls the page sideways during the cast

- **Where:** `src/features/stage/cast-scene.tsx:422-426` (and the scene root at line 447).
- **Problem:** the call's segment is `scale: [1.7, 1]` at `orderSpot + 0.05`. A motion sequence holds a value's first keyframe from t = 0, so the call sits at scale 1.7 from the start of `received` until about 2.55 s into `order`. It is invisible (opacity 0), but its scaled box still overflows the viewport. Neither `html` nor `body` clips x, so the page gets a horizontal scroll.
- **Evidence:** `document.documentElement.scrollWidth` in the lab, `ui=0`, computed transform of `[data-cast-call]` = `matrix(1.7, 0, 0, 1.7, 0, 0)`:

  | Viewport | URL | scrollWidth | Viewport width |
  |---|---|---|---|
  | Phone | `/en/dev/stage?show=cast&at=3`, short names | 437 | 390 |
  | Phone | `/en/dev/stage?show=cast&at=3&match=later` | 417 | 390 |
  | Phone | `/pt/dev/stage?show=cast&at=2.1&names=long` | 486 | 390 |
  | Desktop | `/pt/dev/stage?show=cast&at=3&names=long` | 1453 | 1280 |

  After the cast (`at=13`) the phone width goes back to 390. Phones can be swiped sideways, or zoom out, through the whole of "picked yours".
- **Fix:** add `overflow-x-clip` to the scene's absolute root. That clips x only, so the falling card can still come from above. The other way is to keep the call at scale 1 until its segment starts.

## Low: on phones the cast's height ignores the chat bar, so the page scrolls 28 px while it plays

- **Where:** `src/features/turn/turn-screen.tsx:141` (`min-h-[calc(100dvh-9rem)]`) and `cast-scene.tsx:447` (`h-[calc(100dvh-9rem)]`).
- **Problem:** the match column already pads its bottom by `2rem + var(--dock)`, and on phones the chat bar sets `--dock` to 60 px. The 9rem estimate leaves `--dock` out.
- **Evidence:** at 390×844, `scrollHeight` is 872 during received, order and entrance. It is 844 after the cast (`at=13`) and on `show=turn`. The page scrolls during the scene, then snaps back when the min-height drops.
- **Fix:** use `calc(100dvh-9rem-var(--dock))` in both places.
