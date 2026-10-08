"use client";

import { useEffect, useId } from "react";
import { getSettings, type Settings, subscribeSettings } from "./settings";

/**
 * The background music: one tune in two takes that share a timeline (same
 * tempo, same bars, same loop), so one can take over from the other at the
 * same point in the song. Played through WebAudio, so the loop has no gap and
 * both takes start sample-exact.
 */
const TRACKS = {
  /** The show's lounge vamp: the room, the lobby and every match. */
  stage: "/music/stage-loop.mp3",
  /** The same vamp on an old radio in the booth: What for?'s presenter. Mixed 6 dB under the stage. */
  booth: "/music/booth-loop.mp3",
} as const;
export type Track = keyof typeof TRACKS;

/** Both files loop over the same 48 bars (seconds); what comes before plays once. */
const LOOP_START = 8.1062;
const LOOP_END = 129.2721;
const LOOP = LOOP_END - LOOP_START;

/** The tape clunk into the booth: the file starts 0.5 s before the clunk. */
const SWITCH_SFX = "/sounds/tv-switch.mp3";
const CLUNK = 0.5;
/** The booth comes in this long after the clunk, once the crackle dies down. */
const BOOTH_IN = 1.2;
const SFX_LEVEL = 0.8;

/** How loud the music plays with these settings: 0 when muted or its group is off. */
export function musicVolume(settings: Settings): number {
  const g = settings.sounds.music;
  if (settings.muted || !g.on) return 0;
  return g.volume * settings.volume;
}

/** Where a timeline position lands in the file once the loop has wrapped. */
export function loopPosition(seconds: number): number {
  if (seconds < LOOP_END) return Math.max(0, seconds);
  return LOOP_START + ((seconds - LOOP_START) % LOOP);
}

type Playing = {
  track: Track;
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** The context time the song's position 0 would have played at. */
  origin: number;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let playing: Playing | null = null;
let current: Track | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function context() {
  if (ctx) return ctx;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = musicVolume(getSettings());
  master.connect(ctx.destination);
  // the browser keeps audio off until the first touch: wake it then
  const wake = () => {
    if (ctx?.state !== "running") ctx?.resume().catch(() => {});
  };
  for (const e of ["pointerdown", "keydown", "touchend"])
    document.addEventListener(e, wake, { capture: true, passive: true });
  subscribeSettings(() => {
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(
      musicVolume(getSettings()),
      ctx.currentTime,
      0.05,
    );
    apply();
  });
  return ctx;
}

function load(src: string): Promise<AudioBuffer | null> {
  let p = buffers.get(src);
  if (!p) {
    const c = context();
    p = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((data) => c.decodeAudioData(data))
      .catch(() => null);
    buffers.set(src, p);
  }
  return p;
}

/** The song position (seconds on the shared timeline) at a context time. */
function position(at: number) {
  return playing ? loopPosition(at - playing.origin) : 0;
}

function start(
  track: Track,
  buffer: AudioBuffer,
  at: number,
  from: number,
  fadeIn: number,
) {
  const c = context();
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(1, at + fadeIn);
  gain.connect(master as GainNode);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = LOOP_START;
  source.loopEnd = LOOP_END;
  source.connect(gain);
  const offset = loopPosition(from);
  source.start(at, offset);
  return { track, source, gain, origin: at - offset } satisfies Playing;
}

function stop(p: Playing, at: number, fadeOut: number) {
  p.gain.gain.cancelScheduledValues(at);
  p.gain.gain.setValueAtTime(p.gain.gain.value, at);
  p.gain.gain.linearRampToValueAtTime(0, at + fadeOut);
  p.source.stop(at + fadeOut + 0.05);
}

let applying = 0;

/** Moves the music to `current`: a fade in, a crossfade, the TV switch into the booth or a fade out. */
async function apply() {
  const turn = ++applying;
  const want = musicVolume(getSettings()) > 0 ? current : null;
  if (playing?.track === want) return;
  if (!ctx && !want) return;
  const c = context();
  if (!want) {
    if (playing) stop(playing, c.currentTime, 0.6);
    playing = null;
    return;
  }
  const [buffer, sfx] = await Promise.all([
    load(TRACKS[want]),
    want === "booth" && playing?.track === "stage" ? load(SWITCH_SFX) : null,
  ]);
  // a later call took over while this one loaded
  if (turn !== applying || !buffer || playing?.track === want) return;
  const now = c.currentTime;
  const was = playing;
  if (!was) {
    playing = start(want, buffer, now, 0, 1);
    return;
  }
  if (sfx) {
    // the tape clunks: the stage stops dead, crackle, then the booth on the old radio, at the same point in the song
    const fx = c.createBufferSource();
    const fxGain = c.createGain();
    fxGain.gain.value = SFX_LEVEL;
    fx.buffer = sfx;
    fx.connect(fxGain).connect(master as GainNode);
    fx.start(now);
    const g = was.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    // the warning flick drops the music for a blink
    g.setValueAtTime(1, now + 0.17);
    g.linearRampToValueAtTime(0.05, now + 0.175);
    g.setValueAtTime(0.05, now + 0.23);
    g.linearRampToValueAtTime(1, now + 0.235);
    g.setValueAtTime(1, now + CLUNK);
    g.linearRampToValueAtTime(0, now + CLUNK + 0.01);
    was.source.stop(now + CLUNK + 0.05);
    const at = now + CLUNK + BOOTH_IN;
    playing = start(want, buffer, at, position(at), 0.15);
    return;
  }
  // back out of the booth, or any other change: a crossfade at the same point in the song
  stop(was, now, 1.5);
  playing = start(want, buffer, now, position(now), 1.5);
}

const claims = new Map<string, { track: Track | null; rank: number }>();

function resolve() {
  let best: { track: Track | null; rank: number } | null = null;
  for (const c of claims.values()) if (!best || c.rank > best.rank) best = c;
  current = best?.track ?? null;
  apply();
}

/**
 * Asks for a track while mounted. The highest `rank` asking wins (null asks
 * for silence, undefined asks nothing); with nobody asking, the music fades out.
 */
export function useMusic(track: Track | null | undefined, rank = 0) {
  const id = useId();
  useEffect(() => {
    if (track === undefined) claims.delete(id);
    else claims.set(id, { track, rank });
    resolve();
  }, [id, track, rank]);
  useEffect(
    () => () => {
      claims.delete(id);
      resolve();
    },
    [id],
  );
}
