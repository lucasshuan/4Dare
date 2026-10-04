# WP11 review (commit 92f00cc)

Scope: `git show 92f00cc`, checked against the acceptance in `docs/phase10/briefs/WP11.md` ("Your package") and the report `docs/phase10/reports/WP11.md`.

Checks run:
- `pnpm exec vitest run src/features/chat src/features/stage/lab/scenarios.test.ts src/i18n/messages.test.ts`: 3 files, 48 tests passed.
- `pnpm typecheck`: clean.
- Lab probes at 390x844 (`isMobile`, `hasTouch`) against http://localhost:3100. The engineer's screenshots in `.data/shots/WP11/` were reviewed: desktop unread with bubbles, phone open with long names in pt, phone folded with long names, desktop open in dark.

Verdict: **not passed**. One medium defect, one low.

## Medium: the phone bar disappears for the asker's whole Ask and Guess step

- Where: `src/features/chat/room-chat.tsx:177` (`hidden = phone && !open && focus === "other"`), with `useFocusPlace` at line 330.
- What goes wrong: on a phone, `Ask` and `Guess` in `src/features/turn/turn-screen.tsx` (lines 374 and 538) still `autoFocus` their field whenever `focusIsFree()`. Only the pick screen turns autofocus off on phones. A programmatic focus makes the field `document.activeElement` but does not raise a keyboard, yet `useFocusPlace` already reports `"other"`. The folded bar then gets `display:none` and `--dock` drops to `0px` for the whole step. Unread notices, the count and the live region (which sits inside the hidden root) are all gone for the player whose turn it is, until they blur the field.
- Evidence: in the lab at phone size, `/en/dev/stage?show=turn&at=-0.5&you=3` and `&at=1&you=3` (Nina asks): `activeElement` = the "A yes-or-no question about you" input, and `[data-chat]` has computed `display: none`. Seats 0-2 (not asking) at the same moments: `display: block`. After `activeElement.blur()` the bar shows again.
- Fix: hide the bar only while a keyboard is really up. For example, require `innerHeight − visualViewport.height − visualViewport.offsetTop > ~80` along with focus in another field, listening to `visualViewport` resize, as `useKeyboard` already does. Another option is to count "other" only after a pointer or key gesture on that field. Gating the `Ask`/`Guess` autofocus on phones (WP12, shared file) would also help, but a programmatic focus should not hide the chat either way.

## Low: desktop bubbles stack without a cap

- Where: `src/features/chat/room-chat.tsx:137-141` (`setBubbles((b) => [...b, ...arrivals…])`) and `chat-bubbles.tsx`.
- What goes wrong: every unread line adds a bubble for 3.05 s and nothing limits the stack. With 3 other players each allowed 5 lines per 10 s, a burst can stack about 15 bubbles of about 66 px (roughly 1000 px). They run off the top of an 800 px window and cover the right side of the screen for 3 s.
- Fix: keep only the newest few, for example `.slice(-3)` when appending.

## Checked and fine

Sizes and placement (`right-4 bottom-0 w-[340px]`, 56/60 px plus the safe area, 62%/66% open), the eases and durations of open and fold, the chevron, z-[35], `data-chat`, `--dock` set and removed. The head button with `aria-expanded`/`aria-controls` and the count in its label. The sky head, the inverted count with its pop, faces newest first, the hop, the nudge guarded for reduced motion, bubbles above the tab and cleared on open. The phone line with an avatar and "You:". The list: others with avatar and name, yours in sky, emoji-only lines big, system pills that wrap, with avatars through `useWithNames`. Compose: 46 px pill, send disabled while `cleanChatText` is null, Enter keeps the focus, `maxLength` 280, focus on open only with a fine pointer, Escape folds. The body unmounts once folded. Mounted only outside `closed`. `localStorage` reads and writes wrapped in try/catch. Bubble timers run on the server clock. Unread survives a reload. System lines never count, and theme lines wait for `showAt`, so nothing is spoiled. No character data reaches the chat. i18n keys match in en/pt/ja. Dark tokens are in place. No collisions with existing e2e locators.
