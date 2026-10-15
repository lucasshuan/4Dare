"use client";

import { useEffect } from "react";
import { ROOM_SOUNDS, soundSrc } from "@/game/sounds";
import {
  getSettings,
  type Settings,
  type SoundGroup,
  useSettings,
} from "./settings";

/** Each room sound's settings group; which file it plays and how loud is the panel's (ROOM_SOUNDS). */
const GROUPS = {
  tick: "clock",
  complete: "match",
  step: "match",
  join: "room",
  leave: "room",
  chat: "chat",
} as const satisfies Record<keyof typeof ROOM_SOUNDS, SoundGroup>;
export type Sound = keyof typeof GROUPS;

/** How loud a sound plays with these settings: its own level, its group's and the overall one; 0 when muted or its group is off. */
export function soundVolume(sound: Sound, settings: Settings): number {
  const { volume } = ROOM_SOUNDS[sound];
  const g = settings.sounds[GROUPS[sound]];
  if (settings.muted || !g.on) return 0;
  return volume * g.volume * settings.volume;
}

const players = new Map<string, HTMLAudioElement>();

function audio(sound: Sound) {
  const src = soundSrc(ROOM_SOUNDS[sound].sound);
  let a = players.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    players.set(src, a);
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
