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

/** The presenter's remote, made on the spot too: a drum roll, applause, a horn, a gasp. */
export function cueSound(kind: "drum" | "clap" | "horn" | "gasp") {
  const s = getSettings();
  const g = s.sounds.match;
  if (s.muted || !g.on || typeof window === "undefined") return;
  const volume = 0.22 * g.volume * s.volume;
  if (volume <= 0) return;
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    const now = ctx.currentTime;
    /** A burst of noise through a filter: the drum's hits, the claps. */
    const burst = (t: number, length: number, freq: number, level: number) => {
      const frames = Math.floor(ctx.sampleRate * length);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = volume * level;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(t);
    };
    /** A plain tone gliding from `from` to `to` Hz. */
    const tone = (
      t: number,
      length: number,
      from: number,
      to: number,
      type: OscillatorType,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t);
      osc.frequency.exponentialRampToValueAtTime(to, t + length);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.6, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + length + 0.02);
    };
    if (kind === "drum")
      for (let i = 0; i < 18; i++)
        burst(now + i * 0.055, 0.05, 180, 0.6 + i * 0.03);
    else if (kind === "clap")
      for (let i = 0; i < 14; i++)
        burst(now + i * 0.07 + Math.random() * 0.03, 0.04, 1500, 0.9);
    else if (kind === "horn") {
      tone(now, 0.28, 392, 392, "sawtooth");
      tone(now + 0.3, 0.5, 523, 523, "sawtooth");
    } else tone(now, 0.7, 880, 330, "sine");
  } catch {
    // no audio here: the remote only shows
  }
}
