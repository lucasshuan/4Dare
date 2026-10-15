// Every value the control panel can change, declared once. Each entry points
// at a leaf of a tunable constant (tune.ts) by its key; the default is that
// constant's own value, so nothing is written twice. The panel's tabs, the
// server's checks and the values a room carries all come from this list.
import { AVAILABILITY, type GameKey } from "./games";
import { IMP_REVEAL, IMP_RULES } from "./impostor/engine";
import { MATCH_QUESTIONS } from "./impostor/questions";
import {
  COINS,
  CUE_GAP,
  LOTS,
  LOTS_PER_SEAT,
  LU_CLOCKS,
  LU_FLOORS,
  ROUNDS,
} from "./lineup/rules";
import { MOMENT_TRACKS, MOMENTS, TRACK_IDS, TRACK_TUNES } from "./music-tunes";
import { GAME_XP, XP } from "./profile/xp";
import { cleanClipsText, SCENE_CLIPS, SCENE_GAMES } from "./scene-clips";
import { CAST, CAST_MARKS } from "./show-timing/cast";
import { DEAL, DEAL_MARKS } from "./show-timing/deal";
import { DRAW, DRAW_MARKS } from "./show-timing/draw";
import { LINEUP, LINEUP_MARKS } from "./show-timing/lineup";
import { OPENING, OPENING_MARKS } from "./show-timing/opening";
import { PICK } from "./show-timing/pick";
import { THEME, THEME_MARKS } from "./show-timing/theme";
import { ROOM_SOUNDS, SOUND_IDS } from "./sounds";
import { defaultOf, type Tunes, type TuneValue } from "./tune";
import { DEFAULT_SETTINGS, ENGINE, REVEAL_TIMING, STEP_SECONDS } from "./types";
import { WORKSHOP } from "./workshop-rules";

/** The tunable constants by their prefix (the first part of a key). */
const ROOTS: Record<string, object> = {
  opening: OPENING,
  openingMarks: OPENING_MARKS,
  theme: THEME,
  themeMarks: THEME_MARKS,
  draw: DRAW,
  drawMarks: DRAW_MARKS,
  pick: PICK,
  cast: CAST,
  castMarks: CAST_MARKS,
  deal: DEAL,
  dealMarks: DEAL_MARKS,
  lineup: LINEUP,
  lineupMarks: LINEUP_MARKS,
  reveal: REVEAL_TIMING,
  imp: IMP_REVEAL,
  impRules: IMP_RULES,
  impMatch: MATCH_QUESTIONS,
  lu: LU_CLOCKS,
  luFloor: LU_FLOORS,
  cue: CUE_GAP,
  engine: ENGINE,
  // DEFAULT_RULES (lineup/rules.ts) reads the same keys: room.coins, room.trades…
  room: DEFAULT_SETTINGS,
  "room.step": STEP_SECONDS,
  "rules.coins": COINS,
  "rules.lotsPerSeat": LOTS_PER_SEAT,
  "rules.lots": LOTS,
  "rules.rounds": ROUNDS,
  xp: XP,
  gameXp: GAME_XP,
  games: AVAILABILITY,
  music: TRACK_TUNES,
  moments: MOMENT_TRACKS,
  roomSounds: ROOM_SOUNDS,
  scenes: SCENE_CLIPS,
  workshop: WORKSHOP,
};

export type TuneUnit =
  | "ms"
  | "s"
  | "n"
  | "xp"
  | "coins"
  | "bool"
  | "choice"
  | "db"
  | "bar"
  | "gain"
  | "clips";

/** Which tab of a game's page lists an entry. */
export type TuneTab =
  | "timing"
  | "defaults"
  | "xp"
  | "availability"
  | "music"
  | "scenes"
  | "workshop";

export interface Tunable {
  /**
   * The leaf's key ("lu.halftime"), or the key of a { first, later } pair
   * ("opening.title"): the room's first match and the ones after.
   */
  key: string;
  label: string;
  /** The game it belongs to; "shared" for every game. */
  game: GameKey | "shared";
  tab: TuneTab;
  group: string;
  unit: TuneUnit;
  min?: number;
  max?: number;
  /** For a choice: the values it takes. */
  options?: readonly string[];
  /** Where the default lives. */
  src: string;
  /** Only shown: tied to something the panel can't move with it. */
  locked?: string;
  /** The room's first match only (no "later" value). */
  firstOnly?: boolean;
}

const MOMENT_LABEL: Record<(typeof MOMENTS)[number], string> = {
  room: "Sala (lobby e partida)",
  opening: "Abertura (recomeça do início)",
  host: "Apresentador (cabine)",
  end: "Fim de jogo",
};

const SHOW = { min: 100, max: 30_000, unit: "ms" } as const;
const CLOCK = { min: 1000, max: 180_000, unit: "ms" } as const;
const ST = "src/game/show-timing";

const t = (
  key: string,
  label: string,
  game: Tunable["game"],
  group: string,
  src: string,
  more: Partial<Tunable> = {},
): Tunable => ({
  key,
  label,
  game,
  tab: "timing",
  group,
  src,
  ...SHOW,
  ...more,
});

/** Room defaults: what a new room starts with, and the range its host can set. */
const room = (
  key: string,
  label: string,
  game: Tunable["game"],
  more: Partial<Tunable>,
): Tunable => ({
  key,
  label,
  game,
  tab: "defaults",
  group: "Padrões da sala",
  src: "src/game/types.ts",
  unit: "s",
  min: 30,
  max: 300,
  ...more,
});

const xp = (key: string, label: string, game: Tunable["game"]): Tunable => ({
  key,
  label,
  game,
  tab: "xp",
  group: "XP por partida",
  src: "src/game/profile/xp.ts",
  unit: "xp",
  min: 0,
  max: 100,
});

export const TUNABLES: readonly Tunable[] = [
  // -- shared: the opening and the engine ------------------------------------
  t(
    "opening.curtain",
    "Cortina antes do título",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
  ),
  t(
    "opening.title",
    "Cena do título (número, elenco e jogo)",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
    { locked: "sincronizada com a música (95,08 BPM)" },
  ),
  t(
    "opening.entrance.vote",
    "Entrada da votação de tema",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
  ),
  t(
    "opening.entrance.theming",
    "Entrada do tema digitado",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
  ),
  t(
    "opening.tieSpin",
    "Roleta de desempate",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
  ),
  t(
    "opening.settle",
    "O tema escolhido assenta",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
  ),
  t(
    "openingMarks.settleDim",
    "Os perdedores apagam (momento)",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
  ),
  t(
    "openingMarks.settleLeave",
    "Os perdedores saem (momento)",
    "shared",
    "Abertura",
    `${ST}/opening.ts`,
  ),
  t(
    "engine.startWait",
    "Espera máxima pelas telas no início",
    "shared",
    "Motor",
    "src/game/types.ts",
    { min: 1000, max: 15_000 },
  ),
  t(
    "engine.startLead",
    "Antecipação do início",
    "shared",
    "Motor",
    "src/game/types.ts",
    { min: 0, max: 3000 },
  ),
  t(
    "engine.endLead",
    "Antecipação do fim",
    "shared",
    "Motor",
    "src/game/types.ts",
    { min: 0, max: 3000 },
  ),
  t(
    "engine.clockCutFloor",
    "Piso do corte de relógio (quando os outros já agiram)",
    "shared",
    "Motor",
    "src/game/types.ts",
    { min: 3000, max: 60_000 },
  ),

  // -- Who am I? -------------------------------------------------------------
  t(
    "opening.intro",
    "Cold open (como jogar)",
    "who-am-i",
    "Abertura",
    `${ST}/opening.ts`,
    { firstOnly: true },
  ),
  t(
    "theme.theme.withRule",
    "Tema em cena (com regra)",
    "who-am-i",
    "Tema e sorteio",
    `${ST}/theme.ts`,
  ),
  t(
    "theme.theme.alone",
    "Tema em cena (sem regra)",
    "who-am-i",
    "Tema e sorteio",
    `${ST}/theme.ts`,
  ),
  t(
    "theme.rule.cards",
    "Regra com cartas ✓ e ✗",
    "who-am-i",
    "Tema e sorteio",
    `${ST}/theme.ts`,
    { firstOnly: true },
  ),
  t(
    "theme.rule.sentence",
    "Regra só com a frase",
    "who-am-i",
    "Tema e sorteio",
    `${ST}/theme.ts`,
    { firstOnly: true },
  ),
  t(
    "draw.draw",
    "Sorteio (avatares no 4)",
    "who-am-i",
    "Tema e sorteio",
    `${ST}/draw.ts`,
  ),
  t(
    "draw.target",
    "Para quem você escolhe",
    "who-am-i",
    "Tema e sorteio",
    `${ST}/draw.ts`,
  ),
  t(
    "draw.lead",
    "Folga do título quando dois escolhem um para o outro",
    "who-am-i",
    "Tema e sorteio",
    `${ST}/draw.ts`,
    { min: 0, max: 3000 },
  ),
  t(
    "engine.pickSeconds",
    "Tempo para escolher o personagem",
    "who-am-i",
    "Tema e sorteio",
    "src/game/types.ts",
    { unit: "s", min: 30, max: 300 },
  ),
  t(
    "pick.entrance",
    "Entrada da mesa de escolha",
    "who-am-i",
    "Elenco e turnos",
    `${ST}/pick.ts`,
  ),
  t(
    "pick.picked.confirmed",
    "Todos escolheram",
    "who-am-i",
    "Elenco e turnos",
    `${ST}/pick.ts`,
  ),
  t(
    "pick.picked.timeout",
    "Carimbo de tempo esgotado",
    "who-am-i",
    "Elenco e turnos",
    `${ST}/pick.ts`,
  ),
  t(
    "cast.received",
    "Quem escolheu a sua carta",
    "who-am-i",
    "Elenco e turnos",
    `${ST}/cast.ts`,
  ),
  t(
    "cast.order",
    "Ordem dos turnos",
    "who-am-i",
    "Elenco e turnos",
    `${ST}/cast.ts`,
  ),
  t(
    "cast.entrance",
    "Entrada do primeiro turno",
    "who-am-i",
    "Elenco e turnos",
    `${ST}/cast.ts`,
  ),
  t(
    "reveal.answersBase",
    "Respostas: base",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
  ),
  t(
    "reveal.perAnswer",
    "Respostas: a mais por resposta",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
    { min: 0, max: 5000 },
  ),
  t(
    "reveal.perNoteChar",
    "Respostas: a mais por letra de comentário",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
    { min: 0, max: 500 },
  ),
  t(
    "reveal.answersMin",
    "Respostas: mínimo",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
  ),
  t(
    "reveal.answersMax",
    "Respostas: máximo",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
  ),
  t(
    "reveal.guessHit",
    "Palpite certo",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
  ),
  t(
    "reveal.guessMiss",
    "Palpite errado",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
  ),
  t(
    "reveal.pass",
    "Passou a vez",
    "who-am-i",
    "Revelações entre turnos",
    "src/game/types.ts",
  ),

  // -- Impostor ----------------------------------------------------------------
  t(
    "deal.card",
    "Carta secreta na tela",
    "impostor",
    "Distribuição",
    `${ST}/deal.ts`,
  ),
  t(
    "deal.entrance",
    "Entrada da pergunta",
    "impostor",
    "Distribuição",
    `${ST}/deal.ts`,
  ),
  t(
    "dealMarks.cardWarning",
    "“Um de vocês tem outra” (momento)",
    "impostor",
    "Distribuição",
    `${ST}/deal.ts`,
  ),
  t(
    "imp.repliesBase",
    "Respostas: base",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
  ),
  t(
    "imp.perReply",
    "Respostas: a mais por resposta",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
    { min: 0, max: 3000 },
  ),
  t(
    "imp.perWord",
    "Respostas: a mais por palavra",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
    { min: 0, max: 3000 },
  ),
  t(
    "imp.repliesMax",
    "Respostas: máximo",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
  ),
  t(
    "imp.out",
    "Alguém saiu",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
  ),
  t(
    "imp.tie",
    "Empate (ou ninguém votou)",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
  ),
  t(
    "imp.caught",
    "Impostor pego",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
  ),
  t(
    "imp.swap",
    "Troca de pergunta",
    "impostor",
    "Revelações",
    "src/game/impostor/engine.ts",
  ),
  t(
    "engine.talkFloor",
    "Discussão: mínimo mesmo com todos votando",
    "impostor",
    "Relógios",
    "src/game/types.ts",
    { ...CLOCK, min: 5000, max: 120_000 },
  ),

  // -- What for? -------------------------------------------------------------
  t(
    "lineup.rules",
    "Regras no quadro",
    "lineup",
    "Abertura e rodadas",
    `${ST}/lineup.ts`,
    { firstOnly: true },
  ),
  t(
    "lineup.secret",
    "Missão secreta",
    "lineup",
    "Abertura e rodadas",
    `${ST}/lineup.ts`,
  ),
  t(
    "opening.round",
    "Cartão “Rodada N”",
    "lineup",
    "Abertura e rodadas",
    `${ST}/opening.ts`,
  ),
  t(
    "lineup.chair",
    "Cadeira do apresentador",
    "lineup",
    "Abertura e rodadas",
    `${ST}/lineup.ts`,
  ),
  t(
    "lineup.entrance",
    "Primeiro lote entra",
    "lineup",
    "Leilão",
    `${ST}/lineup.ts`,
  ),
  t("lineup.sold", "Vendido", "lineup", "Leilão", `${ST}/lineup.ts`),
  t(
    "lineup.unsold",
    "Ninguém deu lance",
    "lineup",
    "Leilão",
    `${ST}/lineup.ts`,
  ),
  t(
    "lu.lone",
    "Lote com um só comprador possível",
    "lineup",
    "Leilão",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.snipe",
    "Lance no fim devolve",
    "lineup",
    "Leilão",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.halftime",
    "Intervalo",
    "lineup",
    "Leilão",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lineup.wrap",
    "Quadros lado a lado",
    "lineup",
    "Leilão",
    `${ST}/lineup.ts`,
  ),
  t(
    "lineup.envelope",
    "Envelope da missão",
    "lineup",
    "Apresentação e veredito",
    `${ST}/lineup.ts`,
  ),
  t(
    "lineupMarks.missionTag",
    "A missão sobe para o topo (momento)",
    "lineup",
    "Apresentação e veredito",
    `${ST}/lineup.ts`,
  ),
  t(
    "lu.present",
    "Cada quadro no palco",
    "lineup",
    "Apresentação e veredito",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lineup.votes.base",
    "Votos caindo: base",
    "lineup",
    "Apresentação e veredito",
    `${ST}/lineup.ts`,
  ),
  t(
    "lineup.votes.each",
    "Votos caindo: a mais por voto",
    "lineup",
    "Apresentação e veredito",
    `${ST}/lineup.ts`,
    { min: 0, max: 3000 },
  ),
  t(
    "lineup.votes.max",
    "Votos caindo: máximo",
    "lineup",
    "Apresentação e veredito",
    `${ST}/lineup.ts`,
  ),
  t(
    "lineup.stamp",
    "Carimbo",
    "lineup",
    "Apresentação e veredito",
    `${ST}/lineup.ts`,
  ),
  t(
    "lineup.verdict",
    "Veredito",
    "lineup",
    "Apresentação e veredito",
    `${ST}/lineup.ts`,
  ),
  t(
    "lu.tiebreak",
    "Desempate",
    "lineup",
    "Apresentação e veredito",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.score",
    "Placar da rodada (ou pódio)",
    "lineup",
    "Apresentação e veredito",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.choose",
    "Apresentador escolhe a missão",
    "lineup",
    "Apresentador",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.firstLot",
    "Primeiro lote da rodada (fila vazia)",
    "lineup",
    "Apresentador",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.nextLot",
    "Lote seguinte (fila acabou)",
    "lineup",
    "Apresentador",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.verdict",
    "Apresentador decide",
    "lineup",
    "Apresentador",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "lu.quickVote",
    "Sem veredito: a sala vota",
    "lineup",
    "Apresentador",
    "src/game/lineup/rules.ts",
    CLOCK,
  ),
  t(
    "cue.gap",
    "Intervalo mínimo entre sons do controle",
    "lineup",
    "Apresentador",
    "src/game/lineup/rules.ts",
    { min: 500, max: 10_000 },
  ),
  ...(
    [
      ["halftime", "Intervalo"],
      ["trading", "Trocas"],
      ["defending", "Defesa"],
      ["judging", "Julgamento"],
      ["scoring", "Placar"],
    ] as const
  ).map(([k, label]) =>
    t(
      `luFloor.${k}`,
      `Piso do corte: ${label}`,
      "lineup",
      "Pisos dos cortes",
      "src/game/lineup/rules.ts",
      CLOCK,
    ),
  ),

  // -- room defaults ---------------------------------------------------------
  room("room.step.min", "Menor relógio que a sala pode pôr", "shared", {
    min: 10,
    max: 120,
  }),
  room("room.step.max", "Maior relógio que a sala pode pôr", "shared", {
    min: 60,
    max: 900,
  }),
  room("room.voteSeconds", "Votar no tema", "shared", {}),
  room("room.askSeconds", "Perguntar", "who-am-i", {}),
  room("room.answerSeconds", "Responder", "who-am-i", {}),
  room("room.guessSeconds", "Palpitar", "who-am-i", {}),
  room("room.validateSeconds", "Conferir palpite", "who-am-i", {}),
  room("room.replySeconds", "Responder a pergunta", "impostor", {}),
  room("room.talkSeconds", "Discutir", "impostor", {}),
  room("room.lastSeconds", "Último palpite do impostor", "impostor", {}),
  room("room.lotSeconds", "Lote do leilão", "lineup", {}),
  room("room.tradeSeconds", "Trocas", "lineup", {}),
  room("room.defendSeconds", "Defender o time", "lineup", {}),
  room("room.judgeSeconds", "Julgar", "lineup", {}),
  room("room.coins", "Moedas por jogador", "lineup", {
    unit: "coins",
    min: 1,
    max: 50,
  }),
  room("rules.coins.min", "Moedas: o mínimo que a sala pode pôr", "lineup", {
    unit: "coins",
    min: 1,
    max: 50,
  }),
  room("rules.coins.max", "Moedas: o máximo que a sala pode pôr", "lineup", {
    unit: "coins",
    min: 1,
    max: 50,
  }),
  room("room.lotsPerSeat", "Lotes por jogador", "lineup", {
    unit: "n",
    min: 1,
    max: 8,
  }),
  room("rules.lotsPerSeat.min", "Lotes por jogador: mínimo", "lineup", {
    unit: "n",
    min: 1,
    max: 8,
  }),
  room("rules.lotsPerSeat.max", "Lotes por jogador: máximo", "lineup", {
    unit: "n",
    min: 1,
    max: 8,
  }),
  room("rules.rounds.max", "Rodadas: o máximo que a sala pode pôr", "lineup", {
    unit: "n",
    min: 1,
    max: 6,
  }),
  room("room.interval", "Intervalo no meio do leilão", "lineup", {
    unit: "bool",
  }),
  room("room.trades", "Trocas entre jogadores", "lineup", { unit: "bool" }),
  room("room.heavy", "Missões pesadas", "lineup", { unit: "bool" }),
  room("room.mode", "Modo apresentador por padrão", "lineup", {
    unit: "choice",
    options: ["host", "classic"],
  }),
  room("room.themeMode", "Tema por voto (ou o anfitrião digita)", "shared", {
    unit: "choice",
    options: ["vote", "host"],
  }),
  // what the room doesn't show, on the same tab
  room("engine.hostThemeSeconds", "Anfitrião digita o tema", "shared", {
    group: "Fora da criação de sala",
    src: "src/game/types.ts",
    min: 10,
    max: 120,
  }),
  room("impMatch.questions", "Perguntas preparadas por partida", "impostor", {
    group: "Fora da criação de sala",
    src: "src/game/impostor/questions.ts",
    unit: "n",
    min: 3,
    max: 20,
  }),
  room(
    "impRules.firstRoundQuestions",
    "Perguntas antes do primeiro voto",
    "impostor",
    {
      group: "Fora da criação de sala",
      src: "src/game/impostor/engine.ts",
      unit: "n",
      min: 1,
      max: 5,
    },
  ),
  room("impRules.maxSwaps", "Trocas de carta por partida", "impostor", {
    group: "Fora da criação de sala",
    src: "src/game/impostor/engine.ts",
    unit: "n",
    min: 0,
    max: 5,
  }),
  room("rules.lots.extra", "Lotes a mais na mesa", "lineup", {
    group: "Fora da criação de sala",
    src: "src/game/lineup/rules.ts",
    unit: "n",
    min: 0,
    max: 10,
  }),
  room("rules.lots.max", "Máximo de lotes", "lineup", {
    group: "Fora da criação de sala",
    src: "src/game/lineup/rules.ts",
    unit: "n",
    min: 6,
    max: 40,
  }),

  // -- XP ----------------------------------------------------------------------
  xp("xp.finish", "Terminar a partida", "shared"),
  xp("xp.first", "Ficar em primeiro", "shared"),
  xp("xp.dayFirst", "Primeira partida do dia", "shared"),
  xp("gameXp.who-am-i.discovered", "Descobrir o seu personagem", "who-am-i"),
  xp("gameXp.impostor.rightVote", "Voto certo num impostor", "impostor"),
  xp(
    "gameXp.impostor.survived",
    "Cada rodada que o impostor sobrevive",
    "impostor",
  ),
  xp(
    "gameXp.impostor.guessHit",
    "Último palpite certo do impostor",
    "impostor",
  ),
  xp("gameXp.lineup.roundWon", "Vencer a rodada", "lineup"),
  xp("gameXp.lineup.vote", "Cada voto recebido", "lineup"),
  xp("gameXp.lineup.crowd", "Favorito da plateia", "lineup"),
  xp("gameXp.lineup.presented", "Cada rodada apresentada", "lineup"),

  // -- music -----------------------------------------------------------------
  ...TRACK_IDS.flatMap((id): Tunable[] => [
    {
      key: `music.${id}.gainDb`,
      label: "Volume-base",
      game: "shared",
      tab: "music",
      group: id,
      unit: "db",
      min: -18,
      max: 12,
      src: "src/game/music-tunes.ts",
    },
    {
      key: `music.${id}.start`,
      label: "O loop volta ao compasso",
      game: "shared",
      tab: "music",
      group: id,
      unit: "bar",
      min: 0,
      max: 60,
      src: "src/game/music-tunes.ts",
    },
    {
      key: `music.${id}.end`,
      label: "O loop volta depois do compasso",
      game: "shared",
      tab: "music",
      group: id,
      unit: "bar",
      min: 1,
      max: 64,
      src: "src/game/music-tunes.ts",
    },
  ]),
  ...(["who-am-i", "impostor", "lineup"] as const).flatMap((g) =>
    MOMENTS.filter((m) => m in MOMENT_TRACKS[g]).map(
      (m): Tunable => ({
        key: `moments.${g}.${m}`,
        label: MOMENT_LABEL[m],
        game: g,
        tab: "music",
        group: "Música por momento",
        unit: "choice",
        options: ["", ...TRACK_IDS],
        src: "src/game/music-tunes.ts",
      }),
    ),
  ),

  // -- the room's own sounds -------------------------------------------------
  ...(
    [
      ["join", "Alguém entra na sala"],
      ["leave", "Alguém sai da sala"],
      ["chat", "Mensagem no chat fechado"],
      ["step", "Passo que espera você"],
      ["tick", "Relógio acabando"],
      ["complete", "Pódio"],
    ] as const
  ).flatMap(([k, label]): Tunable[] => [
    {
      key: `roomSounds.${k}.sound`,
      label,
      game: "shared",
      tab: "music",
      group: "Sons da sala e da partida",
      unit: "choice",
      options: SOUND_IDS,
      src: "src/game/sounds.ts",
    },
    {
      key: `roomSounds.${k}.volume`,
      label: `${label}: volume`,
      game: "shared",
      tab: "music",
      group: "Sons da sala e da partida",
      unit: "gain",
      min: 0,
      max: 1.5,
      src: "src/game/sounds.ts",
    },
  ]),

  // -- the title scenes' sounds -----------------------------------------------
  ...SCENE_GAMES.map(
    (g): Tunable => ({
      key: `scenes.${g}`,
      label: "Sons da abertura",
      game: g,
      tab: "scenes",
      group: "Cenas",
      unit: "clips",
      src: "src/features/opening/scene-sound.ts",
    }),
  ),

  // -- the Workshop's rules ---------------------------------------------------
  ...(
    [
      ["weekly", "Sugestões por conta, por semana", "Envio", "n", 1, 20],
      ["page", "Itens por página na Oficina", "Envio", "n", 6, 96],
      [
        "weight.level",
        "Peso por nível de quem vota",
        "Prioridade",
        "gain",
        0,
        1,
      ],
      [
        "weight.live",
        "Peso por sugestão no ar de quem vota (até 5)",
        "Prioridade",
        "gain",
        0,
        1,
      ],
      [
        "weight.staff",
        "Peso extra de curadores e admins",
        "Prioridade",
        "gain",
        0,
        3,
      ],
      [
        "author",
        "Pontos por sugestão do autor já no ar",
        "Prioridade",
        "n",
        0,
        20,
      ],
      [
        "z",
        "Confiança (z): mais alto pede mais votos",
        "Prioridade",
        "gain",
        0.5,
        3,
      ],
    ] as const
  ).map(
    ([k, label, group, unit, min, max]): Tunable => ({
      key: `workshop.${k}`,
      label,
      game: "shared",
      tab: "workshop",
      group,
      unit,
      min,
      max,
      src: "src/game/workshop-rules.ts",
    }),
  ),
  ...(
    [
      ["near_theme", "Tema parecido com um que já existe"],
      ["same_starters", "Mesmos exemplos de outro tema"],
      ["no_picture", "Exemplo sem foto"],
      ["near_text", "Texto parecido com um que já existe"],
      ["blocked_word", "Palavra bloqueada"],
    ] as const
  ).map(
    ([k, label]): Tunable => ({
      key: `workshop.checks.${k}`,
      label,
      game: "shared",
      tab: "workshop",
      group: "Checagens ao sugerir",
      unit: "bool",
      src: "src/server/workshop.ts",
    }),
  ),

  // -- availability ------------------------------------------------------------
  ...(["who-am-i", "impostor", "lineup"] as const).map(
    (g): Tunable => ({
      key: `games.${g}`,
      label: "Disponibilidade",
      game: g,
      tab: "availability",
      group: "Disponibilidade",
      unit: "choice",
      options: ["open", "test", "closed"],
      src: "src/game/games.ts",
    }),
  ),
];

/** Units kept to hundredths; the rest are whole numbers. */
const FRACTIONAL: ReadonlySet<TuneUnit> = new Set(["gain", "db"]);

/** The constant and the path a key points at. */
function locate(key: string): { root: object; path: string[] } | null {
  const prefix = Object.keys(ROOTS)
    .filter((p) => key === p || key.startsWith(`${p}.`))
    .sort((a, b) => b.length - a.length)[0];
  if (!prefix) return null;
  return {
    root: ROOTS[prefix],
    path: key.slice(prefix.length + 1).split("."),
  };
}

/** The code's value at a key: a leaf, or a { first, later } pair. */
export function defaultAt(key: string): unknown {
  const at = locate(key);
  return at ? defaultOf(at.root, at.path) : undefined;
}

const isLeaf = (v: unknown): v is TuneValue =>
  typeof v === "number" || typeof v === "boolean" || typeof v === "string";

/** The leaf keys an entry stands for: itself, or its .first and .later. */
export function leavesOf(entry: Tunable): string[] {
  const d = defaultAt(entry.key);
  if (isLeaf(d)) return [entry.key];
  if (d && typeof d === "object")
    return Object.keys(d)
      .filter((k) => isLeaf((d as Record<string, unknown>)[k]))
      .map((k) => `${entry.key}.${k}`);
  return [];
}

const BY_LEAF = new Map<string, Tunable>(
  TUNABLES.flatMap((e) => leavesOf(e).map((k) => [k, e] as const)),
);

/** The entry a leaf key belongs to. */
export const entryOf = (leaf: string) => BY_LEAF.get(leaf);

/**
 * A set of values made safe: unknown keys and wrong types dropped, numbers
 * rounded and kept in their range, choices kept to their options, and values
 * equal to the code's default left out (only what differs is kept).
 */
export function cleanTunes(raw: unknown): Record<string, TuneValue> {
  const out: Record<string, TuneValue> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    const e = BY_LEAF.get(k);
    if (!e || e.locked) continue;
    const d = defaultAt(k);
    if (typeof d !== typeof v) continue;
    let val = v as TuneValue;
    if (typeof val === "number") {
      if (!Number.isFinite(val)) continue;
      val = FRACTIONAL.has(e.unit)
        ? Math.round(val * 100) / 100
        : Math.round(val);
      if (e.min !== undefined) val = Math.max(e.min, val);
      if (e.max !== undefined) val = Math.min(e.max, val);
    }
    if (e.options && !e.options.includes(String(val))) continue;
    if (e.unit === "clips") {
      const clean = cleanClipsText(String(val));
      if (clean === null) continue;
      val = clean;
    }
    if (val !== d) out[k] = val;
  }
  return out;
}

/** Only the values a room of `game` reads: its game's and the shared ones. */
export function tunesFor(tunes: Tunes, game: GameKey): Tunes {
  return Object.fromEntries(
    Object.entries(tunes).filter(([k]) => {
      const g = BY_LEAF.get(k)?.game;
      return g === "shared" || g === game;
    }),
  );
}
