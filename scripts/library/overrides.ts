// Hand-reviewed corrections to the generated library, from an audit of the
// 2,000 most popular entries of each list, a safety sweep of the rest and a
// review of what the filters excluded (each finding checked by a second
// reviewer). Wikidata items are keyed by QID (all three lists); single entries
// by their entry id ("pt-wd-Q302", "ja-al-1234"); origins belong to the
// character, so they are keyed by QID or AniList id in every list.
import type { Category } from "../../src/game/categories";
import type { Lang } from "./types";

/** Items to leave out of every list, with the reason. */
export const DENY_QIDS: Record<string, string> = {
  Q51664: "Jesus in Islam: the same person as Jesus Christ (Q302)",
  Q2095353: "God in Islam: a concept, not a character",
  Q5816:
    "毛沢東: Mao Zedong is a dictator known for mass atrocities (Great Leap Forward famine, Cultural Revolution).",
  Q19878:
    "ムアンマル・アル＝カッザーフィー: Gaddafi, Libyan dictator linked to state terrorism (Lockerbie) and repression.",
  Q192550:
    "エル・ドラード: This is the legendary golden city or country, a place, not a character.",
  Q174097:
    "Hogwarts: A school/castle (a place) in Harry Potter, not a character.",
  Q1140303:
    "ディズニープリンセス: Disney Princess is a merchandising franchise line, not a character, and its origin 'シュガー・ラッシュ：オンライン' is also misleading.",
  Q2330140:
    "Entre Cila e Caríbdis: An idiom ('between Scylla and Charybdis'), not a character.",
  Q51552:
    "ロマン・ポランスキー: Convicted sex offender (unlawful sex with a 13-year-old).",
  Q48231: "イディ・アミン: Ugandan dictator responsible for mass killings.",
  Q133040:
    "Alberto Fujimori: Authoritarian leader convicted of the murders committed by the Barrios Altos and La Cantuta death squads.",
  Q216936:
    "ショーン・コムズ: Sean 'Diddy' Combs, convicted in 2025 of sex-related prostitution-transport charges after widely reported abuse allegations.",
  Q639789:
    "知恵の樹: The Tree of Knowledge from Genesis is an object or concept, not a character.",
  Q853611:
    "古代エジプト人の魂: The ancient Egyptian concept of the soul, not a character.",
  Q1142989:
    "Enfield Poltergeist: An alleged haunting case (event) involving a real private family.",
  Q58441:
    "Robinho: Convicted in Italy of gang rape and serving that sentence in Brazil since 2024, so he is a convicted sex offender.",
  Q809440:
    "Jesus curando o cego perto de Jericó: This is a miracle/episode from the Gospels, not a character.",
  Q12967:
    "レオポルド2世: Leopold II of Belgium, known chiefly for the Congo Free State atrocities.",
  Q8588:
    "シュレーディンガーの猫: Schrödinger's cat is a physics thought experiment (a concept), not a character.",
  Q4746911: "Árvore da Vida: A biblical tree (object), not a character.",
  Q56345672:
    "にじさんじ: Nijisanji is a VTuber talent agency (a company brand), not a character or performing group.",
  Q160847: "Hideki Tojo: WWII leader executed as a Class-A war criminal.",
  Q41117: "Kim Il-sung: North Korean dictator responsible for mass atrocities.",
  Q10665: "Kim Jong-il: North Korean dictator responsible for mass atrocities.",
  Q1125226:
    "イスラエルの失われた10支族: The Ten Lost Tribes is a historical or ethnic concept, not a character or team-like group.",
  Q86663108:
    "Comerciante Feliz: Same antisemitic 'Happy Merchant' caricature meme.",
  Q927144:
    "クマー: This is the Pedobear entry (alias ペドベアー), a pedophilia meme.",
  Q984268: "Golliwogg: Blackface/racist caricature doll.",
  Q21261062:
    "Jim Crow: Blackface minstrel caricature whose name became the term for segregation laws.",
  Q7428360:
    "Savita Bhabhi: Lead character of an Indian pornographic comic (Kirtu).",
  Q51120751:
    "Nick Fuentes: White-nationalist streamer and Holocaust denier, known for extremist content.",
  Q192519:
    "Jack Ruby: Known only for murdering Lee Harvey Oswald (origin 'businessperson' hides this).",
  Q273055:
    "R. Kelly: Convicted of sex trafficking and child sexual abuse offences.",
  Q1975172: "Rolf Harris: Convicted of indecent assault of girls.",
  Q195687:
    "Allison Mack: Convicted in the NXIVM sex-trafficking/racketeering case.",
  Q1321093:
    "ジャニー喜多川: Johnny Kitagawa, found to have sexually abused hundreds of minors. He is known in Japan mostly for this.",
  Q576918:
    "João de Deus: Brazilian 'medium' convicted of rape/sexual abuse of many women (sentenced to hundreds of years).",
  Q193172:
    "Burzum: One-man project of Varg Vikernes, convicted murderer, church arsonist and neo-Nazi.",
  Q1952396:
    "司忍: Boss of the Yamaguchi-gumi yakuza (origin literally 'ヤクザ'), a crime boss.",
  Q469406:
    "山口二矢: Known only as the assassin of politician Inejirō Asanuma (origin '活動家' is misleading).",
  Q218862:
    "岡本公三: Japanese Red Army terrorist from the 1972 Lod Airport massacre (origin '活動家' is misleading).",
  Q63229830:
    "飯塚幸三: Known only as the driver convicted over the 2019 Ikebukuro crash that killed a mother and child. He is otherwise a private person.",
  Q13462978:
    "Elizabeth Smart: Known primarily as a child kidnapping/rape victim, which makes her a crime victim known for the crime.",
  Q141829:
    "Lavrenti Beria: Stalin's secret-police chief who ran purges and mass executions.",
  Q123923:
    "Radovan Karadžić: Convicted of genocide (Srebrenica) and crimes against humanity.",
  Q47139:
    "Slobodan Milošević: Leader tried for genocide and war crimes in the Yugoslav wars.",
  Q332400: "Oswald Mosley: Leader of the British Union of Fascists.",
  Q5721:
    "フィリップ・ペタン: Head of the Nazi-collaborationist Vichy regime, convicted of treason.",
  Q150552:
    "Franz von Papen: Hitler's vice-chancellor who helped bring the Nazis to power.",
  Q57135:
    "エーリッヒ・フォン・マンシュタイン: Nazi Wehrmacht field marshal convicted of war crimes.",
  Q153899:
    "エンヴェル・パシャ: One of the main perpetrators of the Armenian genocide.",
  Q53783: "Enver Hoxha: Albanian Stalinist dictator known for mass repression.",
  Q164535:
    "Mobutu Sese Seko: Zairean kleptocratic dictator known for repression.",
  Q44819:
    "Suharto: Indonesian dictator who rose through the 1965–66 mass killings.",
  Q24237654:
    "Hibatullah Akhundzada: Supreme leader of the Taliban (listed as 'monarca').",
  Q299165:
    "Emílio Garrastazu Médici: President during the most violent period of Brazil's military dictatorship (systematic torture).",
  Q14362:
    "全斗煥: Chun Doo-hwan, South Korean military dictator convicted over the Gwangju massacre.",
  Q20850503:
    "エフゲニー・プリゴジン: Wagner Group warlord whose forces are accused of war crimes.",
  Q1671077: "Mahamrityunjaya Mantra: A Hindu mantra (text), not a character.",
  Q2723173: "Sudarshana Chakra: A divine weapon (object), not a character.",
  Q1189541:
    "Patriarcas bíblicos: A category of biblical figures, not a character.",
  Q2998816:
    "The Buddha in Hinduism: A topic/concept article about how Hinduism views the Buddha.",
  Q2337894:
    "Deus no budismo: A concept article ('God in Buddhism'), not a character.",
  Q2376772: "Gävle goat: A straw Christmas sculpture (object/event).",
  Q974896: "Neustã: The biblical bronze serpent object, not a character.",
  Q2667302: "球形の牛: A physics joke/metaphor (spherical cow), a concept.",
  Q2302121: "Ain Soph: A Kabbalistic theological concept.",
  Q868738: "Phlegethon: A river of the Greek underworld (place).",
  Q6897848: "Monad: A philosophical/Gnostic concept.",
  Q1426132: "Moli: A magical herb from the Odyssey, not a character.",
  Q770974: "Greek chorus: A theatrical device, not a character.",
  Q2481268:
    "alternative versions of Spider-Man: A list/overview article, not a single character.",
  Q2037884: "Universal Monsters: A film franchise, not a character.",
};

/** Items a keyword filter excluded by mistake. */
export const ALLOW_QIDS: Record<string, string> = {
  Q60029: "Oskar Schindler",
  Q49086: "Simon Wiesenthal",
  Q36804: "Eazy-E",
  Q2073970: "Nipsey Hussle",
  Q726201: "Tony Sirico",
  Q561820: "Teruyuki Kagawa",
  Q66107: "Henry Kissinger",
  Q186256: "Ferdinand VII of Spain",
  Q2667: "Paul von Hindenburg",
  Q4616: "Marilyn Monroe",
  Q49561909: "Sydney Sweeney",
  Q186304: "Kim Kardashian",
  Q122020: "Hilary Duff",
  Q83325: "Pamela Anderson",
  Q189400: "Brooke Shields",
  Q229507: "Jayne Mansfield",
  Q199801: "Cindy Crawford",
  Q180710: "Anna Nicole Smith",
  Q208117: "Bella Thorne",
  Q206833: "Denise Richards",
  Q72334: "Toni Morrison",
  Q185122: "Carmen Electra",
  Q217427: "La Toya Jackson",
  Q230993: "Jenny McCarthy",
  Q276005: "Charlotte Gainsbourg",
  Q212531: "Kate Moss",
  Q232786: "Alice Eve",
  Q211082: "Tara Reid",
  Q630446: "John Green",
  Q229972: "Catalina Sandino Moreno",
  Q264199: "Dana Plato",
  Q273034: "Lucy Maud Montgomery",
  Q3074666: "Flávia Alessandra",
  Q2352306: "Deborah Secco",
  Q2573415: "Regiane Alves",
  Q10322202: "Lívia Andrade",
  Q1791104: "Gretchen",
  Q1193022: "Miho Kanno",
  Q234094: "Chiaki Kuriyama",
  Q234112: "Fumie Suguri",
  Q289729: "Rie Miyazawa",
  Q306631: "Hitomi",
  Q965921: "Mitsu Dan",
  Q1197179: "Ayumi Itō",
  Q1137010: "Mieko Harada",
  Q850690: "Naomi Kawashima",
  Q551359: "Go Nagai",
  Q271854: "Yōko Shimada",
  Q11255761: "Mariko Tsutsui",
  Q3043265: "Saki Takaoka",
  Q253420: "Vivian Hsu",
  Q11555726: "Yasuha",
  Q1021987: "Misako Tanaka",
  Q3180188: "Rieko Miura",
  Q1092044: "Shigeru Muroi",
  Q3543730: "Tamao Satō",
  Q108636: "Easter Bunny",
  Q105071318: "Grim Reaper",
  Q3321458: "Mr. Clean",
  Q6481026: "Lamb Chop",
  Q2250832: "Punch and Judy",
  Q1146749: "King Momo",
  Q121900648: "Zundamon",
  Q112031567: "Kotonoha Akane & Aoi",
  Q190511: "Apophis",
};

/** Single entries to drop (duplicates, junk). */
export const REMOVE_IDS: Record<string, string> = {
  "en-wd-Q51664": "duplicate of Jesus in Islam",
  "en-wd-Q240679": "duplicate of Hercules",
  "en-wd-Q106843272": "duplicate of Avengers",
  "en-wd-Q23991129": "duplicate of Peter Parker",
  "en-wd-Q108403692": "duplicate of Frank Castle",
  "en-wd-Q23894967": "duplicate of Tony Stark",
  "en-wd-Q3678579": "duplicate of Jehovah",
  "en-wd-Q738569": "duplicate of Kara Zor-El",
  "en-wd-Q4009216": "duplicate of Yelena Belova",
  "pt-wd-Q122248": "duplicate of Héracles",
  "pt-wd-Q645312": "duplicate of Baco",
  "pt-wd-Q797477": "duplicate of Baal",
  "ja-al-6194": "duplicate of 宮本武蔵",
  "pt-wd-Q44015": "duplicate of São João Evangelista",
  "pt-wd-Q766677": "duplicate of Jeová",
  "ja-al-169492": "duplicate of 兎田ぺこら",
  "pt-wd-Q51664": "duplicate of Jesus Cristo (Jesus in Islam)",
};

/** Better names for single entries; the old name stays as an alias. */
export const NAMES: Record<string, string> = {
  "ja-wd-Q2575060": "ロトの妻",
  "en-wd-Q848673": "Shaggy Rogers",
  "pt-wd-Q517": "Napoleão Bonaparte",
  "pt-wd-Q729150": "Justiceiro",
  "pt-wd-Q868958": "Motoqueiro Fantasma",
  "pt-wd-Q838097": "Vampira",
  "pt-wd-Q632212": "Tempestade",
  "pt-wd-Q15012089": "Pantera Cor-de-Rosa",
  "pt-wd-Q692603": "Gato Félix",
  "pt-wd-Q3244512": "Harry Potter",
  "pt-wd-Q192673": "Ifigênia",
  "pt-wd-Q41127": "Poseidon",
  "pt-wd-Q1579": "Ganesha",
  "pt-wd-Q11380": "Vishnu",
  "pt-wd-Q11389": "Brahma",
  "pt-wd-Q319918": "Patolino",
  "pt-wd-Q623553": "Piu-Piu",
  "pt-wd-Q912984": "Ligeirinho",
  "pt-wd-Q822524": "Papa-Léguas",
  "pt-wd-Q2575084": "Wandinha Addams",
  "pt-wd-Q1193472": "Sr. Siriguejo",
  "pt-wd-Q836789": "Charada",
  "pt-wd-Q1107971": "Caco, o Sapo",
  "pt-wd-Q1707194": "Cuca",
  "ja-wd-Q29201": "黄帝",
  "ja-al-218266": "name 程小時, origin 時光代理人 -LINK CLICK-",
  "ja-al-218267": "name 陸光, origin 時光代理人 -LINK CLICK-",
  "pt-wd-Q184216": "Tétis (titânide)",
  "pt-wd-Q41680": "Dionísio",
  "pt-wd-Q145746": "José do Egito",
  "pt-wd-Q217096": "Naruhito",
  "ja-wd-Q1501505": "ミッフィー",
  "ja-wd-Q28967995": "アーリング・ハーランド",
  "ja-wd-Q616664": "カゼミーロ",
  "ja-wd-Q429039": "ロベルト・カルロス",
  "ja-wd-Q20994118": "ロドリ",
  "ja-wd-Q1426891": "マイケル・マイヤーズ",
  "en-wd-Q30148558": "Jadon Sancho",
  "en-wd-Q200261": "Tom Welling",
  "en-wd-Q245207": "Florentino Pérez",
  "en-wd-Q209094": "Robin Tunney",
  "en-wd-Q19116103": "André Onana",
  "en-wd-Q168740": "Juan Mata",
  "en-wd-Q186330": "Rafael Márquez",
  "en-wd-Q108159340": "Arda Güler",
  "en-wd-Q1195817": "Elagabal",
  "pt-wd-Q183102": "Pernalonga",
  "pt-wd-Q1077456": "Patrick Estrela",
  "pt-wd-Q1064404": "Lula Molusco",
  "pt-wd-Q1953422": "Os Muppets",
  "ja-al-187554": "ディルック・ラグヴィンド",
  "ja-al-209686": "鍾離",
  "ja-al-209687": "タルタリヤ",
  "ja-al-190868": "ガイア",
  "ja-al-192557": "クライン・モレッティ",
  "ja-al-127465": "魏無羨",
  "ja-al-127466": "藍忘機",
  "ja-al-149589": "謝憐",
  "pt-wd-Q816170": "Belfegor",
  "ja-wd-Q65042993": "中島敦",
  "ja-wd-Q1116411": "ハイヌウェレ",
  "ja-wd-Q8069094": "銭形平次",
};

/**
 * Origins with no Wikidata work or descriptor behind them, translated by hand:
 * "topic:" for works, traditions and franchises, "job:" for what a real
 * person is known as ("job:<key>:f" is the feminine form).
 */
export const CUSTOM_ORIGINS: Record<
  string,
  { category: Category; labels: Record<Lang, string> }
> = {
  "topic:bible": {
    category: "religion",
    labels: { en: "Bible", pt: "Bíblia", ja: "聖書" },
  },
  "topic:christianity": {
    category: "religion",
    labels: { en: "Christianity", pt: "Cristianismo", ja: "キリスト教" },
  },
  "topic:buddhism": {
    category: "religion",
    labels: { en: "Buddhism", pt: "Budismo", ja: "仏教" },
  },
  "topic:ars-goetia": {
    category: "religion",
    labels: { en: "Ars Goetia", pt: "Ars Goetia", ja: "ゴエティア" },
  },
  "topic:greek-mythology": {
    category: "mythology",
    labels: {
      en: "Greek mythology",
      pt: "Mitologia grega",
      ja: "ギリシア神話",
    },
  },
  "topic:roman-mythology": {
    category: "mythology",
    labels: { en: "Roman mythology", pt: "Mitologia romana", ja: "ローマ神話" },
  },
  "topic:hindu-mythology": {
    category: "mythology",
    labels: { en: "Hindu mythology", pt: "Mitologia hindu", ja: "インド神話" },
  },
  "topic:chinese-mythology": {
    category: "mythology",
    labels: {
      en: "Chinese mythology",
      pt: "Mitologia chinesa",
      ja: "中国神話",
    },
  },
  "topic:arthurian-legend": {
    category: "folklore",
    labels: {
      en: "Arthurian legend",
      pt: "Lendas arturianas",
      ja: "アーサー王伝説",
    },
  },
  "topic:japanese-folklore": {
    category: "folklore",
    labels: {
      en: "Japanese folklore",
      pt: "Folclore japonês",
      ja: "日本の妖怪",
    },
  },
  "topic:east-asian-folklore": {
    category: "folklore",
    labels: {
      en: "East Asian folklore",
      pt: "Folclore do Leste Asiático",
      ja: "東アジアの民間伝承",
    },
  },
  "topic:european-folklore": {
    category: "folklore",
    labels: {
      en: "European folklore",
      pt: "Folclore europeu",
      ja: "ヨーロッパの民間伝承",
    },
  },
  "topic:himalayan-folklore": {
    category: "folklore",
    labels: {
      en: "Himalayan folklore",
      pt: "Folclore do Himalaia",
      ja: "ヒマラヤの民間伝承",
    },
  },
  "topic:west-african-folklore": {
    category: "folklore",
    labels: {
      en: "West African folklore",
      pt: "Folclore da África Ocidental",
      ja: "西アフリカの民間伝承",
    },
  },
  "topic:christmas": {
    category: "folklore",
    labels: { en: "Christmas", pt: "Natal", ja: "クリスマス" },
  },
  "topic:sinterklaas": {
    category: "folklore",
    labels: { en: "Sinterklaas", pt: "Sinterklaas", ja: "シンタクラース" },
  },
  "topic:commedia-dellarte": {
    category: "art",
    labels: {
      en: "commedia dell'arte",
      pt: "commedia dell'arte",
      ja: "コメディア・デラルテ",
    },
  },
  "topic:creepypasta": {
    category: "internet",
    labels: { en: "Creepypasta", pt: "Creepypasta", ja: "クリーピーパスタ" },
  },
  "topic:hololive": {
    category: "internet",
    labels: { en: "Hololive", pt: "Hololive", ja: "ホロライブ" },
  },
  "topic:vocaloid": {
    category: "music",
    labels: { en: "Vocaloid", pt: "Vocaloid", ja: "VOCALOID" },
  },
  "topic:utau": {
    category: "music",
    labels: { en: "UTAU", pt: "UTAU", ja: "UTAU" },
  },
  "topic:marvel": {
    category: "comics",
    labels: { en: "Marvel", pt: "Marvel", ja: "マーベル" },
  },
  "topic:x-men": {
    category: "comics",
    labels: { en: "X-Men", pt: "X-Men", ja: "X-MEN" },
  },
  "topic:fantastic-four": {
    category: "comics",
    labels: {
      en: "Fantastic Four",
      pt: "Quarteto Fantástico",
      ja: "ファンタスティック・フォー",
    },
  },
  "topic:captain-america": {
    category: "comics",
    labels: {
      en: "Captain America",
      pt: "Capitão América",
      ja: "キャプテン・アメリカ",
    },
  },
  "topic:image-comics": {
    category: "comics",
    labels: {
      en: "Image Comics",
      pt: "Image Comics",
      ja: "イメージ・コミックス",
    },
  },
  "topic:disney": {
    category: "cartoons",
    labels: { en: "Disney", pt: "Disney", ja: "ディズニー" },
  },
  "topic:hanna-barbera": {
    category: "cartoons",
    labels: {
      en: "Hanna-Barbera",
      pt: "Hanna-Barbera",
      ja: "ハンナ・バーベラ",
    },
  },
  "topic:james-bond": {
    category: "film_tv",
    labels: { en: "James Bond", pt: "007", ja: "007シリーズ" },
  },
  "topic:alien": {
    category: "film_tv",
    labels: { en: "Alien", pt: "Alien", ja: "エイリアンシリーズ" },
  },
  "topic:sherlock-holmes": {
    category: "literature",
    labels: {
      en: "Sherlock Holmes",
      pt: "Sherlock Holmes",
      ja: "シャーロック・ホームズシリーズ",
    },
  },
  "topic:arsene-lupin": {
    category: "literature",
    labels: {
      en: "Arsène Lupin",
      pt: "Arsène Lupin",
      ja: "アルセーヌ・ルパンシリーズ",
    },
  },
  "topic:jack-ryan": {
    category: "literature",
    labels: {
      en: "Jack Ryan",
      pt: "Jack Ryan",
      ja: "ジャック・ライアンシリーズ",
    },
  },
  "topic:tarzan": {
    category: "literature",
    labels: { en: "Tarzan of the Apes", pt: "Tarzan", ja: "類猿人ターザン" },
  },
  "topic:twilight": {
    category: "literature",
    labels: { en: "Twilight", pt: "Crepúsculo", ja: "トワイライト" },
  },
  "topic:fu-manchu": {
    category: "literature",
    labels: {
      en: "Fu Manchu novels",
      pt: "Romances de Fu Manchu",
      ja: "フー・マンチューシリーズ",
    },
  },
  "topic:pulp-magazines": {
    category: "literature",
    labels: {
      en: "Pulp magazines",
      pt: "Revistas pulp",
      ja: "パルプ・マガジン",
    },
  },
  "topic:zenigata-heiji": {
    category: "literature",
    labels: {
      en: "Zenigata Heiji Torimonohikae",
      pt: "Zenigata Heiji Torimonohikae",
      ja: "銭形平次捕物控",
    },
  },
  "topic:miffy": {
    category: "literature",
    labels: {
      en: "Dick Bruna's picture books",
      pt: "Livros de Dick Bruna",
      ja: "ディック・ブルーナの絵本",
    },
  },
  "topic:bleach": {
    category: "anime",
    labels: { en: "Bleach", pt: "Bleach", ja: "BLEACH" },
  },
  "topic:trigun": {
    category: "anime",
    labels: { en: "Trigun", pt: "Trigun", ja: "TRIGUN" },
  },
  "topic:frieren": {
    category: "anime",
    labels: {
      en: "Frieren: Beyond Journey's End",
      pt: "Frieren e a Jornada para o Além",
      ja: "葬送のフリーレン",
    },
  },
  "topic:spice-and-wolf": {
    category: "anime",
    labels: { en: "Spice and Wolf", pt: "Spice and Wolf", ja: "狼と香辛料" },
  },
  "topic:kurokos-basketball": {
    category: "anime",
    labels: {
      en: "Kuroko's Basketball",
      pt: "Kuroko no Basket",
      ja: "黒子のバスケ",
    },
  },
  "topic:mo-dao-zu-shi": {
    category: "anime",
    labels: { en: "Mo Dao Zu Shi", pt: "Mo Dao Zu Shi", ja: "魔道祖師" },
  },
  "topic:heaven-officials-blessing": {
    category: "anime",
    labels: {
      en: "Heaven Official's Blessing",
      pt: "Heaven Official's Blessing",
      ja: "天官賜福",
    },
  },
  "topic:lord-of-the-mysteries": {
    category: "anime",
    labels: {
      en: "Lord of the Mysteries",
      pt: "Lord of the Mysteries",
      ja: "詭秘之主",
    },
  },
  "topic:saiki-k": {
    category: "anime",
    labels: {
      en: "The Disastrous Life of Saiki K.",
      pt: "A Desastrosa Vida de Saiki K.",
      ja: "斉木楠雄のΨ難",
    },
  },
  "job:satirical-politician": {
    category: "politics",
    labels: {
      en: "satirical politician",
      pt: "político satírico",
      ja: "風刺政治家",
    },
  },
  "job:first-lady": {
    category: "politics",
    labels: { en: "First Lady", pt: "primeira-dama", ja: "ファーストレディ" },
  },
  "job:civil-rights-activist": {
    category: "politics",
    labels: {
      en: "civil rights activist",
      pt: "ativista dos direitos civis",
      ja: "公民権運動家",
    },
  },
  "job:revolutionary": {
    category: "history",
    labels: { en: "revolutionary", pt: "revolucionário", ja: "革命家" },
  },
  "job:swordsman": {
    category: "history",
    labels: { en: "swordsman", pt: "espadachim", ja: "剣豪" },
  },
  "job:bakumatsu-samurai": {
    category: "history",
    labels: {
      en: "Bakumatsu samurai",
      pt: "samurai do Bakumatsu",
      ja: "幕末の志士",
    },
  },
  "job:sengoku-princess": {
    category: "history",
    labels: {
      en: "Sengoku-period princess",
      pt: "princesa do período Sengoku",
      ja: "戦国時代の姫",
    },
  },
  "job:quilombola-warrior:f": {
    category: "history",
    labels: {
      en: "quilombola warrior",
      pt: "guerreira quilombola",
      ja: "キロンボの女戦士",
    },
  },
  "job:aviator:f": {
    category: "history",
    labels: { en: "aviator", pt: "aviadora", ja: "飛行士" },
  },
  "job:royal": {
    category: "royalty",
    labels: { en: "royal", pt: "membro da realeza", ja: "王族" },
  },
  "job:prince": {
    category: "royalty",
    labels: { en: "prince", pt: "príncipe", ja: "王子" },
  },
  "job:princess": {
    category: "royalty",
    labels: { en: "princess", pt: "princesa", ja: "王女" },
  },
  "job:queen-of-england": {
    category: "royalty",
    labels: {
      en: "queen of England",
      pt: "rainha da Inglaterra",
      ja: "イングランド女王",
    },
  },
  "job:queen-consort": {
    category: "royalty",
    labels: { en: "queen consort", pt: "rainha consorte", ja: "王妃" },
  },
  "job:roman-emperor": {
    category: "royalty",
    labels: { en: "Roman emperor", pt: "imperador romano", ja: "ローマ皇帝" },
  },
  "job:emperor": {
    category: "royalty",
    labels: { en: "emperor", pt: "imperador", ja: "皇帝" },
  },
  "job:emperor:f": {
    category: "royalty",
    labels: { en: "empress", pt: "imperatriz", ja: "皇帝" },
  },
  "job:empress-consort": {
    category: "royalty",
    labels: { en: "empress", pt: "imperatriz", ja: "皇后" },
  },
  "job:empress-emerita": {
    category: "royalty",
    labels: { en: "empress emerita", pt: "imperatriz emérita", ja: "上皇后" },
  },
  "job:japanese-imperial-family": {
    category: "royalty",
    labels: {
      en: "Japanese imperial family",
      pt: "família imperial japonesa",
      ja: "皇族",
    },
  },
  "job:pope": {
    category: "religion",
    labels: { en: "pope", pt: "papa", ja: "ローマ教皇" },
  },
  "job:nun": {
    category: "religion",
    labels: { en: "nun", pt: "religiosa", ja: "修道女" },
  },
  "job:monk": {
    category: "religion",
    labels: { en: "monk", pt: "monge", ja: "僧侶" },
  },
  "job:missionary": {
    category: "religion",
    labels: { en: "missionary", pt: "missionário", ja: "宣教師" },
  },
  "job:prophet": {
    category: "religion",
    labels: { en: "prophet", pt: "profeta", ja: "預言者" },
  },
  "job:mystic": {
    category: "religion",
    labels: { en: "mystic", pt: "místico", ja: "祈祷僧" },
  },
  "job:occultist": {
    category: "religion",
    labels: { en: "occultist", pt: "ocultista", ja: "オカルティスト" },
  },
  "job:psychoanalyst": {
    category: "science",
    labels: { en: "psychoanalyst", pt: "psicanalista", ja: "精神分析学者" },
  },
  "job:psychiatrist": {
    category: "science",
    labels: { en: "psychiatrist", pt: "psiquiatra", ja: "精神科医" },
  },
  "job:sociologist": {
    category: "science",
    labels: { en: "sociologist", pt: "sociólogo", ja: "社会学者" },
  },
  "job:nurse:f": {
    category: "science",
    labels: { en: "nurse", pt: "enfermeira", ja: "看護師" },
  },
  "job:football-executive": {
    category: "sports",
    labels: {
      en: "football executive",
      pt: "dirigente esportivo",
      ja: "サッカー協会役員",
    },
  },
  "job:football-referee": {
    category: "sports",
    labels: {
      en: "football referee",
      pt: "árbitro de futebol",
      ja: "サッカー審判員",
    },
  },
  "job:coach-and-journalist": {
    category: "sports",
    labels: {
      en: "coach and journalist",
      pt: "técnico e jornalista",
      ja: "監督・ジャーナリスト",
    },
  },
  "job:talent-manager": {
    category: "business",
    labels: {
      en: "talent manager",
      pt: "empresário musical",
      ja: "タレントマネージャー",
    },
  },
  "job:tenor": {
    category: "music",
    labels: { en: "tenor", pt: "tenor", ja: "テノール歌手" },
  },
  "job:noh-actor": {
    category: "art",
    labels: { en: "Noh actor", pt: "ator de nô", ja: "能楽師" },
  },
  "group:metal-dance-unit": {
    category: "music",
    labels: {
      en: "metal dance unit",
      pt: "grupo de metal e dança",
      ja: "メタルダンスユニット",
    },
  },
};

/** Generated origins that mean nothing to players, swapped in every list. */
export const ORIGIN_REPLACEMENTS: Record<string, string> = {
  "wd:Q2246088": "topic:marvel", // Earth-616
};

/**
 * Corrected origins, by QID or AniList entry ("al-90107"); null clears it.
 * Values are origin ids: CUSTOM_ORIGINS, a descriptor ("job:actor",
 * "job:actor:f") or one of the character's own Wikidata works ("wd:Q1079").
 */
export const ORIGINS: Record<string, string | null> = {
  // Bible
  Q477527: "topic:bible", // Amram
  Q51676: "topic:bible", // Aaron
  Q2575060: "topic:bible", // Lot's wife
  Q206238: "topic:bible", // Elisha
  Q214617: "topic:bible", // Hagar
  Q302: "topic:bible", // Jesus Christ
  Q9181: "topic:bible", // Abraham
  Q9077: "topic:bible", // Moses
  Q289957: "topic:bible", // Jacob
  Q81422: "topic:bible", // Noah
  Q133507: "topic:bible", // Elijah
  Q145746: "topic:bible", // Joseph
  Q671872: "topic:bible", // Isaac
  Q830183: "topic:bible", // Eve
  Q41370: "topic:bible", // David
  Q81018: "topic:bible", // Judas Iscariot
  Q128267: "topic:bible", // Saint Joseph
  Q156290: "topic:bible", // Methuselah
  Q213027: "topic:bible", // Enoch
  Q81989: "topic:bible", // Gabriel
  Q275010: "topic:bible", // Moloch
  Q56951: "topic:bible", // Raphael
  Q721135: "topic:bible", // Azazel
  Q815594: "topic:bible", // Belial
  Q28730: "topic:bible", // Saul
  Q107626: "topic:bible", // Seth
  Q194808: "topic:bible", // Sarah
  Q188794: "topic:bible", // Isaiah
  Q158825: "topic:bible", // Jeremiah
  Q6577515: "topic:bible", // Samuel
  Q126689: "topic:bible", // Jehoshaphat
  Q37085: "topic:bible", // Solomon
  Q665541: "topic:bible", // Hosea
  Q1135632: "topic:bible", // Rahab
  Q320139: "topic:bible", // Zerubbabel
  Q209378: "wd:Q220890", // Uriel: Book of Enoch
  Q186350: "topic:christianity", // God the Father
  Q2875978: "topic:ars-goetia", // Valac
  // Buddhism
  Q193461: "topic:buddhism", // Maitreya
  Q715162: "topic:buddhism", // Guan Yin
  Q604687: "topic:buddhism", // Kṣitigarbha
  Q866315: "topic:buddhism", // Vaiśravaṇa
  Q471696: "topic:buddhism", // Mañjuśrī
  Q868306: "topic:buddhism", // Samantabhadra
  // Mythology
  Q45967: "topic:greek-mythology", // Persephone
  Q1320718: "topic:greek-mythology", // Theseus
  Q131203: "topic:greek-mythology", // Nyx
  Q6612: "topic:greek-mythology", // Charon
  Q199647: "topic:greek-mythology", // Thanatos
  Q208588: "topic:greek-mythology", // Eurydice
  Q102561: "topic:greek-mythology", // Sisyphus
  Q174353: "topic:greek-mythology", // Orpheus
  Q131651: "topic:greek-mythology", // Electra
  Q23168: "topic:greek-mythology", // Minos
  Q379828: "topic:greek-mythology", // Penthesilea
  Q131090: "topic:greek-mythology", // Chaos
  Q41410: "topic:greek-mythology", // Hades
  Q161419: "topic:greek-mythology", // Oceanus
  Q905162: "wd:Q60220", // Dido: Aeneid
  Q47652: "topic:roman-mythology", // Venus
  Q5011: "topic:roman-mythology", // Cupid
  Q128335: "topic:hindu-mythology", // Indra
  Q641632: "topic:chinese-mythology", // Nüwa
  Q466462: "topic:chinese-mythology", // Chang'e
  // Folklore
  Q215681: "topic:arthurian-legend", // Lancelot
  Q81109: "topic:arthurian-legend", // Mordred
  Q315796: "topic:christmas", // Santa Claus
  Q220453: "topic:sinterklaas", // Zwarte Piet
  Q129628: "topic:himalayan-folklore", // Yeti
  Q692111: "topic:japanese-folklore", // kitsune
  Q335140: "topic:japanese-folklore", // kappa
  Q4738985: "topic:japanese-folklore", // Amabie
  Q622761: "topic:east-asian-folklore", // Moon rabbit
  Q627323: "topic:european-folklore", // Sandman
  Q308697: "topic:european-folklore", // goblin
  Q485953: "topic:west-african-folklore", // Ananse
  Q17309: "topic:commedia-dellarte", // Pierrot
  Q7540067: "topic:creepypasta", // Slender Man
  // Literature
  Q4653: "topic:sherlock-holmes", // Sherlock Holmes
  Q283111: "topic:sherlock-holmes", // Professor Moriarty
  Q461606: "topic:arsene-lupin", // Arsène Lupin
  Q1068314: "topic:jack-ryan", // Jack Ryan
  Q170241: "topic:tarzan", // Tarzan
  Q191527: "topic:twilight", // Edward Cullen
  Q1357701: "topic:fu-manchu", // Fu Manchu
  Q967116: "topic:pulp-magazines", // The Shadow
  Q1076932: "wd:Q16155002", // Nancy Drew
  Q188574: "wd:Q3766392", // Winnie the Pooh
  Q8069094: "topic:zenigata-heiji", // Zenigata Heiji
  Q1501505: "topic:miffy", // Miffy
  // Film and TV
  Q2009573: "topic:james-bond", // James Bond
  Q246154: "topic:james-bond", // M
  Q211414: "topic:james-bond", // Miss Moneypenny
  Q7154377: "wd:Q1079", // Saul Goodman: Breaking Bad
  Q5620660: "wd:Q1079", // Gus Fring
  Q16578433: "wd:Q1079", // Mike Ehrmantraut
  Q2708078: "wd:Q23572", // Daenerys Targaryen: Game of Thrones
  Q329466: "wd:Q329434", // Freddy Krueger: A Nightmare on Elm Street
  Q1647348: "wd:Q80981", // Leatherface: The Texas Chainsaw Massacre
  Q844794: "wd:Q200804", // Predator
  Q209758: "topic:alien", // Xenomorph
  Q6567: "wd:Q860461", // Godzilla
  Q216810: "wd:Q309048", // King Kong
  Q1150106: "wd:Q461540", // Hellboy
  Q1953422: "wd:Q2120540", // The Muppets: The Muppet Show
  Q52401: "wd:Q483815", // Shrek
  Q4902053: "wd:Q188439", // Rapunzel: Tangled
  // Cartoons
  Q183102: "wd:Q622435", // Bugs Bunny: Looney Tunes
  Q623553: "wd:Q622435", // Tweety
  Q949916: "topic:hanna-barbera", // Yogi Bear
  Q901323: "wd:Q205683", // Scooby-Doo
  Q935079: "wd:Q83279", // SpongeBob SquarePants
  Q1077456: "wd:Q83279", // Patrick Star
  Q1064404: "wd:Q83279", // Squidward Tentacles
  Q1381762: "wd:Q158869", // Teenage Mutant Ninja Turtles
  Q1419509: "topic:disney", // Oswald the Lucky Rabbit
  Q6550: "topic:disney", // Donald Duck
  Q11937: "topic:disney", // Scrooge McDuck
  Q403138: "topic:disney", // Chip 'n' Dale
  Q11947: "topic:disney", // Pete
  Q161731: "wd:Q4508116", // Cheburashka
  // Games
  Q191626: "wd:Q1046812", // Sonic the Hedgehog
  Q904189: "wd:Q1046812", // Knuckles the Echidna
  Q194135: "wd:Q1046812", // Miles "Tails" Prower
  Q1136987: "wd:Q1046812", // Shadow the Hedgehog
  Q613241: "wd:Q2569953", // Kirby
  Q376682: "wd:Q83265", // Carl Johnson: Grand Theft Auto: San Andreas
  // Comics
  Q79037: "topic:marvel", // Spider-Man
  Q2712364: "topic:marvel", // Celestial
  Q369197: "topic:marvel", // Black Widow
  Q907767: "topic:marvel", // Doctor Strange
  Q19095: "topic:marvel", // Hawkeye
  Q1753322: "topic:marvel", // Kingpin
  Q975100: "topic:marvel", // Nick Fury
  Q1147326: "topic:marvel", // Loki
  Q2283843: "wd:Q288296", // Mysterio: Spider-Man
  Q578094: "wd:Q288296", // Doctor Octopus
  Q2639150: "topic:x-men", // Gambit
  Q840291: "topic:x-men", // Magneto
  Q838076: "topic:x-men", // Professor X
  Q584585: "topic:fantastic-four", // Human Torch
  Q28006858: "topic:captain-america", // Bucky Barnes
  Q839858: "topic:image-comics", // Spawn
  // Anime, manga and their kin
  Q2359852: "wd:Q28667972", // Boa Hancock: One Piece
  Q662389: "wd:Q1044391", // Yugi Mutou: Yu-Gi-Oh!
  Q65042993: "wd:Q17215635", // Atsushi Nakajima: Bungo Stray Dogs
  Q554163: "topic:bleach", // Sousuke Aizen
  Q1044491: "topic:bleach", // Uryū Ishida
  Q2434371: "topic:trigun", // Vash the Stampede
  Q104144455: "topic:frieren", // Frieren
  "al-7373": "topic:spice-and-wolf",
  "al-18769": "topic:kurokos-basketball",
  "al-127465": "topic:mo-dao-zu-shi",
  "al-127466": "topic:mo-dao-zu-shi",
  "al-149589": "topic:heaven-officials-blessing",
  "al-192557": "topic:lord-of-the-mysteries",
  "al-90107": "topic:saiki-k",
  Q5147714: "topic:utau", // Kasane Teto
  Q552682: "topic:vocaloid", // Hatsune Miku
  Q99470768: "topic:hololive", // Houshou Marine
  // Real people
  Q76509760: "job:satirical-politician", // Count Binface
  Q43274: "job:monarch", // Charles III
  Q82674: "job:queen-of-england", // Mary I
  Q80823: "job:queen-consort", // Anne Boleyn
  Q162819: "job:queen-consort", // Catherine of Aragon
  Q152239: "job:queen-consort", // Queen Camilla
  Q80976: "job:royal", // Prince Philip
  Q152316: "job:prince", // Prince Harry
  Q10479: "job:princess", // Catherine, Princess of Wales
  Q214369: "job:princess", // Leonor, Princess of Asturias
  Q1413: "job:roman-emperor", // Nero
  Q185152: "job:emperor", // Puyi
  Q9738: "job:emperor:f", // Wu Zetian
  Q230433: "job:empress-consort", // Empress Masako
  Q230697: "job:empress-consort", // Kōjun
  Q150782: "job:empress-consort", // Empress Elisabeth of Austria
  Q87610: "job:empress-emerita", // Empress Michiko
  Q743509: "job:japanese-imperial-family", // Aiko, Princess Toshi
  Q844333: "job:japanese-imperial-family", // Prince Hisahito
  Q311174: "job:japanese-imperial-family", // Fumihito
  Q2379961: "job:japanese-imperial-family", // Princess Akiko of Mikasa
  Q1152111: "job:japanese-imperial-family", // Princess Kako
  Q486381: "job:japanese-imperial-family", // Prince Tomohito of Mikasa
  Q232636: "job:japanese-imperial-family", // Kiko
  Q448104: "job:japanese-imperial-family", // Hisako, Princess Takamado
  Q280229: "job:japanese-imperial-family", // Takahito, Prince Mikasa
  Q165421: "job:first-lady", // Jacqueline Kennedy Onassis
  Q40933: "job:first-lady", // Eva Perón
  Q57911283: "job:first-lady", // Michelle Bolsonaro
  Q8027: "job:civil-rights-activist", // Martin Luther King Jr.
  Q5809: "job:revolutionary", // Che Guevara
  Q7172014: "job:politician", // Pete Hegseth
  Q10364348: "job:politician", // Ronaldo Caiado
  Q8442: "job:politician", // Otto von Bismarck
  Q301804: "job:politician", // Shigeru Yoshida
  Q105301361: "job:politician:f", // Erika Hilton
  Q30547: "job:nun", // Mother Teresa
  Q989: "job:pope", // John Paul II
  Q37278: "job:pope", // John Paul I
  Q16975: "job:pope", // Paul VI
  Q17293: "job:religious", // Tenzin Gyatso
  Q222227: "job:monk", // Kūkai
  Q163900: "job:missionary", // Francis Xavier
  Q35811: "job:prophet", // Zoroaster
  Q43989: "job:mystic", // Grigori Rasputin
  Q172684: "job:occultist", // Aleister Crowley
  Q9215: "job:psychoanalyst", // Sigmund Freud
  Q41532: "job:psychiatrist", // Carl Jung
  Q9387: "job:sociologist", // Max Weber
  Q37103: "job:nurse:f", // Florence Nightingale
  Q17714: "job:physicist", // Stephen Hawking
  Q307: "job:astronomer", // Galileo Galilei
  Q7327: "job:astronaut", // Yuri Gagarin
  Q3355: "job:aviator:f", // Amelia Earhart
  Q762: "job:painter", // Leonardo da Vinci
  Q169352: "job:noh-actor", // Zeami Motokiyo
  Q193344: "job:swordsman", // Miyamoto Musashi
  Q378450: "job:bakumatsu-samurai", // Sakamoto Ryōma
  Q635214: "job:sengoku-princess", // Oichi
  Q10263875: "job:quilombola-warrior:f", // Dandara dos Palmares
  Q2599: "job:musician", // Paul McCartney
  Q392: "job:singer", // Bob Dylan
  Q36844: "job:singer:f", // Rihanna
  Q37615: "job:tenor", // Luciano Pavarotti
  Q505476: "job:dj", // Avicii
  Q361297: "job:talent-manager", // Joe Jackson
  Q126513: "job:presenter", // Steve Irwin
  Q11190781: "group:metal-dance-unit", // Babymetal
  Q122575981: "group:idol", // NCT Wish
  Q5162259: "job:mma", // Conor McGregor
  Q41421: "job:basketball", // Michael Jordan
  Q44473: "job:american-football", // O. J. Simpson
  Q124138: "job:football-executive", // Gianni Infantino
  Q483437: "job:football-executive", // Sepp Blatter
  Q207358: "job:football-executive", // João Havelange
  Q485885: "job:football-referee", // Pierluigi Collina
  Q2600582: "job:coach-and-journalist", // João Saldanha
  Q174614: "job:football-coach", // Carlo Ancelotti
  Q79983: "job:football-coach", // José Mourinho
  Q702233: "job:football-coach", // Thomas Tuchel
  Q191634: "job:football-coach", // Luiz Felipe Scolari
  Q44980: "job:football-coach", // Alex Ferguson
  Q4462: "job:football-coach", // Joachim Löw
  Q21226404: "job:football-coach", // Julian Nagelsmann
  Q83106: "job:football-coach", // Jürgen Klopp
  Q40652: "job:football-coach", // Tite
  Q3840425: "job:football-coach", // Luis de la Fuente
  Q31575: "job:football-coach", // Marcelo Bielsa
  Q527550: "job:football-coach", // Jorge Jesus
  Q463933: "job:football-coach", // Vahid Halilhodžić
};

/** Vandalism and mistakes among an entry's aliases. */
export const DROP_ALIASES: Record<string, string[]> = {
  "en-wd-Q1186309": ["Doraemon es el mejor", "enserio"],
  "en-wd-Q2519257": ["el folla mamis", "el pitufo azul"],
  "en-wd-Q133698867": ["el tocador de abuelas"],
  "en-wd-Q816170": ["Baiano Preguiçoso"],
  "pt-wd-Q816170": ["Baiano Preguiçoso"],
  "en-wd-Q58331177": ["dictator"],
  "en-wd-Q215522": ["Memorándum de Paco"],
  "en-wd-Q201994": ["Esposa de Fernando Hamana"],
  "en-wd-Q114498066": ["es una persona q no tiene datos criminales"],
  "pt-wd-Q42786": ["Andrea Dotti"],
  "ja-wd-Q2005341": ["Kanade Tachibana", "立華かなで"],
  "ja-wd-Q22906680": ["Nagito Komaeda", "狛枝凪斗"],
  "en-wd-Q80823": ["Ana la mona"],
  "en-wd-Q2875978": ["aminnn", "Coolor"],
};
