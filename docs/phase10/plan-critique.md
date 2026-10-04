# Phase 10 plan: adversarial review

Reviewed `plan.md` against ROADMAP Phase 10 (`ROADMAP.md:162-187`), the seven specs, the prototype in `docs/phase10/prototype/`, and the code at `36fa787`. Most of the plan holds up: the engine "shows" model, the queueing in `stage()`, the `startStep` rule, back-compat, the realtime multiplexer and the secrecy checks are sound. The findings below are what is still wrong or missing. Each one gives the plan section, the problem, the evidence and a fix. The top 10 come first, most important first.

---

## Top 10

### 1. The ✓✓✗ rule scene and the hand of suggestions will almost never appear (plan §1.6, lines 309-311; WP5, WP9b)
**Problem.** Both come only from match history. The plan admits history is sparse ("16 matches … sentence-only rule, 0–4 hand cards"), and server-data §4.4 says "Most themes return an empty hand and no fits". `data/themes.json` has 337 themes, and Claude makes up new ones for half the votes (`ARCHITECTURE.md:21`), which have no history at all. When Jean plays it, the first match will nearly always show only the sentence and an empty hand. The two scenes he approved (cards dealt into the frame, ✗ falling out, the fanned hand under the card) will not appear, so the result looks worse than the artifact. Cross-cutting sets also get `misfit: null`, so there is no ✗, although ROADMAP:172 asks for "one that doesn't gets ✗ and falls out".
**Evidence.** plan.md:309-311; server-data.md §4.3-4.4; `src/server/theme-picks.ts:107-139` (history only); `data/characters.json` has 15,021 entries with `category`/`origin`/`imageUrl`; `src/server/themes.ts` already uses the Anthropic SDK.
**Fix.** Add a curated source that is used whenever history is thin:
- an offline script (`scripts/library/theme-suggestions.ts`) asks Claude, once per bank theme, for about 8 characters that clearly fit. It resolves them to library ids that have a picture in en/pt/ja and writes `data/theme-suggestions.json`. A test checks that every id resolves, like `theme-set-examples.test.ts`.
- when Claude invents a theme in `themes.draw`, the same call returns its suggestions, stored with the theme.
- `ruleExamples` takes ✓ from history, then from suggestions. `misfit` gets a per-theme curated pick, so cross-cutting sets get a ✗ too.
- the hand fills up to 5 from suggestions after the history cards. It shows the count only when it is greater than 0.

This is separate from match history, so it does not distort Random, which was server-data's objection to seeding.

### 2. The new `RevealOverlay` key guard breaks a behaviour that works today (plan §1.11, line 400; WP4)
**Problem.** The plan has the overlay's keydown ignore "events whose target is inside `[data-chat]` **or any editable element**". When the answers reveal opens, the Guess field mounts under it with `autoFocus`. Today the first key typed closes the reveal and the letter lands in the field. With the guard, keys typed in the focused field are ignored, so the scrim (z-30) stays over the field for 6-10 s while the player types without seeing what they write.
**Evidence.** `src/features/room/reveal-overlay.tsx:39-53` closes on any key; `src/features/turn/turn-screen.tsx:508` (Guess `autoFocus`), `:351` (Ask `autoFocus`).
**Fix.** Ignore only targets inside `[data-chat]` and keep everything else as it is. Add a test: the reveal is open, the guess field is focused, a letter is typed, and the reveal closes.

### 3. The "New!" rule contradicts scene 7 and the plan's own draft table; `MIN_DRAFT_NAME` contradicts "random only when the card is empty" (§1.4 line 131, §1.5 lines 290-299, WP9a line 744)
**Problem.**
- WP9a says "New!" commits "600 ms after the last keystroke, on blur or Enter when nothing matches **exactly**". In the prototype's scene 7, "Homem" stays typed for more than 1 s with partial matches (`scenes-b.js:319-334`). The dropdown and the ghost preview are visible and **no** seal appears. Scene 8 shows "New!" only when the search has **no rows** (`scenes-b.js:391-411`). With the plan, every pause while typing a library name slams a "New!" seal (scale 2.2/−20°) and a drop zone over the card. It also flips the draft from "preview" (§1.5 table, line 296) to "new name", so a timeout creates junk characters such as "Homem" instead of using the previewed Homem-Aranha. "Enter when nothing matches exactly" also conflicts with the combobox rule "Enter picks the highlighted row".
- `MIN_DRAFT_NAME = 2` turns a typed "L", "Q", "X" or a one-kanji Japanese name into an empty card, which then gets a random character. Jean decided that "random [is] only for an empty card" (ROADMAP:177).

**Fix.** "New!" appears only when the query returns no rows, or on blur when there is no highlighted row. While rows exist, the card stays in "typing + preview", and the draft is the previewed character. Enter picks the highlighted row. Drop `MIN_DRAFT_NAME` (any non-empty trimmed name counts as a card) or set it to 1. e2e `pickAll` should type a name that is certain to have no rows (for example "Zqxj Hero 1").

### 4. Show lengths go well past the approved proposal, especially in later matches (§1.1 line 29, §2 lines 436-444)
**Problem.** The proposal Jean called "perfeito" states its cost: "uns 30 s na primeira partida da sala e uns 14 s nas seguintes" (`flow.html:95`). Its chart gives 29.3 s and 16.5 s (`player.js:228-229`). The plan comes to 43.9 s and 26.1 s, so later matches are 58% over. Most of the excess in later matches is beats that have no prototype choreography and are added to every match: `curtain` 1.6, vote `entrance` 1.7 (the chart budgets "line 1 s" for the first match only), `settle` 3.3 (the chart counts it inside the vote), `picked` 2.2, and the turn `entrance` 0.6. The later-match draw, target, received and order variants are made up anyway, yet they come out longer than the chart's 3 s each.
**Fix.** Keep the prototype's scene lengths for the first match, where real choreography exists. Make the later-match defaults fit the chart:
- run the `round` card inside the curtain (about 2.0 s together);
- vote entrance 1.0;
- `settle` 1.5 when the vote ended early (keep 3.3 only after a timeout or tie);
- theme 3.0, draw 3.0, target 2.6, `picked` 1.0, received 2.4, order 2.0 + 0.6.

Show both columns to Jean. Put the "knobs" list in the plan as the defaults, not as a fallback.

### 5. The `randomPick` change and the shared hand make duplicate characters likely, and a player can end up holding their own secret (§1.5 line 305, §1.6 line 310)
**Problem.** Today `randomPick` excludes every character already picked in the match, the caller's own secret included (`src/server/actions.ts:284-289`). The plan removes the caller's own secret to fix a weak leak (seeing that Random never draws X). With sparse history the pool is 1-5 characters (`MIN_RANDOM_PICKS = 1`). Random will then often hand you your own secret X to pick for your target. During the turns you see X on your target's card, conclude "I'm not X", and can never guess your own character. The hand shows the same top 5 to everyone and excludes nothing, which makes cross-target duplicates common too. The plan swaps a weak leak for a fairness bug and changes current behaviour ("everything that works today keeps working").
**Fix.** Keep today's exclusion in `randomPick`. Order the hand per picker, for example 5 drawn from the top 8 with a seed from the picker id, so players don't converge on the same card. Write the remaining trade-off in ARCHITECTURE: duplicates are allowed, and rejecting them would leak.

### 6. "For whom" name colour contradicts the ROADMAP (WP8 acceptance, line 715)
**Problem.** ROADMAP:173 says "big face, **name in their colour**". The plan says "name in ink". Spec B §11.1 raised this, and the plan decided it silently, against a ROADMAP checkbox.
**Fix.** Draw the name (in the slip and on the screen) in the target's seat colour. In light mode, use a deeper mix on the tinted wash for contrast (`color-mix(in oklch, var(--seat-n), black 30%)`, like the prototype's `--*-deep` tokens). Dark mode can use `--seat-n` as is. Check 3:1 at 64-96 px in both themes, and screenshot all four seats.

### 7. `theme.spec` will race once WP7 lands; the plan fixes only `voteAll` (§6.3 lines 803-804, WP7 line 707)
**Problem.** At `DARE_SHOW_SCALE=0.25`, the typed-theme `theme` beat lasts 650 ms, and the "The theme is…" kicker shows for about 550 ms of it. In local mode the guest only learns of `SET_THEME` through the 1 s poll (`src/features/data/use-room.ts:28`), so it often seeks straight into the rule beat. `e2e/theme.spec.ts:33-38` then waits for that heading on **both** pages. It passes in WP1 only because today's ThemeScreen keeps the heading for the whole show.
**Fix.** In WP1, change `theme.spec` to wait for the header tag ("Space pirates") and then the pick field. Alternatively, give scaled beats a floor (`max(ms·scale, 1500)`) for beats that e2e reads text from. Add a rule for all specs: never assert on text that only lives inside one beat.

### 8. Long real names will overflow most scenes on phones; only the slip handles them (WP7 line 707, WP10 line 760, WP9b)
**Problem.** The prototype uses short demo names ("Bia", "Leo", "Rafa"). Real guests are named like "GatoMaravilhoso" or "CapivaraCorajosa" (up to `MAX_NAME` 16, `src/game/types.ts:133`; `src/game/guest-names.ts`), and most players are guests. Places that break:
- cold-open labels: 13 px under 62 px cards with 30 px gaps (`scenes-a.js:128-134`);
- cast-table labels: `nowrap`, 80 px cards, 8 px gaps on phones (`scenes-c.js:11,22,27`);
- "X starts!" at 40 px (`scenes-c.js:91`) and "X picked yours." at 28 px;
- the done row.

Only WP8 lists "long names shrink to fit". The risks table (line 824) says "long names measured and shrunk", but no other WP has it in its acceptance.
**Fix.** Every scene WP gets this acceptance item: labels truncate to their column width (`max-w-[card+gap] truncate`, avatar kept), headings wrap (`flex-wrap`, `text-balance`) and fit the text on phones. Add a lab parameter `names=long` (pt guest names, 4 players, 390 px) to every screenshot matrix.

### 9. Phone keyboard versus the fixed chat bar and sheet is unspecified, and the proposed fallback makes it worse (§7 Phones, line 824; WP11 line 768)
**Problem.** The open chat sheet has its compose field at the bottom of a `fixed bottom-0` sheet. With the default keyboard behaviour on iOS and Android (`resizes-visual`), the keyboard covers that field. The plan's fallback, `interactiveWidget: "resizes-content"`, is global. It shrinks the layout viewport whenever any field is focused, so every `dvh` layout reflows: the pick card's `W` clamp, the cold open, the turn card. The folded 60 px bar also rides on top of the keyboard, over the focused pick, ask or guess field. `src/app/[locale]/layout.tsx:61` sets no `interactiveWidget` today.
**Fix.** Keep the default. Use `visualViewport` to lift the open sheet by `innerHeight − vv.height − vv.offsetTop`, only while the chat input has focus. Hide the folded bar and set `--dock` to 0 while any non-chat editable element has focus (`focusin`/`focusout`). Add a real-phone check to WP12's checklist: iOS Safari and Android Chrome, chat open with the keyboard, and typing on the pick card.

### 10. Package boundaries freeze exactly what the scene WPs must tune (§5 shared-file rules, lines 645-650; WP1 owns `types.ts`)
**Problem.** `SHOW_TIMING` and `SHOW_MARKS` live in `src/game/types.ts`, owned by WP1 in wave 1. `stage.ts` (the look table and routing) is "frozen" after WP3. All strings, `globals.css` and `theme-sets.ts` belong to WP2, and the lab belongs to WP11 in wave 4. The four scene WPs (7, 8, 9b, 10) build choreography whose marks (`themeTag`, `targetWash`, `orderSpot`, beat lengths) and looks are tied to it, but they cannot change either. They also cannot add a string or a lab scenario. Every mismatch becomes a "request" for WP12, so no scene WP can finish its own pt/ja and timing verification, and WP12 turns into a serial re-tuning pass across four scenes.
**Fix.** Split by owner:
- `src/game/show-timing/{opening,theme,draw,pick,cast}.ts`, each owned by its scene WP; `types.ts` re-exports the merged object, and tests read the constants, never literals;
- per-beat look entries registered from each scene's folder;
- WP2 creates one namespace file per scene WP (`stage-open.json`, `stage-draw.json`, `stage-cast.json`, plus `chat.json`), all three languages, each then owned by that WP;
- one lab scenario file per scene (`lab/scenarios/<scene>.ts`).

---

## More findings (lower priority)

### 11. A queued show replaces the running one, and routing then shows the wrong screen (§1.1 line 26, §1.2 line 89)
`stage()` queues the times but overwrites `s.reveal`, so the opening disappears from state. During the rest of the opening, the plan's rule ("queued → the screen the phase implies, beat = null") routes `picking` to the **pick table end state**. A reload in that window never shows the cold open. It is rare in production (cards are disabled until `stepStartsAt`), but it happens in every e2e run between WP1 and WP7: today's VoteScreen keeps the cards enabled, and `voteAll` votes during the opening. **Fix:** route a queued show to its first beat's screen with the pre-state (vote/theming for `theme`, pick for `cast`), or keep the previous show as `reveal.prev` until its `until`.

### 12. `layoutId` hand-off and the seekable timeline both write `transform` on the hero (§1.2 line 94, WP7)
Motion's layout projection and `useStageTimeline` would both set transform and scale on the same card (hero out at +2.2: scale .6, y −290). **Fix:** put `layoutId` on an outer wrapper and the timeline on an inner element. Set the layout transition explicitly (0.9 s, `backOut(1.2)`, as in `scenes-a.js:306`).

### 13. Restoring the draft can clobber typing (§1.5, WP9b "restore from `pick.draft` on reload")
Drafts bump `version` quietly. The drafter's own view keeps the old draft until the next poll or ping, and if the card re-syncs from `pick.draft` on any view change, the text jumps back mid-typing. **Fix:** restore only on mount, or when the server draft differs and the field is neither focused nor dirty.

### 14. `confirmCard` races the picture upload (§1.5 line 303)
For a new name, `confirmCard` takes the picture from the **stored** draft. A Confirm sent while `POST /draft/image` is still running creates the character without its picture. **Fix:** disable Confirm while `uploading`, or have the upload return a token that `confirmCard` waits for.

### 15. The synchronised final flush creates a write burst at `deadline − 1.5 s` (§1.5 line 299)
Every client flushes at the same server moment, and last-second Confirms land in the same window. `dispatch` retries 5 times with no backoff (`src/server/rooms.ts:72-87`), so a Confirm can fail with `conflict`. **Fix:** flush only if dirty, add per-client jitter (0-400 ms), and give `dispatch` a short randomised backoff.

### 16. Chat author ids are not reassigned when a guest signs in (§1.7)
`handOverSeats` swaps the guest id in room state (`src/server/rooms.ts:266-284`), but stored messages keep `author_id` and the `ChatPerson` snapshots. The new account's older messages then render as someone else's (left side, old guest name and critter), and "you" in system lines breaks. **Fix:** add `ChatStore.reassign(code, from, to)` and call it from `handOverSeats`, as `matches.reassign` does.

### 17. Chat rate limiting is per server instance (§1.7 line 348)
`allow()` is an in-memory map per instance (`src/server/rate-limit.ts`). On Vercel, separate instances do not share it, yet ROADMAP:184 says "rate limited". **Fix:** check in the insert path, for example count the author's rows in the last 10 s inside a Postgres function and refuse above 5, or add a `before insert` trigger. Keep `allow()` as a first line of defence.

### 18. Do not mount the chat on `closed` or `RoomProblem` (§1.2 tree)
`<RoomChat/>` sits under `StageProvider` for every area. A closed room's messages are cleared and the route returns 404, which leaves an empty tab on the "room not found" page. Mount it only for `lobby`, `match` and `result`.

### 19. Reduced motion: the global CSS clamp makes infinite CSS loops jitter (§1.9, WP2 tokens `--animate-drift/bob/nudge/dot/blink`)
`globals.css:200-208` forces `animation-duration: 1ms !important`, and an `infinite` 1 ms loop flickers every frame. **Fix:** give every loop `motion-reduce:animate-none`, or drive it with motion and `useReducedMotion`, as `turn-backdrop.tsx` does. WP2 should test it with emulated reduced motion.

### 20. Ask and Guess can be submitted before `stepStartsAt` and get dropped silently (§1.4 guards, line 28)
The turn body enters during the `entrance` beat, before `stepStartsAt`. A quick Enter returns `too_early`, which `useAction` hides (`src/lib/hooks/use-action.ts:20`), so the question vanishes. **Fix:** disable submit until `stepStartsAt`, as the plan does for VOTE and PICK.

### 21. WP1 interim behaviour (WP1 acceptance, line 659)
Between WP1 and WP7/9b/10, the live app shows today's vote result for the whole theme show (up to 21 s), and today's turn screen for the 12 s cast with ASK silently refused. That is fine for development, but it must not be deployed. Note it in the WP1 report, since Jean plans to test the work live.

### 22. e2e server reuse (§1.12, `playwright.config.ts`)
`reuseExistingServer: true` reuses a 3100 server started before WP1, which has no `DARE_SHOW_SCALE`, so the shows run at full length and time out. Note in WP1: stop any old `.next-e2e` server first.

### 23. Small inaccuracies
- §1.4 line 271 says `backToLobby` needs `s.reveal = null`, but it already sets it (`src/game/engine.ts:848`). Only `leave()` needs the fix.
- `Screen`'s padding is `pb-8 sm:pb-12 sm:short:pb-6` (`src/components/ui/screen.tsx:67`). The `--dock` term must go into each breakpoint, not a single `pb-[calc(2rem+var(--dock))]`.
- Engine.md §4.2 asked for distinct words for "match number" and "turn round". The plan reuses "Round {n}" for both the card and "Round n · X's turn". Pick distinct pt/ja wording, or say "Match {n}".
- The `firstTurn` chat line snapshots the first player at the moment of the last PICK. If that player leaves during the cast, the line names the wrong player. Compute it at `cast.until`, or accept the edge case.
- The heart icon on the hand shows `picks`, but the prototype's heart is likes (`scenes-b.js:249`). Use a neutral icon for the pick count, or show likes.

### 24. The slip's "final size" wording (WP8 line 715)
The decision text says the slip comes out "already at its final size". The artifact's code scales it from 0.15 to 1 while it rises (`scenes-b.js:89-93`). The plan follows the code, which matches what Jean watched and approved. Keep it, and say so in the WP8 report so nobody "fixes" it later. Also keep the slip straight: the draw notes still say "que vira no ar" (`scenes-b.js:105`), but that is stale.

### 25. Players who join at match 2 or later never see the rules (§1.1 line 30)
`first` is per room, so a newcomer joining for match 3 gets only the "Round 3" card and no rule scene. This is not a contradiction, but put it to Jean: `first = round === 0 || someone seated now has not played a match in this room`.
