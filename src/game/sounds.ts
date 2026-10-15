// The sound library (public/sfx, each file named for what it is) and the
// sounds a room plays, which the panel can swap and turn up or down (tune.ts).
import { tunable } from "./tune";

export const SOUND_CATEGORIES = [
  "Impacto",
  "Movimento",
  "Aviso",
  "Objeto",
  "Mixagem",
] as const;

/** Every sound file there is: its id is its file name in public/sfx. */
export const SOUND_LIBRARY = [
  { id: "thump", name: "Thump", cat: "Impacto", what: "Batida grave e seca." },
  {
    id: "soft-thud",
    name: "Soft Thud",
    cat: "Impacto",
    what: "Baque abafado e curto.",
  },
  { id: "pop", name: "Pop", cat: "Impacto", what: "Estalo curto e agudo." },
  {
    id: "tape-clunk",
    name: "Tape Clunk",
    cat: "Impacto",
    what: "Tecla de fita travando, com chiado no fim.",
  },
  {
    id: "whoosh",
    name: "Whoosh",
    cat: "Movimento",
    what: "Sopro rápido que passa.",
  },
  {
    id: "counter-roll",
    name: "Counter Roll",
    cat: "Movimento",
    what: "Contador girando até parar.",
  },
  {
    id: "card-fan",
    name: "Card Fan",
    cat: "Movimento",
    what: "Cartas abrindo em leque.",
  },
  {
    id: "confetti-burst",
    name: "Confetti Burst",
    cat: "Movimento",
    what: "Estouro com confete caindo.",
  },
  {
    id: "chime-up",
    name: "Chime Up",
    cat: "Aviso",
    what: "Duas notas subindo.",
  },
  {
    id: "chime-down",
    name: "Chime Down",
    cat: "Aviso",
    what: "Duas notas descendo.",
  },
  {
    id: "soft-ding",
    name: "Soft Ding",
    cat: "Aviso",
    what: "Uma nota suave que se apaga.",
  },
  {
    id: "clock-ticking",
    name: "Clock Ticking",
    cat: "Objeto",
    what: "Relógio de ponteiro, em loop.",
  },
  {
    id: "lamp-switch",
    name: "Lamp Switch",
    cat: "Objeto",
    what: "Interruptor de luminária.",
  },
  {
    id: "hum-burnout",
    name: "Hum Burnout",
    cat: "Objeto",
    what: "Zumbido de lâmpada queimando.",
  },
  {
    id: "blinds-and-stamp",
    name: "Blinds and Stamp",
    cat: "Mixagem",
    what: "Teclas de letreiro, zumbido, persianas, passos, flash, luzes apagando e carimbo.",
  },
  {
    id: "blinds-rise",
    name: "Blinds Rise",
    cat: "Mixagem",
    what: "Persianas subindo, passos, flash e carimbo.",
  },
  {
    id: "chalk-and-whistle",
    name: "Chalk and Whistle",
    cat: "Mixagem",
    what: "Apito distante, giz riscando e batidas no quadro.",
  },
  {
    id: "chalk-and-eraser",
    name: "Chalk and Eraser",
    cat: "Mixagem",
    what: "Apagador, giz riscando e batidas no quadro.",
  },
] as const satisfies readonly {
  id: string;
  name: string;
  cat: (typeof SOUND_CATEGORIES)[number];
  what: string;
}[];
export type SoundId = (typeof SOUND_LIBRARY)[number]["id"];
export const SOUND_IDS = SOUND_LIBRARY.map((s) => s.id) as readonly SoundId[];

/** Where a sound's file is. */
export const soundSrc = (id: string) => `/sfx/${id}.mp3`;

/** The room's own sounds: which file each plays, and how loud (× its file). */
export const ROOM_SOUNDS = tunable<
  Record<
    "tick" | "complete" | "step" | "join" | "leave" | "chat",
    { sound: SoundId; volume: number }
  >
>("roomSounds", {
  /** Loops while the step clock runs low. */
  tick: { sound: "clock-ticking", volume: 0.5 },
  /** The podium, with its confetti. */
  complete: { sound: "confetti-burst", volume: 0.7 },
  /** A turn step that waits on you starts: your question, your answer, your guess, the check of a guess on your pick. */
  step: { sound: "pop", volume: 0.6 },
  /** Someone joined the room (or came back to it). */
  join: { sound: "chime-up", volume: 0.6 },
  /** Someone left the room. */
  leave: { sound: "chime-down", volume: 0.6 },
  /** Someone else wrote in the chat while it was folded. */
  chat: { sound: "soft-ding", volume: 0.6 },
});
