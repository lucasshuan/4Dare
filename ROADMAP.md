# Roadmap

Tick = done and committed.

## Fixes

- [ ] Browser back no longer leaves the room; settings get own URL/hash
- [ ] Host can hand host to another member
- [ ] Home OpenGraph drops "2 to 4 players"
- [ ] Player leaves mid-match: game handles it
- [ ] Chat header shows room name, smaller
- [ ] Lobby and matches never scroll (no vertical, no horizontal), any screen size

## Games

- [ ] Who am I?: up to 6 players
- [ ] Every game gets own intro screen
- [ ] New game inspired by Ito
- [ ] Who am I?: polish, fix transitions
- [ ] Impostor: polish, fix transitions
- [ ] Impostor: visual redo. Spy theme, Persona vibe
- [ ] What for?: polish, fix transitions

## Sound

- [ ] Room actions get sounds
- [ ] Full sound set in every game

## Narrator

- [ ] Record 315 lines per language (en, pt, es, ja), file per ID: `<lang>/<id>.mp3`
- [ ] Narration on/off switch
- [ ] Lines play by moment: shared, theme vote, per-game hook and rules
- [ ] Max one line per 45 s, no repeat in a match, never same line twice in a row
- [ ] Collisions: only top one plays (ending > discovery/vote > give up > check > wrong guess > pass > stall)
- [ ] Two-player Who am I? skips `whoami.lastOne`
- [ ] What for? presenter mode: presenter and room hear own `whatfor.host.*` lines
- [ ] Auctioneer countdown (`goingOnce/Twice/Sold`): optional, off by default
- [ ] Cold open ~11000 ms when narration on (`OPENING.intro`)
- [ ] Impostor stops showing Who am I?'s cold-open text

## Languages

- [ ] Korean
- [ ] Chinese
- [ ] Russian
- [ ] French

## Menu

- [x] Burger left of logo opens drawer: Play, You, Community, Library, Help
- [x] Drawer top: face, level, XP bar; guest sees Discord/Google sign-in
- [x] "Go to" filter, arrow keys, Esc closes, focus back to button
- [x] Hidden during matches
- [x] Own page for settings (`/settings`)
- [ ] Avatar menu keeps account, theme, sign out only
- [ ] Blue dot: suggestion moved or new achievement
- [x] Drop `/how-to-play` page

## Characters (`/characters`)

- [x] Whole library per language: search by name, work, alias; filter by tastes
- [x] Sheet opens over list (`@modal`), close keeps scroll; direct link = full page
- [x] New character modal: name first, shows look-alikes; live card preview
- [x] Player aliases (`character_aliases`): author, language, history, 3 reports hide; library names locked
- [x] Photos from sheet, same route as card (auto check, pending for sender)

## Workshop (`/workshop`)

- [x] One page for themes, questions, missions; tabs hide per game filter
- [ ] "In the Workshop" strip on each game page, opens filtered
- [x] Traffic light: amber voting (votes, % want), green live, red refused with reason
- [x] States `voting`, `review`, `live`, `refused` in `workshop_suggestions` (banks only get what goes live) and `workshop_votes`
- [x] Suggest form asks what each bank stores (theme: set, games, characters; question: type, scope, audience, spice; mission: mood, heavy)
- [x] Silent curation on suggest: look-alike names/texts, starter overlap, missing photos, blocked words, format, 3 per week. Rules only, no AI
- [x] Preview switches language by flag, shows Who am I? opening rule
- [x] Translation wand: game banks and theme patterns first, MyMemory for the rest; curator completes all 4 languages
- [x] Review queue sorted by votes; going live inserts theme starters, deletes nothing

## Community

- [x] Rankings: per game and period (week, month, ever), podium, own place, top helpers
- [x] Players page: search; all, played with me, playing now
- [x] Contributions feed (photos, characters, aliases, suggestions), own numbers and the pictures badge
- [ ] Empty ranking (under 3 players): better skeleton

## Social

- [ ] Notifications
- [ ] Friends
- [ ] Friend chat
- [ ] Clans

## Profile

- [ ] Better trivia
- [ ] Better activity, matches included

## Badges

- [ ] Badges tab on profile (`/u/<name>?tab=badges`)
- [ ] Tiers bronze, silver, gold with progress (e.g. Collector: 23/30 photos)
- [ ] Menu shows count of new badges since last visit

## Legal and news

- [x] Privacy and terms pages (short, essentials in 30 s, index; lawyer check before publish)
- [x] Accounts 16+ only, under 16 play as guest; reported minor account deleted (in the terms)
- [x] No cookie banner (only needed cookies)
- [x] Two-layer license: personal stuff leaves with account, game content stays unnamed
- [ ] Public room chat: report a line, host mutes/kicks, chat off switch
- [x] News: `news_posts` in four languages, filters by game and kind, reactions, a link per post, Workshop posts write themselves; menu dot vs last seen
