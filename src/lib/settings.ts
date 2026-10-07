"use client";

import { useSyncExternalStore } from "react";
import type { GameKey } from "@/game/games";
import {
  GAME_OPTIONS,
  type GameOption,
  type GameOptions,
  parseGameOptions,
} from "@/game/options";
import { parsePresets, type RoomPreset } from "@/game/presets";

/** The sound groups a person can turn down or off; sound.ts says which sound is in which. */
export const SOUND_GROUPS = ["match", "clock", "chat", "room"] as const;
export type SoundGroup = (typeof SOUND_GROUPS)[number];

/** What this device remembers: how loud the game is, the chat bubbles, each game's options and the room presets. */
export type Settings = {
  /** 0 to 1, over every sound. */
  volume: number;
  muted: boolean;
  sounds: Record<SoundGroup, { on: boolean; volume: number }>;
  chatBubbles: boolean;
  games: GameOptions;
  presets: RoomPreset[];
};

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  muted: false,
  sounds: {
    match: { on: true, volume: 1 },
    clock: { on: true, volume: 1 },
    chat: { on: true, volume: 1 },
    room: { on: true, volume: 1 },
  },
  chatBubbles: true,
  games: {
    "who-am-i": { ...GAME_OPTIONS["who-am-i"] },
    impostor: { ...GAME_OPTIONS.impostor },
  },
  presets: [],
};

const unit = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(1, Math.max(0, v))
    : fallback;
const flag = (v: unknown, fallback: boolean) =>
  typeof v === "boolean" ? v : fallback;
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

/** Settings read back from storage: anything missing or malformed falls back to its default. */
export function parseSettings(raw: unknown): Settings {
  const r = record(raw);
  const sounds = record(r.sounds);
  return {
    volume: unit(r.volume, DEFAULT_SETTINGS.volume),
    muted: flag(r.muted, DEFAULT_SETTINGS.muted),
    sounds: Object.fromEntries(
      SOUND_GROUPS.map((g) => {
        const s = record(sounds[g]);
        const d = DEFAULT_SETTINGS.sounds[g];
        return [g, { on: flag(s.on, d.on), volume: unit(s.volume, d.volume) }];
      }),
    ) as Settings["sounds"],
    chatBubbles: flag(r.chatBubbles, DEFAULT_SETTINGS.chatBubbles),
    games: parseGameOptions(r.games),
    presets: parsePresets(r.presets),
  };
}

const KEY = "dare:settings";
const listeners = new Set<() => void>();
let current: Settings | null = null;

function read(): Settings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** The settings now (the defaults on the server and before storage is read). */
export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  current ??= read();
  return current;
}

/** Changes some settings, saves them on this device and tells every reader. */
export function updateSettings(change: (s: Settings) => Settings) {
  current = parseSettings(change(getSettings()));
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // private windows and full storage keep the change for this tab only
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // another tab changed them
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    current = read();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

/** One of a game's options. */
export function useGameOption<G extends GameKey>(
  game: G,
  option: GameOption<G>,
): boolean {
  return useSettings().games[game][option];
}
