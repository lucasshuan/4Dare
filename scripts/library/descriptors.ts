// Short descriptors used as `origin` for real people ("actress", "atriz", "女優").
// Each category lists the Wikidata occupations (P106) it covers, the label per
// language as [male/neutral, female], and how to spot it in a description so
// we can pick the occupation a person is best known for.
import type { Lang } from "./types";

export interface Descriptor {
  key: string;
  occupations: string[];
  labels: Record<Lang, [string, string]>;
  /** Patterns found in Wikidata descriptions, per language. */
  match: Record<Lang, RegExp>;
}

const d = (
  key: string,
  occupations: string[],
  en: [string, string],
  pt: [string, string],
  ja: [string, string],
  match: Record<Lang, RegExp>,
): Descriptor => ({ key, occupations, labels: { en, pt, ja }, match });

/** Ordered by how a player would describe someone when nothing else decides. */
export const DESCRIPTORS: Descriptor[] = [
  d(
    "monarch",
    ["Q116", "Q1097498", "Q2304859", "Q12097", "Q39018"],
    ["monarch", "monarch"],
    ["monarca", "monarca"],
    ["君主", "君主"],
    {
      en: /\b(king|queen|emperor|empress|monarch|pharaoh|sultan|tsar|czar|shah|ruler)\b/i,
      pt: /\b(rei|rainha|imperador|imperatriz|monarca|faraó|sultão|czar|governante)\b/i,
      ja: /(天皇|皇帝|国王|女王|君主|ファラオ|皇后)/,
    },
  ),
  d(
    "footballer",
    ["Q937857"],
    ["footballer", "footballer"],
    ["futebolista", "futebolista"],
    ["サッカー選手", "サッカー選手"],
    {
      en: /\b(football(er)?|soccer)\b/i,
      pt: /\b(futebolista|jogador(a)? de futebol)\b/i,
      ja: /サッカー/,
    },
  ),
  d(
    "football-coach",
    ["Q628099"],
    ["football manager", "football manager"],
    ["treinador de futebol", "treinadora de futebol"],
    ["サッカー指導者", "サッカー指導者"],
    {
      en: /\b(football|soccer) (manager|coach)\b/i,
      pt: /\btreinador(a)? de futebol\b/i,
      ja: /サッカー指導者|サッカー監督/,
    },
  ),
  d(
    "basketball",
    ["Q3665646"],
    ["basketball player", "basketball player"],
    ["jogador de basquete", "jogadora de basquete"],
    ["バスケットボール選手", "バスケットボール選手"],
    {
      en: /\bbasketball\b/i,
      pt: /\b(basquete|basquetebol)\b/i,
      ja: /バスケットボール/,
    },
  ),
  d(
    "tennis",
    ["Q10833314"],
    ["tennis player", "tennis player"],
    ["tenista", "tenista"],
    ["テニス選手", "テニス選手"],
    {
      en: /\btennis\b/i,
      pt: /\btenista\b/i,
      ja: /テニス/,
    },
  ),
  d(
    "f1",
    ["Q10841764"],
    ["Formula One driver", "Formula One driver"],
    ["piloto de Fórmula 1", "piloto de Fórmula 1"],
    ["F1ドライバー", "F1ドライバー"],
    {
      en: /\bformula (one|1)\b/i,
      pt: /\bfórmula (1|um)\b/i,
      ja: /F1/,
    },
  ),
  d(
    "racing",
    ["Q378622", "Q10349745"],
    ["racing driver", "racing driver"],
    ["piloto", "piloto"],
    ["レーシングドライバー", "レーシングドライバー"],
    {
      en: /\bracing driver\b/i,
      pt: /\b(piloto|automobilista)\b/i,
      ja: /(レーシングドライバー|カーレーサー|レーサー)/,
    },
  ),
  d(
    "boxer",
    ["Q11338576"],
    ["boxer", "boxer"],
    ["pugilista", "pugilista"],
    ["ボクサー", "ボクサー"],
    {
      en: /\bboxer\b/i,
      pt: /\b(pugilista|boxeador(a)?)\b/i,
      ja: /ボクサー|ボクシング/,
    },
  ),
  d(
    "mma",
    ["Q11607585"],
    ["MMA fighter", "MMA fighter"],
    ["lutador de MMA", "lutadora de MMA"],
    ["総合格闘家", "総合格闘家"],
    {
      en: /\b(mixed martial|mma)\b/i,
      pt: /\b(artes marciais mistas|mma)\b/i,
      ja: /総合格闘/,
    },
  ),
  d(
    "wrestler",
    ["Q13474373"],
    ["professional wrestler", "professional wrestler"],
    ["lutador de luta livre", "lutadora de luta livre"],
    ["プロレスラー", "プロレスラー"],
    {
      en: /\bwrestler\b/i,
      pt: /\bluta livre\b/i,
      ja: /プロレスラー/,
    },
  ),
  d(
    "sumo",
    ["Q2727289"],
    ["sumo wrestler", "sumo wrestler"],
    ["lutador de sumô", "lutadora de sumô"],
    ["力士", "力士"],
    {
      en: /\bsumo\b/i,
      pt: /\bsum[ôo]\b/i,
      ja: /力士|横綱|大関/,
    },
  ),
  d(
    "baseball",
    ["Q10871364"],
    ["baseball player", "baseball player"],
    ["jogador de beisebol", "jogadora de beisebol"],
    ["野球選手", "野球選手"],
    {
      en: /\bbaseball\b/i,
      pt: /\bbeisebol\b/i,
      ja: /野球|投手|内野手|外野手|捕手/,
    },
  ),
  d(
    "american-football",
    ["Q19204627"],
    ["American football player", "American football player"],
    ["jogador de futebol americano", "jogadora de futebol americano"],
    ["アメリカンフットボール選手", "アメリカンフットボール選手"],
    {
      en: /\bamerican football\b/i,
      pt: /\bfutebol americano\b/i,
      ja: /アメリカンフットボール/,
    },
  ),
  d(
    "hockey",
    ["Q11774891"],
    ["ice hockey player", "ice hockey player"],
    ["jogador de hóquei no gelo", "jogadora de hóquei no gelo"],
    ["アイスホッケー選手", "アイスホッケー選手"],
    {
      en: /\bhockey\b/i,
      pt: /\bhóquei\b/i,
      ja: /アイスホッケー/,
    },
  ),
  d(
    "golfer",
    ["Q11303721"],
    ["golfer", "golfer"],
    ["golfista", "golfista"],
    ["ゴルファー", "ゴルファー"],
    {
      en: /\bgolfer\b/i,
      pt: /\bgolfista\b/i,
      ja: /ゴルファー|ゴルフ/,
    },
  ),
  d(
    "figure-skater",
    ["Q13219587"],
    ["figure skater", "figure skater"],
    ["patinador artístico", "patinadora artística"],
    ["フィギュアスケート選手", "フィギュアスケート選手"],
    {
      en: /\bfigure skater\b/i,
      pt: /\bpatinador(a)? artístic[oa]\b/i,
      ja: /フィギュアスケート/,
    },
  ),
  d(
    "swimmer",
    ["Q10843402"],
    ["swimmer", "swimmer"],
    ["nadador", "nadadora"],
    ["競泳選手", "競泳選手"],
    {
      en: /\bswimmer\b/i,
      pt: /\bnadador(a)?\b/i,
      ja: /競泳|水泳/,
    },
  ),
  d(
    "athletics",
    ["Q11513337", "Q4009406"],
    ["athlete", "athlete"],
    ["atleta", "atleta"],
    ["陸上競技選手", "陸上競技選手"],
    {
      en: /\b(sprinter|runner|athlete|hurdler|jumper|thrower)\b/i,
      pt: /\b(velocista|atleta|corredor(a)?|maratonista)\b/i,
      ja: /陸上|マラソン|短距離/,
    },
  ),
  d(
    "gymnast",
    ["Q13381572", "Q16947675"],
    ["gymnast", "gymnast"],
    ["ginasta", "ginasta"],
    ["体操選手", "体操選手"],
    {
      en: /\bgymnast\b/i,
      pt: /\bginasta\b/i,
      ja: /体操/,
    },
  ),
  d(
    "judoka",
    ["Q6665249"],
    ["judoka", "judoka"],
    ["judoca", "judoca"],
    ["柔道家", "柔道家"],
    {
      en: /\bjudo(ka)?\b/i,
      pt: /\bjud(oca|ô)\b/i,
      ja: /柔道/,
    },
  ),
  d(
    "cyclist",
    ["Q2309784"],
    ["cyclist", "cyclist"],
    ["ciclista", "ciclista"],
    ["自転車競技選手", "自転車競技選手"],
    {
      en: /\bcyclist\b/i,
      pt: /\bciclista\b/i,
      ja: /自転車/,
    },
  ),
  d(
    "cricketer",
    ["Q12299841"],
    ["cricketer", "cricketer"],
    ["jogador de críquete", "jogadora de críquete"],
    ["クリケット選手", "クリケット選手"],
    {
      en: /\bcricketer\b/i,
      pt: /\bcríquete\b/i,
      ja: /クリケット/,
    },
  ),
  d(
    "volleyball",
    ["Q15117302"],
    ["volleyball player", "volleyball player"],
    ["jogador de vôlei", "jogadora de vôlei"],
    ["バレーボール選手", "バレーボール選手"],
    {
      en: /\bvolleyball\b/i,
      pt: /\b(vôlei|voleibol)\b/i,
      ja: /バレーボール/,
    },
  ),
  d(
    "chess",
    ["Q10873124"],
    ["chess player", "chess player"],
    ["enxadrista", "enxadrista"],
    ["チェスプレイヤー", "チェスプレイヤー"],
    {
      en: /\bchess\b/i,
      pt: /\bxadrez|enxadrista\b/i,
      ja: /チェス/,
    },
  ),
  d(
    "skater",
    ["Q17502714"],
    ["skateboarder", "skateboarder"],
    ["skatista", "skatista"],
    ["スケートボーダー", "スケートボーダー"],
    {
      en: /\bskateboard/i,
      pt: /\bskatista\b/i,
      ja: /スケートボード/,
    },
  ),
  d(
    "surfer",
    ["Q13561328"],
    ["surfer", "surfer"],
    ["surfista", "surfista"],
    ["サーファー", "サーファー"],
    {
      en: /\bsurfer\b/i,
      pt: /\bsurfista\b/i,
      ja: /サーファー|サーフィン/,
    },
  ),
  d(
    "athlete",
    ["Q2066131"],
    ["athlete", "athlete"],
    ["atleta", "atleta"],
    ["スポーツ選手", "スポーツ選手"],
    {
      en: /\b(athlete|sportsman|sportswoman)\b/i,
      pt: /\b(atleta|desportista|esportista)\b/i,
      ja: /スポーツ選手|アスリート/,
    },
  ),
  d(
    "politician",
    ["Q82955", "Q372436", "Q30461", "Q48352"],
    ["politician", "politician"],
    ["político", "política"],
    ["政治家", "政治家"],
    {
      en: /\b(politician|president|prime minister|statesman|stateswoman|senator|chancellor|governor|minister)\b/i,
      pt: /\b(político|política|presidente|primeiro-ministro|primeira-ministra|estadista|senador(a)?|governador(a)?)\b/i,
      ja: /政治家|大統領|首相|総理大臣|議員/,
    },
  ),
  d(
    "samurai",
    ["Q38142"],
    ["samurai", "samurai"],
    ["samurai", "samurai"],
    ["武将", "武将"],
    {
      en: /\b(samurai|daimy[oō]|shogun)\b/i,
      pt: /\b(samurai|daimio|xogum)\b/i,
      ja: /武将|武士|大名|将軍|戦国/,
    },
  ),
  d(
    "military",
    ["Q47064", "Q189290", "Q1402561"],
    ["military leader", "military leader"],
    ["militar", "militar"],
    ["軍人", "軍人"],
    {
      en: /\b(general|admiral|military|commander|marshal|soldier|warrior|conqueror)\b/i,
      pt: /\b(general|almirante|militar|comandante|marechal|soldado|guerreir[oa]|conquistador(a)?)\b/i,
      ja: /軍人|将軍|元帥|提督/,
    },
  ),
  d(
    "actor",
    ["Q33999", "Q10800557", "Q10798782", "Q2259451", "Q970153"],
    ["actor", "actress"],
    ["ator", "atriz"],
    ["俳優", "女優"],
    {
      en: /\bact(or|ress)\b/i,
      pt: /\b(ator|atriz|actor|actriz)\b/i,
      ja: /俳優|女優/,
    },
  ),
  d(
    "singer-songwriter",
    ["Q488205"],
    ["singer-songwriter", "singer-songwriter"],
    ["cantor e compositor", "cantora e compositora"],
    ["シンガーソングライター", "シンガーソングライター"],
    {
      en: /\bsinger-songwriter\b/i,
      pt: /\bcantor(a)?(-| e )compositor(a)?\b/i,
      ja: /シンガーソングライター/,
    },
  ),
  d(
    "singer",
    ["Q177220", "Q2643890", "Q55960555"],
    ["singer", "singer"],
    ["cantor", "cantora"],
    ["歌手", "歌手"],
    {
      en: /\b(singer|vocalist)\b/i,
      pt: /\b(cantor|cantora|vocalista)\b/i,
      ja: /歌手|ボーカル/,
    },
  ),
  d(
    "rapper",
    ["Q2252262"],
    ["rapper", "rapper"],
    ["rapper", "rapper"],
    ["ラッパー", "ラッパー"],
    {
      en: /\brapper\b/i,
      pt: /\b(rapper|rapper)\b/i,
      ja: /ラッパー/,
    },
  ),
  d(
    "idol",
    ["Q226008", "Q1328668"],
    ["idol", "idol"],
    ["ídolo", "ídolo"],
    ["アイドル", "アイドル"],
    {
      en: /\bidol\b/i,
      pt: /\bídolo\b/i,
      ja: /アイドル/,
    },
  ),
  d(
    "voice-actor",
    ["Q2405480", "Q622807"],
    ["voice actor", "voice actress"],
    ["dublador", "dubladora"],
    ["声優", "声優"],
    {
      en: /\b(voice act(or|ress)|seiy[uū])\b/i,
      pt: /\b(dublador(a)?|seiy[uū]|dobrador(a)?)\b/i,
      ja: /声優/,
    },
  ),
  d(
    "comedian",
    ["Q245068", "Q18545066"],
    ["comedian", "comedian"],
    ["humorista", "humorista"],
    ["お笑い芸人", "お笑い芸人"],
    {
      en: /\b(comedian|comedienne|comic)\b/i,
      pt: /\b(humorista|comediante)\b/i,
      ja: /お笑い|芸人|コメディアン|漫才/,
    },
  ),
  d(
    "tarento",
    ["Q2705098"],
    ["TV personality", "TV personality"],
    ["personalidade de TV", "personalidade de TV"],
    ["タレント", "タレント"],
    {
      en: /\b(tarento|tv personality|television personality)\b/i,
      pt: /\bpersonalidade\b/i,
      ja: /タレント/,
    },
  ),
  d(
    "presenter",
    ["Q947873", "Q2722764"],
    ["TV presenter", "TV presenter"],
    ["apresentador", "apresentadora"],
    ["司会者", "司会者"],
    {
      en: /\b(presenter|host|broadcaster)\b/i,
      pt: /\bapresentador(a)?\b/i,
      ja: /司会|キャスター|アナウンサー/,
    },
  ),
  d(
    "youtuber",
    ["Q17125263", "Q94791573", "Q57414145", "Q50279140"],
    ["YouTuber", "YouTuber"],
    ["youtuber", "youtuber"],
    ["YouTuber", "YouTuber"],
    {
      en: /\b(youtuber|streamer|influencer)\b/i,
      pt: /\b(youtuber|streamer|influenciador(a)?)\b/i,
      ja: /YouTuber|ユーチューバー|配信者|実況/,
    },
  ),
  d(
    "model",
    ["Q4610556", "Q3357567"],
    ["model", "model"],
    ["modelo", "modelo"],
    ["モデル", "モデル"],
    {
      en: /\bmodel\b/i,
      pt: /\bmodelo\b/i,
      ja: /モデル/,
    },
  ),
  d(
    "dancer",
    ["Q5716684"],
    ["dancer", "dancer"],
    ["dançarino", "dançarina"],
    ["ダンサー", "ダンサー"],
    {
      en: /\b(dancer|ballerina)\b/i,
      pt: /\b(dançarin[oa]|bailarin[oa])\b/i,
      ja: /ダンサー|バレエ/,
    },
  ),
  d("dj", ["Q130857"], ["DJ", "DJ"], ["DJ", "DJ"], ["DJ", "DJ"], {
    en: /\b(dj|disc jockey)\b/i,
    pt: /\b(dj|disc jockey)\b/i,
    ja: /DJ/,
  }),
  d(
    "guitarist",
    ["Q855091"],
    ["guitarist", "guitarist"],
    ["guitarrista", "guitarrista"],
    ["ギタリスト", "ギタリスト"],
    {
      en: /\bguitarist\b/i,
      pt: /\bguitarrista\b/i,
      ja: /ギタリスト/,
    },
  ),
  d(
    "pianist",
    ["Q486748"],
    ["pianist", "pianist"],
    ["pianista", "pianista"],
    ["ピアニスト", "ピアニスト"],
    {
      en: /\bpianist\b/i,
      pt: /\bpianista\b/i,
      ja: /ピアニスト/,
    },
  ),
  d(
    "musician",
    ["Q639669", "Q753110", "Q183945"],
    ["musician", "musician"],
    ["músico", "musicista"],
    ["ミュージシャン", "ミュージシャン"],
    {
      en: /\b(musician|songwriter|record producer|drummer|bassist)\b/i,
      pt: /\b(músico|musicista|compositor(a)?|baterista|baixista)\b/i,
      ja: /ミュージシャン|音楽家|作曲家|ドラマー|ベーシスト/,
    },
  ),
  d(
    "composer",
    ["Q36834"],
    ["composer", "composer"],
    ["compositor", "compositora"],
    ["作曲家", "作曲家"],
    {
      en: /\bcomposer\b/i,
      pt: /\bcompositor(a)?\b/i,
      ja: /作曲家/,
    },
  ),
  d(
    "director",
    ["Q2526255", "Q3455803"],
    ["film director", "film director"],
    ["cineasta", "cineasta"],
    ["映画監督", "映画監督"],
    {
      en: /\b(film ?maker|director)\b/i,
      pt: /\b(cineasta|realizador(a)?|diretor(a)?)\b/i,
      ja: /映画監督|監督/,
    },
  ),
  d(
    "producer",
    ["Q3282637", "Q578109"],
    ["film producer", "film producer"],
    ["produtor", "produtora"],
    ["プロデューサー", "プロデューサー"],
    {
      en: /\bproducer\b/i,
      pt: /\bprodutor(a)?\b/i,
      ja: /プロデューサー/,
    },
  ),
  d(
    "mangaka",
    ["Q191633"],
    ["manga artist", "manga artist"],
    ["mangaká", "mangaká"],
    ["漫画家", "漫画家"],
    {
      en: /\b(manga|mangaka)\b/i,
      pt: /\bmangak[áa]\b/i,
      ja: /漫画家/,
    },
  ),
  d(
    "animator",
    ["Q266569"],
    ["animator", "animator"],
    ["animador", "animadora"],
    ["アニメーター", "アニメーター"],
    {
      en: /\banimat(or|ion)\b/i,
      pt: /\banimador(a)?\b/i,
      ja: /アニメーター|アニメーション/,
    },
  ),
  d(
    "cartoonist",
    ["Q1114448", "Q715301"],
    ["cartoonist", "cartoonist"],
    ["cartunista", "cartunista"],
    ["漫画家", "漫画家"],
    {
      en: /\b(cartoonist|comics artist|comic book)\b/i,
      pt: /\b(cartunista|quadrinista|desenhista)\b/i,
      ja: /漫画家|イラストレーター/,
    },
  ),
  d(
    "fashion",
    ["Q3501317"],
    ["fashion designer", "fashion designer"],
    ["estilista", "estilista"],
    ["ファッションデザイナー", "ファッションデザイナー"],
    {
      en: /\bfashion designer\b/i,
      pt: /\bestilista\b/i,
      ja: /ファッションデザイナー/,
    },
  ),
  d(
    "chef",
    ["Q3499072"],
    ["chef", "chef"],
    ["chef", "chef"],
    ["料理人", "料理人"],
    {
      en: /\bchef\b/i,
      pt: /\bchef\b/i,
      ja: /料理人|シェフ|料理研究家/,
    },
  ),
  d(
    "religious",
    ["Q250867", "Q42603", "Q432386", "Q1423891", "Q2259532", "Q1234713"],
    ["religious figure", "religious figure"],
    ["líder religioso", "líder religiosa"],
    ["宗教家", "宗教家"],
    {
      en: /\b(pope|prophet|saint|priest|preacher|religious|theologian|monk|nun|bishop|cardinal)\b/i,
      pt: /\b(papa|profeta|sant[oa]|padre|sacerdote|pregador(a)?|religios[oa]|teólog[oa]|monge|freira|bispo|cardeal)\b/i,
      ja: /教皇|預言者|聖人|司祭|宗教|神学者|僧|修道|司教|枢機卿/,
    },
  ),
  d(
    "explorer",
    ["Q11900058"],
    ["explorer", "explorer"],
    ["explorador", "exploradora"],
    ["探検家", "探検家"],
    {
      en: /\b(explorer|navigator)\b/i,
      pt: /\b(explorador(a)?|navegador(a)?)\b/i,
      ja: /探検家|航海者|探検/,
    },
  ),
  d(
    "astronaut",
    ["Q11631"],
    ["astronaut", "astronaut"],
    ["astronauta", "astronauta"],
    ["宇宙飛行士", "宇宙飛行士"],
    {
      en: /\b(astronaut|cosmonaut)\b/i,
      pt: /\b(astronauta|cosmonauta)\b/i,
      ja: /宇宙飛行士/,
    },
  ),
  d(
    "inventor",
    ["Q205375"],
    ["inventor", "inventor"],
    ["inventor", "inventora"],
    ["発明家", "発明家"],
    {
      en: /\binventor\b/i,
      pt: /\binventor(a)?\b/i,
      ja: /発明家/,
    },
  ),
  d(
    "business",
    ["Q43845", "Q131524", "Q484876"],
    ["businessperson", "businesswoman"],
    ["empresário", "empresária"],
    ["実業家", "実業家"],
    {
      en: /\b(business(man|woman|person)|entrepreneur|investor|executive|ceo|magnate)\b/i,
      pt: /\b(empresári[oa]|empreendedor(a)?|investidor(a)?|executiv[oa])\b/i,
      ja: /実業家|起業家|経営者|投資家/,
    },
  ),
  d(
    "physicist",
    ["Q169470"],
    ["physicist", "physicist"],
    ["físico", "física"],
    ["物理学者", "物理学者"],
    {
      en: /\bphysicist\b/i,
      pt: /\bfísic[oa]\b/i,
      ja: /物理学者/,
    },
  ),
  d(
    "mathematician",
    ["Q170790"],
    ["mathematician", "mathematician"],
    ["matemático", "matemática"],
    ["数学者", "数学者"],
    {
      en: /\bmathematician\b/i,
      pt: /\bmatemátic[oa]\b/i,
      ja: /数学者/,
    },
  ),
  d(
    "chemist",
    ["Q593644"],
    ["chemist", "chemist"],
    ["químico", "química"],
    ["化学者", "化学者"],
    {
      en: /\bchemist\b/i,
      pt: /\bquímic[oa]\b/i,
      ja: /化学者/,
    },
  ),
  d(
    "biologist",
    ["Q864503"],
    ["biologist", "biologist"],
    ["biólogo", "bióloga"],
    ["生物学者", "生物学者"],
    {
      en: /\b(biologist|naturalist)\b/i,
      pt: /\b(biólog[oa]|naturalista)\b/i,
      ja: /生物学者|博物学者/,
    },
  ),
  d(
    "astronomer",
    ["Q11063"],
    ["astronomer", "astronomer"],
    ["astrônomo", "astrônoma"],
    ["天文学者", "天文学者"],
    {
      en: /\bastronomer\b/i,
      pt: /\bastr[ôo]nom[oa]\b/i,
      ja: /天文学者/,
    },
  ),
  d(
    "scientist",
    ["Q901", "Q1650915"],
    ["scientist", "scientist"],
    ["cientista", "cientista"],
    ["科学者", "科学者"],
    {
      en: /\bscientist\b/i,
      pt: /\bcientista\b/i,
      ja: /科学者/,
    },
  ),
  d(
    "physician",
    ["Q39631"],
    ["physician", "physician"],
    ["médico", "médica"],
    ["医師", "医師"],
    {
      en: /\b(physician|doctor|surgeon)\b/i,
      pt: /\b(médic[oa]|cirurgi[ãa]o?)\b/i,
      ja: /医師|医者|外科医/,
    },
  ),
  d(
    "philosopher",
    ["Q4964182"],
    ["philosopher", "philosopher"],
    ["filósofo", "filósofa"],
    ["哲学者", "哲学者"],
    {
      en: /\bphilosopher\b/i,
      pt: /\bfilósof[oa]\b/i,
      ja: /哲学者|思想家/,
    },
  ),
  d(
    "poet",
    ["Q49757"],
    ["poet", "poet"],
    ["poeta", "poetisa"],
    ["詩人", "詩人"],
    {
      en: /\bpoet\b/i,
      pt: /\b(poeta|poetisa)\b/i,
      ja: /詩人|歌人|俳人/,
    },
  ),
  d(
    "writer",
    ["Q36180", "Q6625963", "Q4853732", "Q28389", "Q11774202"],
    ["writer", "writer"],
    ["escritor", "escritora"],
    ["作家", "作家"],
    {
      en: /\b(writer|novelist|author|playwright|dramatist|screenwriter)\b/i,
      pt: /\b(escritor(a)?|romancista|autor(a)?|dramaturg[oa]|roteirista)\b/i,
      ja: /作家|小説家|著作家|劇作家|脚本家/,
    },
  ),
  d(
    "painter",
    ["Q1028181", "Q483501", "Q33082999"],
    ["painter", "painter"],
    ["pintor", "pintora"],
    ["画家", "画家"],
    {
      en: /\b(painter|artist)\b/i,
      pt: /\b(pintor(a)?|artista plástic[oa])\b/i,
      ja: /画家|浮世絵師|芸術家/,
    },
  ),
  d(
    "sculptor",
    ["Q1281618"],
    ["sculptor", "sculptor"],
    ["escultor", "escultora"],
    ["彫刻家", "彫刻家"],
    {
      en: /\bsculptor\b/i,
      pt: /\bescultor(a)?\b/i,
      ja: /彫刻家/,
    },
  ),
  d(
    "architect",
    ["Q42973"],
    ["architect", "architect"],
    ["arquiteto", "arquiteta"],
    ["建築家", "建築家"],
    {
      en: /\barchitect\b/i,
      pt: /\barquitet[oa]\b/i,
      ja: /建築家/,
    },
  ),
  d(
    "photographer",
    ["Q33231"],
    ["photographer", "photographer"],
    ["fotógrafo", "fotógrafa"],
    ["写真家", "写真家"],
    {
      en: /\bphotographer\b/i,
      pt: /\bfotógraf[oa]\b/i,
      ja: /写真家/,
    },
  ),
  d(
    "journalist",
    ["Q1930187"],
    ["journalist", "journalist"],
    ["jornalista", "jornalista"],
    ["ジャーナリスト", "ジャーナリスト"],
    {
      en: /\b(journalist|reporter)\b/i,
      pt: /\b(jornalista|repórter)\b/i,
      ja: /ジャーナリスト|記者/,
    },
  ),
  d(
    "activist",
    ["Q15253558", "Q11499147"],
    ["activist", "activist"],
    ["ativista", "ativista"],
    ["活動家", "活動家"],
    {
      en: /\b(activist|revolutionary|abolitionist)\b/i,
      pt: /\b(ativista|activista|revolucionári[oa]|abolicionista)\b/i,
      ja: /活動家|革命家|運動家/,
    },
  ),
  d(
    "diplomat",
    ["Q193391"],
    ["diplomat", "diplomat"],
    ["diplomata", "diplomata"],
    ["外交官", "外交官"],
    {
      en: /\bdiplomat\b/i,
      pt: /\bdiplomata\b/i,
      ja: /外交官/,
    },
  ),
];

export const DESCRIPTOR_BY_OCCUPATION = new Map<string, Descriptor>();
for (const descriptor of DESCRIPTORS) {
  for (const occupation of descriptor.occupations) {
    if (!DESCRIPTOR_BY_OCCUPATION.has(occupation)) {
      DESCRIPTOR_BY_OCCUPATION.set(occupation, descriptor);
    }
  }
}

/**
 * Pick the descriptor a player would use: the occupation mentioned first in
 * the description (this language, then English), else the first by priority.
 */
export function pickDescriptor(
  occupations: Iterable<string>,
  descriptions: Partial<Record<Lang, string>>,
  lang: Lang,
): Descriptor | null {
  const candidates = new Set<Descriptor>();
  for (const occupation of occupations) {
    const descriptor = DESCRIPTOR_BY_OCCUPATION.get(occupation);
    if (descriptor) candidates.add(descriptor);
  }
  if (candidates.size === 0) return null;
  if (candidates.size === 1) return [...candidates][0];
  for (const source of [lang, "en"] as Lang[]) {
    const text = descriptions[source];
    if (!text) continue;
    let best: Descriptor | null = null;
    let bestIndex = Number.POSITIVE_INFINITY;
    for (const descriptor of candidates) {
      const index = text.search(descriptor.match[source]);
      if (index >= 0 && index < bestIndex) {
        best = descriptor;
        bestIndex = index;
      }
    }
    if (best) return best;
  }
  return DESCRIPTORS.find((descriptor) => candidates.has(descriptor)) ?? null;
}
