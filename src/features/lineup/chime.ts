"use client";

import { getSettings } from "@/lib/settings";

// A "ting" per coin as a bid lands (lower for "all in"), made on the spot
// with WebAudio: no file to fetch. As loud as the match's sounds.
let audio: AudioContext | null = null;

export function chime(coins: number, low = false) {
  const s = getSettings();
  const g = s.sounds.match;
  if (s.muted || !g.on || typeof window === "undefined") return;
  const volume = 0.18 * g.volume * s.volume;
  if (volume <= 0) return;
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    const n = Math.min(Math.max(1, coins), 8);
    for (let i = 0; i < n; i++) {
      const t = now + i * 0.045;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.value = (low ? 620 : 1180) * (1 + i * 0.03);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  } catch {
    // no audio here: the coins fall silently
  }
}
