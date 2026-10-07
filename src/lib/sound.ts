"use client";

import { useEffect } from "react";
import {
  getSettings,
  type Settings,
  type SoundGroup,
  useSettings,
} from "./settings";

/** The game's sounds, in public/sounds, each in the group the settings turn up or down. Temporary picks until the real ones are made. */
const SOUNDS = {
  /** Loops while the step clock runs low. */
  tick: { src: "/sounds/clock-ticking.mp3", volume: 0.5, group: "clock" },
  /** The podium, with its confetti. */
  complete: {
    src: "/sounds/match-complete.mp3",
    volume: 0.7,
    group: "match",
  },
  /** A turn step that waits on you starts: your question, your answer, your guess, the check of a guess on your pick. */
  step: { src: "/sounds/step-pop.mp3", volume: 0.6, group: "match" },
  /** Someone joined the room (or came back to it). */
  join: { src: "/sounds/player-join.mp3", volume: 0.6, group: "room" },
  /** Someone left the room. */
  leave: { src: "/sounds/player-leave.mp3", volume: 0.6, group: "room" },
  /** Someone else wrote in the chat while it was folded. */
  chat: { src: "/sounds/chat-message.mp3", volume: 0.6, group: "chat" },
} as const satisfies Record<
  string,
  { src: string; volume: number; group: SoundGroup }
>;
export type Sound = keyof typeof SOUNDS;

/** How loud a sound plays with these settings: its own level, its group's and the overall one; 0 when muted or its group is off. */
export function soundVolume(sound: Sound, settings: Settings): number {
  const { volume, group } = SOUNDS[sound];
  const g = settings.sounds[group];
  if (settings.muted || !g.on) return 0;
  return volume * g.volume * settings.volume;
}

const players = new Map<Sound, HTMLAudioElement>();

function audio(sound: Sound) {
  let a = players.get(sound);
  if (!a) {
    a = new Audio(SOUNDS[sound].src);
    a.preload = "auto";
    players.set(sound, a);
  }
  return a;
}

/** Plays a sound from the start, as loud as the settings say. Silently skipped when the browser blocks it (no click on the page yet). */
export function playSound(sound: Sound) {
  const volume = soundVolume(sound, getSettings());
  if (volume === 0) return;
  const a = audio(sound);
  a.volume = volume;
  a.loop = false;
  a.currentTime = 0;
  a.play().catch(() => {});
}

/** Loops a sound while `on` is true; a change in the settings reaches it at once. */
export function useLoopSound(sound: Sound, on: boolean) {
  const volume = soundVolume(sound, useSettings());
  const audible = on && volume > 0;
  useEffect(() => {
    if (!audible) return;
    const a = audio(sound);
    a.loop = true;
    a.currentTime = 0;
    a.play().catch(() => {});
    return () => a.pause();
  }, [sound, audible]);
  useEffect(() => {
    if (audible) audio(sound).volume = volume;
  }, [sound, audible, volume]);
}
