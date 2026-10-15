// The title scenes' sounds as clips held to moments (src/game/scene-clips.ts).
// Each scene names its moments from its own timing (title-timing.ts), so a
// sound held to "the cast lands" follows the cast if the timing changes; the
// code's clips are the scene's sounds as they were mixed, the panel's list
// replaces them when there is one. The scenes and the panel read the same
// functions: there is no second list to keep.
import {
  type SceneClip,
  type SceneGame,
  type SceneKind,
  savedClips,
} from "@/game/scene-clips";
import { soundSrc } from "@/game/sounds";
import type { TitleCue } from "./title-sound";
import { impostorTimes, lineupTimes, MUSIC_AT, whoTimes } from "./title-timing";

/** A moment of a scene: once, or once per player (the cast landing). */
export interface SceneMoment {
  id: string;
  label: string;
  times: number[];
}

const each = (from: number, step: number, n: number) =>
  Array.from({ length: n }, (_, i) => from + i * step);

const m = (id: string, label: string, ...times: number[]): SceneMoment => ({
  id,
  label,
  times,
});

/** A scene's length (s). */
export function sceneLength(game: SceneGame, first: boolean): number {
  if (game === "impostor") return impostorTimes(first).total;
  if (game === "lineup") return lineupTimes(first).total;
  return whoTimes(first, 4).total;
}

/** When the game's take comes in (s); the choreography counts its beats from there. */
export const musicAt = (first: boolean) =>
  first ? MUSIC_AT.first : MUSIC_AT.later;

/** A scene's moments, in order, for `players` on stage. */
export function titleMoments(
  game: SceneGame,
  first: boolean,
  players: number,
): SceneMoment[] {
  const n = Math.max(1, players);
  const out: SceneMoment[] = [m("start", "Início da cena", 0)];
  if (game === "who-am-i") {
    const t = whoTimes(first, n);
    out.push(m("num-in", "Número entra", t.numIn));
    if (!first) out.push(m("roll", "Número conta", t.roll));
    out.push(
      m("num-out", "Número voa · música entra", t.numOut),
      m("chip", "Selo da partida", t.chip),
      m("land", "Cada um pousa", ...each(t.land, t.step, n)),
    );
    if (first)
      out.push(
        m("id-drop", "Cartas na testa", t.idDrop),
        m("spin", "Roleta", t.spin),
      );
    else out.push(m("crown", "Coroa", t.crown));
    if (first && t.q !== null) out.push(m("q", "Viram “?”", t.q));
    out.push(
      m("reveal", "Palco abre", t.reveal),
      m("title", "Título", t.titleLand),
    );
    out.push(m("end", "Fim da cena", t.total));
  } else if (game === "impostor") {
    const t = impostorTimes(first);
    if (first)
      out.push(
        m("board", "Quadro de letras", t.boardIn),
        m("letters", "Letras", t.letters),
        m("digits", "Número", t.digits),
      );
    else
      out.push(
        m("out", "Número sai", t.out),
        m("swap", "Troca o número", t.swap),
      );
    out.push(
      m("fly", "Número voa · música entra", t.fly),
      m("tilt", "Persianas viram", t.tilt),
      m("raise", "Persianas sobem", t.raise),
    );
    if (first)
      out.push(m("walk", "Cada suspeito entra", ...each(t.walk, t.step, n)));
    out.push(
      m("flash", "Flash", ...t.flashes),
      m("dim", "Cada luz apaga", ...each(t.dim, t.clack, n)),
      m("stamp", "Carimbo", t.stamp),
      m("end", "Fim da cena", t.total),
    );
  } else {
    const t = lineupTimes(first);
    if (!first) out.push(m("erase", "Apagador", t.erase));
    out.push(m("num", "Número", t.numW));
    if (first)
      out.push(
        m("rest", "Resto do texto", t.restW),
        m("underline", "Sublinhado", t.ul1),
      );
    out.push(
      m("fly", "Número voa · música entra", t.fly),
      m("pitch", "Campo", t.pitch),
    );
    out.push(m("drop", "Cada ímã cai", ...each(t.drop, t.step, n)));
    if (!first)
      out.push(m("crown", "Coroa", t.crown), m("move", "Ímãs mudam", t.move));
    out.push(
      m("arrows", "Setas", t.arrows),
      m("mystery", "“?” no gol", t.mystery),
      m("circle", "Círculo", t.circle),
      m("title", "Título", t.title),
      m("end", "Fim da cena", t.total),
    );
  }
  return out.sort((a, b) => a.times[0] - b.times[0]);
}

const clip = (
  id: string,
  label: string,
  sound: string,
  anchor: string,
  offset: number,
  gain: number,
  more: Partial<SceneClip> = {},
): SceneClip => ({
  id,
  label,
  sound,
  anchor,
  offset,
  gain,
  trimIn: 0,
  trimOut: null,
  fadeIn: 0,
  fadeOut: 0,
  each: false,
  ...more,
});

/** A scene's sounds as the code mixed them. */
export function codeClips(game: SceneGame, first: boolean): SceneClip[] {
  // the Impostor: one mixed track (the letter board's keys, the lights' hum, the
  // blinds turning and rising, each costume's steps, the flash, every light
  // going off, the stamp) and the white light's hum burning out on the way in
  if (game === "impostor")
    return [
      clip(
        "track",
        "Trilha da cena",
        first ? "blinds-and-stamp" : "blinds-rise",
        "start",
        0,
        1,
        { track: true },
      ),
      clip("hum", "Zumbido das luzes", "hum-burnout", "start", 0, 0.5),
    ];
  // What for?: one mixed track (the whistle far away, the chalk scratching and
  // writing, taps on the board, the eraser on a rematch) and the lamp's switch
  // as the room comes out of the dark
  if (game === "lineup")
    return [
      clip(
        "track",
        "Trilha da cena",
        first ? "chalk-and-whistle" : "chalk-and-eraser",
        "start",
        0,
        1,
        { track: true },
      ),
      clip("lamp", "Luminária", "lamp-switch", "start", 0, 0.9),
    ];
  // Who am I?: the number thumps in (rolls on a rematch) and whooshes off, a
  // soft thud per player landing, the card fan as the roulette spins
  return [
    clip("number", "Número", "thump", "num-in", 0, 1),
    ...(first
      ? []
      : [clip("roll", "Contador", "counter-roll", "roll", -0.01, 0.4)]),
    clip("fly", "Número voa", "whoosh", "num-out", 0, 0.5),
    clip("land", "Pouso", "soft-thud", "land", -0.004, 0.5, { each: true }),
    // the fan's sound starts 0.02 s into its file
    ...(first
      ? [clip("cards", "Roleta", "card-fan", "spin", -0.02, 0.18)]
      : []),
  ];
}

export const kindOf = (first: boolean): SceneKind =>
  first ? "first" : "later";

/** A scene's sounds in force: the panel's, else the code's. */
export function titleClips(game: SceneGame, first: boolean): SceneClip[] {
  return savedClips(game, kindOf(first)) ?? codeClips(game, first);
}

/** When a clip plays (s from the scene's start); none when its moment isn't in this scene. */
export function clipStarts(c: SceneClip, moments: SceneMoment[]): number[] {
  const at = moments.find((x) => x.id === c.anchor);
  if (!at) return [];
  return (c.each ? at.times : at.times.slice(0, 1)).map((t) => t + c.offset);
}

/** The clips as sounds to play. */
export function clipCues(
  clips: readonly SceneClip[],
  moments: SceneMoment[],
): TitleCue[] {
  return clips
    .filter((c) => !c.off)
    .flatMap((c) =>
      clipStarts(c, moments).map(
        (at): TitleCue => ({
          src: soundSrc(c.sound),
          at,
          gain: c.gain,
          ...(c.track ? { track: true } : {}),
          ...(c.trimIn ? { from: c.trimIn } : {}),
          ...(c.trimOut !== null ? { to: c.trimOut } : {}),
          ...(c.fadeIn ? { fadeIn: c.fadeIn } : {}),
          ...(c.fadeOut ? { fadeOut: c.fadeOut } : {}),
        }),
      ),
    );
}

/** A title scene's sounds for `players` on stage. */
export function titleCues(
  game: SceneGame,
  first: boolean,
  players: number,
): TitleCue[] {
  return clipCues(titleClips(game, first), titleMoments(game, first, players));
}

/** The files a scene may play, to load before it starts. */
export function titleSounds(game: SceneGame): string[] {
  const all = [true, false].flatMap((f) => titleClips(game, f));
  return [...new Set(all.filter((c) => !c.off).map((c) => soundSrc(c.sound)))];
}
