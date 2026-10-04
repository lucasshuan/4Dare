-- Starter characters for every theme (see migrations/0011_theme_starters.sql).
-- Curated by hand against the hosted library: famous in Portuguese, English and
-- Japanese, a clear fit, a picture whenever the library has one. Safe to run
-- again: it only inserts and never deletes or reorders what is there.
-- To add a theme, append its rows (position 1 and 2 are the clearest fits).

insert into public.theme_starters (theme_id, character_id, position) values
  -- animals
  ('a-character-and-their-pet', 'wd-Q1168491', 1), -- Charlie Brown
  ('a-character-and-their-pet', 'wd-Q11934', 2), -- Mickey Mouse
  ('a-character-and-their-pet', 'wd-Q2583524', 3), -- Dorothy Gale
  ('a-character-and-their-pet', 'wd-Q3244512', 4), -- Harry Potter
  ('a-character-and-their-pet', 'wd-Q277545', 5), -- Jon Arbuckle
  ('bears', 'wd-Q188574', 1), -- Winnie the Pooh
  ('bears', 'wd-Q632908', 2), -- Paddington Bear
  ('bears', 'wd-Q949916', 3), -- Yogi Bear
  ('bears', 'wd-Q1569886', 4), -- Care Bears
  ('bears', 'wd-Q1137445', 5), -- Rilakkuma
  ('big-cats', 'wd-Q1649583', 1), -- Simba
  ('big-cats', 'wd-Q15012089', 2), -- Pink Panther
  ('big-cats', 'wd-Q4446039', 3), -- Tigger
  ('big-cats', 'wd-Q1860030', 4), -- Bagheera
  ('big-cats', 'wd-Q762731', 5), -- Aslan
  ('birds', 'wd-Q6550', 1), -- Donald Duck
  ('birds', 'wd-Q623553', 2), -- Tweety
  ('birds', 'wd-Q741321', 3), -- Woody Woodpecker
  ('birds', 'wd-Q242562', 4), -- Big Bird
  ('birds', 'wd-Q1910444', 5), -- Chocobo
  ('cats', 'wd-Q1839152', 1), -- Tom Cat
  ('cats', 'wd-Q692603', 2), -- Felix the Cat
  ('cats', 'wd-Q10990037', 3), -- Sylvester
  ('cats', 'wd-Q934013', 4), -- Cheshire Cat
  ('cats', 'wd-Q191794', 5), -- Hello Kitty
  ('characters-turned-into-animals', 'wd-Q958289', 1), -- Tiana
  ('characters-turned-into-animals', 'wd-Q190082', 2), -- Arachne
  ('characters-turned-into-animals', 'wd-Q2559802', 3), -- Beast
  ('characters-turned-into-animals', 'wd-Q6502703', 4), -- Pinocchio
  ('characters-turned-into-animals', 'wd-Q713701', 5), -- Sirius Black
  ('characters-with-an-animal-in-their-name', 'wd-Q79037', 1), -- Spider-Man
  ('characters-with-an-animal-in-their-name', 'wd-Q2695156', 2), -- Batman
  ('characters-with-an-animal-in-their-name', 'wd-Q11934', 3), -- Mickey Mouse
  ('characters-with-an-animal-in-their-name', 'wd-Q741321', 4), -- Woody Woodpecker
  ('characters-with-an-animal-in-their-name', 'wd-Q10993', 5), -- Tiger Woods
  ('characters-with-an-animal-sidekick', 'wd-Q308950', 1), -- Ash Ketchum
  ('characters-with-an-animal-sidekick', 'wd-Q848673', 2), -- Shaggy Rogers
  ('characters-with-an-animal-sidekick', 'wd-Q52986', 3), -- Tintin
  ('characters-with-an-animal-sidekick', 'wd-Q4902053', 4), -- Rapunzel
  ('characters-with-an-animal-sidekick', 'al-6866', 5), -- Kiki
  ('dinosaurs', 'wd-Q14332', 1), -- Tyrannosaurus rex
  ('dinosaurs', 'wd-Q2152060', 2), -- Rex (Toy Story)
  ('dinosaurs', 'wd-Q214174', 3), -- Yoshi
  ('dinosaurs', 'wd-Q6567', 4), -- Godzilla
  ('dogs', 'wd-Q207369', 1), -- Snoopy
  ('dogs', 'wd-Q901323', 2), -- Scooby-Doo
  ('dogs', 'wd-Q108732', 3), -- Pluto
  ('dogs', 'wd-Q941640', 4), -- Lassie
  ('dogs', 'wd-Q1260264', 5), -- Droopy
  ('elephants', 'wd-Q132152', 1), -- Babar the Elephant
  ('elephants', 'wd-Q1579', 2), -- Ganesha
  ('famous-real-life-animals', 'wd-Q687727', 1), -- Sergeant Stubby
  ('famous-real-life-animals', 'wd-Q1144606', 2), -- Major General Sir Nils Olav III
  ('famous-real-life-animals', 'wd-Q1386318', 3), -- F. D. C. Willard
  ('farm-animals', 'wd-Q761417', 1), -- Clarabelle Cow
  ('farm-animals', 'wd-Q1339544', 2), -- Foghorn Leghorn
  ('farm-animals', 'wd-Q1063221', 3), -- Napoleon
  ('farm-animals', 'wd-Q2267970', 4), -- Miss Piggy
  ('farm-animals', 'wd-Q10288122', 5), -- Galinha Pintadinha
  ('foxes', 'wd-Q194135', 1), -- Miles "Tails" Prower
  ('foxes', 'wd-Q2081430', 2), -- Fox McCloud
  ('foxes', 'al-7407', 3), -- Kurama
  ('foxes', 'wd-Q692111', 4), -- kitsune
  ('foxes', 'al-130429', 5), -- Senko
  ('horses-and-ponies', 'wd-Q15141696', 1), -- Twilight Sparkle
  ('horses-and-ponies', 'wd-Q1918252', 2), -- Rocinante
  ('horses-and-ponies', 'wd-Q1051189', 3), -- Horace Horsecollar
  ('insects-and-spiders', 'wd-Q1028714', 1), -- Jiminy Cricket
  ('insects-and-spiders', 'wd-Q1423458', 2), -- Mothra
  ('insects-and-spiders', 'wd-Q1282345', 3), -- Caterpillar
  ('insects-and-spiders', 'al-122124', 4), -- Kumoko
  ('insects-and-spiders', 'wd-Q485953', 5), -- Ananse
  ('mascots', 'wd-Q7823740', 1), -- Tony the Tiger
  ('mascots', 'wd-Q131200', 2), -- Tux
  ('mascots', 'wd-Q3268297', 3), -- Leo the Lion
  ('mascots', 'wd-Q1156071', 4), -- Misha
  ('mascots', 'wd-Q1752846', 5), -- Nipper
  ('mice-and-rats', 'wd-Q11934', 1), -- Mickey Mouse
  ('mice-and-rats', 'wd-Q1962394', 2), -- Jerry
  ('mice-and-rats', 'wd-Q912984', 3), -- Speedy Gonzales
  ('mice-and-rats', 'wd-Q2032573', 4), -- Topo Gigio
  ('mice-and-rats', 'wd-Q2082114', 5), -- Splinter
  ('monkeys-and-apes', 'wd-Q216810', 1), -- King Kong
  ('monkeys-and-apes', 'wd-Q12389', 2), -- Donkey Kong
  ('monkeys-and-apes', 'wd-Q11773777', 3), -- Sun Wukong
  ('monkeys-and-apes', 'wd-Q3010400', 4), -- Caesar
  ('monkeys-and-apes', 'wd-Q188618', 5), -- Hanuman
  ('penguins', 'wd-Q131200', 1), -- Tux
  ('penguins', 'wd-Q764907', 2), -- Chilly Willy
  ('penguins', 'al-1892', 3), -- Pen Pen
  ('penguins', 'wd-Q1144606', 4), -- Major General Sir Nils Olav III
  ('pigs', 'wd-Q937186', 1), -- Porky Pig
  ('pigs', 'wd-Q836719', 2), -- Piglet
  ('pigs', 'wd-Q2267970', 3), -- Miss Piggy
  ('pigs', 'wd-Q1063221', 4), -- Napoleon
  ('pigs', 'wd-Q1148977', 5), -- Zhu Bajie
  ('rabbits', 'wd-Q183102', 1), -- Bugs Bunny
  ('rabbits', 'wd-Q178776', 2), -- White Rabbit
  ('rabbits', 'wd-Q1501505', 3), -- Miffy
  ('rabbits', 'wd-Q108636', 4), -- Easter Bunny
  ('rabbits', 'wd-Q3087423', 5), -- My Melody
  ('reptiles', 'wd-Q323934', 1), -- Leonardo
  ('reptiles', 'wd-Q275475', 2), -- Kaa
  ('reptiles', 'wd-Q3178753', 3), -- Charmander
  ('reptiles', 'wd-Q2291541', 4), -- Koopa Troopa
  ('reptiles', 'wd-Q687240', 5), -- Gamera
  ('talking-animals', 'wd-Q748427', 1), -- Donkey
  ('talking-animals', 'wd-Q877650', 2), -- Meowth
  ('talking-animals', 'wd-Q1107971', 3), -- Kermit the Frog
  ('talking-animals', 'wd-Q1069773', 4), -- José Carioca
  ('talking-animals', 'wd-Q191626', 5), -- Sonic the Hedgehog
  ('wolves', 'wd-Q2630940', 1), -- Akela
  ('wolves', 'al-7373', 2), -- Holo
  ('wolves', 'wd-Q716835', 3), -- Jacob Black
  ('wolves', 'wd-Q501667', 4), -- Lycaon
  -- anime
  ('anime-characters', 'wd-Q2142', 1), -- Goku
  ('anime-characters', 'wd-Q308950', 2), -- Ash Ketchum
  ('anime-characters', 'wd-Q757015', 3), -- Usagi Tsukino
  ('anime-characters', 'wd-Q1186309', 4), -- Doraemon
  ('anime-characters', 'wd-Q105037411', 5), -- Satoru Gojo
  ('dragon-ball-characters', 'wd-Q2142', 1), -- Goku
  ('dragon-ball-characters', 'wd-Q180916', 2), -- Vegeta
  ('dragon-ball-characters', 'wd-Q757313', 3), -- Frieza
  ('dragon-ball-characters', 'wd-Q151659', 4), -- Piccolo
  ('dragon-ball-characters', 'wd-Q1614785', 5), -- Bulma
  ('magical-girls', 'wd-Q757015', 1), -- Usagi Tsukino
  ('magical-girls', 'wd-Q2082802', 2), -- Sakura Kinomoto
  ('magical-girls', 'wd-Q11677249', 3), -- Madoka Kaname
  ('magical-girls', 'wd-Q840529', 4), -- Sailor Mars
  ('magical-girls', 'al-38005', 5), -- Homura Akemi
  ('manga-artists', 'wd-Q208582', 1), -- Akira Toriyama
  ('manga-artists', 'wd-Q193300', 2), -- Osamu Tezuka
  ('manga-artists', 'wd-Q2010', 3), -- Eiichiro Oda
  ('manga-artists', 'wd-Q219948', 4), -- Rumiko Takahashi
  ('manga-artists', 'wd-Q3782468', 5), -- Hajime Isayama
  ('manga-characters', 'wd-Q843545', 1), -- Light Yagami
  ('manga-characters', 'wd-Q18206694', 2), -- Eren Yeager
  ('manga-characters', 'wd-Q2305538', 3), -- Guts
  ('manga-characters', 'wd-Q987751', 4), -- Edward Elric
  ('manga-characters', 'wd-Q1036543', 5), -- Himura Kenshin
  ('naruto-characters', 'wd-Q931', 1), -- Naruto Uzumaki
  ('naruto-characters', 'wd-Q1740', 2), -- Sasuke Uchiha
  ('naruto-characters', 'wd-Q1767', 3), -- Kakashi Hatake
  ('naruto-characters', 'wd-Q203240', 4), -- Sakura Haruno
  ('naruto-characters', 'wd-Q1043344', 5), -- Itachi Uchiha
  ('one-piece-characters', 'wd-Q477948', 1), -- Monkey D. Luffy
  ('one-piece-characters', 'wd-Q858432', 2), -- Roronoa Zoro
  ('one-piece-characters', 'wd-Q877964', 3), -- Nami
  ('one-piece-characters', 'wd-Q1061765', 4), -- Sanji
  ('one-piece-characters', 'wd-Q1190653', 5), -- Nico Robin
  ('shonen-protagonists', 'wd-Q931', 1), -- Naruto Uzumaki
  ('shonen-protagonists', 'wd-Q477948', 2), -- Monkey D. Luffy
  ('shonen-protagonists', 'wd-Q2142', 3), -- Goku
  ('shonen-protagonists', 'wd-Q85805158', 4), -- Tanjirō Kamado
  ('shonen-protagonists', 'wd-Q719114', 5), -- Ichigo Kurosaki
  ('studio-ghibli-characters', 'al-269', 1), -- Totoro
  ('studio-ghibli-characters', 'al-384', 2), -- Chihiro Ogino
  ('studio-ghibli-characters', 'al-507', 3), -- Howl
  ('studio-ghibli-characters', 'al-6866', 4), -- Kiki
  ('studio-ghibli-characters', 'al-14286', 5), -- Ponyo
  ('tokusatsu-heroes', 'wd-Q11289254', 1), -- Ultraman Zero
  ('tokusatsu-heroes', 'wd-Q1988617', 2), -- Kamen Rider 1
  ('tokusatsu-heroes', 'wd-Q2706884', 3), -- Tommy Oliver
  -- books
  ('cartoonists', 'wd-Q43994', 1), -- Matt Groening
  ('cartoonists', 'wd-Q8704', 2), -- Walt Disney
  ('cartoonists', 'wd-Q657432', 3), -- Mauricio de Sousa
  ('cartoonists', 'wd-Q318750', 4), -- Stephen Hillenburg
  ('cartoonists', 'wd-Q181900', 5), -- Stan Lee
  ('characters-from-children-s-books', 'wd-Q188574', 1), -- Winnie the Pooh
  ('characters-from-children-s-books', 'wd-Q107190', 2), -- Peter Pan
  ('characters-from-children-s-books', 'wd-Q1269082', 3), -- Alice
  ('characters-from-children-s-books', 'wd-Q6668', 4), -- Pippi Longstocking
  ('characters-from-children-s-books', 'wd-Q1501505', 5), -- Miffy
  ('classic-literature-characters', 'wd-Q4653', 1), -- Sherlock Holmes
  ('classic-literature-characters', 'wd-Q3266236', 2), -- Count Dracula
  ('classic-literature-characters', 'wd-Q2021531', 3), -- Frankenstein's monster
  ('classic-literature-characters', 'wd-Q1046049', 4), -- Captain Nemo
  ('classic-literature-characters', 'wd-Q1750634', 5), -- Quasimodo
  ('fairy-tale-characters', 'wd-Q2739228', 1), -- Snow White
  ('fairy-tale-characters', 'wd-Q2559332', 2), -- Cinderella
  ('fairy-tale-characters', 'wd-Q6502703', 3), -- Pinocchio
  ('fairy-tale-characters', 'wd-Q2283527', 4), -- Puss in Boots
  ('fairy-tale-characters', 'wd-Q4902053', 5), -- Rapunzel
  ('poets', 'wd-Q1067', 1), -- Dante Alighieri
  ('poets', 'wd-Q692', 2), -- William Shakespeare
  ('poets', 'wd-Q34189', 3), -- Pablo Neruda
  ('poets', 'wd-Q5679', 4), -- Lord Byron
  ('poets', 'wd-Q5676', 5), -- Matsuo Bashō
  ('princes', 'wd-Q152316', 1), -- Prince Harry, Duke of Sussex
  ('princes', 'wd-Q180916', 2), -- Vegeta
  ('princes', 'wd-Q2447542', 3), -- Prince Hamlet
  ('princes', 'wd-Q80976', 4), -- Prince Philip, Duke of Edinburgh
  ('princes', 'wd-Q1649583', 5), -- Simba
  ('princesses', 'wd-Q51797', 1), -- Princess Leia
  ('princesses', 'wd-Q507001', 2), -- Princess Peach
  ('princesses', 'wd-Q892442', 3), -- Ariel
  ('princesses', 'wd-Q10479', 4), -- Catherine, Princess of Wales
  ('princesses', 'wd-Q52405', 5), -- Princess Fiona
  ('writers', 'wd-Q34660', 1), -- J. K. Rowling
  ('writers', 'wd-Q35064', 2), -- Agatha Christie
  ('writers', 'wd-Q892', 3), -- J. R. R. Tolkien
  ('writers', 'wd-Q39829', 4), -- Stephen King
  ('writers', 'wd-Q134798', 5), -- Haruki Murakami
  -- cartoons
  ('cartoon-network-characters', 'wd-Q2895569', 1), -- Ben Tennyson
  ('cartoon-network-characters', 'wd-Q5450693', 2), -- Finn the Human
  ('cartoon-network-characters', 'wd-Q19881126', 3), -- Steven Universe
  ('cartoon-network-characters', 'wd-Q3806262', 4), -- Jake the Dog
  ('cartoon-network-characters', 'wd-Q6756306', 5), -- Marceline the Vampire Queen
  ('characters-from-old-cartoons', 'wd-Q199796', 1), -- Popeye
  ('characters-from-old-cartoons', 'wd-Q583810', 2), -- Betty Boop
  ('characters-from-old-cartoons', 'wd-Q741321', 3), -- Woody Woodpecker
  ('characters-from-old-cartoons', 'wd-Q692603', 4), -- Felix the Cat
  ('characters-from-old-cartoons', 'wd-Q15012089', 5), -- Pink Panther
  ('characters-that-are-food', 'wd-Q20039752', 1), -- Gudetama
  ('characters-that-are-food', 'wd-Q5618186', 2), -- Gummibär
  ('characters-that-are-food', 'wd-Q783947', 3), -- Humpty Dumpty
  ('characters-that-are-food', 'wd-Q3039850', 4), -- Pillsbury Doughboy
  ('characters-that-are-food', 'wd-Q3922023', 5), -- Princess Bubblegum
  ('characters-that-are-vehicles', 'wd-Q864418', 1), -- Lightning McQueen
  ('characters-that-are-vehicles', 'wd-Q1088996', 2), -- KITT
  ('characters-that-are-vehicles', 'wd-Q2620474', 3), -- Herbie
  ('characters-that-are-vehicles', 'wd-Q6786487', 4), -- Mater
  ('characters-that-are-vehicles', 'wd-Q151583', 5), -- Optimus Prime
  ('children-s-cartoon-characters', 'wd-Q11934', 1), -- Mickey Mouse
  ('children-s-cartoon-characters', 'wd-Q188574', 2), -- Winnie the Pooh
  ('children-s-cartoon-characters', 'wd-Q1186309', 3), -- Doraemon
  ('children-s-cartoon-characters', 'wd-Q305405', 4), -- Smurfette
  ('children-s-cartoon-characters', 'wd-Q1501505', 5), -- Miffy
  ('christmas-characters', 'wd-Q315796', 1), -- Santa Claus
  ('christmas-characters', 'wd-Q719748', 2), -- Grinch
  ('christmas-characters', 'wd-Q965003', 3), -- Rudolph the Red-Nosed Reindeer
  ('christmas-characters', 'wd-Q626756', 4), -- Ebenezer Scrooge
  ('christmas-characters', 'wd-Q51671', 5), -- Biblical Magi
  ('cute-characters', 'wd-Q191794', 1), -- Hello Kitty
  ('cute-characters', 'wd-Q9351', 2), -- Pikachu
  ('cute-characters', 'wd-Q77001957', 3), -- Grogu
  ('cute-characters', 'al-269', 4), -- Totoro
  ('cute-characters', 'wd-Q207369', 5), -- Snoopy
  ('looney-tunes-characters', 'wd-Q183102', 1), -- Bugs Bunny
  ('looney-tunes-characters', 'wd-Q319918', 2), -- Daffy Duck
  ('looney-tunes-characters', 'wd-Q623553', 3), -- Tweety
  ('looney-tunes-characters', 'wd-Q10990037', 4), -- Sylvester
  ('looney-tunes-characters', 'wd-Q887525', 5), -- Tasmanian Devil
  ('nickelodeon-characters', 'wd-Q935079', 1), -- SpongeBob SquarePants
  ('nickelodeon-characters', 'wd-Q1640011', 2), -- Aang
  ('nickelodeon-characters', 'wd-Q1077456', 3), -- Patrick Star
  ('nickelodeon-characters', 'wd-Q1064404', 4), -- Squidward Tentacles
  ('nickelodeon-characters', 'wd-Q6200946', 5), -- Jimmy Neutron
  ('plant-characters', 'wd-Q3116935', 1), -- Groot
  ('plant-characters', 'wd-Q754477', 2), -- Treebeard
  ('plant-characters', 'wd-Q1427625', 3), -- Swamp Thing
  ('plant-characters', 'wd-Q6667893', 4), -- Ent
  ('plant-characters', 'wd-Q847571', 5), -- Bulbasaur
  ('puppet-characters', 'wd-Q1107971', 1), -- Kermit the Frog
  ('puppet-characters', 'wd-Q6502703', 2), -- Pinocchio
  ('puppet-characters', 'wd-Q2032573', 3), -- Topo Gigio
  ('puppet-characters', 'wd-Q762250', 4), -- Elmo
  ('puppet-characters', 'wd-Q2050852', 5), -- Billy
  ('round-shaped-characters', 'wd-Q613241', 1), -- Kirby
  ('round-shaped-characters', 'wd-Q2913000', 2), -- Pac-Man
  ('round-shaped-characters', 'wd-Q1753198', 3), -- Jigglypuff
  ('round-shaped-characters', 'wd-Q21541731', 4), -- BB-8
  ('round-shaped-characters', 'wd-Q783947', 5), -- Humpty Dumpty
  ('talking-objects', 'wd-Q1088996', 1), -- KITT
  ('talking-objects', 'wd-Q1986193', 2), -- Buzz Lightyear
  ('talking-objects', 'wd-Q833933', 3), -- HAL 9000
  ('talking-objects', 'wd-Q6502703', 4), -- Pinocchio
  ('talking-objects', 'wd-Q1042885', 5), -- Office Assistant
  ('the-simpsons-characters', 'wd-Q7810', 1), -- Homer Simpson
  ('the-simpsons-characters', 'wd-Q5480', 2), -- Bart Simpson
  ('the-simpsons-characters', 'wd-Q7828', 3), -- Marge Simpson
  ('the-simpsons-characters', 'wd-Q5846', 4), -- Lisa Simpson
  ('the-simpsons-characters', 'wd-Q716636', 5), -- Mr. Burns
  ('toy-characters', 'wd-Q2290907', 1), -- Woody
  ('toy-characters', 'wd-Q25097', 2), -- Chucky
  ('toy-characters', 'wd-Q18615088', 3), -- Annabelle
  ('toy-characters', 'wd-Q737939', 4), -- Ken Carson
  ('toy-characters', 'wd-Q2095216', 5), -- Raggedy Ann
  -- celebs
  ('actors', 'wd-Q37079', 1), -- Tom Cruise
  ('actors', 'wd-Q38111', 2), -- Leonardo DiCaprio
  ('actors', 'wd-Q35332', 3), -- Brad Pitt
  ('actors', 'wd-Q43416', 4), -- Keanu Reeves
  ('actors', 'wd-Q36970', 5), -- Jackie Chan
  ('actresses', 'wd-Q34436', 1), -- Scarlett Johansson
  ('actresses', 'wd-Q13909', 2), -- Angelina Jolie
  ('actresses', 'wd-Q39476', 3), -- Emma Watson
  ('actresses', 'wd-Q36301', 4), -- Anne Hathaway
  ('actresses', 'wd-Q873', 5), -- Meryl Streep
  ('celebrities-known-by-one-name', 'wd-Q1744', 1), -- Madonna
  ('celebrities-known-by-one-name', 'wd-Q12897', 2), -- Pelé
  ('celebrities-known-by-one-name', 'wd-Q36153', 3), -- Beyoncé
  ('celebrities-known-by-one-name', 'wd-Q34424', 4), -- Shakira
  ('celebrities-known-by-one-name', 'wd-Q189489', 5), -- Zendaya
  ('characters-who-became-memes', 'wd-Q21994166', 1), -- Pepe the Frog
  ('characters-who-became-memes', 'wd-Q1107971', 2), -- Kermit the Frog
  ('characters-who-became-memes', 'wd-Q935079', 3), -- SpongeBob SquarePants
  ('characters-who-became-memes', 'wd-Q149', 4), -- Nyan Cat
  ('characters-who-became-memes', 'wd-Q219504', 5), -- Boromir
  ('child-actors', 'wd-Q103578', 1), -- Macaulay Culkin
  ('child-actors', 'wd-Q182580', 2), -- Shirley Temple
  ('child-actors', 'wd-Q25936414', 3), -- Millie Bobby Brown
  ('child-actors', 'wd-Q115541', 4), -- Dakota Fanning
  ('child-actors', 'wd-Q489856', 5), -- Haley Joel Osment
  ('classic-hollywood-stars', 'wd-Q4616', 1), -- Marilyn Monroe
  ('classic-hollywood-stars', 'wd-Q42786', 2), -- Audrey Hepburn
  ('classic-hollywood-stars', 'wd-Q882', 3), -- Charlie Chaplin
  ('classic-hollywood-stars', 'wd-Q83359', 4), -- James Dean
  ('classic-hollywood-stars', 'wd-Q34012', 5), -- Marlon Brando
  ('comedians', 'wd-Q23760', 1), -- Rowan Atkinson
  ('comedians', 'wd-Q40504', 2), -- Jim Carrey
  ('comedians', 'wd-Q83338', 3), -- Robin Williams
  ('comedians', 'wd-Q43874', 4), -- Eddie Murphy
  ('comedians', 'wd-Q26372', 5), -- Takeshi Kitano
  ('comedy-groups', 'wd-Q16402', 1), -- Monty Python
  ('comedy-groups', 'wd-Q64450', 2), -- Marx Brothers
  ('comedy-groups', 'wd-Q1014432', 3), -- The Drifters
  ('comedy-groups', 'wd-Q2740228', 4), -- Mamonas Assassinas
  ('famous-people-from-the-2000s', 'wd-Q11975', 1), -- Britney Spears
  ('famous-people-from-the-2000s', 'wd-Q47899', 2), -- Paris Hilton
  ('famous-people-from-the-2000s', 'wd-Q30449', 3), -- Avril Lavigne
  ('famous-people-from-the-2000s', 'wd-Q39444', 4), -- Ronaldinho
  ('famous-people-from-the-2000s', 'wd-Q15897', 5), -- Amy Winehouse
  ('famous-people-from-the-60s', 'wd-Q1299', 1), -- The Beatles
  ('famous-people-from-the-60s', 'wd-Q9696', 2), -- John F. Kennedy
  ('famous-people-from-the-60s', 'wd-Q1615', 3), -- Neil Armstrong
  ('famous-people-from-the-60s', 'wd-Q8027', 4), -- Martin Luther King Jr.
  ('famous-people-from-the-60s', 'wd-Q5928', 5), -- Jimi Hendrix
  ('famous-people-from-the-70s', 'wd-Q16397', 1), -- Bruce Lee
  ('famous-people-from-the-70s', 'wd-Q80938', 2), -- John Travolta
  ('famous-people-from-the-70s', 'wd-Q409', 3), -- Bob Marley
  ('famous-people-from-the-70s', 'wd-Q36107', 4), -- Muhammad Ali
  ('famous-people-from-the-70s', 'wd-Q5383', 5), -- David Bowie
  ('famous-people-from-the-80s', 'wd-Q2831', 1), -- Michael Jackson
  ('famous-people-from-the-80s', 'wd-Q1744', 2), -- Madonna
  ('famous-people-from-the-80s', 'wd-Q10490', 3), -- Ayrton Senna
  ('famous-people-from-the-80s', 'wd-Q1545', 4), -- Cyndi Lauper
  ('famous-people-from-the-80s', 'wd-Q2685', 5), -- Arnold Schwarzenegger
  ('famous-people-from-the-90s', 'wd-Q8446', 1), -- Kurt Cobain
  ('famous-people-from-the-90s', 'wd-Q41421', 2), -- Michael Jordan
  ('famous-people-from-the-90s', 'wd-Q55641', 3), -- Spice Girls
  ('famous-people-from-the-90s', 'wd-Q6107', 4), -- Tupac Shakur
  ('famous-people-from-the-90s', 'wd-Q83325', 5), -- Pamela Anderson
  ('fashion-designers', 'wd-Q45661', 1), -- Coco Chanel
  ('fashion-designers', 'wd-Q159694', 2), -- Christian Dior
  ('fashion-designers', 'wd-Q171556', 3), -- Yves Saint Laurent
  ('fashion-designers', 'wd-Q264490', 4), -- Gianni Versace
  ('fashion-designers', 'wd-Q296647', 5), -- Ralph Lauren
  ('magicians-and-illusionists', 'wd-Q131545', 1), -- Harry Houdini
  ('magicians-and-illusionists', 'wd-Q139637', 2), -- David Copperfield
  ('magicians-and-illusionists', 'wd-Q860922', 3), -- Zatanna
  ('magicians-and-illusionists', 'wd-Q59694', 4), -- Mandrake the Magician
  ('magicians-and-illusionists', 'wd-Q1332798', 5), -- Kaito Kuroba
  ('models', 'wd-Q152208', 1), -- Gisele Bündchen
  ('models', 'wd-Q199369', 2), -- Naomi Campbell
  ('models', 'wd-Q1375057', 3), -- Kendall Jenner
  ('models', 'wd-Q212531', 4), -- Kate Moss
  ('models', 'wd-Q151866', 5), -- Adriana Lima
  ('movie-directors', 'wd-Q8877', 1), -- Steven Spielberg
  ('movie-directors', 'wd-Q3772', 2), -- Quentin Tarantino
  ('movie-directors', 'wd-Q25191', 3), -- Christopher Nolan
  ('movie-directors', 'wd-Q7374', 4), -- Alfred Hitchcock
  ('movie-directors', 'wd-Q55400', 5), -- Hayao Miyazaki
  ('real-people-with-a-biopic', 'wd-Q15869', 1), -- Freddie Mercury
  ('real-people-with-a-biopic', 'wd-Q132537', 2), -- J. Robert Oppenheimer
  ('real-people-with-a-biopic', 'wd-Q1001', 3), -- Mahatma Gandhi
  ('real-people-with-a-biopic', 'wd-Q19837', 4), -- Steve Jobs
  ('real-people-with-a-biopic', 'wd-Q303', 5), -- Elvis Presley
  ('tv-hosts', 'wd-Q55800', 1), -- Oprah Winfrey
  ('tv-hosts', 'wd-Q335680', 2), -- Jimmy Fallon
  ('tv-hosts', 'wd-Q1395208', 3), -- Silvio Santos
  ('tv-hosts', 'wd-Q483325', 4), -- Ellen DeGeneres
  ('tv-hosts', 'wd-Q466963', 5), -- Tetsuko Kuroyanagi
  ('youtubers-and-streamers', 'wd-Q57618112', 1), -- MrBeast
  ('youtubers-and-streamers', 'wd-Q114834007', 2), -- IShowSpeed
  ('youtubers-and-streamers', 'wd-Q13423853', 3), -- PewDiePie
  ('youtubers-and-streamers', 'wd-Q11222605', 4), -- Hikakin
  ('youtubers-and-streamers', 'wd-Q10281000', 5), -- Felipe Neto
  -- family
  ('baby-characters', 'wd-Q7834', 1), -- Maggie Simpson
  ('baby-characters', 'wd-Q77001957', 2), -- Grogu
  ('baby-characters', 'wd-Q837909', 3), -- Stewie Griffin
  ('baby-characters', 'wd-Q249081', 4), -- Roo
  ('characters-in-a-love-triangle', 'wd-Q223757', 1), -- Bella Swan
  ('characters-in-a-love-triangle', 'wd-Q2531690', 2), -- Olive Oyl
  ('characters-in-a-love-triangle', 'wd-Q2071301', 3), -- Katniss Everdeen
  ('characters-in-a-love-triangle', 'wd-Q272054', 4), -- Guinevere
  ('characters-in-a-love-triangle', 'wd-Q2860154', 5), -- Archie Andrews
  ('characters-over-100-years-old', 'wd-Q51730', 1), -- Yoda
  ('characters-over-100-years-old', 'wd-Q3266236', 2), -- Count Dracula
  ('characters-over-100-years-old', 'wd-Q177499', 3), -- Gandalf
  ('characters-over-100-years-old', 'wd-Q104144455', 4), -- Frieren
  ('characters-over-100-years-old', 'wd-Q717588', 5), -- Thor
  ('characters-with-a-famous-sibling', 'wd-Q210593', 1), -- Luigi
  ('characters-with-a-famous-sibling', 'wd-Q15614636', 2), -- Anna
  ('characters-with-a-famous-sibling', 'wd-Q1147326', 3), -- Loki
  ('characters-with-a-famous-sibling', 'wd-Q1740', 4), -- Sasuke Uchiha
  ('characters-with-a-famous-sibling', 'wd-Q11459', 5), -- Serena Williams
  ('child-characters', 'wd-Q5480', 1), -- Bart Simpson
  ('child-characters', 'wd-Q1168491', 2), -- Charlie Brown
  ('child-characters', 'wd-Q6899893', 3), -- Monica
  ('child-characters', 'al-138100', 4), -- Anya Forger
  ('child-characters', 'wd-Q6668', 5), -- Pippi Longstocking
  ('children-of-famous-parents', 'wd-Q51746', 1), -- Luke Skywalker
  ('children-of-famous-parents', 'wd-Q20426404', 2), -- Boruto Uzumaki
  ('children-of-famous-parents', 'wd-Q237324', 3), -- Lisa Marie Presley
  ('children-of-famous-parents', 'wd-Q221364', 4), -- Jaden Smith
  ('children-of-famous-parents', 'wd-Q752269', 5), -- Gohan
  ('elderly-characters', 'wd-Q842104', 1), -- Grampa Simpson
  ('elderly-characters', 'wd-Q712548', 2), -- Albus Dumbledore
  ('elderly-characters', 'wd-Q1752065', 3), -- Master Roshi
  ('elderly-characters', 'wd-Q315796', 4), -- Santa Claus
  ('elderly-characters', 'wd-Q1809674', 5), -- Granny
  ('famous-couples', 'wd-Q83186', 1), -- Romeo and Juliet
  ('famous-couples', 'wd-Q58701', 2), -- Adam and Eve
  ('famous-couples', 'wd-Q7103994', 3), -- Orpheus and Eurydice
  ('famous-couples', 'wd-Q2521223', 4), -- Jonathan and Martha Kent
  ('famous-couples', 'wd-Q1255696', 5), -- Tommy and Tuppence
  ('famous-dads', 'wd-Q7810', 1), -- Homer Simpson
  ('famous-dads', 'wd-Q12206942', 2), -- Darth Vader
  ('famous-dads', 'wd-Q2287748', 3), -- Mufasa
  ('famous-dads', 'wd-Q2142', 4), -- Goku
  ('famous-dads', 'wd-Q616658', 5), -- Mr. Incredible
  ('famous-duos', 'wd-Q403138', 1), -- Chip 'n' Dale
  ('famous-duos', 'wd-Q1073705', 2), -- Timon and Pumbaa
  ('famous-duos', 'wd-Q484918', 3), -- Simon & Garfunkel
  ('famous-duos', 'wd-Q185828', 4), -- Daft Punk
  ('famous-duos', 'wd-Q2371967', 5), -- Bert and Ernie
  ('famous-families', 'wd-Q3817916', 1), -- The Addams Family
  ('famous-families', 'wd-Q9762', 2), -- Simpson family
  ('famous-families', 'wd-Q54311', 3), -- Skywalker family
  ('famous-families', 'wd-Q977528', 4), -- Duck family
  ('famous-families', 'wd-Q43267', 5), -- The Jackson 5
  ('famous-moms', 'wd-Q7828', 1), -- Marge Simpson
  ('famous-moms', 'wd-Q3134305', 2), -- Elastigirl
  ('famous-moms', 'wd-Q500727', 3), -- Morticia Addams
  ('famous-moms', 'al-138102', 4), -- Yor Forger
  ('famous-moms', 'wd-Q345', 5), -- Mary
  ('famous-trios', 'wd-Q11965', 1), -- Huey, Dewey, and Louie
  ('famous-trios', 'wd-Q51671', 2), -- Biblical Magi
  ('famous-trios', 'wd-Q917295', 3), -- Alvin and the Chipmunks
  ('famous-trios', 'wd-Q133405', 4), -- Bee Gees
  ('famous-trios', 'wd-Q153056', 5), -- Destiny's Child
  ('groups-of-friends', 'wd-Q639184', 1), -- Seven Dwarfs
  ('groups-of-friends', 'wd-Q927354', 2), -- Teen Titans
  ('groups-of-friends', 'wd-Q1953422', 3), -- The Muppets
  ('groups-of-friends', 'wd-Q1569886', 4), -- Care Bears
  ('groups-of-friends', 'wd-Q512836', 5), -- The Archies
  ('half-of-a-famous-couple', 'wd-Q673361', 1), -- Romeo
  ('half-of-a-famous-couple', 'wd-Q11936', 2), -- Minnie Mouse
  ('half-of-a-famous-couple', 'wd-Q117012', 3), -- Yoko Ono
  ('half-of-a-famous-couple', 'wd-Q845922', 4), -- Lois Lane
  ('half-of-a-famous-couple', 'wd-Q737939', 5), -- Ken Carson
  ('half-of-a-famous-duo', 'wd-Q59996', 1), -- Robin
  ('half-of-a-famous-duo', 'wd-Q187349', 2), -- Dr. Watson
  ('half-of-a-famous-duo', 'wd-Q1962394', 3), -- Jerry
  ('half-of-a-famous-duo', 'wd-Q630823', 4), -- Sancho Panza
  ('half-of-a-famous-duo', 'wd-Q51787', 5), -- C-3PO
  ('high-school-students', 'wd-Q23991129', 1), -- Peter Parker
  ('high-school-students', 'al-89028', 2), -- Izuku Midoriya
  ('high-school-students', 'wd-Q94578998', 3), -- Kaguya Shinomiya
  ('high-school-students', 'al-310', 4), -- Hanamichi Sakuragi
  ('high-school-students', 'wd-Q2860154', 5), -- Archie Andrews
  ('members-of-a-famous-family', 'wd-Q2575084', 1), -- Wednesday Addams
  ('members-of-a-famous-family', 'wd-Q173998', 2), -- Ron Weasley
  ('members-of-a-famous-family', 'wd-Q5846', 3), -- Lisa Simpson
  ('members-of-a-famous-family', 'wd-Q186304', 4), -- Kim Kardashian
  ('members-of-a-famous-family', 'wd-Q835154', 5), -- Michael Corleone
  ('members-of-a-famous-team', 'wd-Q190679', 1), -- Captain America
  ('members-of-a-famous-team', 'wd-Q338430', 2), -- Wonder Woman
  ('members-of-a-famous-team', 'wd-Q323934', 3), -- Leonardo
  ('members-of-a-famous-team', 'wd-Q41421', 4), -- Michael Jordan
  ('members-of-a-famous-team', 'wd-Q1767', 5), -- Kakashi Hatake
  ('orphans', 'wd-Q3244512', 1), -- Harry Potter
  ('orphans', 'wd-Q2695156', 2), -- Batman
  ('orphans', 'wd-Q931', 3), -- Naruto Uzumaki
  ('orphans', 'wd-Q170241', 4), -- Tarzan
  ('orphans', 'wd-Q771213', 5), -- Anne Shirley
  ('siblings-who-come-as-a-set', 'wd-Q11965', 1), -- Huey, Dewey, and Louie
  ('siblings-who-come-as-a-set', 'wd-Q134233', 2), -- Jonas Brothers
  ('siblings-who-come-as-a-set', 'wd-Q1798441', 3), -- Beagle Boys
  ('siblings-who-come-as-a-set', 'wd-Q223495', 4), -- The Carpenters
  ('siblings-who-come-as-a-set', 'wd-Q717996', 5), -- Cain and Abel
  ('twins', 'wd-Q1251049', 1), -- Fred and George Weasley
  ('twins', 'wd-Q2454190', 2), -- Tweedledum and Tweedledee
  ('twins', 'wd-Q51797', 3), -- Princess Leia
  ('twins', 'wd-Q190103', 4), -- Castor and Pollux
  ('twins', 'wd-Q28859527', 5), -- Rem
  -- games
  ('fighting-game-characters', 'wd-Q1223440', 1), -- Ryu
  ('fighting-game-characters', 'wd-Q584674', 2), -- Scorpion
  ('fighting-game-characters', 'wd-Q6575302', 3), -- Jin Kazama
  ('fighting-game-characters', 'wd-Q1317441', 4), -- Mai Shiranui
  ('fighting-game-characters', 'wd-Q2713943', 5), -- Morrigan Aensland
  ('nintendo-characters', 'wd-Q12379', 1), -- Mario
  ('nintendo-characters', 'wd-Q568553', 2), -- Link
  ('nintendo-characters', 'wd-Q12389', 3), -- Donkey Kong
  ('nintendo-characters', 'wd-Q613241', 4), -- Kirby
  ('nintendo-characters', 'wd-Q12400', 5), -- Samus Aran
  ('poke-mon', 'wd-Q9351', 1), -- Pikachu
  ('poke-mon', 'wd-Q844940', 2), -- Charizard
  ('poke-mon', 'wd-Q847571', 3), -- Bulbasaur
  ('poke-mon', 'wd-Q2141803', 4), -- Mewtwo
  ('poke-mon', 'wd-Q1263559', 5), -- Eevee
  ('retro-game-characters', 'wd-Q2913000', 1), -- Pac-Man
  ('retro-game-characters', 'wd-Q12389', 2), -- Donkey Kong
  ('retro-game-characters', 'wd-Q191626', 3), -- Sonic the Hedgehog
  ('retro-game-characters', 'wd-Q3174269', 4), -- Mega Man
  ('retro-game-characters', 'wd-Q12400', 5), -- Samus Aran
  ('video-game-characters', 'wd-Q12379', 1), -- Mario
  ('video-game-characters', 'wd-Q191626', 2), -- Sonic the Hedgehog
  ('video-game-characters', 'wd-Q223684', 3), -- Lara Croft
  ('video-game-characters', 'wd-Q104901351', 4), -- Steve
  ('video-game-characters', 'wd-Q1621656', 5), -- Solid Snake
  ('video-game-species', 'wd-Q1057701', 1), -- Goomba
  ('video-game-species', 'wd-Q9351', 2), -- Pikachu
  ('video-game-species', 'wd-Q13164404', 3), -- Creeper
  ('video-game-species', 'wd-Q1910444', 4), -- Chocobo
  -- heroes
  ('antiheroes', 'wd-Q1631090', 1), -- Deadpool
  ('antiheroes', 'wd-Q729150', 2), -- Punisher
  ('antiheroes', 'wd-Q202857', 3), -- Captain Jack Sparrow
  ('antiheroes', 'wd-Q1621261', 4), -- Venom
  ('antiheroes', 'wd-Q2305538', 5), -- Guts
  ('bullies', 'wd-Q179641', 1), -- Draco Malfoy
  ('bullies', 'wd-Q2537674', 2), -- Biff Tannen
  ('bullies', 'wd-Q1511163', 3), -- Nelson Muntz
  ('bullies', 'wd-Q552000', 4), -- Flash Thompson
  ('bullies', 'al-88892', 5), -- Katsuki Bakugou
  ('characters-who-betrayed-someone', 'wd-Q81018', 1), -- Judas Iscariot
  ('characters-who-betrayed-someone', 'wd-Q172248', 2), -- Marcus Junius Brutus
  ('characters-who-betrayed-someone', 'wd-Q1977325', 3), -- Scar
  ('characters-who-betrayed-someone', 'wd-Q1147326', 4), -- Loki
  ('characters-who-betrayed-someone', 'wd-Q216489', 5), -- Saruman
  ('characters-who-want-to-rule-the-world', 'wd-Q1996763', 1), -- Dr. Eggman
  ('characters-who-want-to-rule-the-world', 'wd-Q430178', 2), -- Doctor Doom
  ('characters-who-want-to-rule-the-world', 'wd-Q2281', 3), -- Sauron
  ('characters-who-want-to-rule-the-world', 'wd-Q51770', 4), -- Palpatine
  ('characters-who-want-to-rule-the-world', 'wd-Q843545', 5), -- Light Yagami
  ('characters-with-a-famous-rival', 'wd-Q2142', 1), -- Goku
  ('characters-with-a-famous-rival', 'wd-Q1839152', 2), -- Tom Cat
  ('characters-with-a-famous-rival', 'wd-Q4653', 3), -- Sherlock Holmes
  ('characters-with-a-famous-rival', 'wd-Q931', 4), -- Naruto Uzumaki
  ('characters-with-a-famous-rival', 'wd-Q2695156', 5), -- Batman
  ('characters-with-a-secret-identity', 'wd-Q79037', 1), -- Spider-Man
  ('characters-with-a-secret-identity', 'wd-Q79015', 2), -- Superman
  ('characters-with-a-secret-identity', 'wd-Q226822', 3), -- Zorro
  ('characters-with-a-secret-identity', 'wd-Q757015', 4), -- Usagi Tsukino
  ('characters-with-a-secret-identity', 'wd-Q844697', 5), -- Shinichi Kudo
  ('chosen-ones', 'wd-Q3244512', 1), -- Harry Potter
  ('chosen-ones', 'wd-Q247120', 2), -- Neo
  ('chosen-ones', 'wd-Q45792', 3), -- King Arthur
  ('chosen-ones', 'wd-Q51752', 4), -- Anakin Skywalker
  ('chosen-ones', 'wd-Q1640011', 5), -- Aang
  ('comic-book-characters', 'wd-Q79037', 1), -- Spider-Man
  ('comic-book-characters', 'wd-Q2695156', 2), -- Batman
  ('comic-book-characters', 'wd-Q186422', 3), -- Wolverine
  ('comic-book-characters', 'wd-Q188760', 4), -- Hulk
  ('comic-book-characters', 'wd-Q338430', 5), -- Wonder Woman
  ('comic-relief-characters', 'wd-Q16253807', 1), -- Olaf
  ('comic-relief-characters', 'wd-Q748427', 2), -- Donkey
  ('comic-relief-characters', 'wd-Q51793', 3), -- Jar Jar Binks
  ('comic-relief-characters', 'wd-Q1078696', 4), -- Usopp
  ('comic-relief-characters', 'al-129131', 5), -- Zenitsu Agatsuma
  ('female-superheroes', 'wd-Q338430', 1), -- Wonder Woman
  ('female-superheroes', 'wd-Q929285', 2), -- Scarlet Witch
  ('female-superheroes', 'wd-Q369197', 3), -- Black Widow
  ('female-superheroes', 'wd-Q632212', 4), -- Storm
  ('female-superheroes', 'wd-Q8981293', 5), -- Supergirl
  ('female-villains', 'wd-Q388605', 1), -- Cruella de Vil
  ('female-villains', 'wd-Q1660555', 2), -- Maleficent
  ('female-villains', 'wd-Q375671', 3), -- Poison Ivy
  ('female-villains', 'wd-Q252044', 4), -- The Evil Queen
  ('female-villains', 'wd-Q1057918', 5), -- Bellatrix Lestrange
  ('hero-and-sidekick', 'wd-Q2695156', 1), -- Batman
  ('hero-and-sidekick', 'wd-Q187349', 2), -- Dr. Watson
  ('hero-and-sidekick', 'wd-Q9351', 3), -- Pikachu
  ('hero-and-sidekick', 'wd-Q191626', 4), -- Sonic the Hedgehog
  ('hero-and-sidekick', 'wd-Q52401', 5), -- Shrek
  ('hero-teams', 'wd-Q322646', 1), -- Avengers
  ('hero-teams', 'wd-Q735744', 2), -- Justice League
  ('hero-teams', 'wd-Q128452', 3), -- X-Men
  ('hero-teams', 'wd-Q152098', 4), -- The Fantastic Four
  ('hero-teams', 'wd-Q1381762', 5), -- Teenage Mutant Ninja Turtles
  ('heroes-without-superpowers', 'wd-Q2695156', 1), -- Batman
  ('heroes-without-superpowers', 'wd-Q19095', 2), -- Hawkeye
  ('heroes-without-superpowers', 'wd-Q226822', 3), -- Zorro
  ('heroes-without-superpowers', 'wd-Q122634', 4), -- Robin Hood
  ('heroes-without-superpowers', 'wd-Q148659', 5), -- Indiana Jones
  ('mad-scientists', 'wd-Q2337004', 1), -- Emmett Brown
  ('mad-scientists', 'wd-Q2320164', 2), -- Victor Frankenstein
  ('mad-scientists', 'wd-Q24207815', 3), -- Rick Sanchez
  ('mad-scientists', 'wd-Q578094', 4), -- Doctor Octopus
  ('mad-scientists', 'al-35252', 5), -- Rintarou Okabe
  ('main-characters', 'wd-Q12379', 1), -- Mario
  ('main-characters', 'wd-Q51746', 2), -- Luke Skywalker
  ('main-characters', 'wd-Q477948', 3), -- Monkey D. Luffy
  ('main-characters', 'wd-Q308950', 4), -- Ash Ketchum
  ('main-characters', 'wd-Q177329', 5), -- Frodo Baggins
  ('mentors', 'wd-Q51730', 1), -- Yoda
  ('mentors', 'wd-Q712548', 2), -- Albus Dumbledore
  ('mentors', 'wd-Q6383900', 3), -- Mr. Miyagi
  ('mentors', 'wd-Q1752065', 4), -- Master Roshi
  ('mentors', 'wd-Q2082114', 5), -- Splinter
  ('sidekicks', 'wd-Q59996', 1), -- Robin
  ('sidekicks', 'wd-Q187349', 2), -- Dr. Watson
  ('sidekicks', 'wd-Q173998', 3), -- Ron Weasley
  ('sidekicks', 'wd-Q51803', 4), -- Chewbacca
  ('sidekicks', 'wd-Q630823', 5), -- Sancho Panza
  ('superheroes', 'wd-Q79015', 1), -- Superman
  ('superheroes', 'wd-Q79037', 2), -- Spider-Man
  ('superheroes', 'wd-Q2695156', 3), -- Batman
  ('superheroes', 'wd-Q180704', 4), -- Iron Man
  ('superheroes', 'wd-Q62397809', 5), -- Saitama
  ('villain-gangs', 'wd-Q2082275', 1), -- Sinister Six
  ('villain-gangs', 'wd-Q1798441', 2), -- Beagle Boys
  ('villain-gangs', 'wd-Q181291', 3), -- Death Eater
  ('villain-gangs', 'wd-Q3052324', 4), -- Hydra
  ('villain-gangs', 'wd-Q2791993', 5), -- Legion of Doom
  ('villains', 'wd-Q12206942', 1), -- Darth Vader
  ('villains', 'wd-Q217533', 2), -- The Joker
  ('villains', 'wd-Q176132', 3), -- Lord Voldemort
  ('villains', 'wd-Q2276627', 4), -- Thanos
  ('villains', 'wd-Q757313', 5), -- Frieza
  ('villains-henchmen', 'wd-Q15736052', 1), -- Minions
  ('villains-henchmen', 'wd-Q51785', 2), -- stormtrooper
  ('villains-henchmen', 'wd-Q1057701', 3), -- Goomba
  ('villains-henchmen', 'wd-Q4396920', 4), -- Bebop and Rocksteady
  ('villains-henchmen', 'wd-Q849477', 5), -- Harley Quinn
  ('villains-who-became-good', 'wd-Q180916', 1), -- Vegeta
  ('villains-who-became-good', 'wd-Q10291638', 2), -- Gru
  ('villains-who-became-good', 'wd-Q719748', 3), -- Grinch
  ('villains-who-became-good', 'wd-Q1997841', 4), -- Zuko
  ('villains-who-became-good', 'wd-Q221196', 5), -- Gaara
  -- history
  ('ancient-history-figures', 'wd-Q1048', 1), -- Julius Caesar
  ('ancient-history-figures', 'wd-Q635', 2), -- Cleopatra
  ('ancient-history-figures', 'wd-Q8409', 3), -- Alexander the Great
  ('ancient-history-figures', 'wd-Q12154', 4), -- Tutankhamun
  ('ancient-history-figures', 'wd-Q4604', 5), -- Confucius
  ('business-people', 'wd-Q19837', 1), -- Steve Jobs
  ('business-people', 'wd-Q5284', 2), -- Bill Gates
  ('business-people', 'wd-Q317521', 3), -- Elon Musk
  ('business-people', 'wd-Q36215', 4), -- Mark Zuckerberg
  ('business-people', 'wd-Q47213', 5), -- Warren Buffett
  ('explorers-and-adventurers', 'wd-Q7322', 1), -- Christopher Columbus
  ('explorers-and-adventurers', 'wd-Q6101', 2), -- Marco Polo
  ('explorers-and-adventurers', 'wd-Q1496', 3), -- Ferdinand Magellan
  ('explorers-and-adventurers', 'wd-Q7328', 4), -- Vasco da Gama
  ('explorers-and-adventurers', 'wd-Q3355', 5), -- Amelia Earhart
  ('historical-figures', 'wd-Q517', 1), -- Napoleon
  ('historical-figures', 'wd-Q635', 2), -- Cleopatra
  ('historical-figures', 'wd-Q1001', 3), -- Mahatma Gandhi
  ('historical-figures', 'wd-Q7226', 4), -- Joan of Arc
  ('historical-figures', 'wd-Q91', 5), -- Abraham Lincoln
  ('inventors', 'wd-Q8743', 1), -- Thomas Edison
  ('inventors', 'wd-Q9036', 2), -- Nikola Tesla
  ('inventors', 'wd-Q34286', 3), -- Alexander Graham Bell
  ('inventors', 'wd-Q762', 4), -- Leonardo da Vinci
  ('inventors', 'wd-Q8958', 5), -- Johannes Gutenberg
  ('kings', 'wd-Q45792', 1), -- King Arthur
  ('kings', 'wd-Q43274', 2), -- Charles III
  ('kings', 'wd-Q7742', 3), -- Louis XIV of France
  ('kings', 'wd-Q38370', 4), -- Henry VIII of England
  ('kings', 'wd-Q37085', 5), -- Solomon
  ('military-leaders', 'wd-Q517', 1), -- Napoleon
  ('military-leaders', 'wd-Q720', 2), -- Genghis Khan
  ('military-leaders', 'wd-Q8409', 3), -- Alexander the Great
  ('military-leaders', 'wd-Q1048', 4), -- Julius Caesar
  ('military-leaders', 'wd-Q36456', 5), -- Hannibal
  ('painters', 'wd-Q5582', 1), -- Vincent van Gogh
  ('painters', 'wd-Q5593', 2), -- Pablo Picasso
  ('painters', 'wd-Q762', 3), -- Leonardo da Vinci
  ('painters', 'wd-Q5588', 4), -- Frida Kahlo
  ('painters', 'wd-Q5577', 5), -- Salvador Dalí
  ('philosophers', 'wd-Q913', 1), -- Socrates
  ('philosophers', 'wd-Q868', 2), -- Aristotle
  ('philosophers', 'wd-Q4604', 3), -- Confucius
  ('philosophers', 'wd-Q9358', 4), -- Friedrich Nietzsche
  ('philosophers', 'wd-Q9191', 5), -- René Descartes
  ('politicians', 'wd-Q8016', 1), -- Winston Churchill
  ('politicians', 'wd-Q76', 2), -- Barack Obama
  ('politicians', 'wd-Q7416', 3), -- Margaret Thatcher
  ('politicians', 'wd-Q7747', 4), -- Vladimir Putin
  ('politicians', 'wd-Q567', 5), -- Angela Merkel
  ('presidents', 'wd-Q91', 1), -- Abraham Lincoln
  ('presidents', 'wd-Q9696', 2), -- John F. Kennedy
  ('presidents', 'wd-Q23', 3), -- George Washington
  ('presidents', 'wd-Q22686', 4), -- Donald Trump
  ('presidents', 'wd-Q37181', 5), -- Luiz Inácio Lula da Silva
  ('queens', 'wd-Q9682', 1), -- Elizabeth II
  ('queens', 'wd-Q635', 2), -- Cleopatra
  ('queens', 'wd-Q9439', 3), -- Victoria
  ('queens', 'wd-Q159888', 4), -- Queen of Sheba
  ('queens', 'wd-Q45859', 5), -- Isabella I of Castile
  ('revolutionaries', 'wd-Q5809', 1), -- Che Guevara
  ('revolutionaries', 'wd-Q1394', 2), -- Vladimir Lenin
  ('revolutionaries', 'wd-Q8605', 3), -- Simón Bolívar
  ('revolutionaries', 'wd-Q539', 4), -- Giuseppe Garibaldi
  ('revolutionaries', 'wd-Q44197', 5), -- Maximilien Robespierre
  ('scientists', 'wd-Q937', 1), -- Albert Einstein
  ('scientists', 'wd-Q935', 2), -- Isaac Newton
  ('scientists', 'wd-Q7186', 3), -- Marie Curie
  ('scientists', 'wd-Q1035', 4), -- Charles Darwin
  ('scientists', 'wd-Q17714', 5), -- Stephen Hawking
  ('women-who-made-history', 'wd-Q7186', 1), -- Marie Curie
  ('women-who-made-history', 'wd-Q7226', 2), -- Joan of Arc
  ('women-who-made-history', 'wd-Q5588', 3), -- Frida Kahlo
  ('women-who-made-history', 'wd-Q30547', 4), -- Mother Teresa
  ('women-who-made-history', 'wd-Q32732', 5), -- Malala Yousafzai
  -- jobs
  ('airplane-pilots', 'wd-Q3355', 1), -- Amelia Earhart
  ('airplane-pilots', 'wd-Q313211', 2), -- Alberto Santos-Dumont
  ('airplane-pilots', 'wd-Q4701', 3), -- Manfred von Richthofen
  ('airplane-pilots', 'wd-Q1618', 4), -- Charles Lindbergh
  ('airplane-pilots', 'wd-Q2908', 5), -- Antoine de Saint-Exupéry
  ('butlers', 'wd-Q159051', 1), -- Alfred Pennyworth
  ('butlers', 'al-10863', 2), -- Sebastian Michaelis
  ('butlers', 'wd-Q500457', 3), -- Lurch
  ('butlers', 'wd-Q521812', 4), -- Jeeves
  ('butlers', 'al-89155', 5), -- Sebas Tian
  ('characters-who-are-bosses', 'wd-Q1193472', 1), -- Mr. Krabs
  ('characters-who-are-bosses', 'wd-Q716636', 2), -- Mr. Burns
  ('characters-who-are-bosses', 'wd-Q2346771', 3), -- Michael Scott
  ('characters-who-are-bosses', 'wd-Q2720206', 4), -- Miranda Priestly
  ('characters-who-are-bosses', 'wd-Q10291638', 5), -- Gru
  ('chefs-and-cooks', 'wd-Q15280', 1), -- Gordon Ramsay
  ('chefs-and-cooks', 'wd-Q1061765', 2), -- Sanji
  ('chefs-and-cooks', 'wd-Q935079', 3), -- SpongeBob SquarePants
  ('chefs-and-cooks', 'wd-Q700', 4), -- Swedish Chef
  ('chefs-and-cooks', 'al-75216', 5), -- Souma Yukihira
  ('clowns', 'wd-Q3899150', 1), -- Pennywise
  ('clowns', 'wd-Q837716', 2), -- Ronald McDonald
  ('clowns', 'wd-Q46476', 3), -- Bozo the Clown
  ('clowns', 'wd-Q727156', 4), -- Krusty the Clown
  ('clowns', 'wd-Q17309', 5), -- Pierrot
  ('detectives', 'wd-Q4653', 1), -- Sherlock Holmes
  ('detectives', 'wd-Q170534', 2), -- Hercule Poirot
  ('detectives', 'wd-Q844697', 3), -- Shinichi Kudo
  ('detectives', 'wd-Q52863', 4), -- L
  ('detectives', 'wd-Q623732', 5), -- Philip Marlowe
  ('doctors', 'wd-Q842945', 1), -- Gregory House
  ('doctors', 'wd-Q429828', 2), -- Meredith Grey
  ('doctors', 'wd-Q187349', 3), -- Dr. Watson
  ('doctors', 'al-309', 4), -- Chopper Tony Tony
  ('doctors', 'wd-Q5264', 5), -- Hippocrates
  ('journalists', 'wd-Q845922', 1), -- Lois Lane
  ('journalists', 'wd-Q52986', 2), -- Tintin
  ('journalists', 'wd-Q1992523', 3), -- J. Jonah Jameson
  ('journalists', 'wd-Q7237599', 4), -- April O'Neil
  ('journalists', 'wd-Q230744', 5), -- Anna Wintour
  ('lawyers', 'wd-Q7154377', 1), -- Saul Goodman
  ('lawyers', 'wd-Q1038163', 2), -- Phoenix Wright
  ('lawyers', 'wd-Q377529', 3), -- Perry Mason
  ('lawyers', 'wd-Q525777', 4), -- Atticus Finch
  ('lawyers', 'wd-Q327553', 5), -- Daredevil
  ('maids', 'wd-Q28859527', 1), -- Rem
  ('maids', 'al-120970', 2), -- Tohru
  ('maids', 'al-14941', 3), -- Misaki Ayuzawa
  ('maids', 'al-121104', 4), -- Ai Hayasaka
  ('maids', 'al-2762', 5), -- Roberta Cisneros
  ('office-workers', 'wd-Q4169030', 1), -- Dwight Schrute
  ('office-workers', 'wd-Q745284', 2), -- Chandler Bing
  ('office-workers', 'al-122189', 3), -- Hirotaka Nifuji
  ('office-workers', 'al-120969', 4), -- Kobayashi
  ('office-workers', 'wd-Q1450970', 5), -- Yoshikage Kira
  ('police-officers', 'wd-Q2082223', 1), -- John McClane
  ('police-officers', 'wd-Q1503352', 2), -- Chief Wiggum
  ('police-officers', 'wd-Q116113', 3), -- Jim Gordon
  ('police-officers', 'wd-Q2669664', 4), -- Olivia Benson
  ('police-officers', 'wd-Q1067723', 5), -- Inspector Lestrade
  ('ship-captains', 'wd-Q1035128', 1), -- Captain Hook
  ('ship-captains', 'wd-Q202857', 2), -- Captain Jack Sparrow
  ('ship-captains', 'wd-Q1046049', 3), -- Captain Nemo
  ('ship-captains', 'wd-Q477948', 4), -- Monkey D. Luffy
  ('ship-captains', 'wd-Q1640063', 5), -- Captain Haddock
  ('soldiers', 'wd-Q951317', 1), -- John Rambo
  ('soldiers', 'wd-Q190679', 2), -- Captain America
  ('soldiers', 'wd-Q30311583', 3), -- Levi Ackerman
  ('soldiers', 'wd-Q652022', 4), -- Master Chief
  ('soldiers', 'wd-Q246838', 5), -- Mulan
  ('spies', 'wd-Q2009573', 1), -- James Bond
  ('spies', 'al-138101', 2), -- Loid Forger
  ('spies', 'wd-Q369197', 3), -- Black Widow
  ('spies', 'wd-Q1059919', 4), -- Jason Bourne
  ('spies', 'wd-Q82180', 5), -- Mata Hari
  ('teachers', 'wd-Q176772', 1), -- Severus Snape
  ('teachers', 'al-65643', 2), -- Koro-sensei
  ('teachers', 'al-434', 3), -- Eikichi Onizuka
  ('teachers', 'al-89225', 4), -- Shouta Aizawa
  ('teachers', 'wd-Q1511184', 5), -- Edna Krabappel
  -- looks
  ('bald-characters', 'wd-Q62397809', 1), -- Saitama
  ('bald-characters', 'wd-Q838076', 2), -- Professor X
  ('bald-characters', 'wd-Q7810', 3), -- Homer Simpson
  ('bald-characters', 'wd-Q757141', 4), -- Krillin
  ('bald-characters', 'wd-Q694790', 5), -- Lex Luthor
  ('blond-characters', 'wd-Q931', 1), -- Naruto Uzumaki
  ('blond-characters', 'wd-Q4616', 2), -- Marilyn Monroe
  ('blond-characters', 'wd-Q507001', 3), -- Princess Peach
  ('blond-characters', 'wd-Q51746', 4), -- Luke Skywalker
  ('blond-characters', 'wd-Q15620419', 5), -- Elsa
  ('blue-characters', 'wd-Q191626', 1), -- Sonic the Hedgehog
  ('blue-characters', 'wd-Q1186309', 2), -- Doraemon
  ('blue-characters', 'wd-Q602854', 3), -- Stitch
  ('blue-characters', 'wd-Q939734', 4), -- Papa Smurf
  ('blue-characters', 'wd-Q737236', 5), -- Mystique
  ('characters-who-dress-in-black', 'wd-Q12206942', 1), -- Darth Vader
  ('characters-who-dress-in-black', 'wd-Q2575084', 2), -- Wednesday Addams
  ('characters-who-dress-in-black', 'wd-Q176772', 3), -- Severus Snape
  ('characters-who-dress-in-black', 'wd-Q2695156', 4), -- Batman
  ('characters-who-dress-in-black', 'wd-Q247120', 5), -- Neo
  ('characters-who-wear-a-cape', 'wd-Q79015', 1), -- Superman
  ('characters-who-wear-a-cape', 'wd-Q3266236', 2), -- Count Dracula
  ('characters-who-wear-a-cape', 'wd-Q907767', 3), -- Doctor Strange
  ('characters-who-wear-a-cape', 'wd-Q226822', 4), -- Zorro
  ('characters-who-wear-a-cape', 'wd-Q62397809', 5), -- Saitama
  ('characters-who-wear-a-hat', 'wd-Q477948', 1), -- Monkey D. Luffy
  ('characters-who-wear-a-hat', 'wd-Q148659', 2), -- Indiana Jones
  ('characters-who-wear-a-hat', 'wd-Q2290907', 3), -- Woody
  ('characters-who-wear-a-hat', 'wd-Q864751', 4), -- The Hatter
  ('characters-who-wear-a-hat', 'wd-Q4653', 5), -- Sherlock Holmes
  ('characters-who-wear-a-helmet', 'wd-Q12206942', 1), -- Darth Vader
  ('characters-who-wear-a-helmet', 'wd-Q652022', 2), -- Master Chief
  ('characters-who-wear-a-helmet', 'wd-Q1986193', 3), -- Buzz Lightyear
  ('characters-who-wear-a-helmet', 'wd-Q840291', 4), -- Magneto
  ('characters-who-wear-a-helmet', 'wd-Q185828', 5), -- Daft Punk
  ('characters-who-wear-a-hood', 'wd-Q47386', 1), -- Kenny McCormick
  ('characters-who-wear-a-hood', 'wd-Q51770', 2), -- Palpatine
  ('characters-who-wear-a-hood', 'wd-Q994344', 3), -- Ezio Auditore da Firenze
  ('characters-who-wear-a-hood', 'wd-Q611993', 4), -- Green Arrow
  ('characters-who-wear-a-hood', 'wd-Q122634', 5), -- Robin Hood
  ('characters-who-wear-a-mask', 'wd-Q79037', 1), -- Spider-Man
  ('characters-who-wear-a-mask', 'wd-Q226822', 2), -- Zorro
  ('characters-who-wear-a-mask', 'wd-Q366957', 3), -- Jason Voorhees
  ('characters-who-wear-a-mask', 'wd-Q1767', 4), -- Kakashi Hatake
  ('characters-who-wear-a-mask', 'wd-Q158940', 5), -- Bane
  ('characters-who-wear-a-suit', 'wd-Q2009573', 1), -- James Bond
  ('characters-who-wear-a-suit', 'wd-Q13471616', 2), -- Mr. Bean
  ('characters-who-wear-a-suit', 'wd-Q1996431', 3), -- Agent 47
  ('characters-who-wear-a-suit', 'wd-Q1061765', 4), -- Sanji
  ('characters-who-wear-a-suit', 'wd-Q7540067', 5), -- Slender Man
  ('characters-who-wear-armor', 'wd-Q180704', 1), -- Iron Man
  ('characters-who-wear-armor', 'wd-Q7226', 2), -- Joan of Arc
  ('characters-who-wear-armor', 'wd-Q661225', 3), -- Alphonse Elric
  ('characters-who-wear-armor', 'wd-Q79325377', 4), -- Din Djarin
  ('characters-who-wear-armor', 'wd-Q2441117', 5), -- Pegasus Seiya
  ('characters-who-wear-glasses', 'wd-Q3244512', 1), -- Harry Potter
  ('characters-who-wear-glasses', 'wd-Q929855', 2), -- Velma Dinkley
  ('characters-who-wear-glasses', 'wd-Q1203', 3), -- John Lennon
  ('characters-who-wear-glasses', 'wd-Q774772', 4), -- Clark Kent
  ('characters-who-wear-glasses', 'wd-Q1001', 5), -- Mahatma Gandhi
  ('characters-who-wear-sunglasses', 'wd-Q1976616', 1), -- Terminator
  ('characters-who-wear-sunglasses', 'wd-Q247120', 2), -- Neo
  ('characters-who-wear-sunglasses', 'wd-Q1752065', 3), -- Master Roshi
  ('characters-who-wear-sunglasses', 'wd-Q544387', 4), -- Ray Charles
  ('characters-who-wear-sunglasses', 'al-2075', 5), -- Kamina
  ('characters-with-a-beard', 'wd-Q315796', 1), -- Santa Claus
  ('characters-with-a-beard', 'wd-Q712548', 2), -- Albus Dumbledore
  ('characters-with-a-beard', 'wd-Q177499', 3), -- Gandalf
  ('characters-with-a-beard', 'wd-Q91', 4), -- Abraham Lincoln
  ('characters-with-a-beard', 'wd-Q34201', 5), -- Zeus
  ('characters-with-a-big-nose', 'wd-Q6502703', 1), -- Pinocchio
  ('characters-with-a-big-nose', 'wd-Q1064404', 2), -- Squidward Tentacles
  ('characters-with-a-big-nose', 'wd-Q1078696', 3), -- Usopp
  ('characters-with-a-big-nose', 'wd-Q10291638', 4), -- Gru
  ('characters-with-a-big-nose', 'wd-Q536138', 5), -- Wario
  ('characters-with-a-color-in-their-name', 'wd-Q15012089', 1), -- Pink Panther
  ('characters-with-a-color-in-their-name', 'wd-Q2739228', 2), -- Snow White
  ('characters-with-a-color-in-their-name', 'wd-Q32884', 3), -- Green Lantern
  ('characters-with-a-color-in-their-name', 'wd-Q998220', 4), -- Black Panther
  ('characters-with-a-color-in-their-name', 'wd-Q178776', 5), -- White Rabbit
  ('characters-with-a-facial-scar', 'wd-Q3244512', 1), -- Harry Potter
  ('characters-with-a-facial-scar', 'wd-Q1977325', 2), -- Scar
  ('characters-with-a-facial-scar', 'wd-Q1997841', 3), -- Zuko
  ('characters-with-a-facial-scar', 'wd-Q1036543', 4), -- Himura Kenshin
  ('characters-with-a-facial-scar', 'wd-Q629034', 5), -- Tony Montana
  ('characters-with-a-mustache', 'wd-Q12379', 1), -- Mario
  ('characters-with-a-mustache', 'wd-Q882', 2), -- Charlie Chaplin
  ('characters-with-a-mustache', 'wd-Q170534', 3), -- Hercule Poirot
  ('characters-with-a-mustache', 'wd-Q5577', 4), -- Salvador Dalí
  ('characters-with-a-mustache', 'wd-Q15869', 5), -- Freddie Mercury
  ('characters-with-an-iconic-hairstyle', 'wd-Q7828', 1), -- Marge Simpson
  ('characters-with-an-iconic-hairstyle', 'wd-Q2142', 2), -- Goku
  ('characters-with-an-iconic-hairstyle', 'wd-Q51797', 3), -- Princess Leia
  ('characters-with-an-iconic-hairstyle', 'wd-Q937', 4), -- Albert Einstein
  ('characters-with-an-iconic-hairstyle', 'wd-Q303', 5), -- Elvis Presley
  ('characters-with-big-ears', 'wd-Q11934', 1), -- Mickey Mouse
  ('characters-with-big-ears', 'wd-Q51730', 2), -- Yoda
  ('characters-with-big-ears', 'wd-Q602854', 3), -- Stitch
  ('characters-with-big-ears', 'wd-Q161731', 4), -- Cheburashka
  ('characters-with-big-ears', 'wd-Q183102', 5), -- Bugs Bunny
  ('characters-with-freckles', 'wd-Q6668', 1), -- Pippi Longstocking
  ('characters-with-freckles', 'al-2072', 2), -- Ace Portgas
  ('characters-with-freckles', 'wd-Q771213', 3), -- Anne Shirley
  ('characters-with-freckles', 'al-89028', 4), -- Izuku Midoriya
  ('characters-with-freckles', 'wd-Q173998', 5), -- Ron Weasley
  ('characters-with-tattoos', 'wd-Q79031', 1), -- Mike Tyson
  ('characters-with-tattoos', 'wd-Q309433', 2), -- Michael Scofield
  ('characters-with-tattoos', 'wd-Q199796', 3), -- Popeye
  ('characters-with-tattoos', 'wd-Q2291154', 4), -- Kratos
  ('characters-with-tattoos', 'wd-Q10520', 5), -- David Beckham
  ('green-characters', 'wd-Q188760', 1), -- Hulk
  ('green-characters', 'wd-Q52401', 2), -- Shrek
  ('green-characters', 'wd-Q1107971', 3), -- Kermit the Frog
  ('green-characters', 'wd-Q51730', 4), -- Yoda
  ('green-characters', 'wd-Q151659', 5), -- Piccolo
  ('one-eyed-characters', 'wd-Q975100', 1), -- Nick Fury
  ('one-eyed-characters', 'wd-Q43610', 2), -- Odin
  ('one-eyed-characters', 'wd-Q193567', 3), -- Polyphemus
  ('one-eyed-characters', 'wd-Q858432', 4), -- Roronoa Zoro
  ('one-eyed-characters', 'wd-Q311183', 5), -- Date Masamune
  ('orange-characters', 'wd-Q844940', 1), -- Charizard
  ('orange-characters', 'wd-Q1063506', 2), -- Crash Bandicoot
  ('orange-characters', 'wd-Q910204', 3), -- Thing
  ('orange-characters', 'wd-Q2283527', 4), -- Puss in Boots
  ('orange-characters', 'wd-Q7823740', 5), -- Tony the Tiger
  ('pink-characters', 'wd-Q15012089', 1), -- Pink Panther
  ('pink-characters', 'wd-Q1077456', 2), -- Patrick Star
  ('pink-characters', 'wd-Q613241', 3), -- Kirby
  ('pink-characters', 'wd-Q910881', 4), -- Majin Buu
  ('pink-characters', 'wd-Q2267970', 5), -- Miss Piggy
  ('purple-characters', 'wd-Q2276627', 1), -- Thanos
  ('purple-characters', 'wd-Q21516231', 2), -- Beerus
  ('purple-characters', 'wd-Q15141696', 3), -- Twilight Sparkle
  ('purple-characters', 'wd-Q2141803', 4), -- Mewtwo
  ('purple-characters', 'wd-Q1050827', 5), -- Waluigi
  ('red-characters', 'wd-Q864418', 1), -- Lightning McQueen
  ('red-characters', 'wd-Q1193472', 2), -- Mr. Krabs
  ('red-characters', 'wd-Q762250', 3), -- Elmo
  ('red-characters', 'wd-Q1150106', 4), -- Hellboy
  ('red-characters', 'wd-Q904189', 5), -- Knuckles the Echidna
  ('redheads', 'wd-Q892442', 1), -- Ariel
  ('redheads', 'wd-Q173998', 2), -- Ron Weasley
  ('redheads', 'wd-Q2321523', 3), -- Shanks
  ('redheads', 'wd-Q771213', 4), -- Anne Shirley
  ('redheads', 'wd-Q1631670', 5), -- Jessica Rabbit
  ('yellow-characters', 'wd-Q9351', 1), -- Pikachu
  ('yellow-characters', 'wd-Q935079', 2), -- SpongeBob SquarePants
  ('yellow-characters', 'wd-Q15736052', 3), -- Minions
  ('yellow-characters', 'wd-Q623553', 4), -- Tweety
  ('yellow-characters', 'wd-Q5480', 5), -- Bart Simpson
  -- music
  ('band-members', 'wd-Q1203', 1), -- John Lennon
  ('band-members', 'wd-Q15869', 2), -- Freddie Mercury
  ('band-members', 'wd-Q8446', 3), -- Kurt Cobain
  ('band-members', 'wd-Q19198', 4), -- Chester Bennington
  ('band-members', 'wd-Q712860', 5), -- Chris Martin
  ('bands-and-music-groups', 'wd-Q1299', 1), -- The Beatles
  ('bands-and-music-groups', 'wd-Q15862', 2), -- Queen
  ('bands-and-music-groups', 'wd-Q13580495', 3), -- BTS
  ('bands-and-music-groups', 'wd-Q25056945', 4), -- Blackpink
  ('bands-and-music-groups', 'wd-Q15920', 5), -- Metallica
  ('bands-from-cartoons-and-anime', 'wd-Q917295', 1), -- Alvin and the Chipmunks
  ('bands-from-cartoons-and-anime', 'wd-Q189991', 2), -- Gorillaz
  ('bands-from-cartoons-and-anime', 'wd-Q512836', 3), -- The Archies
  ('characters-who-dance', 'wd-Q2831', 1), -- Michael Jackson
  ('characters-who-dance', 'wd-Q207369', 2), -- Snoopy
  ('characters-who-dance', 'wd-Q2575084', 3), -- Wednesday Addams
  ('characters-who-dance', 'wd-Q94579116', 4), -- Chika Fujiwara
  ('characters-who-dance', 'wd-Q3116935', 5), -- Groot
  ('characters-who-sing', 'wd-Q15620419', 1), -- Elsa
  ('characters-who-sing', 'wd-Q552682', 2), -- Hatsune Miku
  ('characters-who-sing', 'wd-Q892442', 3), -- Ariel
  ('characters-who-sing', 'al-19565', 4), -- Yui Hirasawa
  ('characters-who-sing', 'wd-Q1753198', 5), -- Jigglypuff
  ('characters-with-a-famous-theme-song', 'wd-Q2009573', 1), -- James Bond
  ('characters-with-a-famous-theme-song', 'wd-Q15012089', 2), -- Pink Panther
  ('characters-with-a-famous-theme-song', 'wd-Q12206942', 3), -- Darth Vader
  ('characters-with-a-famous-theme-song', 'wd-Q12379', 4), -- Mario
  ('characters-with-a-famous-theme-song', 'wd-Q935079', 5), -- SpongeBob SquarePants
  ('classical-composers', 'wd-Q254', 1), -- Wolfgang Amadeus Mozart
  ('classical-composers', 'wd-Q255', 2), -- Ludwig van Beethoven
  ('classical-composers', 'wd-Q1339', 3), -- Johann Sebastian Bach
  ('classical-composers', 'wd-Q1268', 4), -- Frédéric Chopin
  ('classical-composers', 'wd-Q1340', 5), -- Antonio Vivaldi
  ('djs', 'wd-Q505476', 1), -- Avicii
  ('djs', 'wd-Q8298', 2), -- David Guetta
  ('djs', 'wd-Q26334949', 3), -- Marshmello
  ('djs', 'wd-Q81637', 4), -- Calvin Harris
  ('djs', 'wd-Q28007321', 5), -- Alok
  ('female-singers', 'wd-Q26876', 1), -- Taylor Swift
  ('female-singers', 'wd-Q1744', 2), -- Madonna
  ('female-singers', 'wd-Q19848', 3), -- Lady Gaga
  ('female-singers', 'wd-Q151892', 4), -- Ariana Grande
  ('female-singers', 'wd-Q34424', 5), -- Shakira
  ('guitarists', 'wd-Q5928', 1), -- Jimi Hendrix
  ('guitarists', 'wd-Q34166', 2), -- Slash
  ('guitarists', 'wd-Q48187', 3), -- Eric Clapton
  ('guitarists', 'wd-Q165467', 4), -- Jimmy Page
  ('guitarists', 'wd-Q15873', 5), -- Brian May
  ('j-pop-idols', 'wd-Q1154232', 1), -- Atsuko Maeda
  ('j-pop-idols', 'al-172759', 2), -- Ai Hoshino
  ('j-pop-idols', 'wd-Q362254', 3), -- Takuya Kimura
  ('j-pop-idols', 'wd-Q1198084', 4), -- Momoe Yamaguchi
  ('j-pop-idols', 'wd-Q347428', 5), -- Jun Matsumoto
  ('k-pop-idols', 'wd-Q22338877', 1), -- Jung Kook
  ('k-pop-idols', 'wd-Q26707663', 2), -- Lisa
  ('k-pop-idols', 'wd-Q495577', 3), -- G-Dragon
  ('k-pop-idols', 'wd-Q21060390', 4), -- Cha Eun-woo
  ('k-pop-idols', 'wd-Q20145', 5), -- IU
  ('male-singers', 'wd-Q2831', 1), -- Michael Jackson
  ('male-singers', 'wd-Q303', 2), -- Elvis Presley
  ('male-singers', 'wd-Q34086', 3), -- Justin Bieber
  ('male-singers', 'wd-Q1450', 4), -- Bruno Mars
  ('male-singers', 'wd-Q40912', 5), -- Frank Sinatra
  ('music-duos', 'wd-Q185828', 1), -- Daft Punk
  ('music-duos', 'wd-Q484918', 2), -- Simon & Garfunkel
  ('music-duos', 'wd-Q223495', 3), -- The Carpenters
  ('music-duos', 'wd-Q173790', 4), -- Roxette
  ('music-duos', 'wd-Q161723', 5), -- t.A.T.u.
  ('rappers', 'wd-Q5608', 1), -- Eminem
  ('rappers', 'wd-Q6096', 2), -- Snoop Dogg
  ('rappers', 'wd-Q6107', 3), -- Tupac Shakur
  ('rappers', 'wd-Q15935', 4), -- Kanye West
  ('rappers', 'wd-Q162202', 5), -- Nicki Minaj
  ('rock-stars', 'wd-Q303', 1), -- Elvis Presley
  ('rock-stars', 'wd-Q128121', 2), -- Mick Jagger
  ('rock-stars', 'wd-Q133151', 3), -- Ozzy Osbourne
  ('rock-stars', 'wd-Q5383', 4), -- David Bowie
  ('rock-stars', 'wd-Q11885', 5), -- Axl Rose
  -- myths
  ('angels', 'wd-Q45581', 1), -- Michael
  ('angels', 'wd-Q81989', 2), -- Gabriel
  ('angels', 'wd-Q56951', 3), -- Raphael
  ('angels', 'wd-Q209378', 4), -- Uriel
  ('angels', 'wd-Q490838', 5), -- Azrael
  ('biblical-characters', 'wd-Q302', 1), -- Jesus Christ
  ('biblical-characters', 'wd-Q9077', 2), -- Moses
  ('biblical-characters', 'wd-Q81422', 3), -- Noah
  ('biblical-characters', 'wd-Q345', 4), -- Mary
  ('biblical-characters', 'wd-Q81018', 5), -- Judas Iscariot
  ('creatures-that-come-in-crowds', 'wd-Q15736052', 1), -- Minions
  ('creatures-that-come-in-crowds', 'wd-Q2024813', 2), -- Oompa-Loompa
  ('creatures-that-come-in-crowds', 'wd-Q1409501', 3), -- Ewok
  ('creatures-that-come-in-crowds', 'wd-Q639184', 4), -- Seven Dwarfs
  ('creatures-that-come-in-crowds', 'wd-Q1057701', 5), -- Goomba
  ('demons', 'wd-Q35230', 1), -- Satan
  ('demons', 'wd-Q1150106', 2), -- Hellboy
  ('demons', 'wd-Q202492', 3), -- Beelzebub
  ('demons', 'al-10863', 4), -- Sebastian Michaelis
  ('demons', 'wd-Q732551', 5), -- Pazuzu
  ('dragons', 'wd-Q46302', 1), -- Smaug
  ('dragons', 'wd-Q1470558', 2), -- King Ghidorah
  ('dragons', 'al-120970', 3), -- Tohru
  ('dragons', 'al-385', 4), -- Haku
  ('dragons', 'wd-Q745315', 5), -- Fáfnir
  ('elves', 'wd-Q213480', 1), -- Legolas
  ('elves', 'wd-Q104144455', 2), -- Frieren
  ('elves', 'wd-Q204274', 3), -- Galadriel
  ('elves', 'wd-Q206018', 4), -- Arwen
  ('elves', 'al-127292', 5), -- Marcille Donato
  ('fairies', 'wd-Q853847', 1), -- Tinker Bell
  ('fairies', 'wd-Q846982', 2), -- tooth fairy
  ('fairies', 'wd-Q1660555', 3), -- Maleficent
  ('fairies', 'wd-Q321305', 4), -- Morgan le Fay
  ('fantasy-characters', 'wd-Q177499', 1), -- Gandalf
  ('fantasy-characters', 'wd-Q3244512', 2), -- Harry Potter
  ('fantasy-characters', 'wd-Q2492923', 3), -- Geralt of Rivia
  ('fantasy-characters', 'wd-Q568553', 4), -- Link
  ('fantasy-characters', 'wd-Q104144455', 5), -- Frieren
  ('fantasy-races', 'wd-Q74359', 1), -- Hobbit
  ('fantasy-races', 'wd-Q338688', 2), -- Middle-earth dwarf
  ('fantasy-races', 'wd-Q203904', 3), -- Middle-earth elf
  ('fantasy-races', 'wd-Q308697', 4), -- goblin
  ('fantasy-races', 'wd-Q937840', 5), -- Orcs in Tolkien's legendarium
  ('ghosts', 'wd-Q1442531', 1), -- Casper the Friendly Ghost
  ('ghosts', 'wd-Q2596301', 2), -- Sadako Yamamura
  ('ghosts', 'al-128651', 3), -- Hanako
  ('ghosts', 'wd-Q717100', 4), -- Bloody Mary
  ('giant-characters', 'wd-Q192785', 1), -- Goliath
  ('giant-characters', 'wd-Q216810', 2), -- King Kong
  ('giant-characters', 'wd-Q6567', 3), -- Godzilla
  ('giant-characters', 'wd-Q1429836', 4), -- Galactus
  ('giant-characters', 'wd-Q193567', 5), -- Polyphemus
  ('goddesses', 'wd-Q37122', 1), -- Athena
  ('goddesses', 'wd-Q79876', 2), -- Isis
  ('goddesses', 'wd-Q455602', 3), -- Amaterasu
  ('goddesses', 'wd-Q1647325', 4), -- Freyja
  ('goddesses', 'wd-Q132127', 5), -- Kali
  ('gods', 'wd-Q34201', 1), -- Zeus
  ('gods', 'wd-Q42952', 2), -- Thor
  ('gods', 'wd-Q47534', 3), -- Anubis
  ('gods', 'wd-Q11378', 4), -- Shiva
  ('gods', 'wd-Q179818', 5), -- Quetzalcoatl
  ('greek-mythology-characters', 'wd-Q34201', 1), -- Zeus
  ('greek-mythology-characters', 'wd-Q160730', 2), -- Medusa
  ('greek-mythology-characters', 'wd-Q122248', 3), -- Heracles
  ('greek-mythology-characters', 'wd-Q41746', 4), -- Achilles
  ('greek-mythology-characters', 'wd-Q41410', 5), -- Hades
  ('half-human-characters', 'wd-Q16341', 1), -- Spock
  ('half-human-characters', 'wd-Q892442', 2), -- Ariel
  ('half-human-characters', 'wd-Q183417', 3), -- Chiron
  ('half-human-characters', 'al-87275', 4), -- Ken Kaneki
  ('half-human-characters', 'wd-Q881024', 5), -- Blade
  ('legendary-creatures', 'wd-Q129866', 1), -- Minotaur
  ('legendary-creatures', 'wd-Q49658', 2), -- Loch Ness Monster
  ('legendary-creatures', 'wd-Q129628', 3), -- Yeti
  ('legendary-creatures', 'wd-Q151480', 4), -- sphinx
  ('legendary-creatures', 'wd-Q335140', 5), -- kappa
  ('monsters', 'wd-Q2021531', 1), -- Frankenstein's monster
  ('monsters', 'wd-Q6567', 2), -- Godzilla
  ('monsters', 'wd-Q216810', 3), -- King Kong
  ('monsters', 'wd-Q49658', 4), -- Loch Ness Monster
  ('monsters', 'wd-Q209758', 5), -- Xenomorph
  ('non-humans', 'wd-Q9351', 1), -- Pikachu
  ('non-humans', 'wd-Q11934', 2), -- Mickey Mouse
  ('non-humans', 'wd-Q51730', 3), -- Yoda
  ('non-humans', 'wd-Q935079', 4), -- SpongeBob SquarePants
  ('non-humans', 'wd-Q207369', 5), -- Snoopy
  ('tiny-characters', 'wd-Q853847', 1), -- Tinker Bell
  ('tiny-characters', 'wd-Q2420783', 2), -- Ant-Man
  ('tiny-characters', 'wd-Q1028714', 3), -- Jiminy Cricket
  ('tiny-characters', 'wd-Q305405', 4), -- Smurfette
  ('tiny-characters', 'wd-Q5685120', 5), -- Atom
  ('urban-legends', 'wd-Q7540067', 1), -- Slender Man
  ('urban-legends', 'wd-Q717100', 2), -- Bloody Mary
  ('urban-legends', 'wd-Q14920256', 3), -- Herobrine
  ('urban-legends', 'wd-Q19059677', 4), -- Jeff the Killer
  ('urban-legends', 'wd-Q1866923', 5), -- La Llorona
  ('vampires', 'wd-Q3266236', 1), -- Count Dracula
  ('vampires', 'wd-Q191527', 2), -- Edward Cullen
  ('vampires', 'wd-Q282514', 3), -- Alucard
  ('vampires', 'al-23602', 4), -- Shinobu Oshino
  ('vampires', 'wd-Q2295321', 5), -- Lestat de Lioncourt
  ('witches', 'wd-Q3822980', 1), -- Wicked Witch of the West
  ('witches', 'wd-Q174009', 2), -- Hermione Granger
  ('witches', 'wd-Q187002', 3), -- Baba Yaga
  ('witches', 'wd-Q929285', 4), -- Scarlet Witch
  ('witches', 'wd-Q187602', 5), -- Circe
  ('zombies-and-undead', 'wd-Q3266236', 1), -- Count Dracula
  ('zombies-and-undead', 'wd-Q936278', 2), -- Imhotep
  ('zombies-and-undead', 'wd-Q2708262', 3), -- Jack Skellington
  ('zombies-and-undead', 'al-5627', 4), -- Brook
  ('zombies-and-undead', 'al-89103', 5), -- Momonga
  -- powers
  ('characters-sent-to-another-world', 'wd-Q2583524', 1), -- Dorothy Gale
  ('characters-sent-to-another-world', 'wd-Q1269082', 2), -- Alice
  ('characters-sent-to-another-world', 'al-384', 3), -- Chihiro Ogino
  ('characters-sent-to-another-world', 'al-123962', 4), -- Rimuru Tempest
  ('characters-sent-to-another-world', 'wd-Q1640313', 5), -- Lucy Pevensie
  ('characters-who-came-back-from-the-dead', 'wd-Q2142', 1), -- Goku
  ('characters-who-came-back-from-the-dead', 'wd-Q177499', 2), -- Gandalf
  ('characters-who-came-back-from-the-dead', 'wd-Q302', 3), -- Jesus Christ
  ('characters-who-came-back-from-the-dead', 'wd-Q3183235', 4), -- Jon Snow
  ('characters-who-came-back-from-the-dead', 'wd-Q47386', 5), -- Kenny McCormick
  ('characters-who-can-fly', 'wd-Q79015', 1), -- Superman
  ('characters-who-can-fly', 'wd-Q107190', 2), -- Peter Pan
  ('characters-who-can-fly', 'wd-Q2142', 3), -- Goku
  ('characters-who-can-fly', 'wd-Q180704', 4), -- Iron Man
  ('characters-who-can-fly', 'wd-Q3735317', 5), -- Mary Poppins
  ('characters-who-can-see-the-future', 'wd-Q907767', 1), -- Doctor Strange
  ('characters-who-can-see-the-future', 'wd-Q39978', 2), -- Nostradamus
  ('characters-who-can-see-the-future', 'wd-Q170779', 3), -- Cassandra
  ('characters-who-can-see-the-future', 'wd-Q939956', 4), -- Paul Atreides
  ('characters-who-can-see-the-future', 'wd-Q16650986', 5), -- Yuno Gasai
  ('characters-who-can-talk-to-animals', 'wd-Q170241', 1), -- Tarzan
  ('characters-who-can-talk-to-animals', 'wd-Q2377081', 2), -- John Dolittle
  ('characters-who-can-talk-to-animals', 'wd-Q623059', 3), -- Aquaman
  ('characters-who-can-talk-to-animals', 'wd-Q892442', 4), -- Ariel
  ('characters-who-can-talk-to-animals', 'wd-Q1381592', 5), -- Mowgli
  ('characters-who-can-turn-invisible', 'wd-Q510450', 1), -- Invisible Woman
  ('characters-who-can-turn-invisible', 'wd-Q177329', 2), -- Frodo Baggins
  ('characters-who-can-turn-invisible', 'wd-Q3244512', 3), -- Harry Potter
  ('characters-who-can-turn-invisible', 'wd-Q934013', 4), -- Cheshire Cat
  ('characters-who-can-turn-invisible', 'wd-Q1442531', 5), -- Casper the Friendly Ghost
  ('characters-who-got-kidnapped', 'wd-Q507001', 1), -- Princess Peach
  ('characters-who-got-kidnapped', 'wd-Q845922', 2), -- Lois Lane
  ('characters-who-got-kidnapped', 'wd-Q4902053', 3), -- Rapunzel
  ('characters-who-got-kidnapped', 'wd-Q45967', 4), -- Persephone
  ('characters-who-got-kidnapped', 'wd-Q51797', 5), -- Princess Leia
  ('characters-who-lost-their-memory', 'wd-Q1059919', 1), -- Jason Bourne
  ('characters-who-lost-their-memory', 'wd-Q186422', 2), -- Wolverine
  ('characters-who-lost-their-memory', 'al-385', 3), -- Haku
  ('characters-who-lost-their-memory', 'wd-Q1798592', 4), -- Cloud Strife
  ('characters-who-lost-their-memory', 'wd-Q843545', 5), -- Light Yagami
  ('characters-who-transform', 'wd-Q188760', 1), -- Hulk
  ('characters-who-transform', 'wd-Q151583', 2), -- Optimus Prime
  ('characters-who-transform', 'wd-Q757015', 3), -- Usagi Tsukino
  ('characters-who-transform', 'wd-Q2895569', 4), -- Ben Tennyson
  ('characters-who-transform', 'wd-Q18206694', 5), -- Eren Yeager
  ('characters-who-use-gadgets', 'wd-Q2695156', 1), -- Batman
  ('characters-who-use-gadgets', 'wd-Q1186309', 2), -- Doraemon
  ('characters-who-use-gadgets', 'wd-Q2009573', 3), -- James Bond
  ('characters-who-use-gadgets', 'wd-Q180704', 4), -- Iron Man
  ('characters-who-use-gadgets', 'wd-Q844697', 5), -- Shinichi Kudo
  ('characters-who-use-magic', 'wd-Q3244512', 1), -- Harry Potter
  ('characters-who-use-magic', 'wd-Q188044', 2), -- Merlin
  ('characters-who-use-magic', 'wd-Q177499', 3), -- Gandalf
  ('characters-who-use-magic', 'wd-Q907767', 4), -- Doctor Strange
  ('characters-who-use-magic', 'wd-Q104144455', 5), -- Frieren
  ('characters-with-a-famous-special-move', 'wd-Q2142', 1), -- Goku
  ('characters-with-a-famous-special-move', 'wd-Q1223440', 2), -- Ryu
  ('characters-with-a-famous-special-move', 'wd-Q931', 3), -- Naruto Uzumaki
  ('characters-with-a-famous-special-move', 'wd-Q2441117', 4), -- Pegasus Seiya
  ('characters-with-a-famous-special-move', 'wd-Q584674', 5), -- Scorpion
  ('characters-with-a-magic-item', 'wd-Q1358109', 1), -- Aladdin
  ('characters-with-a-magic-item', 'wd-Q717588', 2), -- Thor
  ('characters-with-a-magic-item', 'wd-Q45792', 3), -- King Arthur
  ('characters-with-a-magic-item', 'wd-Q177329', 4), -- Frodo Baggins
  ('characters-with-a-magic-item', 'wd-Q550404', 5), -- He-Man
  ('characters-with-electric-powers', 'wd-Q9351', 1), -- Pikachu
  ('characters-with-electric-powers', 'wd-Q34201', 2), -- Zeus
  ('characters-with-electric-powers', 'wd-Q717588', 3), -- Thor
  ('characters-with-electric-powers', 'wd-Q2717625', 4), -- Killua Zoldyck
  ('characters-with-electric-powers', 'wd-Q2300110', 5), -- Blanka
  ('characters-with-fire-powers', 'wd-Q584585', 1), -- Human Torch
  ('characters-with-fire-powers', 'wd-Q844940', 2), -- Charizard
  ('characters-with-fire-powers', 'wd-Q1997841', 3), -- Zuko
  ('characters-with-fire-powers', 'wd-Q746314', 4), -- Roy Mustang
  ('characters-with-fire-powers', 'wd-Q845864', 5), -- Bowser
  ('characters-with-mind-powers', 'wd-Q838076', 1), -- Professor X
  ('characters-with-mind-powers', 'wd-Q27955792', 2), -- Eleven
  ('characters-with-mind-powers', 'wd-Q2141803', 3), -- Mewtwo
  ('characters-with-mind-powers', 'al-89616', 4), -- Shigeo Kageyama
  ('characters-with-mind-powers', 'wd-Q191527', 5), -- Edward Cullen
  ('cursed-characters', 'wd-Q2559802', 1), -- Beast
  ('cursed-characters', 'wd-Q519034', 2), -- Aurora
  ('cursed-characters', 'wd-Q52405', 3), -- Princess Fiona
  ('cursed-characters', 'wd-Q160730', 4), -- Medusa
  ('cursed-characters', 'al-508', 5), -- Sophie Hatter
  ('immortal-characters', 'wd-Q3266236', 1), -- Count Dracula
  ('immortal-characters', 'wd-Q1631090', 2), -- Deadpool
  ('immortal-characters', 'wd-Q868779', 3), -- Connor MacLeod
  ('immortal-characters', 'wd-Q11773777', 4), -- Sun Wukong
  ('immortal-characters', 'wd-Q366957', 5), -- Jason Voorhees
  ('mutants', 'wd-Q186422', 1), -- Wolverine
  ('mutants', 'wd-Q840291', 2), -- Magneto
  ('mutants', 'wd-Q1381762', 3), -- Teenage Mutant Ninja Turtles
  ('mutants', 'wd-Q632212', 4), -- Storm
  ('mutants', 'wd-Q737236', 5), -- Mystique
  ('super-fast-characters', 'wd-Q191626', 1), -- Sonic the Hedgehog
  ('super-fast-characters', 'wd-Q2258938', 2), -- Barry Allen
  ('super-fast-characters', 'wd-Q864418', 3), -- Lightning McQueen
  ('super-fast-characters', 'wd-Q912984', 4), -- Speedy Gonzales
  ('super-fast-characters', 'wd-Q1189', 5), -- Usain Bolt
  ('super-strong-characters', 'wd-Q188760', 1), -- Hulk
  ('super-strong-characters', 'wd-Q199796', 2), -- Popeye
  ('super-strong-characters', 'wd-Q122248', 3), -- Heracles
  ('super-strong-characters', 'wd-Q62397809', 4), -- Saitama
  ('super-strong-characters', 'wd-Q6668', 5), -- Pippi Longstocking
  -- quirks
  ('always-cheerful-characters', 'wd-Q935079', 1), -- SpongeBob SquarePants
  ('always-cheerful-characters', 'wd-Q16253807', 2), -- Olaf
  ('always-cheerful-characters', 'wd-Q477948', 3), -- Monkey D. Luffy
  ('always-cheerful-characters', 'wd-Q15141427', 4), -- Pinkie Pie
  ('always-cheerful-characters', 'wd-Q1158157', 5), -- Ned Flanders
  ('arrogant-characters', 'wd-Q180916', 1), -- Vegeta
  ('arrogant-characters', 'wd-Q179641', 2), -- Draco Malfoy
  ('arrogant-characters', 'wd-Q2269136', 3), -- Gaston
  ('arrogant-characters', 'wd-Q864418', 4), -- Lightning McQueen
  ('arrogant-characters', 'wd-Q1066453', 5), -- Seto Kaiba
  ('characters-who-are-poor', 'wd-Q1358109', 1), -- Aladdin
  ('characters-who-are-poor', 'wd-Q765880', 2), -- The Tramp
  ('characters-who-are-poor', 'wd-Q10271128', 3), -- El Chavo del Ocho
  ('characters-who-are-poor', 'wd-Q173998', 4), -- Ron Weasley
  ('characters-who-are-poor', 'wd-Q2559332', 5), -- Cinderella
  ('characters-who-love-to-eat', 'wd-Q1754267', 1), -- Cookie Monster
  ('characters-who-love-to-eat', 'wd-Q2480066', 2), -- Snorlax
  ('characters-who-love-to-eat', 'wd-Q2142', 3), -- Goku
  ('characters-who-love-to-eat', 'wd-Q848673', 4), -- Shaggy Rogers
  ('characters-who-love-to-eat', 'wd-Q6730366', 5), -- Maggy
  ('characters-who-never-talk', 'wd-Q15012089', 1), -- Pink Panther
  ('characters-who-never-talk', 'wd-Q7834', 2), -- Maggie Simpson
  ('characters-who-never-talk', 'wd-Q207369', 3), -- Snoopy
  ('characters-who-never-talk', 'wd-Q1962394', 4), -- Jerry
  ('characters-who-never-talk', 'wd-Q568553', 5), -- Link
  ('characters-who-ride-motorcycles', 'wd-Q868958', 1), -- Ghost Rider
  ('characters-who-ride-motorcycles', 'al-2588', 2), -- Shoutarou Kaneda
  ('characters-who-ride-motorcycles', 'wd-Q1435927', 3), -- Fonzie
  ('characters-who-ride-motorcycles', 'wd-Q1976616', 4), -- Terminator
  ('characters-who-ride-motorcycles', 'wd-Q169814', 5), -- Valentino Rossi
  ('characters-whose-name-ends-in-man', 'wd-Q2695156', 1), -- Batman
  ('characters-whose-name-ends-in-man', 'wd-Q550404', 2), -- He-Man
  ('characters-whose-name-ends-in-man', 'wd-Q2913000', 3), -- Pac-Man
  ('characters-whose-name-ends-in-man', 'wd-Q7540067', 4), -- Slender Man
  ('characters-whose-name-ends-in-man', 'wd-Q3174269', 5), -- Mega Man
  ('characters-whose-name-is-the-title', 'wd-Q3244512', 1), -- Harry Potter
  ('characters-whose-name-is-the-title', 'wd-Q52401', 2), -- Shrek
  ('characters-whose-name-is-the-title', 'wd-Q170241', 3), -- Tarzan
  ('characters-whose-name-is-the-title', 'wd-Q191626', 4), -- Sonic the Hedgehog
  ('characters-whose-name-is-the-title', 'wd-Q1186309', 5), -- Doraemon
  ('characters-with-a-catchphrase', 'wd-Q183102', 1), -- Bugs Bunny
  ('characters-with-a-catchphrase', 'wd-Q7810', 2), -- Homer Simpson
  ('characters-with-a-catchphrase', 'wd-Q1986193', 3), -- Buzz Lightyear
  ('characters-with-a-catchphrase', 'wd-Q10271128', 4), -- El Chavo del Ocho
  ('characters-with-a-catchphrase', 'wd-Q757015', 5), -- Usagi Tsukino
  ('characters-with-a-famous-favorite-food', 'wd-Q199796', 1), -- Popeye
  ('characters-with-a-famous-favorite-food', 'wd-Q188574', 2), -- Winnie the Pooh
  ('characters-with-a-famous-favorite-food', 'wd-Q931', 3), -- Naruto Uzumaki
  ('characters-with-a-famous-favorite-food', 'wd-Q632908', 4), -- Paddington Bear
  ('characters-with-a-famous-favorite-food', 'wd-Q2328583', 5), -- Ryuk
  ('characters-with-a-famous-vehicle', 'wd-Q2695156', 1), -- Batman
  ('characters-with-a-famous-vehicle', 'wd-Q51802', 2), -- Han Solo
  ('characters-with-a-famous-vehicle', 'wd-Q2337004', 3), -- Emmett Brown
  ('characters-with-a-famous-vehicle', 'wd-Q315796', 4), -- Santa Claus
  ('characters-with-a-famous-vehicle', 'wd-Q614889', 5), -- Fred Flintstone
  ('characters-with-a-number-in-their-name', 'wd-Q51788', 1), -- R2-D2
  ('characters-with-a-number-in-their-name', 'wd-Q833933', 2), -- HAL 9000
  ('characters-with-a-number-in-their-name', 'wd-Q1996431', 3), -- Agent 47
  ('characters-with-a-number-in-their-name', 'wd-Q295599', 4), -- Two-Face
  ('characters-with-a-number-in-their-name', 'wd-Q27955792', 5), -- Eleven
  ('characters-with-matching-initials', 'wd-Q11934', 1), -- Mickey Mouse
  ('characters-with-matching-initials', 'wd-Q107190', 2), -- Peter Pan
  ('characters-with-matching-initials', 'wd-Q216810', 3), -- King Kong
  ('characters-with-matching-initials', 'wd-Q176772', 4), -- Severus Snape
  ('characters-with-matching-initials', 'wd-Q185737', 5), -- Bilbo Baggins
  ('clumsy-characters', 'wd-Q111135', 1), -- Goofy
  ('clumsy-characters', 'wd-Q13471616', 2), -- Mr. Bean
  ('clumsy-characters', 'wd-Q51793', 3), -- Jar Jar Binks
  ('clumsy-characters', 'wd-Q323637', 4), -- Inspector Clouseau
  ('clumsy-characters', 'wd-Q190366', 5), -- Neville Longbottom
  ('geniuses', 'wd-Q937', 1), -- Albert Einstein
  ('geniuses', 'wd-Q4653', 2), -- Sherlock Holmes
  ('geniuses', 'wd-Q762', 3), -- Leonardo da Vinci
  ('geniuses', 'wd-Q180704', 4), -- Iron Man
  ('geniuses', 'wd-Q52863', 5), -- L
  ('gloomy-characters', 'wd-Q1799013', 1), -- Eeyore
  ('gloomy-characters', 'wd-Q1168491', 2), -- Charlie Brown
  ('gloomy-characters', 'wd-Q1064404', 3), -- Squidward Tentacles
  ('gloomy-characters', 'wd-Q1143582', 4), -- Shinji Ikari
  ('gloomy-characters', 'wd-Q2575084', 5), -- Wednesday Addams
  ('greedy-characters', 'wd-Q1193472', 1), -- Mr. Krabs
  ('greedy-characters', 'wd-Q11937', 2), -- Scrooge McDuck
  ('greedy-characters', 'wd-Q536138', 3), -- Wario
  ('greedy-characters', 'wd-Q626756', 4), -- Ebenezer Scrooge
  ('greedy-characters', 'wd-Q877964', 5), -- Nami
  ('grumpy-or-hot-tempered-characters', 'wd-Q6550', 1), -- Donald Duck
  ('grumpy-or-hot-tempered-characters', 'wd-Q188760', 2), -- Hulk
  ('grumpy-or-hot-tempered-characters', 'wd-Q719748', 3), -- Grinch
  ('grumpy-or-hot-tempered-characters', 'wd-Q2663574', 4), -- Oscar the Grouch
  ('grumpy-or-hot-tempered-characters', 'al-88892', 5), -- Katsuki Bakugou
  ('lazy-characters', 'wd-Q1077456', 1), -- Patrick Star
  ('lazy-characters', 'wd-Q2480066', 2), -- Snorlax
  ('lazy-characters', 'wd-Q7810', 3), -- Homer Simpson
  ('lazy-characters', 'wd-Q30334', 4), -- Shikamaru Nara
  ('lazy-characters', 'wd-Q5644130', 5), -- Don Ramón
  ('liars-and-tricksters', 'wd-Q6502703', 1), -- Pinocchio
  ('liars-and-tricksters', 'wd-Q1147326', 2), -- Loki
  ('liars-and-tricksters', 'wd-Q1078696', 3), -- Usopp
  ('liars-and-tricksters', 'wd-Q202857', 4), -- Captain Jack Sparrow
  ('liars-and-tricksters', 'wd-Q1069773', 5), -- José Carioca
  ('nerds', 'wd-Q629583', 1), -- Sheldon Cooper
  ('nerds', 'wd-Q929855', 2), -- Velma Dinkley
  ('nerds', 'wd-Q174009', 3), -- Hermione Granger
  ('nerds', 'wd-Q5846', 4), -- Lisa Simpson
  ('nerds', 'wd-Q6200946', 5), -- Jimmy Neutron
  ('rebels', 'wd-Q51797', 1), -- Princess Leia
  ('rebels', 'wd-Q122634', 2), -- Robin Hood
  ('rebels', 'wd-Q2071301', 3), -- Katniss Everdeen
  ('rebels', 'wd-Q952328', 4), -- Lelouch Lamperouge
  ('rebels', 'wd-Q5809', 5), -- Che Guevara
  ('rich-characters', 'wd-Q11937', 1), -- Scrooge McDuck
  ('rich-characters', 'wd-Q180704', 2), -- Iron Man
  ('rich-characters', 'wd-Q2695156', 3), -- Batman
  ('rich-characters', 'wd-Q716636', 4), -- Mr. Burns
  ('rich-characters', 'wd-Q7048121', 5), -- Jay Gatsby
  ('scaredy-cats', 'wd-Q901323', 1), -- Scooby-Doo
  ('scaredy-cats', 'wd-Q2542307', 2), -- The Cowardly Lion
  ('scaredy-cats', 'al-129131', 3), -- Zenitsu Agatsuma
  ('scaredy-cats', 'wd-Q836719', 4), -- Piglet
  ('scaredy-cats', 'wd-Q210593', 5), -- Luigi
  ('spoiled-characters', 'wd-Q179641', 1), -- Draco Malfoy
  ('spoiled-characters', 'wd-Q47352', 2), -- Eric Cartman
  ('spoiled-characters', 'wd-Q7421675', 3), -- Quico
  ('spoiled-characters', 'wd-Q12900597', 4), -- Joffrey Baratheon
  ('spoiled-characters', 'wd-Q1649955', 5), -- Scarlett O'Hara
  -- scifi
  ('ai-characters', 'wd-Q833933', 1), -- HAL 9000
  ('ai-characters', 'wd-Q65089566', 2), -- J.A.R.V.I.S.
  ('ai-characters', 'wd-Q2085488', 3), -- Agent Smith
  ('ai-characters', 'wd-Q478507', 4), -- Skynet
  ('ai-characters', 'wd-Q1088996', 5), -- KITT
  ('aliens', 'wd-Q209758', 1), -- Xenomorph
  ('aliens', 'wd-Q602854', 2), -- Stitch
  ('aliens', 'wd-Q79015', 3), -- Superman
  ('aliens', 'wd-Q757313', 4), -- Frieza
  ('aliens', 'wd-Q51803', 5), -- Chewbacca
  ('characters-who-went-to-space', 'wd-Q1615', 1), -- Neil Armstrong
  ('characters-who-went-to-space', 'wd-Q7327', 2), -- Yuri Gagarin
  ('characters-who-went-to-space', 'wd-Q1986193', 3), -- Buzz Lightyear
  ('characters-who-went-to-space', 'wd-Q988925', 4), -- Ellen Ripley
  ('characters-who-went-to-space', 'wd-Q2252', 5), -- Buzz Aldrin
  ('cyborgs', 'wd-Q2466726', 1), -- Cyborg
  ('cyborgs', 'wd-Q1976616', 2), -- Terminator
  ('cyborgs', 'wd-Q6918065', 3), -- Motoko Kusanagi
  ('cyborgs', 'al-73979', 4), -- Genos
  ('cyborgs', 'wd-Q51792', 5), -- General Grievous
  ('robots', 'wd-Q51788', 1), -- R2-D2
  ('robots', 'wd-Q151583', 2), -- Optimus Prime
  ('robots', 'wd-Q1186309', 3), -- Doraemon
  ('robots', 'wd-Q750023', 4), -- Bender
  ('robots', 'wd-Q3174269', 5), -- Mega Man
  ('sci-fi-characters', 'wd-Q12206942', 1), -- Darth Vader
  ('sci-fi-characters', 'wd-Q16341', 2), -- Spock
  ('sci-fi-characters', 'wd-Q247120', 3), -- Neo
  ('sci-fi-characters', 'wd-Q988925', 4), -- Ellen Ripley
  ('sci-fi-characters', 'wd-Q2338941', 5), -- Marty McFly
  ('spaceship-pilots', 'wd-Q51802', 1), -- Han Solo
  ('spaceship-pilots', 'wd-Q3496918', 2), -- Star-Lord
  ('spaceship-pilots', 'wd-Q2081430', 3), -- Fox McCloud
  ('spaceship-pilots', 'al-1', 4), -- Spike Spiegel
  ('spaceship-pilots', 'wd-Q1986193', 5), -- Buzz Lightyear
  ('star-wars-characters', 'wd-Q12206942', 1), -- Darth Vader
  ('star-wars-characters', 'wd-Q51746', 2), -- Luke Skywalker
  ('star-wars-characters', 'wd-Q51730', 3), -- Yoda
  ('star-wars-characters', 'wd-Q51797', 4), -- Princess Leia
  ('star-wars-characters', 'wd-Q51802', 5), -- Han Solo
  ('starship-captains', 'wd-Q16311', 1), -- James T. Kirk
  ('starship-captains', 'wd-Q51802', 2), -- Han Solo
  ('starship-captains', 'wd-Q16276', 3), -- Jean-Luc Picard
  ('starship-captains', 'wd-Q3496918', 4), -- Star-Lord
  ('starship-captains', 'al-3', 5), -- Jet Black
  ('time-travelers', 'wd-Q2338941', 1), -- Marty McFly
  ('time-travelers', 'wd-Q1976616', 2), -- Terminator
  ('time-travelers', 'wd-Q1186309', 3), -- Doraemon
  ('time-travelers', 'wd-Q34358', 4), -- The Doctor
  ('time-travelers', 'wd-Q757302', 5), -- Trunks
  -- screen
  ('action-movie-heroes', 'wd-Q2009573', 1), -- James Bond
  ('action-movie-heroes', 'wd-Q148659', 2), -- Indiana Jones
  ('action-movie-heroes', 'wd-Q951317', 3), -- John Rambo
  ('action-movie-heroes', 'wd-Q2082223', 4), -- John McClane
  ('action-movie-heroes', 'wd-Q64417139', 5), -- John Wick
  ('animated-movie-characters', 'wd-Q52401', 1), -- Shrek
  ('animated-movie-characters', 'wd-Q15620419', 2), -- Elsa
  ('animated-movie-characters', 'wd-Q1986193', 3), -- Buzz Lightyear
  ('animated-movie-characters', 'wd-Q15736052', 4), -- Minions
  ('animated-movie-characters', 'al-269', 5), -- Totoro
  ('characters-with-multiple-versions', 'wd-Q79037', 1), -- Spider-Man
  ('characters-with-multiple-versions', 'wd-Q2695156', 2), -- Batman
  ('characters-with-multiple-versions', 'wd-Q2009573', 3), -- James Bond
  ('characters-with-multiple-versions', 'wd-Q4653', 4), -- Sherlock Holmes
  ('characters-with-multiple-versions', 'wd-Q6567', 5), -- Godzilla
  ('comedy-movie-characters', 'wd-Q13471616', 1), -- Mr. Bean
  ('comedy-movie-characters', 'wd-Q5651141', 2), -- Borat Margaret Sagdiyev
  ('comedy-movie-characters', 'wd-Q765880', 3), -- The Tramp
  ('comedy-movie-characters', 'wd-Q2071380', 4), -- Austin Powers
  ('comedy-movie-characters', 'wd-Q323637', 5), -- Inspector Clouseau
  ('dc-characters', 'wd-Q2695156', 1), -- Batman
  ('dc-characters', 'wd-Q79015', 2), -- Superman
  ('dc-characters', 'wd-Q338430', 3), -- Wonder Woman
  ('dc-characters', 'wd-Q217533', 4), -- The Joker
  ('dc-characters', 'wd-Q849477', 5), -- Harley Quinn
  ('disney-characters', 'wd-Q11934', 1), -- Mickey Mouse
  ('disney-characters', 'wd-Q6550', 2), -- Donald Duck
  ('disney-characters', 'wd-Q15620419', 3), -- Elsa
  ('disney-characters', 'wd-Q602854', 4), -- Stitch
  ('disney-characters', 'wd-Q1649583', 5), -- Simba
  ('dreamworks-characters', 'wd-Q52401', 1), -- Shrek
  ('dreamworks-characters', 'wd-Q3307548', 2), -- Po
  ('dreamworks-characters', 'wd-Q748427', 3), -- Donkey
  ('dreamworks-characters', 'wd-Q52405', 4), -- Princess Fiona
  ('dreamworks-characters', 'wd-Q2283527', 5), -- Puss in Boots
  ('harry-potter-characters', 'wd-Q3244512', 1), -- Harry Potter
  ('harry-potter-characters', 'wd-Q174009', 2), -- Hermione Granger
  ('harry-potter-characters', 'wd-Q173998', 3), -- Ron Weasley
  ('harry-potter-characters', 'wd-Q712548', 4), -- Albus Dumbledore
  ('harry-potter-characters', 'wd-Q176132', 5), -- Lord Voldemort
  ('horror-movie-characters', 'wd-Q329466', 1), -- Freddy Krueger
  ('horror-movie-characters', 'wd-Q366957', 2), -- Jason Voorhees
  ('horror-movie-characters', 'wd-Q25097', 3), -- Chucky
  ('horror-movie-characters', 'wd-Q1426891', 4), -- Michael Myers
  ('horror-movie-characters', 'wd-Q18615088', 5), -- Annabelle
  ('marvel-characters', 'wd-Q79037', 1), -- Spider-Man
  ('marvel-characters', 'wd-Q180704', 2), -- Iron Man
  ('marvel-characters', 'wd-Q190679', 3), -- Captain America
  ('marvel-characters', 'wd-Q188760', 4), -- Hulk
  ('marvel-characters', 'wd-Q186422', 5), -- Wolverine
  ('pixar-characters', 'wd-Q2290907', 1), -- Woody
  ('pixar-characters', 'wd-Q864418', 2), -- Lightning McQueen
  ('pixar-characters', 'wd-Q1986193', 3), -- Buzz Lightyear
  ('pixar-characters', 'wd-Q616658', 4), -- Mr. Incredible
  ('pixar-characters', 'wd-Q6819227', 5), -- Merida
  ('the-lord-of-the-rings-characters', 'wd-Q177499', 1), -- Gandalf
  ('the-lord-of-the-rings-characters', 'wd-Q177329', 2), -- Frodo Baggins
  ('the-lord-of-the-rings-characters', 'wd-Q15007', 3), -- Gollum
  ('the-lord-of-the-rings-characters', 'wd-Q180322', 4), -- Aragorn
  ('the-lord-of-the-rings-characters', 'wd-Q213480', 5), -- Legolas
  ('tv-series-characters', 'wd-Q23554', 1), -- Walter White
  ('tv-series-characters', 'wd-Q629583', 2), -- Sheldon Cooper
  ('tv-series-characters', 'wd-Q2708078', 3), -- Daenerys Targaryen
  ('tv-series-characters', 'wd-Q27955792', 4), -- Eleven
  ('tv-series-characters', 'wd-Q842945', 5), -- Gregory House
  -- sports
  ('basketball-players', 'wd-Q41421', 1), -- Michael Jordan
  ('basketball-players', 'wd-Q36159', 2), -- LeBron James
  ('basketball-players', 'wd-Q25369', 3), -- Kobe Bryant
  ('basketball-players', 'wd-Q352159', 4), -- Stephen Curry
  ('basketball-players', 'wd-Q169452', 5), -- Shaquille O'Neal
  ('boxers', 'wd-Q36107', 1), -- Muhammad Ali
  ('boxers', 'wd-Q79031', 2), -- Mike Tyson
  ('boxers', 'wd-Q318204', 3), -- Floyd Mayweather
  ('boxers', 'wd-Q486359', 4), -- Manny Pacquiao
  ('boxers', 'wd-Q213919', 5), -- George Foreman
  ('coaches-and-trainers', 'wd-Q164038', 1), -- Pep Guardiola
  ('coaches-and-trainers', 'wd-Q79983', 2), -- José Mourinho
  ('coaches-and-trainers', 'wd-Q174614', 3), -- Carlo Ancelotti
  ('coaches-and-trainers', 'wd-Q44980', 4), -- Alex Ferguson
  ('coaches-and-trainers', 'wd-Q6383900', 5), -- Mr. Miyagi
  ('fictional-athletes', 'wd-Q2289535', 1), -- Rocky Balboa
  ('fictional-athletes', 'wd-Q2484120', 2), -- Tsubasa Oozora
  ('fictional-athletes', 'al-140856', 3), -- Yoichi Isagi
  ('fictional-athletes', 'al-310', 4), -- Hanamichi Sakuragi
  ('fictional-athletes', 'al-64769', 5), -- Shouyou Hinata
  ('martial-artists', 'wd-Q16397', 1), -- Bruce Lee
  ('martial-artists', 'wd-Q36970', 2), -- Jackie Chan
  ('martial-artists', 'wd-Q2673', 3), -- Chuck Norris
  ('martial-artists', 'wd-Q5162259', 4), -- Conor McGregor
  ('martial-artists', 'wd-Q1223440', 5), -- Ryu
  ('olympic-athletes', 'wd-Q1189', 1), -- Usain Bolt
  ('olympic-athletes', 'wd-Q39562', 2), -- Michael Phelps
  ('olympic-athletes', 'wd-Q7520267', 3), -- Simone Biles
  ('olympic-athletes', 'wd-Q33228', 4), -- Nadia Comăneci
  ('olympic-athletes', 'wd-Q597023', 5), -- Yuzuru Hanyū
  ('pro-wrestlers', 'wd-Q44176', 1), -- Hulk Hogan
  ('pro-wrestlers', 'wd-Q44437', 2), -- John Cena
  ('pro-wrestlers', 'wd-Q44304', 3), -- The Undertaker
  ('pro-wrestlers', 'wd-Q44368', 4), -- André the Giant
  ('pro-wrestlers', 'wd-Q10738', 5), -- Dwayne Johnson
  ('race-car-drivers', 'wd-Q10490', 1), -- Ayrton Senna
  ('race-car-drivers', 'wd-Q9671', 2), -- Michael Schumacher
  ('race-car-drivers', 'wd-Q9673', 3), -- Lewis Hamilton
  ('race-car-drivers', 'wd-Q2239218', 4), -- Max Verstappen
  ('race-car-drivers', 'wd-Q10514', 5), -- Fernando Alonso
  ('soccer-players', 'wd-Q615', 1), -- Lionel Messi
  ('soccer-players', 'wd-Q11571', 2), -- Cristiano Ronaldo
  ('soccer-players', 'wd-Q12897', 3), -- Pelé
  ('soccer-players', 'wd-Q142794', 4), -- Neymar
  ('soccer-players', 'wd-Q17515', 5), -- Diego Maradona
  ('tennis-players', 'wd-Q1426', 1), -- Roger Federer
  ('tennis-players', 'wd-Q10132', 2), -- Rafael Nadal
  ('tennis-players', 'wd-Q11459', 3), -- Serena Williams
  ('tennis-players', 'wd-Q5812', 4), -- Novak Djokovic
  ('tennis-players', 'wd-Q17466583', 5), -- Naomi Osaka
  -- warriors
  ('archers', 'wd-Q122634', 1), -- Robin Hood
  ('archers', 'wd-Q213480', 2), -- Legolas
  ('archers', 'wd-Q19095', 3), -- Hawkeye
  ('archers', 'wd-Q2071301', 4), -- Katniss Everdeen
  ('archers', 'wd-Q611993', 5), -- Green Arrow
  ('assassins', 'wd-Q64417139', 1), -- John Wick
  ('assassins', 'wd-Q1996431', 2), -- Agent 47
  ('assassins', 'al-138102', 3), -- Yor Forger
  ('assassins', 'wd-Q2717625', 4), -- Killua Zoldyck
  ('assassins', 'wd-Q1181328', 5), -- Deathstroke
  ('characters-who-use-weapons', 'wd-Q223684', 1), -- Lara Croft
  ('characters-who-use-weapons', 'wd-Q951317', 2), -- John Rambo
  ('characters-who-use-weapons', 'wd-Q717588', 3), -- Thor
  ('characters-who-use-weapons', 'wd-Q12206942', 4), -- Darth Vader
  ('characters-who-use-weapons', 'wd-Q2009573', 5), -- James Bond
  ('criminals', 'wd-Q217533', 1), -- The Joker
  ('criminals', 'wd-Q23554', 2), -- Walter White
  ('criminals', 'wd-Q745077', 3), -- Vito Corleone
  ('criminals', 'wd-Q211013', 4), -- Hannibal Lecter
  ('criminals', 'wd-Q283111', 5), -- Professor Moriarty
  ('hunters', 'wd-Q654588', 1), -- Kraven the Hunter
  ('hunters', 'wd-Q39503', 2), -- Artemis
  ('hunters', 'wd-Q1622359', 3), -- Abraham Van Helsing
  ('hunters', 'wd-Q2717608', 4), -- Gon Freecss
  ('hunters', 'wd-Q2492923', 5), -- Geralt of Rivia
  ('knights', 'wd-Q45792', 1), -- King Arthur
  ('knights', 'wd-Q215681', 2), -- Lancelot
  ('knights', 'wd-Q11680307', 3), -- Brienne of Tarth
  ('knights', 'wd-Q51740', 4), -- Obi-Wan Kenobi
  ('knights', 'wd-Q2441117', 5), -- Pegasus Seiya
  ('ninjas', 'wd-Q931', 1), -- Naruto Uzumaki
  ('ninjas', 'wd-Q323934', 2), -- Leonardo
  ('ninjas', 'wd-Q584674', 3), -- Scorpion
  ('ninjas', 'wd-Q1317441', 4), -- Mai Shiranui
  ('ninjas', 'wd-Q3290281', 5), -- Snake Eyes
  ('pirates', 'wd-Q202857', 1), -- Captain Jack Sparrow
  ('pirates', 'wd-Q477948', 2), -- Monkey D. Luffy
  ('pirates', 'wd-Q1035128', 3), -- Captain Hook
  ('pirates', 'wd-Q1428628', 4), -- Long John Silver
  ('pirates', 'wd-Q36517', 5), -- Francis Drake
  ('samurai', 'wd-Q193344', 1), -- Miyamoto Musashi
  ('samurai', 'wd-Q1036543', 2), -- Himura Kenshin
  ('samurai', 'wd-Q171411', 3), -- Oda Nobunaga
  ('samurai', 'al-672', 4), -- Gintoki Sakata
  ('samurai', 'wd-Q171977', 5), -- Tokugawa Ieyasu
  ('swordfighters', 'wd-Q226822', 1), -- Zorro
  ('swordfighters', 'wd-Q858432', 2), -- Roronoa Zoro
  ('swordfighters', 'wd-Q568553', 3), -- Link
  ('swordfighters', 'wd-Q85805158', 4), -- Tanjirō Kamado
  ('swordfighters', 'wd-Q1773077', 5), -- Aramis
  ('thieves', 'wd-Q461606', 1), -- Arsène Lupin
  ('thieves', 'wd-Q158952', 2), -- Catwoman
  ('thieves', 'wd-Q122634', 3), -- Robin Hood
  ('thieves', 'wd-Q1798441', 4), -- Beagle Boys
  ('thieves', 'al-1044', 5), -- Arsène Lupin III
  ('vikings', 'wd-Q314492', 1), -- Ragnar Lodbrok
  ('vikings', 'al-10138', 2), -- Thorfinn Karlsefni
  ('vikings', 'wd-Q6495913', 3), -- Lathgertha
  ('vikings', 'wd-Q42838', 4), -- Leif Erikson
  ('vikings', 'wd-Q114024745', 5), -- Askeladd
  ('warrior-women', 'wd-Q338430', 1), -- Wonder Woman
  ('warrior-women', 'wd-Q246838', 2), -- Mulan
  ('warrior-women', 'wd-Q7226', 3), -- Joan of Arc
  ('warrior-women', 'wd-Q545694', 4), -- Xena
  ('warrior-women', 'al-40881', 5), -- Mikasa Ackerman
  ('wild-west-characters', 'wd-Q2290907', 1), -- Woody
  ('wild-west-characters', 'wd-Q596978', 2), -- Man with No Name
  ('wild-west-characters', 'wd-Q1588097', 3), -- Lone Ranger
  ('wild-west-characters', 'wd-Q202285', 4), -- Buffalo Bill
  ('wild-west-characters', 'wd-Q1248567', 5), -- Yosemite Sam
  -- world
  ('characters-who-live-in-new-york', 'wd-Q79037', 1), -- Spider-Man
  ('characters-who-live-in-new-york', 'wd-Q323934', 2), -- Leonardo
  ('characters-who-live-in-new-york', 'wd-Q254678', 3), -- Carrie Bradshaw
  ('characters-who-live-in-new-york', 'wd-Q745284', 4), -- Chandler Bing
  ('characters-who-live-in-new-york', 'wd-Q745077', 5), -- Vito Corleone
  ('characters-who-live-in-the-desert', 'wd-Q1358109', 1), -- Aladdin
  ('characters-who-live-in-the-desert', 'wd-Q822524', 2), -- Wile E. Coyote and the Road Runner
  ('characters-who-live-in-the-desert', 'wd-Q221196', 3), -- Gaara
  ('characters-who-live-in-the-desert', 'wd-Q51746', 4), -- Luke Skywalker
  ('characters-who-live-in-the-desert', 'wd-Q939956', 5), -- Paul Atreides
  ('characters-who-live-in-the-jungle', 'wd-Q170241', 1), -- Tarzan
  ('characters-who-live-in-the-jungle', 'wd-Q1381592', 2), -- Mowgli
  ('characters-who-live-in-the-jungle', 'wd-Q216810', 3), -- King Kong
  ('characters-who-live-in-the-jungle', 'wd-Q12389', 4), -- Donkey Kong
  ('characters-who-live-in-the-jungle', 'wd-Q1073705', 5), -- Timon and Pumbaa
  ('characters-who-live-in-the-sea', 'wd-Q935079', 1), -- SpongeBob SquarePants
  ('characters-who-live-in-the-sea', 'wd-Q892442', 2), -- Ariel
  ('characters-who-live-in-the-sea', 'wd-Q623059', 3), -- Aquaman
  ('characters-who-live-in-the-sea', 'wd-Q41127', 4), -- Poseidon
  ('characters-who-live-in-the-sea', 'al-14286', 5), -- Ponyo
  ('characters-who-live-on-an-island', 'wd-Q21233695', 1), -- Moana
  ('characters-who-live-on-an-island', 'wd-Q602854', 2), -- Stitch
  ('characters-who-live-on-an-island', 'wd-Q1752065', 3), -- Master Roshi
  ('characters-who-live-on-an-island', 'wd-Q214174', 4), -- Yoshi
  ('characters-who-live-on-an-island', 'wd-Q1063506', 5), -- Crash Bandicoot
  ('famous-americans', 'wd-Q2831', 1), -- Michael Jackson
  ('famous-americans', 'wd-Q91', 2), -- Abraham Lincoln
  ('famous-americans', 'wd-Q4616', 3), -- Marilyn Monroe
  ('famous-americans', 'wd-Q76', 4), -- Barack Obama
  ('famous-americans', 'wd-Q41421', 5), -- Michael Jordan
  ('famous-brazilians', 'wd-Q12897', 1), -- Pelé
  ('famous-brazilians', 'wd-Q10490', 2), -- Ayrton Senna
  ('famous-brazilians', 'wd-Q142794', 3), -- Neymar
  ('famous-brazilians', 'wd-Q39444', 4), -- Ronaldinho
  ('famous-brazilians', 'wd-Q152208', 5), -- Gisele Bündchen
  ('famous-british-people-and-characters', 'wd-Q9682', 1), -- Elizabeth II
  ('famous-british-people-and-characters', 'wd-Q3244512', 2), -- Harry Potter
  ('famous-british-people-and-characters', 'wd-Q4653', 3), -- Sherlock Holmes
  ('famous-british-people-and-characters', 'wd-Q13471616', 4), -- Mr. Bean
  ('famous-british-people-and-characters', 'wd-Q1203', 5), -- John Lennon
  ('famous-chinese-people-and-characters', 'wd-Q36970', 1), -- Jackie Chan
  ('famous-chinese-people-and-characters', 'wd-Q246838', 2), -- Mulan
  ('famous-chinese-people-and-characters', 'wd-Q4604', 3), -- Confucius
  ('famous-chinese-people-and-characters', 'wd-Q16397', 4), -- Bruce Lee
  ('famous-chinese-people-and-characters', 'wd-Q11773777', 5), -- Sun Wukong
  ('famous-french-people-and-characters', 'wd-Q517', 1), -- Napoleon
  ('famous-french-people-and-characters', 'wd-Q7226', 2), -- Joan of Arc
  ('famous-french-people-and-characters', 'wd-Q461606', 3), -- Arsène Lupin
  ('famous-french-people-and-characters', 'wd-Q21621995', 4), -- Kylian Mbappé
  ('famous-french-people-and-characters', 'wd-Q45661', 5), -- Coco Chanel
  ('famous-italian-people-and-characters', 'wd-Q762', 1), -- Leonardo da Vinci
  ('famous-italian-people-and-characters', 'wd-Q6502703', 2), -- Pinocchio
  ('famous-italian-people-and-characters', 'wd-Q12379', 3), -- Mario
  ('famous-italian-people-and-characters', 'wd-Q307', 4), -- Galileo Galilei
  ('famous-italian-people-and-characters', 'wd-Q6101', 5), -- Marco Polo
  ('famous-japanese-people', 'wd-Q55400', 1), -- Hayao Miyazaki
  ('famous-japanese-people', 'wd-Q208582', 2), -- Akira Toriyama
  ('famous-japanese-people', 'wd-Q4391858', 3), -- Shohei Ohtani
  ('famous-japanese-people', 'wd-Q117012', 4), -- Yoko Ono
  ('famous-japanese-people', 'wd-Q193344', 5), -- Miyamoto Musashi
  ('famous-mexican-people-and-characters', 'wd-Q5588', 1), -- Frida Kahlo
  ('famous-mexican-people-and-characters', 'wd-Q912984', 2), -- Speedy Gonzales
  ('famous-mexican-people-and-characters', 'wd-Q10271128', 3), -- El Chavo del Ocho
  ('famous-mexican-people-and-characters', 'wd-Q125106', 4), -- Salma Hayek
  ('famous-mexican-people-and-characters', 'wd-Q219124', 5), -- Guillermo del Toro
  ('famous-spanish-people-and-characters', 'wd-Q5593', 1), -- Pablo Picasso
  ('famous-spanish-people-and-characters', 'wd-Q10132', 2), -- Rafael Nadal
  ('famous-spanish-people-and-characters', 'wd-Q5577', 3), -- Salvador Dalí
  ('famous-spanish-people-and-characters', 'wd-Q41548', 4), -- Antonio Banderas
  ('famous-spanish-people-and-characters', 'wd-Q113704154', 5), -- Lamine Yamal
  ('ice-and-snow-characters', 'wd-Q15620419', 1), -- Elsa
  ('ice-and-snow-characters', 'wd-Q388796', 2), -- Sub-Zero
  ('ice-and-snow-characters', 'wd-Q129628', 3), -- Yeti
  ('ice-and-snow-characters', 'wd-Q557584', 4), -- Mr. Freeze
  ('ice-and-snow-characters', 'wd-Q372468', 5) -- Yuki-onna
on conflict do nothing;
