// A few themes from each set, shown when someone hovers the set while setting
// up a room. Each one is a real theme in data/themes.json, copied in its three
// languages (theme-set-examples.test.ts checks they still match).
import type { ThemeSet } from "./theme-sets";
import type { Localized } from "./types";

export const THEME_SET_EXAMPLES: Record<ThemeSet, readonly Localized[]> = {
  screen: [
    {
      en: "Disney characters",
      pt: "Personagens da Disney",
      ja: "ディズニーのキャラクター",
    },
    {
      en: "Harry Potter characters",
      pt: "Personagens de Harry Potter",
      ja: "ハリー・ポッターの登場人物",
    },
    {
      en: "Horror movie characters",
      pt: "Personagens de filmes de terror",
      ja: "ホラー映画のキャラクター",
    },
  ],
  cartoons: [
    {
      en: "The Simpsons characters",
      pt: "Personagens dos Simpsons",
      ja: "シンプソンズのキャラクター",
    },
    { en: "Talking objects", pt: "Objetos que falam", ja: "しゃべる物や道具" },
    {
      en: "Toy characters",
      pt: "Personagens que são brinquedos",
      ja: "おもちゃのキャラクター",
    },
  ],
  anime: [
    {
      en: "Dragon Ball characters",
      pt: "Personagens de Dragon Ball",
      ja: "ドラゴンボールのキャラクター",
    },
    {
      en: "Studio Ghibli characters",
      pt: "Personagens do Studio Ghibli",
      ja: "ジブリのキャラクター",
    },
    { en: "Magical girls", pt: "Garotas mágicas", ja: "魔法少女" },
  ],
  games: [
    { en: "Pokémon", pt: "Pokémon", ja: "ポケモン" },
    {
      en: "Nintendo characters",
      pt: "Personagens da Nintendo",
      ja: "任天堂のキャラクター",
    },
    {
      en: "Fighting game characters",
      pt: "Personagens de jogos de luta",
      ja: "格闘ゲームのキャラクター",
    },
  ],
  books: [
    {
      en: "Fairy tale characters",
      pt: "Personagens de contos de fadas",
      ja: "おとぎ話のキャラクター",
    },
    { en: "Princesses", pt: "Princesas", ja: "お姫様" },
    { en: "Writers", pt: "Escritores", ja: "作家" },
  ],
  heroes: [
    { en: "Superheroes", pt: "Super-heróis", ja: "スーパーヒーロー" },
    { en: "Villains", pt: "Vilões", ja: "悪役" },
    { en: "Sidekicks", pt: "Fiéis escudeiros", ja: "主人公の相棒" },
  ],
  powers: [
    {
      en: "Characters who can fly",
      pt: "Personagens que voam",
      ja: "空を飛べるキャラクター",
    },
    {
      en: "Immortal characters",
      pt: "Personagens imortais",
      ja: "不死身のキャラクター",
    },
    { en: "Mutants", pt: "Mutantes", ja: "ミュータント" },
  ],
  myths: [
    { en: "Vampires", pt: "Vampiros", ja: "吸血鬼" },
    { en: "Dragons", pt: "Dragões", ja: "ドラゴン" },
    { en: "Gods", pt: "Deuses", ja: "神様" },
  ],
  scifi: [
    { en: "Robots", pt: "Robôs", ja: "ロボット" },
    { en: "Aliens", pt: "Alienígenas", ja: "宇宙人" },
    {
      en: "Time travelers",
      pt: "Viajantes do tempo",
      ja: "タイムトラベルしたキャラクター",
    },
  ],
  warriors: [
    { en: "Pirates", pt: "Piratas", ja: "海賊" },
    { en: "Ninjas", pt: "Ninjas", ja: "忍者" },
    { en: "Knights", pt: "Cavaleiros", ja: "騎士" },
  ],
  animals: [
    { en: "Cats", pt: "Gatos", ja: "猫のキャラクター" },
    { en: "Dinosaurs", pt: "Dinossauros", ja: "恐竜" },
    { en: "Talking animals", pt: "Animais falantes", ja: "しゃべる動物" },
  ],
  music: [
    { en: "Female singers", pt: "Cantoras", ja: "女性歌手" },
    { en: "Rock stars", pt: "Astros do rock", ja: "ロックスター" },
    { en: "K-pop idols", pt: "Idols de K-pop", ja: "K-POPアイドル" },
  ],
  celebs: [
    { en: "Comedians", pt: "Comediantes", ja: "お笑い芸人" },
    {
      en: "YouTubers and streamers",
      pt: "YouTubers e streamers",
      ja: "YouTuberや配信者",
    },
    {
      en: "Famous people from the 90s",
      pt: "Famosos dos anos 90",
      ja: "90年代の有名人",
    },
  ],
  sports: [
    { en: "Soccer players", pt: "Jogadores de futebol", ja: "サッカー選手" },
    { en: "Race car drivers", pt: "Pilotos de corrida", ja: "レーサー" },
    {
      en: "Fictional athletes",
      pt: "Atletas fictícios",
      ja: "スポーツ漫画や映画のキャラクター",
    },
  ],
  history: [
    { en: "Kings", pt: "Reis", ja: "王様" },
    { en: "Scientists", pt: "Cientistas", ja: "科学者" },
    { en: "Painters", pt: "Pintores", ja: "画家" },
  ],
  world: [
    {
      en: "Famous Brazilians",
      pt: "Brasileiros famosos",
      ja: "有名なブラジル人",
    },
    {
      en: "Characters who live in the sea",
      pt: "Personagens que vivem no mar",
      ja: "海に住むキャラクター",
    },
    {
      en: "Ice and snow characters",
      pt: "Personagens do gelo e da neve",
      ja: "雪や氷のキャラクター",
    },
  ],
  jobs: [
    { en: "Detectives", pt: "Detetives", ja: "探偵" },
    { en: "Doctors", pt: "Médicos", ja: "医者" },
    { en: "Spies", pt: "Espiões", ja: "スパイ" },
  ],
  family: [
    { en: "Twins", pt: "Gêmeos", ja: "双子のキャラクター" },
    { en: "Famous couples", pt: "Casais famosos", ja: "有名なカップル" },
    {
      en: "Baby characters",
      pt: "Personagens bebês",
      ja: "赤ちゃんのキャラクター",
    },
  ],
  quirks: [
    {
      en: "Clumsy characters",
      pt: "Personagens desastrados",
      ja: "ドジなキャラクター",
    },
    {
      en: "Characters with a catchphrase",
      pt: "Personagens com bordão",
      ja: "決めゼリフがあるキャラクター",
    },
    { en: "Geniuses", pt: "Gênios", ja: "天才" },
  ],
  looks: [
    {
      en: "Characters who wear a hat",
      pt: "Personagens de chapéu",
      ja: "帽子をかぶったキャラクター",
    },
    {
      en: "Bald characters",
      pt: "Personagens carecas",
      ja: "ツルツル頭のキャラクター",
    },
    {
      en: "Green characters",
      pt: "Personagens verdes",
      ja: "緑色のキャラクター",
    },
  ],
};
