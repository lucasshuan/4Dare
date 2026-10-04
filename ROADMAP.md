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

## Phase 2 — Online with friends ✅

- [x] Supabase: database, realtime, pictures, guests without login
- [x] Supabase set up in one command (`pnpm setup:supabase`): tables, guests, Discord, Google, URLs, keys
- [x] Server in the same region as the database (São Paulo)
- [x] Real login with Discord and Google
- [x] Deploy on Vercel with the Supabase integration
- [x] Character library on Supabase (`pnpm seed`)
- [x] One browser, one guest: the first page creates the guest cookie, so a new visitor never takes two seats
- [x] Guests never touch the database: a signed cookie, no user, profile or session rows; only Discord/Google accounts are stored
- [x] 2- and 4-player match tested online

## Phase 3 — Characters and themes ✅

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
- [x] Theme drawn from 337 simple themes (an AI draw came and went, see ROADMAP_BUILD.md)
- [x] Themes where the "character" is a group: duos, trios, siblings, families, bands, species (Pikmin)
- [x] Themes in the database: turn on and off without a deploy
- [x] One theme, one idea: "Angels and demons", "Butlers and maids" and 13 others became two themes each
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
- [x] Create room at `/new?game=who-am-i`: opens the room right away and goes into it
- [x] Lobby: host edits the settings and starts; the others mark "I'm ready" (green ✓, red ✗)
- [x] ~~Starts on its own in 2 minutes~~: replaced, the host always starts (see below)
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
- [x] Hovering a set card shows a few example themes from it
- [x] Time per step next to seats on the web, so the settings make a grid
- [x] The last room setup is remembered in the browser; the lobby edits it too
- [x] Or the host types the theme: no sets, no vote, ideas at hand
- [x] Everyone sees "the host is choosing the theme"; after 30 s it becomes a vote among every set
- [x] No "Random" pick for a typed theme
- [x] Quick vote: 8 s; then the theme stays on screen for everyone for 3 s
- [x] The set's emoji on the vote cards and next to the theme at the top
- [x] Smooth animations on all of it: cards, switch, typing, reveal

## Phase 9 — Ready for more games ✅

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
- [x] Pictures: any type the browser opens (JFIF, AVIF...), pasted or dragged from a web page, always sent as cropped even when saved at once; card pictures load ahead for everyone
- [x] "Create room" goes straight into a new room named after you ("Bob123's room", "Sala de Bob123"); the other settings live only in the lobby's "Edit settings"; the room name is required, with nothing under the field
- [x] A new room always starts with 4 seats; the lobby can lower it for that room
- [x] Hover (or tap) a player at the top of the match: their card opens big under them, framed in their seat colour, with name, origin and who picked it
- [x] "Who am I?" has its own small thumbnail (rooms list, selects, lobby): a hand of three cards, yours a big "?", crisp from 38×24 up
- [x] One time per step of a turn, set in the room's rules with a hint each: ask and answer (80 s), guess (60 s), check a guess (40 s); picking always gets 120 s. Every answer that leaves others still to answer cuts 20% of the answer time (never under 10 s left), and the clock shows the cut
- [x] Room QR code in the lobby, right of the greeting: rounded modules, blue eyes, the 4Dare icon in the middle; a click opens it big to scan from across the table
- [x] "Who am I?" banner about 100 px shorter: the question sits right under the top bar and right over the cards, which keep their size
- [x] One loader for the whole site: a hand of "?" cards shuffling, centred in the window with what is going on under it (creating a room, opening it, the profile, a match elsewhere)
- [x] Guests draw a new name and critter from the user menu (dice beside the name); it shows at once in every room they sit in, and an account's profile change does too; a room named after its host keeps its name
- [x] The lobby has no clock: only the host starts the match. Starting while someone is not ready asks first, listing who is missing, live (it turns into "Everyone is ready!" if they confirm meanwhile)
- [x] Tab titles name the room ("Bia's room" when it has no name), never its code; the lobby's big title is always the room's name, the greeting goes under it
- [x] One room at a time, guest or account: joining or creating a room leaves your other lobby; a match still going blocks other rooms; a tab that lost its seat to another room says where it went and can take it back
- [x] Signing in from anywhere hands every guest seat to the account, so a match carries on
- [x] Game cards show how many players are online right now (in a lobby, a match or on the podium), with a live dot; it updates with the room list
- [x] /rooms filters by the host's language, left of who can join: only yours by default, several or all on request (kept in the link); a full room shows an icon too
- [x] More guest names (about 165k; a repeated name only gets even odds at around 420 guests): 90 more adjectives, 86 more nouns, hybrids of two nouns (PotatoNinja, BatataNinja, ジャガイモ忍者), 68 titles that follow the noun's gender (QueenFox, RainhaRaposa, キツネ女王), titles with adjectives, half of them feminine (CaptainBrave, CapitãoCorajoso, 勇敢な船長) and, for one new guest in a hundred, one of 80 legendary meme names (Doge, Sextou, 花金)
- [x] Shorter lobby card: "Start match" (or "I'm ready") sits right of the game's name and takes a full row only when it does not fit, with no hint under it; "Leave room" is a back link above the room's name
- [x] "Create room" on the "Who am I?" page is big (it fills the row beside the code field and is as tall as its label and field) and shaped like a key: solid sky blue with a thick lip under it, it lifts on hover, sinks when pressed and gives a small bounce every few seconds (not with reduced motion)
- [x] The lobby's main button is a bigger key too, like "Create room": the host's "Start match" in teal; a guest's "I'm ready" in apricot, which stays pressed down in teal once ready

## Phase 10 — The match presents itself

The "4Dare em cena" proposal (https://claude.ai/artifact/XwqNSpQWeXC1rrNyKKW4or) built into the game, as pretty as the proposal and as solid as today.

- [ ] The start of a match plays like a stage show: one thing at a time, big and centred, no written tutorial; synced for everyone by the server clock, like the reveals
- [ ] Each step has its own background colour, with symbols from the theme's set; while picking, the colour of whoever you pick for
- [ ] Cold open on a room's first match: everyone's card over their head (yours a "?"), someone asks "Am I from Marvel?" and answers come in; later matches get a short "Round 2" card
- [x] Theme vote lasts 20 s (was 13 s)
- [ ] "Now, choose a theme together" shows alone for a moment, rises into the title, the cards are dealt and only then the clock starts
- [ ] Chosen theme grows in the middle, then the rule as a scene: "Every character must be from this theme", two cards that fit get ✓, one that doesn't gets ✗ and falls out; a typed theme gets only the sentence
- [ ] Draw: the avatars hop into the yellow 4 of the logo, it shakes like a jar and spits out a slip, already straight and at its final size and place: "You pick for Leo"
- [ ] "For whom": the slip becomes the screen (big face, name in their colour, "Pick a character Leo knows"), with a ring of who picks for whom, yours highlighted
- [ ] Pick screen is one card in the middle and the card is the form: a name with autocomplete and a live preview, the picture changed right on it, no "Create character" button; a name not in the library gets a "New!" seal
- [ ] Every theme has about 5 famous, common starter characters (a table fed by a seed), apart from picks and likes; they back the ✓ examples and the hand
- [ ] Under the card, a hand of the theme's starters and its most picked and liked characters; a tap puts one on the card
- [ ] "Random" big beside "Confirm"
- [ ] Out of time: whatever is on the card (picked or being created) is the pick, saved on the server while you edit; random only for an empty card
- [ ] Confirming makes the card grow a little, straight and centred; then the avatars of who has finished show up
- [ ] "Rafa picked yours": your "?" card falls in with who picked it, then the others turn face up
- [ ] Turn order: the cards shuffle into the order, get numbers, "Bia starts!", then shrink into the game's player strip
- [ ] Chat in the lobby and the match: a tab at the bottom right, slightly inset; a click on its top opens it over the screen to about 60% of the height, another click folds it
- [ ] New messages: the tab turns blue with a count and the senders' faces, a 3 s bubble with the text, a small nudge now and then until it is opened
- [ ] Chat on phones: a bar at the bottom with the last message, opening from the bottom the same way
- [ ] Chat has only messages and system lines ("Theme: Superheroes"): no who's-in-the-room list, no emoji shortcuts; up to 280 characters, rate limited, gone when the room closes
- [ ] History only during turns: a button left of the theme opens a full-height bar on the left that pushes the screen (over a scrim on phones)
- [ ] The lobby stays as it is, plus the chat
- [ ] Desktop and phone, light and dark, 3 languages, reduced motion; everything that works today keeps working
