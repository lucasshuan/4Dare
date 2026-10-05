-- Japanese players' own starters (lang 'ja', see migrations/0022), for the
-- themes where the people they know best are not the shared starters' (famous
-- people of the 90s, singers, athletes, yokai...). Ranked first for
-- 'ja' players, the shared ones close behind; other languages never see
-- them. Curated against the hosted library: in its 'ja' part, a clear fit,
-- a picture whenever it has one. Safe to run again: it only inserts.
insert into public.whoami_theme_starters (theme_id, lang, character_id, position) values
  -- cats
  ('cats', 'ja', 'wd-Q1186309', 1), -- Doraemon
  ('cats', 'ja', 'al-3133', 2), -- Jiji
  ('cats', 'ja', 'wd-Q11276181', 3), -- Hikonyan
  -- mascots
  ('mascots', 'ja', 'wd-Q4806134', 1), -- Kumamon
  ('mascots', 'ja', 'wd-Q11277204', 2), -- Funassyi
  ('mascots', 'ja', 'wd-Q11276181', 3), -- Hikonyan
  ('mascots', 'ja', 'wd-Q1272738', 4), -- Domo-kun
  ('mascots', 'ja', 'wd-Q11272433', 5), -- Tsubakuro
  -- tokusatsu-heroes
  ('tokusatsu-heroes', 'ja', 'wd-Q11289201', 1), -- Ultraseven
  ('tokusatsu-heroes', 'ja', 'wd-Q1984905', 2), -- Kamen Rider 2
  ('tokusatsu-heroes', 'ja', 'wd-Q1117779', 3), -- Moonlight Mask
  -- classic-literature-characters
  ('classic-literature-characters', 'ja', 'wd-Q997646', 1), -- Hikaru Genji
  ('classic-literature-characters', 'ja', 'wd-Q1073246', 2), -- Kosuke Kindaichi
  ('classic-literature-characters', 'ja', 'wd-Q1190010', 3), -- Kogoro Akechi
  -- fairy-tale-characters
  ('fairy-tale-characters', 'ja', 'wd-Q877820', 1), -- Momotaro
  ('fairy-tale-characters', 'ja', 'wd-Q1047529', 2), -- Kintaro
  ('fairy-tale-characters', 'ja', 'wd-Q2330988', 3), -- Hare of Inaba
  -- poets
  ('poets', 'ja', 'wd-Q315152', 1), -- Masaoka Shiki
  ('poets', 'ja', 'wd-Q312709', 2), -- Kobayashi Issa
  ('poets', 'ja', 'wd-Q467747', 3), -- Takuboku Ishikawa
  ('poets', 'ja', 'wd-Q464104', 4), -- Akiko Yosano
  ('poets', 'ja', 'wd-Q55993', 5), -- Kenji Miyazawa
  -- princes
  ('princes', 'ja', 'wd-Q263972', 1), -- Prince Shotoku
  ('princes', 'ja', 'wd-Q844333', 2), -- Prince Hisahito
  ('princes', 'ja', 'wd-Q311174', 3), -- Crown Prince Fumihito
  -- princesses
  ('princesses', 'ja', 'wd-Q743509', 1), -- Princess Aiko
  ('princesses', 'ja', 'wd-Q3337177', 2), -- Nausicaa
  ('princesses', 'ja', 'wd-Q1152111', 3), -- Princess Kako
  -- writers
  ('writers', 'ja', 'wd-Q180903', 1), -- Natsume Soseki
  ('writers', 'ja', 'wd-Q317685', 2), -- Osamu Dazai
  ('writers', 'ja', 'wd-Q186326', 3), -- Ryunosuke Akutagawa
  ('writers', 'ja', 'wd-Q43736', 4), -- Yasunari Kawabata
  ('writers', 'ja', 'wd-Q134456', 5), -- Yukio Mishima
  -- characters-from-old-cartoons
  ('characters-from-old-cartoons', 'ja', 'wd-Q11673431', 1), -- Kitaro
  ('characters-from-old-cartoons', 'ja', 'wd-Q3808724', 2), -- Joe Yabuki
  ('characters-from-old-cartoons', 'ja', 'wd-Q1140563', 3), -- Ogon Bat
  -- children-s-cartoon-characters
  ('children-s-cartoon-characters', 'ja', 'wd-Q11175564', 1), -- Anpanman
  ('children-s-cartoon-characters', 'ja', 'wd-Q608166', 2), -- Shinnosuke Nohara
  ('children-s-cartoon-characters', 'ja', 'wd-Q11275947', 3), -- Baikinman
  ('children-s-cartoon-characters', 'ja', 'wd-Q1367960', 4), -- Nobita Nobi
  -- cute-characters
  ('cute-characters', 'ja', 'wd-Q2972831', 1), -- Cinnamoroll
  ('cute-characters', 'ja', 'wd-Q1137445', 2), -- Rilakkuma
  ('cute-characters', 'ja', 'wd-Q10646848', 3), -- Pompompurin
  ('cute-characters', 'ja', 'wd-Q11299840', 4), -- Kuromi
  -- actors
  ('actors', 'ja', 'wd-Q362254', 1), -- Takuya Kimura
  ('actors', 'ja', 'wd-Q211553', 2), -- Ken Watanabe
  ('actors', 'ja', 'wd-Q940531', 3), -- Hiroshi Abe
  ('actors', 'ja', 'wd-Q1134047', 4), -- Masaki Suda
  ('actors', 'ja', 'wd-Q908782', 5), -- Masato Sakai
  -- actresses
  ('actresses', 'ja', 'wd-Q1206963', 1), -- Haruka Ayase
  ('actresses', 'ja', 'wd-Q1137510', 2), -- Yui Aragaki
  ('actresses', 'ja', 'wd-Q1197220', 3), -- Satomi Ishihara
  ('actresses', 'ja', 'wd-Q253900', 4), -- Masami Nagasawa
  ('actresses', 'ja', 'wd-Q871576', 5), -- Kasumi Arimura
  -- celebrities-known-by-one-name
  ('celebrities-known-by-one-name', 'ja', 'wd-Q600', 1), -- Ichiro
  ('celebrities-known-by-one-name', 'ja', 'wd-Q44606', 2), -- GACKT
  ('celebrities-known-by-one-name', 'ja', 'wd-Q850746', 3), -- Tamori
  ('celebrities-known-by-one-name', 'ja', 'wd-Q2913212', 4), -- Rola
  ('celebrities-known-by-one-name', 'ja', 'wd-Q456604', 5), -- Becky
  -- child-actors
  ('child-actors', 'ja', 'wd-Q1135649', 1), -- Mana Ashida
  ('child-actors', 'ja', 'wd-Q875763', 2), -- Fuku Suzuki
  ('child-actors', 'ja', 'wd-Q1202173', 3), -- Mirai Shida
  ('child-actors', 'ja', 'wd-Q1041546', 4), -- Ryunosuke Kamiki
  -- comedians
  ('comedians', 'ja', 'wd-Q1320080', 1), -- Ken Shimura
  ('comedians', 'ja', 'wd-Q1075328', 2), -- Sanma Akashiya
  ('comedians', 'ja', 'wd-Q528506', 3), -- Hitoshi Matsumoto
  ('comedians', 'ja', 'wd-Q706671', 4), -- Naomi Watanabe
  -- comedy-groups
  ('comedy-groups', 'ja', 'wd-Q1154064', 1), -- Downtown
  ('comedy-groups', 'ja', 'wd-Q11305855', 2), -- Sandwichman
  ('comedy-groups', 'ja', 'wd-Q13603384', 3), -- Chidori
  -- famous-people-from-the-2000s
  ('famous-people-from-the-2000s', 'ja', 'wd-Q130852', 1), -- Junichiro Koizumi
  ('famous-people-from-the-2000s', 'ja', 'wd-Q188111', 2), -- Ayumi Hamasaki
  ('famous-people-from-the-2000s', 'ja', 'wd-Q229732', 3), -- Kumi Koda
  ('famous-people-from-the-2000s', 'ja', 'wd-Q954080', 4), -- Hideki Matsui
  -- famous-people-from-the-60s
  ('famous-people-from-the-60s', 'ja', 'wd-Q313081', 1), -- Kyu Sakamoto
  ('famous-people-from-the-60s', 'ja', 'wd-Q910160', 2), -- Shigeo Nagashima
  ('famous-people-from-the-60s', 'ja', 'wd-Q319055', 3), -- Taiho
  ('famous-people-from-the-60s', 'ja', 'wd-Q3113502', 4), -- Yuzo Kayama
  -- famous-people-from-the-70s
  ('famous-people-from-the-70s', 'ja', 'wd-Q1198084', 1), -- Momoe Yamaguchi
  ('famous-people-from-the-70s', 'ja', 'wd-Q498416', 2), -- Pink Lady
  ('famous-people-from-the-70s', 'ja', 'wd-Q297644', 3), -- Kakuei Tanaka
  ('famous-people-from-the-70s', 'ja', 'wd-Q1366214', 4), -- Candies
  -- famous-people-from-the-80s
  ('famous-people-from-the-80s', 'ja', 'wd-Q284007', 1), -- Seiko Matsuda
  ('famous-people-from-the-80s', 'ja', 'wd-Q1143664', 2), -- Akina Nakamori
  ('famous-people-from-the-80s', 'ja', 'wd-Q311728', 3), -- Chiyonofuji
  ('famous-people-from-the-80s', 'ja', 'wd-Q250828', 4), -- Yasuhiro Nakasone
  -- famous-people-from-the-90s
  ('famous-people-from-the-90s', 'ja', 'wd-Q266676', 1), -- Namie Amuro
  ('famous-people-from-the-90s', 'ja', 'wd-Q234598', 2), -- Hikaru Utada
  ('famous-people-from-the-90s', 'ja', 'wd-Q1138250', 3), -- SMAP
  ('famous-people-from-the-90s', 'ja', 'wd-Q486690', 4), -- Hideo Nomo
  ('famous-people-from-the-90s', 'ja', 'wd-Q541078', 5), -- Takanohana
  -- models
  ('models', 'ja', 'wd-Q2913212', 1), -- Rola
  ('models', 'ja', 'wd-Q1051455', 2), -- Kiko Mizuhara
  ('models', 'ja', 'wd-Q465236', 3), -- Nozomi Sasaki
  ('models', 'ja', 'wd-Q20859398', 4), -- Nicole Fujita
  -- movie-directors
  ('movie-directors', 'ja', 'wd-Q8006', 1), -- Akira Kurosawa
  ('movie-directors', 'ja', 'wd-Q335080', 2), -- Makoto Shinkai
  ('movie-directors', 'ja', 'wd-Q26372', 3), -- Takeshi Kitano
  ('movie-directors', 'ja', 'wd-Q740758', 4), -- Hirokazu Kore-eda
  ('movie-directors', 'ja', 'wd-Q720771', 5), -- Mamoru Hosoda
  -- tv-hosts
  ('tv-hosts', 'ja', 'wd-Q850746', 1), -- Tamori
  ('tv-hosts', 'ja', 'wd-Q1075328', 2), -- Sanma Akashiya
  ('tv-hosts', 'ja', 'wd-Q5770223', 3), -- Hiroiki Ariyoshi
  ('tv-hosts', 'ja', 'wd-Q1999174', 4), -- Monta Mino
  -- youtubers-and-streamers
  ('youtubers-and-streamers', 'ja', 'wd-Q24230271', 1), -- Hajime Shacho
  ('youtubers-and-streamers', 'ja', 'wd-Q2900360', 2), -- Egashira 2:50
  ('youtubers-and-streamers', 'ja', 'wd-Q51915371', 3), -- Junichi Kato
  -- child-characters
  ('child-characters', 'ja', 'wd-Q608166', 1), -- Shinnosuke Nohara
  ('child-characters', 'ja', 'wd-Q1367960', 2), -- Nobita Nobi
  ('child-characters', 'ja', 'wd-Q1134950', 3), -- Takeshi Goda (Gian)
  ('child-characters', 'ja', 'wd-Q977511', 4), -- Shizuka Minamoto
  -- famous-dads
  ('famous-dads', 'ja', 'wd-Q1134585', 1), -- Hiroshi Nohara
  ('famous-dads', 'ja', 'wd-Q986728', 2), -- Nobisuke Nobi
  ('famous-dads', 'ja', 'wd-Q2721109', 3), -- Gendo Ikari
  -- famous-duos
  ('famous-duos', 'ja', 'wd-Q1154064', 1), -- Downtown
  ('famous-duos', 'ja', 'wd-Q150186', 2), -- B'z
  ('famous-duos', 'ja', 'wd-Q1058820', 3), -- Chage and Aska
  ('famous-duos', 'ja', 'wd-Q11305855', 4), -- Sandwichman
  -- famous-moms
  ('famous-moms', 'ja', 'wd-Q377368', 1), -- Misae Nohara
  ('famous-moms', 'ja', 'wd-Q1139513', 2), -- Chi-Chi
  ('famous-moms', 'ja', 'wd-Q986716', 3), -- Tamako Nobi
  -- famous-trios
  ('famous-trios', 'ja', 'wd-Q494703', 1), -- Perfume
  ('famous-trios', 'ja', 'wd-Q1366214', 2), -- Candies
  ('famous-trios', 'ja', 'wd-Q854590', 3), -- Yellow Magic Orchestra
  -- superheroes
  ('superheroes', 'ja', 'wd-Q11175564', 1), -- Anpanman
  ('superheroes', 'ja', 'wd-Q1988617', 2), -- Kamen Rider 1
  ('superheroes', 'ja', 'wd-Q11289201', 3), -- Ultraseven
  ('superheroes', 'ja', 'wd-Q11289254', 4), -- Ultraman Zero
  -- villains
  ('villains', 'ja', 'wd-Q11275947', 1), -- Baikinman
  ('villains', 'ja', 'al-129132', 2), -- Muzan Kibutsuji
  ('villains', 'ja', 'wd-Q2265989', 3), -- Dio Brando
  -- ancient-history-figures
  ('ancient-history-figures', 'ja', 'wd-Q234451', 1), -- Himiko
  ('ancient-history-figures', 'ja', 'wd-Q263972', 2), -- Prince Shotoku
  ('ancient-history-figures', 'ja', 'wd-Q314802', 3), -- Emperor Tenji
  -- business-people
  ('business-people', 'ja', 'wd-Q717038', 1), -- Masayoshi Son
  ('business-people', 'ja', 'wd-Q313304', 2), -- Soichiro Honda
  ('business-people', 'ja', 'wd-Q252785', 3), -- Konosuke Matsushita
  ('business-people', 'ja', 'wd-Q3276951', 4), -- Tadashi Yanai
  ('business-people', 'ja', 'wd-Q704995', 5), -- Shibusawa Eiichi
  -- historical-figures
  ('historical-figures', 'ja', 'wd-Q171411', 1), -- Oda Nobunaga
  ('historical-figures', 'ja', 'wd-Q171977', 2), -- Tokugawa Ieyasu
  ('historical-figures', 'ja', 'wd-Q187550', 3), -- Toyotomi Hideyoshi
  ('historical-figures', 'ja', 'wd-Q378450', 4), -- Sakamoto Ryoma
  ('historical-figures', 'ja', 'wd-Q263972', 5), -- Prince Shotoku
  -- inventors
  ('inventors', 'ja', 'wd-Q317858', 1), -- Momofuku Ando
  ('inventors', 'ja', 'wd-Q137727', 2), -- Sakichi Toyoda
  ('inventors', 'ja', 'wd-Q968242', 3), -- Hiraga Gennai
  ('inventors', 'ja', 'wd-Q522246', 4), -- Yoshiro Nakamatsu
  -- military-leaders
  ('military-leaders', 'ja', 'wd-Q276404', 1), -- Takeda Shingen
  ('military-leaders', 'ja', 'wd-Q311080', 2), -- Uesugi Kenshin
  ('military-leaders', 'ja', 'wd-Q311183', 3), -- Date Masamune
  ('military-leaders', 'ja', 'wd-Q310445', 4), -- Minamoto no Yoshitsune
  ('military-leaders', 'ja', 'wd-Q296785', 5), -- Togo Heihachiro
  -- painters
  ('painters', 'ja', 'wd-Q5586', 1), -- Katsushika Hokusai
  ('painters', 'ja', 'wd-Q200798', 2), -- Utagawa Hiroshige
  ('painters', 'ja', 'wd-Q983942', 3), -- Taro Okamoto
  ('painters', 'ja', 'wd-Q231121', 4), -- Yayoi Kusama
  -- politicians
  ('politicians', 'ja', 'wd-Q132345', 1), -- Shinzo Abe
  ('politicians', 'ja', 'wd-Q130852', 2), -- Junichiro Koizumi
  ('politicians', 'ja', 'wd-Q297644', 3), -- Kakuei Tanaka
  ('politicians', 'ja', 'wd-Q261703', 4), -- Yuriko Koike
  ('politicians', 'ja', 'wd-Q1705028', 5), -- Sanae Takaichi
  -- queens
  ('queens', 'ja', 'wd-Q234451', 1), -- Himiko
  ('queens', 'ja', 'wd-Q298057', 2), -- Empress Suiko
  ('queens', 'ja', 'wd-Q232026', 3), -- Empress Jito
  -- revolutionaries
  ('revolutionaries', 'ja', 'wd-Q378450', 1), -- Sakamoto Ryoma
  ('revolutionaries', 'ja', 'wd-Q310462', 2), -- Saigo Takamori
  ('revolutionaries', 'ja', 'wd-Q700310', 3), -- Takasugi Shinsaku
  -- scientists
  ('scientists', 'ja', 'wd-Q356114', 1), -- Hideyo Noguchi
  ('scientists', 'ja', 'wd-Q155777', 2), -- Hideki Yukawa
  ('scientists', 'ja', 'wd-Q80917', 3), -- Shinya Yamanaka
  ('scientists', 'ja', 'wd-Q442225', 4), -- Kitasato Shibasaburo
  -- women-who-made-history
  ('women-who-made-history', 'ja', 'wd-Q81731', 1), -- Murasaki Shikibu
  ('women-who-made-history', 'ja', 'wd-Q514524', 2), -- Tsuda Umeko
  ('women-who-made-history', 'ja', 'wd-Q237948', 3), -- Ichiyo Higuchi
  ('women-who-made-history', 'ja', 'wd-Q508522', 4), -- Raicho Hiratsuka
  -- detectives
  ('detectives', 'ja', 'wd-Q1073246', 1), -- Kosuke Kindaichi
  ('detectives', 'ja', 'wd-Q1190010', 2), -- Kogoro Akechi
  ('detectives', 'ja', 'wd-Q599685', 3), -- Kogoro Mori
  ('detectives', 'ja', 'wd-Q389206', 4), -- Heiji Hattori
  -- doctors
  ('doctors', 'ja', 'wd-Q3640722', 1), -- Black Jack
  ('doctors', 'ja', 'wd-Q356114', 2), -- Hideyo Noguchi
  ('doctors', 'ja', 'wd-Q16027699', 3), -- Kenzo Tenma
  -- police-officers
  ('police-officers', 'ja', 'wd-Q1454316', 1), -- Koichi Zenigata
  ('police-officers', 'ja', 'wd-Q1067948', 2), -- Juzo Megure
  ('police-officers', 'ja', 'wd-Q30921021', 3), -- Toru Amuro
  ('police-officers', 'ja', 'wd-Q1036488', 4), -- Wataru Takagi
  -- characters-who-wear-a-mask
  ('characters-who-wear-a-mask', 'ja', 'wd-Q3991253', 1), -- Tiger Mask
  ('characters-who-wear-a-mask', 'ja', 'wd-Q1988617', 2), -- Kamen Rider 1
  ('characters-who-wear-a-mask', 'ja', 'wd-Q1117779', 3), -- Moonlight Mask
  -- characters-who-wear-glasses
  ('characters-who-wear-glasses', 'ja', 'wd-Q1367960', 1), -- Nobita Nobi
  ('characters-who-wear-glasses', 'ja', 'wd-Q844697', 2), -- Conan Edogawa
  ('characters-who-wear-glasses', 'ja', 'wd-Q2859491', 3), -- Arale Norimaki
  -- band-members
  ('band-members', 'ja', 'wd-Q311193', 1), -- Yoshiki
  ('band-members', 'ja', 'wd-Q1197175', 2), -- Keisuke Kuwata
  ('band-members', 'ja', 'wd-Q306122', 3), -- Hyde
  ('band-members', 'ja', 'wd-Q44315', 4), -- Hide
  ('band-members', 'ja', 'wd-Q938749', 5), -- Koshi Inaba
  -- bands-and-music-groups
  ('bands-and-music-groups', 'ja', 'wd-Q626440', 1), -- Arashi
  ('bands-and-music-groups', 'ja', 'wd-Q1378545', 2), -- Southern All Stars
  ('bands-and-music-groups', 'ja', 'wd-Q1138250', 3), -- SMAP
  ('bands-and-music-groups', 'ja', 'wd-Q686915', 4), -- Mr. Children
  ('bands-and-music-groups', 'ja', 'wd-Q179767', 5), -- X Japan
  -- female-singers
  ('female-singers', 'ja', 'wd-Q234598', 1), -- Hikaru Utada
  ('female-singers', 'ja', 'wd-Q266676', 2), -- Namie Amuro
  ('female-singers', 'ja', 'wd-Q147811', 3), -- Hibari Misora
  ('female-singers', 'ja', 'wd-Q188111', 4), -- Ayumi Hamasaki
  ('female-singers', 'ja', 'wd-Q267471', 5), -- Yumi Matsutoya
  -- guitarists
  ('guitarists', 'ja', 'wd-Q699757', 1), -- Tomoyasu Hotei
  ('guitarists', 'ja', 'wd-Q1345739', 2), -- Tak Matsumoto
  ('guitarists', 'ja', 'wd-Q44315', 3), -- Hide
  ('guitarists', 'ja', 'wd-Q311181', 4), -- Miyavi
  -- male-singers
  ('male-singers', 'ja', 'wd-Q1141809', 1), -- Masaharu Fukuyama
  ('male-singers', 'ja', 'wd-Q11604296', 2), -- Kenshi Yonezu
  ('male-singers', 'ja', 'wd-Q313081', 3), -- Kyu Sakamoto
  ('male-singers', 'ja', 'wd-Q11286857', 4), -- Gen Hoshino
  ('male-singers', 'ja', 'wd-Q1154190', 5), -- Tatsuro Yamashita
  -- music-duos
  ('music-duos', 'ja', 'wd-Q150186', 1), -- B'z
  ('music-duos', 'ja', 'wd-Q95688943', 2), -- Yoasobi
  ('music-duos', 'ja', 'wd-Q1058820', 3), -- Chage and Aska
  ('music-duos', 'ja', 'wd-Q920966', 4), -- Puffy AmiYumi
  ('music-duos', 'ja', 'wd-Q1190621', 5), -- Yuzu
  -- rappers
  ('rappers', 'ja', 'wd-Q27150837', 1), -- Chanmina
  ('rappers', 'ja', 'wd-Q184370', 2), -- Zeebra
  ('rappers', 'ja', 'wd-Q20039817', 3), -- Creepy Nuts
  -- rock-stars
  ('rock-stars', 'ja', 'wd-Q958089', 1), -- Eikichi Yazawa
  ('rock-stars', 'ja', 'wd-Q932240', 2), -- Kyosuke Himuro
  ('rock-stars', 'ja', 'wd-Q1193077', 3), -- Yutaka Ozaki
  ('rock-stars', 'ja', 'wd-Q1041744', 4), -- Kiyoshiro Imawano
  -- dragons
  ('dragons', 'ja', 'wd-Q1360226', 1), -- Shenron
  ('dragons', 'ja', 'wd-Q1054437', 2), -- Yamata no Orochi
  ('dragons', 'ja', 'al-120974', 3), -- Kanna Kamui
  -- goddesses
  ('goddesses', 'ja', 'wd-Q682306', 1), -- Izanami
  ('goddesses', 'ja', 'wd-Q818468', 2), -- Benzaiten
  ('goddesses', 'ja', 'wd-Q1781862', 3), -- Konohanasakuya-hime
  -- gods
  ('gods', 'ja', 'wd-Q272993', 1), -- Susanoo
  ('gods', 'ja', 'wd-Q813858', 2), -- Izanagi
  ('gods', 'ja', 'wd-Q1129330', 3), -- Ebisu
  ('gods', 'ja', 'wd-Q1759916', 4), -- Daikokuten
  ('gods', 'ja', 'wd-Q719665', 5), -- Inari
  -- legendary-creatures
  ('legendary-creatures', 'ja', 'wd-Q1054437', 1), -- Yamata no Orochi
  ('legendary-creatures', 'ja', 'wd-Q1072924', 2), -- Tsuchinoko
  ('legendary-creatures', 'ja', 'wd-Q148209', 3), -- Zashiki-warashi
  ('legendary-creatures', 'ja', 'wd-Q1458863', 4), -- Rokurokubi
  ('legendary-creatures', 'ja', 'wd-Q4738985', 5), -- Amabie
  -- monsters
  ('monsters', 'ja', 'wd-Q687240', 1), -- Gamera
  ('monsters', 'ja', 'wd-Q1470558', 2), -- King Ghidorah
  ('monsters', 'ja', 'wd-Q1423458', 3), -- Mothra
  -- characters-who-can-fly
  ('characters-who-can-fly', 'ja', 'wd-Q11175564', 1), -- Anpanman
  ('characters-who-can-fly', 'ja', 'wd-Q11296603', 2), -- Kiki
  ('characters-who-can-fly', 'ja', 'wd-Q11289201', 3), -- Ultraseven
  -- super-strong-characters
  ('super-strong-characters', 'ja', 'wd-Q1047529', 1), -- Kintaro
  ('super-strong-characters', 'ja', 'wd-Q2859491', 2), -- Arale Norimaki
  ('super-strong-characters', 'ja', 'wd-Q2436256', 3), -- Kinnikuman
  -- characters-whose-name-ends-in-man
  ('characters-whose-name-ends-in-man', 'ja', 'wd-Q11175564', 1), -- Anpanman
  ('characters-whose-name-ends-in-man', 'ja', 'wd-Q11275947', 2), -- Baikinman
  ('characters-whose-name-ends-in-man', 'ja', 'wd-Q2436256', 3), -- Kinnikuman
  ('characters-whose-name-ends-in-man', 'ja', 'wd-Q2478370', 4), -- Riderman
  -- characters-whose-name-is-the-title
  ('characters-whose-name-is-the-title', 'ja', 'wd-Q11175564', 1), -- Anpanman
  ('characters-whose-name-is-the-title', 'ja', 'wd-Q2294962', 2), -- Lupin III
  ('characters-whose-name-is-the-title', 'ja', 'wd-Q11673431', 3), -- Kitaro
  ('characters-whose-name-is-the-title', 'ja', 'wd-Q2436256', 4), -- Kinnikuman
  -- characters-with-a-number-in-their-name
  ('characters-with-a-number-in-their-name', 'ja', 'wd-Q2294962', 1), -- Lupin III
  ('characters-with-a-number-in-their-name', 'ja', 'wd-Q2289037', 2), -- Android 18
  ('characters-with-a-number-in-their-name', 'ja', 'wd-Q2481465', 3), -- Android 17
  ('characters-with-a-number-in-their-name', 'ja', 'wd-Q1988617', 4), -- Kamen Rider 1
  -- geniuses
  ('geniuses', 'ja', 'wd-Q27150862', 1), -- Sota Fujii
  ('geniuses', 'ja', 'al-124142', 2), -- Senku Ishigami
  ('geniuses', 'ja', 'wd-Q838555', 3), -- Hidetoshi Dekisugi
  -- lazy-characters
  ('lazy-characters', 'ja', 'wd-Q1367960', 1), -- Nobita Nobi
  ('lazy-characters', 'ja', 'wd-Q2337951', 2), -- Gintoki Sakata
  ('lazy-characters', 'ja', 'al-89019', 3), -- Umaru Doma
  -- rich-characters
  ('rich-characters', 'ja', 'wd-Q1186404', 1), -- Suneo Honekawa
  ('rich-characters', 'ja', 'wd-Q94578998', 2), -- Kaguya Shinomiya
  ('rich-characters', 'ja', 'wd-Q1066453', 3), -- Seto Kaiba
  -- aliens
  ('aliens', 'ja', 'wd-Q2300752', 1), -- Lum
  ('aliens', 'ja', 'wd-Q180916', 2), -- Vegeta
  ('aliens', 'ja', 'wd-Q11289201', 3), -- Ultraseven
  ('aliens', 'ja', 'wd-Q1192947', 4), -- Keroro
  -- characters-who-went-to-space
  ('characters-who-went-to-space', 'ja', 'wd-Q357450', 1), -- Soichi Noguchi
  ('characters-who-went-to-space', 'ja', 'wd-Q234306', 2), -- Chiaki Mukai
  ('characters-who-went-to-space', 'ja', 'wd-Q232692', 3), -- Naoko Yamazaki
  ('characters-who-went-to-space', 'ja', 'wd-Q8061829', 4), -- Yusaku Maezawa
  -- cyborgs
  ('cyborgs', 'ja', 'wd-Q1988617', 1), -- Kamen Rider 1
  ('cyborgs', 'ja', 'wd-Q2289037', 2), -- Android 18
  ('cyborgs', 'ja', 'wd-Q2481465', 3), -- Android 17
  -- robots
  ('robots', 'ja', 'wd-Q2859491', 1), -- Arale Norimaki
  ('robots', 'ja', 'wd-Q2311640', 2), -- Mechagodzilla
  ('robots', 'ja', 'wd-Q2625107', 3), -- Dorami
  -- animated-movie-characters
  ('animated-movie-characters', 'ja', 'al-121514', 1), -- Mitsuha Miyamizu
  ('animated-movie-characters', 'ja', 'al-384', 2), -- Chihiro Ogino
  ('animated-movie-characters', 'ja', 'al-121516', 3), -- Taki Tachibana
  ('animated-movie-characters', 'ja', 'wd-Q29258951', 4), -- No-Face
  -- horror-movie-characters
  ('horror-movie-characters', 'ja', 'wd-Q2596301', 1), -- Sadako Yamamura
  ('horror-movie-characters', 'ja', 'wd-Q2558762', 2), -- Kayako Saeki
  ('horror-movie-characters', 'ja', 'al-19174', 3), -- Tomie
  -- basketball-players
  ('basketball-players', 'ja', 'wd-Q22959347', 1), -- Rui Hachimura
  ('basketball-players', 'ja', 'wd-Q17492383', 2), -- Yuta Watanabe
  ('basketball-players', 'ja', 'wd-Q84554649', 3), -- Yuki Kawamura
  ('basketball-players', 'ja', 'wd-Q952047', 4), -- Yuta Tabuse
  -- coaches-and-trainers
  ('coaches-and-trainers', 'ja', 'wd-Q2428403', 1), -- Hajime Moriyasu
  ('coaches-and-trainers', 'ja', 'wd-Q331991', 2), -- Takeshi Okada
  ('coaches-and-trainers', 'ja', 'wd-Q845089', 3), -- Tatsunori Hara
  ('coaches-and-trainers', 'ja', 'wd-Q366783', 4), -- Ivica Osim
  -- martial-artists
  ('martial-artists', 'ja', 'wd-Q272469', 1), -- Yasuhiro Yamashita
  ('martial-artists', 'ja', 'wd-Q42302288', 2), -- Tenshin Nasukawa
  ('martial-artists', 'ja', 'wd-Q1154771', 3), -- Kazushi Sakuraba
  -- olympic-athletes
  ('olympic-athletes', 'ja', 'wd-Q316664', 1), -- Kohei Uchimura
  ('olympic-athletes', 'ja', 'wd-Q230985', 2), -- Saori Yoshida
  ('olympic-athletes', 'ja', 'wd-Q234577', 3), -- Mao Asada
  ('olympic-athletes', 'ja', 'wd-Q235937', 4), -- Naoko Takahashi
  ('olympic-athletes', 'ja', 'wd-Q1784', 5), -- Koji Murofushi
  -- pro-wrestlers
  ('pro-wrestlers', 'ja', 'wd-Q45207', 1), -- Antonio Inoki
  ('pro-wrestlers', 'ja', 'wd-Q1387241', 2), -- Giant Baba
  ('pro-wrestlers', 'ja', 'wd-Q484173', 3), -- Rikidozan
  ('pro-wrestlers', 'ja', 'wd-Q1057868', 4), -- Kazuchika Okada
  ('pro-wrestlers', 'ja', 'wd-Q1189750', 5), -- Hiroshi Tanahashi
  -- race-car-drivers
  ('race-car-drivers', 'ja', 'wd-Q59209579', 1), -- Yuki Tsunoda
  ('race-car-drivers', 'ja', 'wd-Q171297', 2), -- Takuma Sato
  ('race-car-drivers', 'ja', 'wd-Q173221', 3), -- Satoru Nakajima
  ('race-car-drivers', 'ja', 'wd-Q82798', 4), -- Kamui Kobayashi
  -- soccer-players
  ('soccer-players', 'ja', 'wd-Q128725', 1), -- Hidetoshi Nakata
  ('soccer-players', 'ja', 'wd-Q202054', 2), -- Keisuke Honda
  ('soccer-players', 'ja', 'wd-Q331953', 3), -- Kazuyoshi Miura
  ('soccer-players', 'ja', 'wd-Q27067753', 4), -- Takefusa Kubo
  ('soccer-players', 'ja', 'wd-Q44395063', 5), -- Kaoru Mitoma
  -- tennis-players
  ('tennis-players', 'ja', 'wd-Q311222', 1), -- Kei Nishikori
  ('tennis-players', 'ja', 'wd-Q978594', 2), -- Shuzo Matsuoka
  ('tennis-players', 'ja', 'wd-Q229104', 3) -- Kimiko Date
on conflict do nothing;
