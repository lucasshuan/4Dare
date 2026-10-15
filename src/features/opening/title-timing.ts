// The title scenes' choreography: when each thing happens, in seconds from the
// title beat's start. The prototypes' timelines as they are; the numbers are
// the same on every screen, so the scenes, their sounds and the music land
// together. Pure, for the scenes and the tests.

import { MUSIC_BEAT } from "@/game/music-tunes";

/** The music's beat as the title scenes count it: the shared tune's, the first beat 0.5 s into the file. */
export const TITLE_BEAT = MUSIC_BEAT;
const BEAT0 = 0.5;

/**
 * When the game's take starts from its top: as the number flies to the
 * corner. The long scene holds the number a little longer.
 */
export const MUSIC_AT = { first: 2.45, later: 2.0 } as const;

/** The k-th beat after the music came in (b(0), b(4), b(8) are downbeats). */
const beat = (first: boolean, k: number) =>
  (first ? MUSIC_AT.first : MUSIC_AT.later) + BEAT0 + k * TITLE_BEAT;

/** The forehead cards' roulette lasts as long as the card-fan sound: the first card stops at 0.42 s, the last at 0.56 s. */
export const REEL_SPAN = 0.56;
export const REEL_FIRST = 0.42;

/** Who am I?'s match card. */
export function whoTimes(first: boolean, players: number) {
  const b = (k: number) => beat(first, k);
  if (!first)
    // the cards land together on b(1), the crown on b(2), the stage opens on b(3), the title hits the downbeat b(4)
    return {
      numIn: 0.05,
      roll: 0.42,
      numOut: 2.0,
      chip: 2.42,
      land: b(1),
      step: 0.045,
      crown: b(2) - 0.385,
      idDrop: 0,
      spin: 0,
      spinDur: 0,
      reelStag: 0,
      stag: 0,
      q: null as number | null,
      qBob: 0,
      reveal: b(3),
      revealDur: TITLE_BEAT,
      titleLand: b(4),
      total: 6.0,
    };
  // the cast lands in one wave on b(1); on b(2) a card drops on every forehead and spins like a
  // roulette, stopping one after the other, the last on b(3) ("I already know who each of you is");
  // on b(5) ("you have no idea") they flip to "?" and bob with the music from b(6); the stage opens
  // on b(7) and the title hits the downbeat b(8)
  const nn = Math.max(2, players);
  return {
    numIn: 0.1,
    roll: 0,
    numOut: 2.45,
    chip: 2.95,
    land: b(1),
    step: 0.05,
    crown: 0,
    idDrop: b(2) - 0.24,
    spin: b(3) - REEL_SPAN,
    spinDur: REEL_FIRST,
    reelStag: (REEL_SPAN - REEL_FIRST) / (nn - 1),
    stag: TITLE_BEAT / 8,
    q: (b(5) - 0.3) as number | null,
    qBob: b(6),
    reveal: b(7),
    revealDur: TITLE_BEAT,
    titleLand: b(8),
    total: 9.0,
  };
}

/**
 * The Impostor's lineup. The case number keeps the match card's timing; the
 * blinds open as it flies (on a rematch, while it changes), the suspects walk
 * in, a flash, and the lights go off one column at a time.
 */
export function impostorTimes(first: boolean) {
  if (!first)
    return {
      boardIn: 0,
      boardDur: 0.01,
      letters: 0,
      letterStep: 0,
      digits: 0,
      digitStep: 0,
      out: 0.42,
      swap: 0.62,
      fly: 2.0,
      leakOn: 0,
      leakDur: 0.3,
      tilt: 0.36,
      tiltStep: 0.018,
      tiltDur: 0.38,
      raise: 0.8,
      raiseDur: 0.8,
      flatDur: 0.18,
      walk: 0,
      step: 0,
      walkDur: 0.01,
      bobs: 0,
      flashes: [2.85],
      dim: 3.5,
      clack: 0.11,
      eyesLag: 0.18,
      stamp: 4.25,
      flick: 1.9,
      total: 6.0,
    };
  return {
    boardIn: 0.1,
    boardDur: 0.35,
    letters: 0.25,
    letterStep: 0.035,
    digits: 0.55,
    digitStep: 0.08,
    out: 0,
    swap: 0,
    fly: 2.45,
    leakOn: 0.02,
    leakDur: 0.5,
    tilt: 2.05,
    tiltStep: 0.018,
    tiltDur: 0.38,
    raise: 2.62,
    raiseDur: 0.8,
    flatDur: 0.18,
    walk: 2.75,
    step: 0.16,
    walkDur: 1.0,
    bobs: 4,
    flashes: [5.35, 5.75],
    dim: 6.3,
    clack: 0.13,
    eyesLag: 0.2,
    stamp: 7.1,
    flick: 3.4,
    total: 9.0,
  };
}

/**
 * What for?'s tactics board. "1st half" in chalk keeps the match card's
 * timing; on a rematch the eraser wipes the number and the board is redrawn
 * quickly once it has flown to the corner.
 */
export function lineupTimes(first: boolean) {
  if (!first)
    return {
      numW: 0.62,
      restW: 0,
      restDur: 0.01,
      ul1: 0,
      ul2: 0,
      ulDur: 0.01,
      erase: 0.25,
      smudge: 0.38,
      fly: 2.0,
      smear: 2.6,
      ghost: 2.62,
      pitch: 2.6,
      pitchDur: 0.24,
      pitch2: 2.66,
      pitch3: 2.72,
      lineDur: 0.18,
      title: 2.65,
      titleDur: 0.3,
      drop: 2.75,
      step: 0.04,
      dropDur: 0.26,
      nameLag: 0.12,
      nameDur: 0.2,
      crown: 3.15,
      move: 3.45,
      arrows: 4.25,
      arrowStep: 0.05,
      arrowDur: 0.2,
      mystery: 4.6,
      writeDur: 0.3,
      circle: 4.75,
      circleDur: 0.3,
      total: 6.0,
    };
  return {
    numW: 0.15,
    restW: 0.42,
    restDur: 0.55,
    ul1: 0.98,
    ul2: 1.24,
    ulDur: 0.21,
    erase: 0,
    smudge: 0,
    fly: 2.45,
    smear: 0,
    ghost: 0,
    pitch: 2.75,
    pitchDur: 0.9,
    pitch2: 3.05,
    pitch3: 3.25,
    lineDur: 0.5,
    title: 6.45,
    titleDur: 1.0,
    drop: 3.1,
    step: 0.2,
    dropDur: 0.55,
    nameLag: 0.4,
    nameDur: 0.6,
    crown: 0,
    move: 0,
    arrows: 4.7,
    arrowStep: 0.22,
    arrowDur: 0.6,
    mystery: 5.55,
    writeDur: 0.9,
    circle: 5.9,
    circleDur: 0.7,
    total: 9.0,
  };
}

/** A delay for a CSS animation, in seconds. */
export const sec = (x: number) => `${x.toFixed(3)}s`;
