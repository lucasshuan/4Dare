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
- [ ] Character generator

## Sound

- [ ] Room actions get sounds
- [ ] Full sound set in every game

## Languages

- [ ] Korean
- [ ] Chinese
- [ ] Russian
- [ ] French

## Menu

- [ ] Burger left of logo opens drawer: Play, You, Community, Library, Help
- [ ] Drawer top: face, level, XP bar; guest sees Discord/Google sign-in
- [ ] "Go to" filter, arrow keys, Esc closes, focus back to button
- [ ] Hidden during matches
- [ ] Avatar menu keeps account, theme, sign out only
- [ ] Blue dot: suggestion moved or new achievement

## Characters (`/characters`)

- [ ] Whole library per language: search by name, work, alias; filter by gostos
- [ ] Sheet opens over list (`@modal`), close keeps scroll; direct link = full page
- [ ] New character modal: name first, shows look-alikes; live card preview
- [ ] Player aliases (`character_aliases`): author, language, history, 3 reports hide; library names locked
- [ ] Photos from sheet, same route as card (auto check, pending for sender)

## Workshop (`/workshop`)

- [ ] One page for themes, questions, missions; tabs hide per game filter
- [ ] "In the Workshop" strip on each game page, opens filtered
- [ ] Traffic light: amber voting (votes, % want), green live, red refused with reason
- [ ] States `voting`, `review`, `live`, `refused`; themes get them too; `suggestion_votes` table
- [ ] Suggest form asks what each bank stores (theme: set, games, characters; question: type, scope, audience, spice; mission: mood, heavy)
- [ ] Silent curation on suggest: look-alike names/texts, starter overlap, missing photos, blocked words, format, 3 per week. Rules only, no AI
- [ ] Preview switches language by flag, shows Who am I? opening rule
- [ ] Translation wand: needs all 4 languages; fills from own theme bank, Apertium for rest, Japanese by hand
- [ ] Review queue sorted by votes; going live inserts theme starters, deletes nothing

## Community

- [ ] Rankings: one view per game and period
- [ ] Players page
- [ ] Contributions feed (photos, characters, aliases, suggestions), no new table

## Legal and news

- [ ] Privacy and terms pages (short; lawyer check before publish)
- [ ] Accounts 16+ only, under 16 play as guest; reported minor account deleted
- [ ] No cookie banner (only needed cookies)
- [ ] Two-layer license: personal stuff leaves with account, game content stays unnamed
- [ ] Public room chat: report a line, host mutes/kicks, chat off switch
- [ ] News: hand-written `messages/<lang>/news.json`, blue dot vs last seen
