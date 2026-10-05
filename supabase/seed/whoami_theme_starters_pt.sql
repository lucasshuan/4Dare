-- Brazilian players' own starters (lang 'pt', see migrations/0022), for the
-- themes where the people they know best are not the shared starters' (famous
-- people of the 90s, singers, footballers, folklore...). Ranked first for
-- 'pt' players, the shared ones close behind; other languages never see
-- them. Curated against the hosted library: in its 'pt' part, a clear fit,
-- a picture whenever it has one. Safe to run again: it only inserts.
insert into public.whoami_theme_starters (theme_id, lang, character_id, position) values
  -- a-character-and-their-pet
  ('a-character-and-their-pet', 'pt', 'wd-Q6200111', 1), -- Cebolinha
  ('a-character-and-their-pet', 'pt', 'wd-Q6730366', 2), -- Magali
  ('a-character-and-their-pet', 'pt', 'wd-Q7546584', 3), -- Cascão
  -- birds
  ('birds', 'pt', 'wd-Q1069773', 1), -- Zé Carioca
  ('birds', 'pt', 'wd-Q10288122', 2), -- Galinha Pintadinha
  ('birds', 'pt', 'wd-Q11937', 3), -- Tio Patinhas
  -- characters-with-an-animal-in-their-name
  ('characters-with-an-animal-in-their-name', 'pt', 'wd-Q6550', 1), -- Pato Donald
  ('characters-with-an-animal-in-their-name', 'pt', 'wd-Q10288122', 2), -- Galinha Pintadinha
  ('characters-with-an-animal-in-their-name', 'pt', 'wd-Q158952', 3), -- Mulher-Gato
  -- characters-with-an-animal-sidekick
  ('characters-with-an-animal-sidekick', 'pt', 'wd-Q6200111', 1), -- Cebolinha
  ('characters-with-an-animal-sidekick', 'pt', 'wd-Q6730366', 2), -- Magali
  ('characters-with-an-animal-sidekick', 'pt', 'wd-Q7546584', 3), -- Cascão
  -- mascots
  ('mascots', 'pt', 'wd-Q10395434', 1), -- Zé Gotinha
  ('mascots', 'pt', 'wd-Q605159', 2), -- Fuleco
  ('mascots', 'pt', 'wd-Q837716', 3), -- Ronald McDonald
  -- poets
  ('poets', 'pt', 'wd-Q379745', 1), -- Carlos Drummond de Andrade
  ('poets', 'pt', 'wd-Q333856', 2), -- Vinicius de Moraes
  ('poets', 'pt', 'wd-Q590', 3), -- Luís de Camões
  ('poets', 'pt', 'wd-Q173481', 4), -- Fernando Pessoa
  ('poets', 'pt', 'wd-Q2607615', 5), -- Cecília Meireles
  -- writers
  ('writers', 'pt', 'wd-Q311145', 1), -- Machado de Assis
  ('writers', 'pt', 'wd-Q12881', 2), -- Paulo Coelho
  ('writers', 'pt', 'wd-Q606389', 3), -- Monteiro Lobato
  ('writers', 'pt', 'wd-Q184440', 4), -- Jorge Amado
  ('writers', 'pt', 'wd-Q235955', 5), -- Clarice Lispector
  -- children-s-cartoon-characters
  ('children-s-cartoon-characters', 'pt', 'wd-Q10288122', 1), -- Galinha Pintadinha
  ('children-s-cartoon-characters', 'pt', 'wd-Q6899893', 2), -- Mônica
  ('children-s-cartoon-characters', 'pt', 'wd-Q6200111', 3), -- Cebolinha
  ('children-s-cartoon-characters', 'pt', 'wd-Q6730366', 4), -- Magali
  -- actors
  ('actors', 'pt', 'wd-Q954355', 1), -- Tony Ramos
  ('actors', 'pt', 'wd-Q922503', 2), -- Wagner Moura
  ('actors', 'pt', 'wd-Q294819', 3), -- Rodrigo Santoro
  ('actors', 'pt', 'wd-Q2750612', 4), -- Lázaro Ramos
  ('actors', 'pt', 'wd-Q772892', 5), -- Antônio Fagundes
  -- actresses
  ('actresses', 'pt', 'wd-Q335455', 1), -- Fernanda Montenegro
  ('actresses', 'pt', 'wd-Q465907', 2), -- Fernanda Torres
  ('actresses', 'pt', 'wd-Q149389', 3), -- Glória Pires
  ('actresses', 'pt', 'wd-Q466954', 4), -- Juliana Paes
  ('actresses', 'pt', 'wd-Q2732423', 5), -- Taís Araújo
  -- celebrities-known-by-one-name
  ('celebrities-known-by-one-name', 'pt', 'wd-Q275939', 1), -- Xuxa
  ('celebrities-known-by-one-name', 'pt', 'wd-Q13476301', 2), -- Anitta
  ('celebrities-known-by-one-name', 'pt', 'wd-Q529207', 3), -- Ronaldo
  ('celebrities-known-by-one-name', 'pt', 'wd-Q531814', 4), -- Kaká
  ('celebrities-known-by-one-name', 'pt', 'wd-Q47526', 5), -- Zico
  -- child-actors
  ('child-actors', 'pt', 'wd-Q5613873', 1), -- Larissa Manoela
  ('child-actors', 'pt', 'wd-Q10323204', 2), -- Maisa Silva
  ('child-actors', 'pt', 'wd-Q13424556', 3), -- Mel Maia
  ('child-actors', 'pt', 'wd-Q10314482', 4), -- Klara Castanho
  -- comedians
  ('comedians', 'pt', 'wd-Q848556', 1), -- Renato Aragão
  ('comedians', 'pt', 'wd-Q1789876', 2), -- Chico Anysio
  ('comedians', 'pt', 'wd-Q555578', 3), -- Roberto Gómez y Bolaños
  ('comedians', 'pt', 'wd-Q732513', 4), -- Jô Soares
  ('comedians', 'pt', 'wd-Q6598039', 5), -- Tatá Werneck
  -- famous-people-from-the-2000s
  ('famous-people-from-the-2000s', 'pt', 'wd-Q531814', 1), -- Kaká
  ('famous-people-from-the-2000s', 'pt', 'wd-Q235940', 2), -- Ivete Sangalo
  ('famous-people-from-the-2000s', 'pt', 'wd-Q152208', 3), -- Gisele Bündchen
  ('famous-people-from-the-2000s', 'pt', 'wd-Q211528', 4), -- RBD
  -- famous-people-from-the-60s
  ('famous-people-from-the-60s', 'pt', 'wd-Q12897', 1), -- Pelé
  ('famous-people-from-the-60s', 'pt', 'wd-Q465191', 2), -- Roberto Carlos
  ('famous-people-from-the-60s', 'pt', 'wd-Q180642', 3), -- Garrincha
  ('famous-people-from-the-60s', 'pt', 'wd-Q200131', 4), -- Antônio Carlos Jobim
  -- famous-people-from-the-70s
  ('famous-people-from-the-70s', 'pt', 'wd-Q1392583', 1), -- Raul Seixas
  ('famous-people-from-the-70s', 'pt', 'wd-Q465877', 2), -- Elis Regina Carvalho Costa
  ('famous-people-from-the-70s', 'pt', 'wd-Q172849', 3), -- Emerson Fittipaldi
  ('famous-people-from-the-70s', 'pt', 'wd-Q1262590', 4), -- Tim Maia
  ('famous-people-from-the-70s', 'pt', 'wd-Q265179', 5), -- Rita Lee
  -- famous-people-from-the-80s
  ('famous-people-from-the-80s', 'pt', 'wd-Q731775', 1), -- Cazuza
  ('famous-people-from-the-80s', 'pt', 'wd-Q47526', 2), -- Zico
  ('famous-people-from-the-80s', 'pt', 'wd-Q171346', 3), -- Nelson Piquet
  ('famous-people-from-the-80s', 'pt', 'wd-Q982366', 4), -- Renato Russo
  -- famous-people-from-the-90s
  ('famous-people-from-the-90s', 'pt', 'wd-Q275939', 1), -- Xuxa
  ('famous-people-from-the-90s', 'pt', 'wd-Q2740228', 2), -- Mamonas Assassinas
  ('famous-people-from-the-90s', 'pt', 'wd-Q529207', 3), -- Ronaldo
  ('famous-people-from-the-90s', 'pt', 'wd-Q10490', 4), -- Ayrton Senna
  ('famous-people-from-the-90s', 'pt', 'wd-Q178649', 5), -- Romário
  -- real-people-with-a-biopic
  ('real-people-with-a-biopic', 'pt', 'wd-Q731775', 1), -- Cazuza
  ('real-people-with-a-biopic', 'pt', 'wd-Q10490', 2), -- Ayrton Senna
  ('real-people-with-a-biopic', 'pt', 'wd-Q1262590', 3), -- Tim Maia
  ('real-people-with-a-biopic', 'pt', 'wd-Q465877', 4), -- Elis Regina Carvalho Costa
  ('real-people-with-a-biopic', 'pt', 'wd-Q1395208', 5), -- Silvio Santos
  -- tv-hosts
  ('tv-hosts', 'pt', 'wd-Q1790996', 1), -- Faustão
  ('tv-hosts', 'pt', 'wd-Q275939', 2), -- Xuxa
  ('tv-hosts', 'pt', 'wd-Q6105', 3), -- Hebe Camargo
  ('tv-hosts', 'pt', 'wd-Q1105361', 4), -- Gugu Liberato
  ('tv-hosts', 'pt', 'wd-Q3329376', 5), -- Luciano Huck
  -- child-characters
  ('child-characters', 'pt', 'wd-Q6200111', 1), -- Cebolinha
  ('child-characters', 'pt', 'wd-Q10271128', 2), -- El Chavo
  ('child-characters', 'pt', 'wd-Q6730366', 3), -- Magali
  ('child-characters', 'pt', 'wd-Q7546584', 4), -- Cascão
  -- comic-book-characters
  ('comic-book-characters', 'pt', 'wd-Q6899893', 1), -- Mônica
  ('comic-book-characters', 'pt', 'wd-Q6200111', 2), -- Cebolinha
  ('comic-book-characters', 'pt', 'wd-Q7546584', 3), -- Cascão
  ('comic-book-characters', 'pt', 'wd-Q6730366', 4), -- Magali
  ('comic-book-characters', 'pt', 'wd-Q1069773', 5), -- Zé Carioca
  -- explorers-and-adventurers
  ('explorers-and-adventurers', 'pt', 'wd-Q174432', 1), -- Pedro Álvares Cabral
  ('explorers-and-adventurers', 'pt', 'wd-Q961743', 2), -- Cândido Rondon
  ('explorers-and-adventurers', 'pt', 'wd-Q130377', 3), -- Bartolomeu Dias
  -- historical-figures
  ('historical-figures', 'pt', 'wd-Q939', 1), -- Pedro I do Brasil
  ('historical-figures', 'pt', 'wd-Q464449', 2), -- Isabel do Brasil
  ('historical-figures', 'pt', 'wd-Q156844', 3), -- Getúlio Vargas
  ('historical-figures', 'pt', 'wd-Q156774', 4), -- Pedro II do Brasil
  ('historical-figures', 'pt', 'wd-Q313211', 5), -- Alberto Santos Dumont
  -- politicians
  ('politicians', 'pt', 'wd-Q37181', 1), -- Luiz Inácio Lula da Silva
  ('politicians', 'pt', 'wd-Q10304982', 2), -- Jair Bolsonaro
  ('politicians', 'pt', 'wd-Q156844', 3), -- Getúlio Vargas
  ('politicians', 'pt', 'wd-Q155824', 4), -- Juscelino Kubitschek
  ('politicians', 'pt', 'wd-Q40722', 5), -- Dilma Rousseff
  -- presidents
  ('presidents', 'pt', 'wd-Q10304982', 1), -- Jair Bolsonaro
  ('presidents', 'pt', 'wd-Q40722', 2), -- Dilma Rousseff
  ('presidents', 'pt', 'wd-Q156844', 3), -- Getúlio Vargas
  ('presidents', 'pt', 'wd-Q155824', 4), -- Juscelino Kubitschek
  ('presidents', 'pt', 'wd-Q230578', 5), -- Fernando Henrique Cardoso
  -- women-who-made-history
  ('women-who-made-history', 'pt', 'wd-Q464449', 1), -- Isabel do Brasil
  ('women-who-made-history', 'pt', 'wd-Q461850', 2), -- Irmã Dulce
  ('women-who-made-history', 'pt', 'wd-Q636688', 3), -- Anita Garibaldi
  ('women-who-made-history', 'pt', 'wd-Q9028898', 4), -- Maria da Penha
  ('women-who-made-history', 'pt', 'wd-Q465902', 5), -- Chiquinha Gonzaga
  -- doctors
  ('doctors', 'pt', 'wd-Q1255930', 1), -- Drauzio Varella
  ('doctors', 'pt', 'wd-Q979554', 2), -- Osvaldo Cruz
  ('doctors', 'pt', 'wd-Q438907', 3), -- Carlos Chagas
  -- journalists
  ('journalists', 'pt', 'wd-Q18314', 1), -- William Bonner
  ('journalists', 'pt', 'wd-Q18315', 2), -- Fátima Bernardes
  ('journalists', 'pt', 'wd-Q1791085', 3), -- Glória Maria
  ('journalists', 'pt', 'wd-Q3424803', 4), -- Renata Vasconcellos
  -- band-members
  ('band-members', 'pt', 'wd-Q982366', 1), -- Renato Russo
  ('band-members', 'pt', 'wd-Q731775', 2), -- Cazuza
  ('band-members', 'pt', 'wd-Q265179', 3), -- Rita Lee
  ('band-members', 'pt', 'wd-Q6430826', 4), -- Chorão
  ('band-members', 'pt', 'wd-Q1791140', 5), -- Herbert Vianna
  -- bands-and-music-groups
  ('bands-and-music-groups', 'pt', 'wd-Q738110', 1), -- Legião Urbana
  ('bands-and-music-groups', 'pt', 'wd-Q2740228', 2), -- Mamonas Assassinas
  ('bands-and-music-groups', 'pt', 'wd-Q1808409', 3), -- Titãs
  ('bands-and-music-groups', 'pt', 'wd-Q1066845', 4), -- Charlie Brown Jr.
  ('bands-and-music-groups', 'pt', 'wd-Q239074', 5), -- Sepultura
  -- female-singers
  ('female-singers', 'pt', 'wd-Q13476301', 1), -- Anitta
  ('female-singers', 'pt', 'wd-Q235940', 2), -- Ivete Sangalo
  ('female-singers', 'pt', 'wd-Q24040310', 3), -- Marília Mendonça
  ('female-singers', 'pt', 'wd-Q465877', 4), -- Elis Regina Carvalho Costa
  ('female-singers', 'pt', 'wd-Q236361', 5), -- Gal Costa
  -- male-singers
  ('male-singers', 'pt', 'wd-Q465191', 1), -- Roberto Carlos
  ('male-singers', 'pt', 'wd-Q1262590', 2), -- Tim Maia
  ('male-singers', 'pt', 'wd-Q309983', 3), -- Caetano Veloso
  ('male-singers', 'pt', 'wd-Q221479', 4), -- Gilberto Gil
  ('male-singers', 'pt', 'wd-Q333632', 5), -- Chico Buarque
  -- rock-stars
  ('rock-stars', 'pt', 'wd-Q1392583', 1), -- Raul Seixas
  ('rock-stars', 'pt', 'wd-Q265179', 2), -- Rita Lee
  ('rock-stars', 'pt', 'wd-Q731775', 3), -- Cazuza
  ('rock-stars', 'pt', 'wd-Q982366', 4), -- Renato Russo
  ('rock-stars', 'pt', 'wd-Q462102', 5), -- Pitty
  -- goddesses
  ('goddesses', 'pt', 'wd-Q1477162', 1), -- Iemanjá
  ('goddesses', 'pt', 'wd-Q1851943', 2), -- Oxum
  ('goddesses', 'pt', 'wd-Q2004715', 3), -- Oyá
  -- legendary-creatures
  ('legendary-creatures', 'pt', 'wd-Q1760117', 1), -- Saci
  ('legendary-creatures', 'pt', 'wd-Q1518398', 2), -- Iara
  ('legendary-creatures', 'pt', 'wd-Q1707194', 3), -- Cuca
  ('legendary-creatures', 'pt', 'wd-Q1025905', 4), -- Caipora
  -- characters-with-a-catchphrase
  ('characters-with-a-catchphrase', 'pt', 'wd-Q8345365', 1), -- Chilindrina
  ('characters-with-a-catchphrase', 'pt', 'wd-Q7421675', 2), -- Quico
  ('characters-with-a-catchphrase', 'pt', 'wd-Q5644130', 3), -- Don Ramón
  -- characters-with-a-famous-favorite-food
  ('characters-with-a-famous-favorite-food', 'pt', 'wd-Q6730366', 1), -- Magali
  ('characters-with-a-famous-favorite-food', 'pt', 'wd-Q10271128', 2), -- El Chavo
  ('characters-with-a-famous-favorite-food', 'pt', 'wd-Q183102', 3), -- Pernalonga
  -- grumpy-or-hot-tempered-characters
  ('grumpy-or-hot-tempered-characters', 'pt', 'wd-Q6899893', 1), -- Mônica
  ('grumpy-or-hot-tempered-characters', 'pt', 'wd-Q5644130', 2), -- Don Ramón
  ('grumpy-or-hot-tempered-characters', 'pt', 'wd-Q1064404', 3), -- Lula Molusco
  -- liars-and-tricksters
  ('liars-and-tricksters', 'pt', 'wd-Q7159981', 1), -- Pedro Malasartes
  ('liars-and-tricksters', 'pt', 'wd-Q1760117', 2), -- Saci
  ('liars-and-tricksters', 'pt', 'wd-Q183102', 3), -- Pernalonga
  -- tv-series-characters
  ('tv-series-characters', 'pt', 'wd-Q10271128', 1), -- El Chavo
  ('tv-series-characters', 'pt', 'wd-Q5644130', 2), -- Don Ramón
  ('tv-series-characters', 'pt', 'wd-Q7421675', 3), -- Quico
  ('tv-series-characters', 'pt', 'wd-Q8345365', 4), -- Chilindrina
  -- coaches-and-trainers
  ('coaches-and-trainers', 'pt', 'wd-Q191634', 1), -- Felipão
  ('coaches-and-trainers', 'pt', 'wd-Q40652', 2), -- Tite
  ('coaches-and-trainers', 'pt', 'wd-Q311511', 3), -- Zagallo
  ('coaches-and-trainers', 'pt', 'wd-Q361252', 4), -- Telê Santana
  ('coaches-and-trainers', 'pt', 'wd-Q716465', 5), -- Bernardinho
  -- martial-artists
  ('martial-artists', 'pt', 'wd-Q356871', 1), -- Anderson Silva
  ('martial-artists', 'pt', 'wd-Q512119', 2), -- José Aldo
  ('martial-artists', 'pt', 'wd-Q4739716', 3), -- Amanda Nunes
  ('martial-artists', 'pt', 'wd-Q15987809', 4), -- Alex Pereira
  -- olympic-athletes
  ('olympic-athletes', 'pt', 'wd-Q10357885', 1), -- Rebeca Andrade
  ('olympic-athletes', 'pt', 'wd-Q64748123', 2), -- Rayssa Leal
  ('olympic-athletes', 'pt', 'wd-Q455738', 3), -- Giba
  -- race-car-drivers
  ('race-car-drivers', 'pt', 'wd-Q171346', 1), -- Nelson Piquet
  ('race-car-drivers', 'pt', 'wd-Q169846', 2), -- Rubens Barrichello
  ('race-car-drivers', 'pt', 'wd-Q172849', 3), -- Emerson Fittipaldi
  -- soccer-players
  ('soccer-players', 'pt', 'wd-Q529207', 1), -- Ronaldo
  ('soccer-players', 'pt', 'wd-Q39444', 2), -- Ronaldinho Gaúcho
  ('soccer-players', 'pt', 'wd-Q178649', 3), -- Romário
  ('soccer-players', 'pt', 'wd-Q28973866', 4), -- Vinícius Júnior
  ('soccer-players', 'pt', 'wd-Q47526', 5), -- Zico
  -- tennis-players
  ('tennis-players', 'pt', 'wd-Q190723', 1), -- Gustavo Kuerten
  ('tennis-players', 'pt', 'wd-Q116855500', 2), -- João Fonseca
  ('tennis-players', 'pt', 'wd-Q2380901', 3), -- Beatriz Haddad Maia
  -- famous-mexican-people-and-characters
  ('famous-mexican-people-and-characters', 'pt', 'wd-Q5644130', 1), -- Don Ramón
  ('famous-mexican-people-and-characters', 'pt', 'wd-Q555578', 2), -- Roberto Gómez y Bolaños
  ('famous-mexican-people-and-characters', 'pt', 'wd-Q7421675', 3), -- Quico
  ('famous-mexican-people-and-characters', 'pt', 'wd-Q8345365', 4), -- Chilindrina
  ('famous-mexican-people-and-characters', 'pt', 'wd-Q171235', 5) -- Thalía
on conflict do nothing;
