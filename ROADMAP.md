# Roadmap

Each phase ends with the game playable; the next one only improves it. Ticked item = done and committed.

## Phase 0 — Base ✅

- [x] Screen design, design system and flow (BPMN)
- [x] Next.js in English, Portuguese and Japanese, light and dark theme
- [x] Game rules written as types
- [x] Commit convention

## Phase 1 — Playable (on your PC) ✅

- [x] Game engine with tests: 2 to 4 players, nobody sees their own card
- [x] Local in-memory server (`pnpm dev`, nothing to set up)
- [x] Public or private room; join by link or code
- [x] Everyone picks another player's character (in a ring)
- [x] Yes-or-no question; everyone else answers: Yes, Probably, Don't know, Probably not, No, Doesn't matter, with an optional comment
- [x] Guess: a close name counts at once; otherwise only the picker decides
- [x] Pass the turn and give up
- [x] Time per step; whoever disappears doesn't stall the match
- [x] End with everyone's place
- [x] Short README

## Phase 2 — Online with friends

- [ ] Supabase: database, realtime, pictures, guests without login
- [x] Supabase set up in one command (`pnpm setup:supabase`): tables, guests, Discord, Google, URLs, keys
- [x] Server in the same region as the database (São Paulo)
- [ ] Real login with Discord and Google
- [ ] Deploy on Vercel with the Supabase integration
- [x] Character library on Supabase (`pnpm seed`)
- [x] One browser, one guest: the first page creates the guest cookie, so a new visitor never takes two seats
- [x] Guests never touch the database: a signed cookie, no user, profile or session rows; only Discord/Google accounts are stored
- [ ] 2- and 4-player match tested online

## Phase 3 — Characters and themes

- [x] Reviewed library builder: content filters, pt-BR names, cache
- [x] Large library in each language, with pictures (8k per language, 91–98% with a picture)
- [x] Reviewed library: no criminals, dictators or adult content; Brazilian and Japanese names; origins and duplicates fixed
- [x] Library takes groups and species: duos, families, teams, bands, Pikachu, Chocobo
- [x] Popularity without news spikes: median of 6 months over 2 years (the Odyssey film had put Agamemnon in the top 3)
- [x] One entry per character: name, aliases and popularity in each language
- [x] Origin as a translatable key (work or job) and a fixed category (anime, sports, mythology...)
- [x] Search with autocomplete and pictures
- [x] "Random" button on the pick screen: draws one of the characters picked most for that theme in played matches (the clock's picks don't count); works from 1 saved match, otherwise a short notice
- [x] "Like this pick?" right after a draw: 👎 draws another and each 👎 halves its chance for that theme; 👍 counts as one more pick
- [x] Instant search: the language's index downloaded once (cached), each key answered from memory in under 1 ms, no server
- [x] Create a character with a name and your own picture (with cropping)
- [x] Change any character's picture (it becomes the library's)
- [x] Theme drawn by the AI; without a key, from 337 simple themes
- [x] Themes where the "character" is a group: duos, trios, siblings, families, bands, species (Pikmin)
- [x] Themes in the database: turn on and off without a deploy; the AI's ones are kept
- [x] One theme, one idea: "Angels and demons", "Butlers and maids" and 13 others became two themes each; the AI no longer joins two groups
- [x] Theme vote: before each match 3 themes show up and everyone votes, with avatars hopping between the cards; 8 s; most votes wins, a tie goes to a synced wheel, and the winner takes the stage before picking

## Phase 4 — Looks like a finished game ✅

- [x] Screens match the design: big images, soft colors, light and dark, 3 languages
- [x] Real flags; language and theme only on the home screen and in the lobby
- [x] Language in a select (flag + name)
- [x] Pointer cursor on everything clickable
- [x] Room code without a button: joins at the 5th character, or says why it can't
- [x] Home screen picks the game: cards in a carousel, with an animated preview; "Who am I?" comes first
- [x] Own logo, square icon and favicon; logo on top of every screen except the lobby and the match; home only with the games
- [x] No screen scrolls on desktop: everything fits from 1024×640 to 1920×1080
- [x] User at the top right, after the theme: avatar and name; a click opens a popover saying if you're a guest and offering Discord and Google
- [x] Reveal for everyone: the answers (6 to 10 s, by length) and the guess (2.5 to 3.5 s)
- [x] Next step's clock paused during the reveal, recharging
- [x] Confetti for a few seconds on a hit
- [x] Smooth, lively transitions on every screen, room creation and room errors included
- [x] Actions answer at once: the response already brings the room, no second fetch; "I'm ready" changes on click
- [x] Scrollable history in a drawer, on web and phone: "My plays" (default) or "All"
- [x] Podium with the winners higher and each player under their card
- [x] After 15 s on the podium everyone goes back to the lobby for another match; the host can go sooner
- [x] Room settings hints as tooltips on the labels, with a small info badge
- [x] Phones

## Phase 5 — Accounts and rooms ✅

- [x] Guest: random name (GatoCorajoso, WonderfulCat, すてきなネコ; 27k combinations) and a Critters avatar
- [x] Discord or Google account: picks name, picture or critter, and color (without Supabase, signs into a test account)
- [x] Public rooms on the game screen: open seats first, "See more" shows full ones and ones in a match
- [x] Create room: public or private, 2 to 4 seats, seconds per step (120 by default)
- [x] Create room at `/new?game=who-am-i`, with the top bar and "Back" above the title
- [x] Lobby: host edits the settings and starts; the others mark "I'm ready" (green ✓, red ✗)
- [x] Starts on its own in 2 minutes or as soon as it's full; the clock only runs with 2 players or more
- [x] When the host leaves, whoever joined first takes the room, in the lobby or mid-match
- [x] Matches saved per player: character, who picked it, how it ended and how long it took
- [x] A guest keeps their matches when signing in with Discord or Google (even into an account that already existed), and their seat when signing in from a room

## Phase 6 — Finishing ✅

- [x] Whole-match tests in the browser
- [x] Short PRODUCT.md and ARCHITECTURE.md

## Phase 7 — Easy to find and share ✅

- [x] Name: 4Dare (was Dare, then Ludodare)
- [x] Search: title and description per page and language, canonical and hreflang links, sitemap, robots, JSON-LD, installable (manifest and icons)
- [x] Share cards with a picture for Twitter, Facebook, Discord, WhatsApp and the like: home, "Who am I?" and a room invite with its code, in 3 languages
- [x] Tab title per page and per step of the match; the step clock counts down in the title; when it's your move and you're in another tab, the icon turns into an orange "!", red in the final seconds
- [x] Vercel Web Analytics and Speed Insights

## Phase 8 — Themes your way ✅

- [x] Themes split into 20 sets, each with its emoji (Movies & TV, Anime & manga, Sports...)
- [x] Creating a room: pick the sets the vote draws from, all on by default, as cards
- [x] Time per step next to seats on the web, so the settings make a grid
- [x] The last room setup is remembered in the browser; the lobby edits it too
- [x] Or the host types the theme: no sets, no vote, ideas at hand
- [x] Everyone sees "the host is choosing the theme"; after 30 s it becomes a vote among every set
- [x] No "Random" pick for a typed theme
- [x] Quick vote: 8 s; then the theme stays on screen for everyone for 3 s
- [x] The set's emoji on the vote cards and next to the theme at the top
- [x] Smooth animations on all of it: cards, switch, typing, reveal

## Phase 9 — Ready for more games

- [x] Creating a room starts with the game, as a tab with its picture and name
- [x] The host can switch the room's game in the lobby (only one game so far)
- [x] Every player name comes with their avatar beside it, even inside a sentence, on phones too
- [x] History and a red Give up button in the match header, left of the clock; give up asks first
- [x] History drawer: one tab per player (with avatar and play count), you first
- [x] Rooms can have a name (up to 25 characters), set when creating or in the lobby; shown in the lobby, the public rooms list and the tab title
- [x] The question field ends with a fixed "?" ("？" in Japanese) that cannot be deleted; the server adds one if missing
- [x] Ties: places go by turn round, so whoever comes later in the order still gets that round's turn and ties if they discover too (1st, 1st, 3rd); the reveal and the podium say it's a tie
- [x] "Who am I?" page: smaller title under an animated banner (a round on a loop: ask, answers, guess, flip), with pointer parallax and a still frame for reduced motion; public rooms, then Create room and join by code
- [x] Account page: the usual top bar, "Back to home" above the title, background colour only for a critter, signing out only from the user menu
- [x] Room passwords: a private room is listed with a lock and asks newcomers for its password in a small dialog; only the host sees it, in the lobby
- [x] Create room: name, who can join and the password on one row, seats and time per step below
- [x] /rooms: every listed room, filtered by game, a search by room name and who can join, all kept in the link; the game page shows its open rooms with "See all" at the top right
- [x] New name 4Dare and a new logo: the 4 is a speech bubble with the "?" inside (its leg is the tail), "Dare" in four colours; icons, favicon and the tab "!" follow
- [x] "Who am I?" banner full width under the top bar: five players around a table, answers that wrap in longer languages, a burst when you get it; the top bar stays put and turns to frosted glass as the page scrolls under it
- [x] The match uses the full width; History sits right of the clock: a sidebar beside the game on the web (remembered per browser), a small button and a drawer on phones; filter by player and by questions or guesses
- [x] Sounds (temporary picks): a clock ticks in a loop when the step clock runs low, a pop on every step change of a turn, a fanfare with the podium's confetti
- [x] /rooms filters in one row: the search, then the game and who can join as selects
- [x] Theme vote lasts 13 s (was 11 s)
