"use client";

import { useEffect } from "react";

/** The game's sounds, in public/sounds. Temporary picks until the real ones are made. */
const SOUNDS = {
  /** Loops while the step clock runs low. */
  tick: { src: "/sounds/clock-ticking.mp3", volume: 0.5 },
  /** The podium, with its confetti. */
  complete: { src: "/sounds/match-complete.mp3", volume: 0.7 },
  /** Every step change of a turn: question sent, answered, guess sent, guess answered. */
  step: { src: "/sounds/step-pop.mp3", volume: 0.6 },
  /** Someone joined the room (or came back to it). */
  join: { src: "/sounds/player-join.mp3", volume: 0.6 },
  /** Someone left the room. */
  leave: { src: "/sounds/player-leave.mp3", volume: 0.6 },
} as const;
export type Sound = keyof typeof SOUNDS;

const players = new Map<Sound, HTMLAudioElement>();

function audio(sound: Sound) {
  let a = players.get(sound);
  if (!a) {
    a = new Audio(SOUNDS[sound].src);
    a.volume = SOUNDS[sound].volume;
    a.preload = "auto";
    players.set(sound, a);
  }
  return a;
}

/** Plays a sound from the start. Silently skipped when the browser blocks it (no click on the page yet). */
export function playSound(sound: Sound) {
  const a = audio(sound);
  a.loop = false;
  a.currentTime = 0;
  a.play().catch(() => {});
}

/** Loops a sound while `on` is true. */
export function useLoopSound(sound: Sound, on: boolean) {
  useEffect(() => {
    if (!on) return;
    const a = audio(sound);
    a.loop = true;
    a.currentTime = 0;
    a.play().catch(() => {});
    return () => a.pause();
  }, [sound, on]);
}
