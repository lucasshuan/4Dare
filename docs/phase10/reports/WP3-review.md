# WP3 review: stage runtime and lab (a80883c)

Verdict: **passed**. No high or medium defects. There are three lows below.

## What was checked

- **Acceptance (plan §5 WP3, §1.2, §1.3, §1.9, §1.10):**
  - `stageFrame` follows the routing table, `prev` and the queued-show case included.
  - `themeFrom`, `clockFrom` / `clockPops`, `historyFrom` and `next` were checked against the engine and `view.ts`. The view drops ended shows, and the vote is kept through a queued cast.
  - `stageLook` was compared with the §1.9 table row by row.
  - `StageProvider` uses one timer, keeps frames identical when nothing changed, and follows the rate and a frozen clock.
  - `useStageTimeline` pauses before seeking, uses 0.25 s hysteresis, resyncs every 1 s and on `visibilitychange`, rebuilds on resize, fonts and deps, and passes `reduced` from MotionConfig.
  - The lab plays a real engine match, and secrecy holds through `toView`. The lab route returns 404 in production. The scene stubs exist, and the stage-shots spec is skipped unless `STAGE_SHOTS=1`.
- **`RoomStage` extraction:** byte-identical to the old `PhaseScreens`, `RoomProblem`, `useRoomTab`, `useStepSound` and `usePreloadCards`. Every caller of `useServerClock` sits inside a room and passes the room's offset, so moving to the clock context changes nothing.
- **Tests and types:**
  - `pnpm exec vitest run src/features/stage`: 2 files, 48 tests passed.
  - `pnpm typecheck`: passes.
  - The lab's themes still resolve for every set after the build-roadmap merge (`LOCAL_THEMES`), checked with a throwaway test that was then removed.
- **Visuals:** the engineer's existing shots in `.data/shots/stage/`:
  - `cast@2.5-names-long-pt-phone-dark`: long names truncate, every name has its avatar, the viewer's own card shows "?";
  - `theme@5-en-phone-light`: theme wash with the set's glyphs.
  - No new screenshots were needed.

## Defects

### Low: stage frames can step back across a boundary when a new view moves the clock offset
- **Where:** `src/features/stage/stage-context.tsx:30`.
- **Cause:** `RoomProvider` builds a new clock on every offset change. `use-room.ts:51` re-estimates the offset on every fetch, with no smoothing; local mode fetches every 1 s. When the clock identity changes, `StageProvider` drops `woke` and uses `clock.now()`.
- **Effect:** if a fetch lands just after a boundary and the new offset is a few ms or tens of ms lower, `now` moves back across it. The frame flips back to the previous beat or screen for that long. Once WP4 keys `AnimatePresence` by screen, that is an exit and re-enter blip. It is rare (it needs a fetch within |Δoffset| of a screen boundary), but cheap to prevent.
- **Fix:** keep a monotonic `now` while neither clock is frozen. Remember the last `now` used and take `Math.max(last, clock.now())` when the old and new clocks are both running at the same rate. Reset it only when the lab moves a frozen clock.

### Low: no stage test for a later match's theme show or cast
- **Where:** `src/features/stage/stage.test.ts`. The only later-match test is the opening (line 158).
- **Acceptance gap:** the acceptance asks for every beat of all variants, first and later. The later branches of `markOf(SHOW_MARKS.targetWash, first)` and `markOf(SHOW_MARKS.orderSpot, first)` are never run, nor the theme show without a rule beat. The code reads `show.first` correctly, but a retimed `later` mark in wave 4 would not be covered.
- **Fix:** extend the "later matches" test to vote, pick and confirm. Then assert `screensByBeat` for the theme show (settle, theme, draw, target, entrance) and the cast, and the target-wash and order-spot looks at their `later` marks.

### Low: the report asks WP12 to fix `voteView`, but it was already fixed
- **Where:** `docs/phase10/reports/WP3.md:167`.
- **Claim:** the report says `voteView` checks only `reveal.kind === "theme"`.
- **Reality:** since `3fe4f68`, before WP3, it also checks `reveal.prev?.kind === "theme"` (`src/game/view.ts:228`). WP3's own test "picks done during the theme show" passes because of that.
- **Effect:** the request would send WP12 after a non-issue.
- **Fix:** drop that request from the report. Deviation 7's reason, the extra `settle` check in `beatScreen`, can stay as a safety net.
