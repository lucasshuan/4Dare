# WP5 report: server (drafts, confirm, rule examples, hand)

## Files

Created:
- `src/server/http.ts`: `sameOrigin(request)`, `failure(code)` (an error code becomes its status), `handle(work)`, `readJson`, `noStore`.
- `src/server/images.ts`: `readImage` (moved out of `actions.ts`, unchanged) and `isUploadedPicture(url)`.
- `src/server/characters.ts`: `findSameName(name, lang, origin)` and `getOrCreateCharacter(input)`.
- `src/server/rule-examples.ts` (+ `rule-examples.test.ts`): `ruleExamplesFor(themes, src)`, `ruleExamples(theme, src)`, `voteExamples(state, themes, src)`, `ExampleSources`.
- `src/app/api/rooms/[code]/draft/route.ts` (`PUT`), `src/app/api/rooms/[code]/draft/image/route.ts` (`POST`), `src/app/api/themes/[id]/picks/route.ts` (`GET`).
- `src/server/backend/supabase/themes.test.ts`: tests for the paging and the cache of the starters reader.

Changed:
- `src/server/rooms.ts`:
  - `dispatch(code, build, { quiet })`, with a random wait of 15–60 ms × attempt between compare-and-swap retries;
  - `saveDraft`, `DraftCard`, `roundExamples`;
  - in `applyDueTimeouts`: `drafted` (by picker id), fallbacks only for cards still empty and from the theme first, and examples on the theming → vote timeout.
- `src/server/actions.ts`:
  - `startGame` sends `examples` (first match, vote mode);
  - new `confirmCard`;
  - `randomPick` saves its draw as the draft (exclusion unchanged);
  - `createCharacter` reuses through `findSameName`;
  - `readImage` moved out.
- `src/server/theme-picks.ts` (+ test):
  - `pickKey("draft-…") → null`;
  - `rankPopular`, shared by `drawPopular` and the hand;
  - `buildHand`, `HAND_SIZE`, `HandCard`, `HandResponse`.
- `src/server/backend/types.ts`: `NewCharacter.id?`, `ThemeStarter`, `CharacterStore.starters()`.
- `src/server/backend/local/characters.ts`: `create` uses the given `id` and returns the existing row when that id is already there; `starters()` returns `[]`.
- `src/server/backend/supabase/characters.ts`:
  - `create` with an `id` is insert-or-nothing (`upsert … ignoreDuplicates` on both tables, then a read back);
  - `starters` comes from `supabaseStarters()`.
- `src/server/backend/supabase/themes.ts`: `readStarters(db)` (pages through `theme_starters`, with `characters(kind)` and `themes(theme_set, active)`), `supabaseStarters()` (10 min cache, same TTL as the themes).
- `src/server/server.test.ts`: the random-pick test rewritten without `data/`, plus new tests (see Verification).

No migration. `theme_starters` was only read (read-only SQL through the MCP). No library row was changed.

## What was built

### Drafts (plan 1.5)

**`PUT /api/rooms/[code]/draft`**
- Body: `{ characterId: string|null, name: string, imageUrl: string|null }`, or `null` for an empty card.
- Checks, in this order:
  1. origin check (403);
  2. guest or account identity;
  3. rate limit `draft:<id>`, 120/min (429);
  4. validation (400): name at most 60, `characterId` 1–200 characters, `imageUrl` only one of our character uploads (`/api/files/characters/<uuid>.<ext>` locally, `<SUPABASE_URL>/storage/v1/object/public/characters/<uuid>.<ext>` hosted);
  5. seated (403), then the engine's `DRAFT` rules (409: `wrong_phase` after the deadline or outside picking, `already_done`).
- On success: a quiet `dispatch` (no realtime ping, no room-list check), then 204.
- `saveDraft` gives the card its `newId` on its first save and keeps it.

**`POST /api/rooms/[code]/draft/image`**
- Multipart field `image`. It checks the origin, then the rate limit `upload:<id>`, the one shared with every other picture.
- It runs `readImage`, and checks that the caller has an open card before storing anything.
- Then `files.put`, and a quiet `DRAFT` that keeps the typed name with `characterId: null` and the new `imageUrl`.
- Returns `{ imageUrl }`.

**Timeout** (`applyDueTimeouts`, picking), in this order:
1. `draftedCharacters` (keyed by picker id). A card with a `characterId` → `characters.get`. Otherwise a non-empty name → `getOrCreateCharacter({ id: draft.newId, lang: picker.lang, name, origin: null, imageUrl: draft.imageUrl, createdBy })`. If that fails, the card is left to the engine, which plays it as typed.
2. `fallbackCharacters(state, drafted)`, only for cards with no pick, no `drafted` entry and no name typed. They come in the order the engine fills them: one pick per card from the theme's history (`drawPopular`, skipping what is already on cards), else `randomPopular`, else `EMERGENCY`, then spares. Card *i* gets candidate *i*, in the picker's language. Before this change, a second empty card could get the first card's spare in another language.

**`confirmCard(code, { characterId } | { name })`**
- With an id it works like `confirmPick`.
- With a name it does the following:
  - trims it and squashes spaces;
  - checks the phase, the seat and an open card;
  - applies the rate limit `upload:<id>`;
  - then calls `getOrCreateCharacter` with the draft's `newId` (so it is the same character a racing timeout would make), the picker's language, and the draft's uploaded picture (only for a new-character draft);
  - finally sends `PICK`.

**`randomPick`**
- The draw is saved as the draft (quiet `DRAFT`, best effort).
- The exclusion is unchanged: everything picked in the match, the caller's own secret included.

### Rule examples (plan 1.6)

**When:** `startGame`, on the first match of a room in vote mode, and the theming → vote timeout of a first match, send `examples` (3 entries, `null` where a theme has none). Nothing is sent when all three are null. If reading fails, nothing is sent and the scene shows the sentence; a start never fails because of the examples.

**✓✓:**
- The first two starters, by position, that have a picture and names in en and pt. A ja name is added when the library has one.
- If fewer than two are left, the theme's best `drawWeight` history picks (library ids only) fill in.
- Still fewer than two → `null`.

**✗:** the misfit rule is described in deviation 2.

**Card:** `{ id: "wd-Q…", imageUrl, names: { en, pt, ja? } }`.

**Lookup:** for the 3 themes together, one `getMany` per language.

### Hand (plan 1.6)

**`GET /api/themes/[id]/picks?lang=`**
- Returns `{ hand: HandCard[] }`, at most 8 cards, from `buildHand`. A `HandCard` is a `CharacterDTO` plus `picks` and `likes`.
- Order: first the history with real signal (2+ picks or 1+ like, by `drawWeight`), then the theme's starters by position. Each character appears once, and cards with a picture come first.
- Never mind what this match already picked.
- Responses:
  - `public, max-age=0, s-maxage=60, stale-while-revalidate=600`;
  - 400 for a bad id or language;
  - an unknown or typed theme id has an empty hand.

## Deviations from the plan

1. **`starters()` lives on `CharacterStore`, not `backend.themes`.**
   - `getBackend().themes` is the `ThemeSource` built by `src/server/themes.ts`, and `backend/index.ts` wires it. WP5 owns neither file.
   - The reader and its cache sit in `supabase/themes.ts`, which WP5 owns, and `supabase/characters.ts` exposes them.
   - It returns every active starter in one cached read (with the character's `kind` and the theme's set, needed for the ✗), instead of `starters(themeId)`.
   - On a failed read it keeps the last list, or returns `[]`, so a match never fails because of the starters.
2. **The ✗ rule goes past "set kind", to avoid ✗ cards that actually fit.** Data checked read-only on the hosted project.
   - A theme is on the fiction side only if its set is a fiction set **and all its starters are `fictional`**. It is on the real side only if its set is `music, celebs, sports, history` **and all its starters are `human`**.
   - `books` counts as mixed (it holds writers and poets), as do the cross-cutting sets.
   - The data marks 23 more themes as mixed: kings, queens, pirates, samurai, vikings, warrior-women, wild-west, manga-artists, j-pop-idols, characters-who-sing, characters-who-dance, characters-with-a-famous-theme-song, bands-from-cartoons-and-anime, fictional-athletes, characters-who-became-memes, magicians, martial-artists, coaches, super-fast, see-the-future, went-to-space, betrayed-someone, animal-in-their-name.
   - Where the ✗ comes from: positions 1–2 of clean themes of **sports + music** for a fiction theme, and of **cartoons + games** for a real theme. Actors, history (kings and dictators) and the deeper positions are left out (Ken Carson, Annabelle and Biblical Magi were in the wider pool).
   - A name guard skips a ✗ whose name holds, or is held by, one of the theme's own names. For example, BLACKPINK's "Lisa" for "The Simpsons characters".
   - The pick is `FNV-1a(themeId) % n` over a fixed order, with up to 8 candidates tried.
3. **`rule-examples.ts` takes its data sources as a parameter** (`ExampleSources`), and `rooms.ts` builds them (`roundExamples`). This way its unit test never loads the backend, whose local stores read `data/*.json` today.
4. **`createCharacter` keeps its own create path.** It shares `findSameName` with `getOrCreateCharacter`, but does not call it. The old form puts an uploaded picture on a same-name entry, which is an update, and the insert-only helper must never do that. `getOrCreateCharacter` reuses a same-name entry as it is: a picture on the draft does not replace the library's.
5. **Every draft gets a `newId` on its first save**, not only drafts for new names; `randomPick`'s draft gets one too. For a draft without one (rooms saved earlier), the timeout uses a fixed `u-<uuid>` hashed from room, match and card, so racing timeouts still make a single row.
6. **The image route makes the card a new character:** `characterId: null`, with the typed name kept.
7. **The draft `PUT` body is strict:** all three fields are required.
8. **The shared types sit next to their code** (`DraftCard` in `rooms.ts`, `HandCard`/`HandResponse` in `theme-picks.ts`). WP5 does not own `contract.ts`. Client code should import them type-only.
9. **The "random pick by theme" test (lead's instruction) no longer imports `data/characters.json`.**
   - It makes its six characters through `createCharacter` (local backend, `u-` ids), and now takes about 50 ms instead of timing out at 5 s cold.
   - A longer timeout was not needed.
   - The cross-language key it used to cover (`en-`/`ja-` ids) is covered by `theme-picks.test.ts` ("in any language").

## Verification

- `pnpm test`: **21 files, 270 tests passed.** New tests:
  - `server.test.ts`, which went from 10 to 20 tests:
    - the draft route: origin, member and validation errors; the save is quiet (no `roomChanged` or `lobbyChanged`, version +1); the target never sees the draft; the picture upload; refused after the deadline; three concurrent readers firing the timeout give **one** library row, on the right card; 429 past 120/min;
    - `getOrCreateCharacter` raced 5 times gives one row;
    - an empty card gets the theme's history pick;
    - `confirmCard`: a new name with the draft's picture, reuse by the same name, a library id;
    - examples at START, the same for both players, and on the host timeout;
    - the hand route: history with signal, then starters, cache header, 400s;
    - dispatch backoff: at least 44 ms over two lost races, `conflict` after 5;
    - `randomPick` saves the draft and never draws the caller's own secret.
  - `rule-examples.test.ts`: 13 tests.
  - `theme-picks.test.ts`: `pickKey` draft, `rankPopular`, `buildHand`.
  - `supabase/themes.test.ts`: paging at a 600-row cap, inactive themes left out, cache, failure.
- `pnpm typecheck`: passes.
- `pnpm exec biome check src/server src/app/api`: clean. The full `pnpm lint` reports 1 error, in `tsconfig.json`: WP3's `next dev` (`.next-wp3`) rewrote its format. That is not a WP5 file.
- **Manual run against `pnpm dev`** (port 3105, `.next-wp5`, `DARE_DATA_DIR=.data/wp5`, two guests driving the real actions and routes):
  - `evil origin: (403, unauthorized)`, `bad url: (400, invalid_input)`, `save: (204)`;
  - `upload: 200 {"imageUrl":"/api/files/characters/….png"}`, then a save with that picture: 204;
  - the draft read back with name and picture; `b sees the name? False`;
  - the hand route: `200 {"hand":[]}` (local mode has no starters), with the cache header; bad id or language: 400;
  - after the 120 s pick clock, three GETs: `[200, 200, 200] asking cast [picked, received, order, entrance]`;
  - a's card is `Zqxj KJJKD` with the uploaded picture (exactly one `u-` row in `.data/wp5/characters.json`); b's empty card got a clock stand-in; a late draft: `409 wrong_phase`.

  The server is stopped. Only the `.next-wp5` entries were removed from `tsconfig.json`; WP3's entries are still there. `.next-wp5` and `.data/wp5` are deleted.
- **Full `pnpm test:e2e`** (with WP3's in-progress tree): **12 passed, 1 failed, 16 skipped** (`stage-shots`, which runs only with `STAGE_SHOTS=1`).
  - The failure was `rooms.spec` "a private room is listed…", after 2 ms: `apiRequestContext: Target page, context or browser has been closed`. That is the context clean-up of `newPlayer()` right after `picture.spec`, before the test did anything.
  - A rerun of `rooms.spec` + `picture.spec` gave **4 passed**.
  - Port 3100 is free afterwards.
- **Hosted data, read-only:**
  - `theme_starters`: 1666 rows, 337 active themes, none empty;
  - every active theme has two starters with a picture and en+pt names, so ✓✓ is never sentence-only;
  - running `ruleExamplesFor` on a dump of the hosted starters and names: **198 themes with ✗, 139 with ✓✓ only, 0 sentence-only**. The ✗ cards look clear: for example Superheroes → Ayrton Senna, Presidents → Charizard, Dogs → Jimi Hendrix, The Simpsons → Daft Punk.

## Screenshots

None: WP5 has no UI.

## Requests for WP12 and later packages

- **WP9b (client):**
  - Draft API:
    - `PUT /api/rooms/[code]/draft` with the whole card (`{characterId, name, imageUrl}`) or `null`. Errors come as `{ error }` with 400, 403, 409 or 429.
    - `POST …/draft/image` (field `image`) answers `{ imageUrl }`. From then on, the card is a new character with the name kept.
    - Put the returned URL in later PUTs. Don't PUT while an upload is in flight, or a PUT sent earlier can drop the picture.
  - Confirm: `confirmCard(code, { characterId } | { name })`.
  - Hand: `GET /api/themes/<themeId(theme)>/picks?lang=` → `HandResponse` (import the types type-only from `@/server/theme-picks`). Shuffle 5 of the 8 per viewer, as the plan says.
- **WP7:** `reveal.rule` cards are `{ id, imageUrl, names: { en, pt, ja? } }`. `ja` can be missing: fall back to `en`.
- **WP6:** `dispatch` now takes `{ quiet }`. A quiet `DRAFT` write changes nothing visible, so system lines have nothing to find there. `rooms.ts` and `server.test.ts` are yours next.
- **WP12:**
  - Maybe move `DraftCard`, `HandCard` and `HandResponse` into `contract.ts`.
  - `ARCHITECTURE.md`: drafts (quiet, `newId`, timeout order), `theme_starters` and the ✗ rule of deviation 2, and the duplicate-secret trade-off.
  - `theme_starters` still has the default table grants for `anon`/`authenticated`. RLS with no policies blocks them, but plan 1.6 said `revoke all`; a one-line idempotent migration would match the other tables.
  - `e2e/helpers.ts`: the `newPlayer()` clean-up can close a context that a following test's first request still uses (the 2 ms failure above).

## Notes for Jean

- **Starters coverage:** 1666 rows over all 337 active themes. These 13 themes have fewer than 5 starters:
  - 2: elephants;
  - 3: bands-from-cartoons-and-anime, famous-real-life-animals, horses-and-ponies, tokusatsu-heroes;
  - 4: baby-characters, comedy-groups, dinosaurs, fairies, ghosts, penguins, video-game-species, wolves.

  All 337 still get ✓✓.
- **How to add starters:** append rows to `supabase/seed/theme_starters.sql`, as `('theme-id', 'wd-Q…', position)`. Positions 1–2 are the clearest fits; prefer characters with a picture and names in pt, en and ja. Run the file again with the Supabase MCP `execute_sql`: it only inserts (`on conflict do nothing`). Never `pnpm seed`. The servers pick the change up within 10 minutes.
- **✗ coverage:** 198 themes get a ✗ card, from famous athletes and musicians for fiction themes, and cartoon and game characters for real-people themes. 139 get only ✓✓: the cross-cutting sets, books, and 23 themes whose starters mix real and made-up characters (list in deviation 2). To give one of them a ✗, its starters would have to be all one kind.
- **Clock and new characters:** a name typed when time runs out becomes a new library character only when the search showed no rows; otherwise the previewed character goes. That character is made once, even when several players' pages fire the timeout together.

## Review (wave 2)

One review after the commit: passed, two lows, both fixed. The hand route and the history fill of the rule examples fall back to the starters when the history read fails; the draft picture route refuses past the deadline before it stores anything.
