import type { Lang } from "@/game/types";
import type { NewsGame } from "./community-contract";

type Texts = Record<Lang, string>;

/** A post of the news page, written by hand when a feature ships. */
interface NewsEntry {
  /** Stays the same forever: reactions and `/news#<id>` links hang on it. */
  id: string;
  /** The day it went live, `YYYY-MM-DD`. */
  at: string;
  kind: "new" | "better" | "fix" | "notice";
  game: NewsGame;
  /** A fix may have none. */
  title?: Texts;
  body: Texts;
  /** A button to where it lives: a path and its words. */
  action?: { href: string; label: Texts };
}

/**
 * What changed in 4Dare, newest first. Every feature a player can see gets an
 * entry here in the same commit: copy one, change the id, the day and the four
 * texts. A Workshop suggestion that goes live writes its own post.
 */
export const NEWS_POSTS: readonly NewsEntry[] = [
  {
    id: "match-openings",
    at: "2026-10-11",
    kind: "new",
    game: "site",
    title: {
      pt: "Cada partida abre com uma cena",
      en: "Every match opens with a scene",
      es: "Cada partida abre con una escena",
      ja: "試合ごとにオープニング",
    },
    body: {
      pt: "Quem sou eu?, Impostor e Escalação ganharam aberturas próprias, no ritmo da música: a ficha da partida, a fila de suspeitos e o quadro tático. O número da partida conta por jogo, e quem venceu a última entra de coroa. A música do lobby para e a do jogo começa do início junto com a cena. A primeira partida tem a cena completa; as seguintes, uma mais curta.",
      en: "Who am I?, Impostor and Lineup each open with their own scene, on the music's beat: the match card, the suspects' lineup and the tactics board. The match number counts per game, and whoever won the last one comes in wearing a crown. The lobby's music stops and the game's starts over with the scene. The first match gets the full scene; the next ones a shorter one.",
      es: "¿Quién soy?, Impostor y Alineación abren con su propia escena, al ritmo de la música: la ficha de la partida, la rueda de sospechosos y la pizarra táctica. El número de partida cuenta por juego, y quien ganó la última entra con corona. La música del lobby se detiene y la del juego empieza de nuevo con la escena. La primera partida tiene la escena completa; las siguientes, una más corta.",
      ja: "だれ？、インポスター、スタメンに、音楽に合わせたオープニングが付きました。試合のカード、容疑者の面通し、作戦ボード。試合の番号はゲームごとに数え、前の試合の勝者は王冠で登場します。ロビーの音楽は止まり、ゲームの音楽がシーンと一緒に最初から流れます。最初の試合はフル、次からは短いバージョンです。",
    },
  },
  {
    id: "lineup-name",
    at: "2026-10-11",
    kind: "notice",
    game: "lineup",
    title: {
      pt: "Monte a equipe agora é Escalação",
      en: "Build the Team is now Lineup",
      es: "Arma el equipo ahora es Alineación",
      ja: "「チームを組もう」は「スタメン」に",
    },
    body: {
      pt: "Mesmo jogo, nome novo. Os links antigos continuam funcionando.",
      en: "Same game, new name. Old links still work.",
      es: "Mismo juego, nombre nuevo. Los enlaces viejos siguen funcionando.",
      ja: "ゲームはそのまま、名前が変わりました。前のリンクもそのまま使えます。",
    },
    action: {
      href: "/lineup",
      label: { pt: "Jogar", en: "Play", es: "Jugar", ja: "遊ぶ" },
    },
  },
  {
    id: "volume-key",
    at: "2026-10-11",
    kind: "better",
    game: "site",
    title: {
      pt: "Volume na mão",
      en: "Volume at hand",
      es: "Volumen a mano",
      ja: "音量をすぐ調整",
    },
    body: {
      pt: "Numa sala, pare o mouse no botão de som: aparece o volume geral, que começa na metade. Um clique muta e outro volta para onde estava. Os botões do topo agora mostram o que fazem.",
      en: "In a room, rest the pointer on the sound key: the overall volume shows up, starting at half. One click mutes, another brings it back where it was. The top bar keys now say what they do.",
      es: "En una sala, deja el ratón sobre el botón de sonido: aparece el volumen general, que empieza a la mitad. Un clic silencia y otro lo devuelve a donde estaba. Los botones de arriba ahora dicen qué hacen.",
      ja: "ルームでサウンドボタンにマウスを乗せると全体の音量が出ます（最初は半分）。クリックでミュート、もう一度で元の音量に。上のボタンは何をするか表示するようになりました。",
    },
  },
  {
    id: "side-menu-community",
    at: "2026-10-09",
    kind: "new",
    game: "site",
    title: {
      pt: "Menu lateral e páginas da comunidade",
      en: "A side menu and community pages",
      es: "Menú lateral y páginas de la comunidad",
      ja: "サイドメニューとコミュニティのページ",
    },
    body: {
      pt: "O botão à esquerda do logo abre tudo o que existe. Chegaram Personagens, para criar, apelidar e mandar fotos, além de Rankings, Jogadores e Contribuições.",
      en: "The button left of the logo opens everything there is. New: Characters, to add, nickname and send pictures, plus Rankings, Players and Contributions.",
      es: "El botón a la izquierda del logo abre todo lo que hay. Llegaron Personajes, para crear, poner apodos y subir fotos, además de Clasificación, Jugadores y Contribuciones.",
      ja: "ロゴの左のボタンからすべてのページへ。キャラクター（追加・ニックネーム・写真）、ランキング、プレイヤー、貢献のページが登場しました。",
    },
    action: {
      href: "/characters",
      label: {
        pt: "Ver Personagens",
        en: "See Characters",
        es: "Ver Personajes",
        ja: "キャラクターを見る",
      },
    },
  },
  {
    id: "workshop-open",
    at: "2026-10-09",
    kind: "new",
    game: "site",
    title: {
      pt: "A Oficina abriu",
      en: "The Workshop is open",
      es: "El Taller abrió",
      ja: "工房がオープン",
    },
    body: {
      pt: "Sugira temas, perguntas e missões, vote no que está chegando e veja o que já está no ar. O que entra no jogo aparece aqui, com crédito a quem sugeriu.",
      en: "Suggest themes, questions and missions, vote on what is coming and see what is live. What goes into the game shows up here, crediting who suggested it.",
      es: "Sugiere temas, preguntas y misiones, vota lo que viene y mira lo que ya está activo. Lo que entra en el juego aparece aquí, con crédito a quien lo sugirió.",
      ja: "テーマ・質問・ミッションを提案し、これからのものに投票し、公開中のものを見よう。ゲームに入ったものは、提案者の名前つきでここに載ります。",
    },
    action: {
      href: "/workshop",
      label: {
        pt: "Abrir a Oficina",
        en: "Open the Workshop",
        es: "Abrir el Taller",
        ja: "工房を開く",
      },
    },
  },
  {
    id: "privacy-terms-v1",
    at: "2026-10-09",
    kind: "notice",
    game: "site",
    title: {
      pt: "Privacidade e termos novos",
      en: "New privacy policy and terms",
      es: "Privacidad y términos nuevos",
      ja: "プライバシーポリシーと利用規約",
    },
    body: {
      pt: "Textos curtos, com o essencial em 30 segundos no topo. Nada mudou no que guardamos.",
      en: "Short texts, with the essentials in 30 seconds at the top. Nothing changed in what we keep.",
      es: "Textos cortos, con lo esencial en 30 segundos arriba. No cambió nada de lo que guardamos.",
      ja: "短い文章で、要点を30秒で読めるようにしました。保存するデータは変わりません。",
    },
    action: {
      href: "/privacy",
      label: {
        pt: "Ler o essencial",
        en: "Read the essentials",
        es: "Leer lo esencial",
        ja: "要点を読む",
      },
    },
  },
];
