"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { MUSIC_BEAT, TRACK_TUNES, type TrackId } from "@/game/music-tunes";
import { withTunes } from "@/game/tune";
import { getSettings, type Settings, subscribeSettings } from "./settings";

/**
 * The tune's beat, for anything that moves with it (MUSIC_BPM), the first
 * beat 0.5333 s into the shared song (a bar's downbeat). Every take's loop
 * starts on a downbeat and holds whole bars, so the beat and the bar keep their
 * place across every wrap; the takes' intros keep the same beat before it.
 */
export { MUSIC_BEAT };
export const MUSIC_FIRST_BEAT = 0.5333;

/** A take's grid: its beat, where its first downbeat falls and how long a bar lasts (s). */
interface Grid {
  beat: number;
  first: number;
  bar: number;
  /** The Encore's own tempo, 4:3 against the shared one. */
  own: boolean;
}
const SHARED: Grid = {
  beat: MUSIC_BEAT,
  first: MUSIC_FIRST_BEAT,
  bar: 4 * MUSIC_BEAT,
  own: false,
};
/**
 * The Encore keeps a grid of its own (126.8 BPM): four of its beats in the
 * time of three of the others, so its bar lasts three of their beats and the
 * downbeats meet every three of their bars.
 */
const ENCORE: Grid = {
  beat: (MUSIC_BEAT * 3) / 4,
  first: MUSIC_FIRST_BEAT,
  bar: 3 * MUSIC_BEAT,
  own: true,
};

/**
 * Where a loop cuts at bar `n` of a grid: 90 ms before its downbeat, since the
 * takes' attacks land up to about 55 ms ahead of it. Cut on the grid, the end
 * let the next downbeat's cymbal start before the wrap and the start lost the
 * first downbeat's attack.
 */
const cut = (g: Grid, n: number) => g.first + n * g.bar - 0.09;

/**
 * The background music: one tune in several takes that share a timeline (same
 * tempo, same bars), so one can take over from another at the same point in
 * the song. Played through WebAudio, so the loop has no gap and every take
 * starts sample-exact. The Suno prompts behind each take are in
 * `assets/music/suno-prompts.md`.
 *
 * Song positions are seconds on that timeline. The song's own 8-bar intro
 * (bars 0 to 7) plays once; a take then loops from `start` (bar 8, or bar 0
 * for a take whose turnaround leads back into the intro) to `end`, the end of its own
 * turnaround: after bar 48 for the takes whose turnaround runs a bar longer,
 * after bar 47 for the rest. A take may open with an intro of its own (`intro`
 * seconds at the head of its file, before the song's position 0): it plays
 * when the music starts on that take, as negative positions, and is skipped
 * when another take hands over past it.
 */
const TRACKS = {
  /** The show's lounge vamp: the room, the lobby and every match. */
  stage: { src: "/music/stage-loop.mp3", intro: 0, grid: SHARED },
  /** The same vamp on an old radio in the booth: Lineup's presenter. Mixed 6 dB under the stage. Its bars start 3 beats into its file. */
  booth: { src: "/music/booth-loop.mp3", intro: 3 * MUSIC_BEAT, grid: SHARED },
  /** The same vamp as hushed spy suspense: Impostor's rooms. As loud as the stage. */
  impostor: { src: "/music/impostor-loop.mp3", intro: 20.7542, grid: SHARED },
  /** Crime and the precinct, its suspense intro played once (bars 0 to 23): the Impostor's next take. */
  precinct: { src: "/music/precinct-loop.mp3", intro: 2.15, grid: SHARED },
  /** The same vamp as 1970s game-show bidding, kept for later. Its kick lands half a beat after the grid, so the file runs an eighth late. */
  bidding: {
    src: "/music/bidding-loop.mp3",
    intro: MUSIC_BEAT / 2,
    grid: SHARED,
  },
  /** The same vamp as a retro sports groove: Lineup's lobby, its whole match (the presenter's booth aside) and its results. As loud as the stage. */
  matchday: { src: "/music/matchday-loop.mp3", intro: 9.7972, grid: SHARED },
  /** The same vamp as a cheeky school bounce, kept for later: nothing plays it yet. As loud as the stage. */
  recess: { src: "/music/recess-loop.mp3", intro: 1.9381, grid: SHARED },
  /** Victory and the end of a match, "Samba de Noche", on its own grid. */
  encore: { src: "/music/encore-loop.mp3", intro: 4.4452, grid: ENCORE },
} as const satisfies Record<
  TrackId,
  { src: string; intro: number; grid: Grid }
>;
export type Track = TrackId;

/**
 * A take's loop in seconds on its timeline, from the panel's bars
 * (music-tunes.ts): back to `start` from `end`. A loop the panel left
 * empty falls back to the take's own.
 */
function loopOf(track: Track): { start: number; end: number } {
  const g = TRACKS[track].grid;
  let { start, end } = TRACK_TUNES[track];
  if (!(end > start)) ({ start, end } = DEFAULT_LOOPS[track]);
  return { start: cut(g, start), end: cut(g, end) };
}
const DEFAULT_LOOPS = withTunes(
  {},
  () =>
    Object.fromEntries(
      (Object.keys(TRACKS) as Track[]).map((t) => [
        t,
        { start: TRACK_TUNES[t].start, end: TRACK_TUNES[t].end },
      ]),
    ) as Record<Track, { start: number; end: number }>,
);

/** A take's level over its file (the panel's dB), as a gain. */
const trimOf = (track: Track) => 10 ** (TRACK_TUNES[track].gainDb / 20);

/** The tape clunk into the booth: the file starts 0.5 s before the clunk. */
const SWITCH_SFX = "/sfx/tape-clunk.mp3";
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

/** 32 beats: every beat-synced animation repeats within this (beat, bar, the marks' cycle). */
const PHRASE = 32 * MUSIC_BEAT;

/**
 * The CSS animation-delay (seconds) that lines a beat-long animation started
 * at `nowMs` up with the music whose position 0 played (or will play) at
 * `originMs` (both performance.now() milliseconds): negative once the song is
 * under way. During a take's intro position 0 is still ahead, and the delay
 * steps back by whole 32-beat phrases so the animations run with the intro.
 */
export function beatDelay(originMs: number, nowMs: number): number {
  const delay = (originMs - nowMs) / 1000 + MUSIC_FIRST_BEAT;
  if (delay <= MUSIC_FIRST_BEAT) return delay;
  return delay - Math.ceil((delay - MUSIC_FIRST_BEAT) / PHRASE) * PHRASE;
}

/**
 * Where a timeline position lands in `track` once its loop has wrapped;
 * negative positions are a take's intro. A position past a take's end (a
 * longer take handing over in its last bar) lands that far into its loop.
 */
export function loopPosition(seconds: number, track: Track): number {
  const { start, end } = loopOf(track);
  if (seconds < end) return seconds;
  return start + ((seconds - start) % (end - start));
}

type Playing = {
  track: Track;
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** The context time the song's position 0 would have played at. */
  origin: number;
  /** Started from the top for a claim's `restartAt` (that moment), not handed over. */
  restart?: number;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** The muffle: a high-pass and a low-pass and a dip, as if the music played in the next room. */
let muffleLow: BiquadFilterNode | null = null;
let muffleFilter: BiquadFilterNode | null = null;
let muffleGain: GainNode | null = null;
let muffled = false;
let meter: AnalyserNode | null = null;
let playing: Playing | null = null;
let current: Track | null = null;
/** The winning claim's `restartAt`, if it has one. */
let currentRestart: number | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function context() {
  if (ctx) return ctx;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = musicVolume(getSettings());
  muffleLow = ctx.createBiquadFilter();
  muffleLow.type = "highpass";
  muffleLow.Q.value = 0.5;
  muffleFilter = ctx.createBiquadFilter();
  muffleFilter.type = "lowpass";
  muffleFilter.Q.value = 0.5;
  muffleGain = ctx.createGain();
  setMuffle();
  master
    .connect(muffleLow)
    .connect(muffleFilter)
    .connect(muffleGain)
    .connect(ctx.destination);
  // what comes out, measured for the panel's level meter
  meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  muffleGain.connect(meter);
  // the browser keeps audio off until the first touch: wake it then
  const wake = () => {
    if (ctx?.state !== "running") ctx?.resume().catch(() => {});
  };
  for (const e of ["pointerdown", "keydown", "touchend"])
    document.addEventListener(e, wake, { capture: true, passive: true });
  // the beat only counts while the context really plays
  ctx.addEventListener("statechange", publishPulse);
  return ctx;
}

let listening = false;

/**
 * Follows the settings from the first ask on, before any audio exists: a
 * room joined muted has no context yet, and turning the sound on must still
 * start the music.
 */
function listen() {
  if (listening) return;
  listening = true;
  subscribeSettings(() => {
    if (ctx && master && !consoleMode)
      master.gain.setTargetAtTime(
        musicVolume(getSettings()),
        ctx.currentTime,
        0.05,
      );
    apply();
  });
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

/** The audio context the music plays in, for sounds that must keep time with it (the title scenes). */
export const audioContext = () => context();

/** Fetches and decodes a take ahead of time, so asking for it later swaps at once. Resolves when it is in (null if it failed). */
export function preloadMusic(track: Track): Promise<AudioBuffer | null> {
  return load(TRACKS[track].src);
}

/** The song position (seconds on the shared timeline) at a context time. */
function position(at: number) {
  return playing ? loopPosition(at - playing.origin, playing.track) : 0;
}

function start(
  track: Track,
  buffer: AudioBuffer,
  at: number,
  from: number,
  fadeIn: number,
) {
  const c = context();
  const { intro } = TRACKS[track];
  const { start, end } = loopOf(track);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(trimOf(track), at + fadeIn);
  gain.connect(master as GainNode);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = start + intro;
  source.loopEnd = end + intro;
  source.connect(gain);
  // deeper into an intro than this take's own goes: it starts from its top
  const pos = Math.max(-intro, loopPosition(from, track));
  source.start(at, pos + intro);
  return { track, source, gain, origin: at - pos } satisfies Playing;
}

/**
 * The performance.now() moment the playing song's position 0 played at, on
 * this pass of the loop, while the music is audible; null when it is silent,
 * stopped or not started yet. It moves on at each wrap: a loop of 41 bars is
 * not a whole number of 32-beat phrases.
 */
let pulse: number | null = null;
const pulseListeners = new Set<() => void>();
let wrapTimer: ReturnType<typeof setTimeout> | undefined;

function publishPulse() {
  clearTimeout(wrapTimer);
  let next: number | null = null;
  if (ctx?.state === "running" && playing && musicVolume(getSettings()) > 0) {
    // what is scheduled now comes out of the speakers this much later
    const latency = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
    const pos = position(ctx.currentTime);
    next = Math.round(performance.now() - pos * 1000 + latency);
    // the next wrap starts a new pass
    const left = loopOf(playing.track).end - pos;
    wrapTimer = setTimeout(publishPulse, left * 1000 + 50);
  }
  // a few ms of re-measuring is not a new beat
  if (
    next === pulse ||
    (next !== null && pulse !== null && Math.abs(next - pulse) < 20)
  )
    return;
  pulse = next;
  for (const l of pulseListeners) l();
}

/** When the song's position 0 played (performance.now() ms) while the music is audible, else null. */
export function useMusicPulse(): number | null {
  return useSyncExternalStore(
    (l) => {
      pulseListeners.add(l);
      return () => pulseListeners.delete(l);
    },
    () => pulse,
    () => null,
  );
}

function stop(p: Playing, at: number, fadeOut: number) {
  p.gain.gain.cancelScheduledValues(at);
  p.gain.gain.setValueAtTime(p.gain.gain.value, at);
  p.gain.gain.linearRampToValueAtTime(0, at + fadeOut);
  p.source.stop(at + fadeOut + 0.05);
}

let applying = 0;

/** How fast the music already playing gets out of the way of a restart: gone at once, without a click. */
const CUT = 0.12;

/**
 * A claim that restarts its track from the top at `at` (performance.now()
 * ms): whatever plays stops at once, then silence until that moment. A
 * moment already past (a reload mid-way) starts that far into the song.
 */
async function restart(turn: number, want: Track, at: number) {
  const c = context();
  if (playing && playing.restart !== at) {
    stop(playing, c.currentTime, CUT);
    playing = null;
    publishPulse();
  }
  const buffer = await load(TRACKS[want].src);
  if (turn !== applying || !buffer || playing) return;
  const now = c.currentTime;
  const when = now + (at - performance.now()) / 1000;
  const top = -TRACKS[want].intro;
  playing = {
    ...start(
      want,
      buffer,
      Math.max(now, when),
      top + Math.max(0, now - when),
      0.02,
    ),
    restart: at,
  };
  publishPulse();
}

/** Moves the music to `current`: a fade in, a crossfade, the TV switch into the booth, a restart or a fade out. */
async function apply() {
  if (consoleMode) return;
  const turn = ++applying;
  const want = musicVolume(getSettings()) > 0 ? current : null;
  if (want && currentRestart !== null) {
    if (playing?.track === want && playing.restart === currentRestart) return;
    return restart(turn, want, currentRestart);
  }
  if (playing?.track === want) return;
  if (!ctx && !want) return;
  const c = context();
  if (!want) {
    if (playing) stop(playing, c.currentTime, 0.6);
    playing = null;
    publishPulse();
    return;
  }
  const [buffer, sfx] = await Promise.all([
    load(TRACKS[want].src),
    want === "booth" && playing && playing.track !== "booth"
      ? load(SWITCH_SFX)
      : null,
  ]);
  // a later call took over while this one loaded
  if (turn !== applying || !buffer || playing?.track === want) return;
  const now = c.currentTime;
  const was = playing;
  if (!was) {
    // a fresh start plays the take from the top, its own intro first
    playing = start(want, buffer, now, Number.NEGATIVE_INFINITY, 0.05);
    publishPulse();
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
    const level = trimOf(was.track);
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    // the warning flick drops the music for a blink
    g.setValueAtTime(level, now + 0.17);
    g.linearRampToValueAtTime(0.05 * level, now + 0.175);
    g.setValueAtTime(0.05 * level, now + 0.23);
    g.linearRampToValueAtTime(level, now + 0.235);
    g.setValueAtTime(level, now + CLUNK);
    g.linearRampToValueAtTime(0, now + CLUNK + 0.01);
    was.source.stop(now + CLUNK + 0.05);
    const at = now + CLUNK + BOOTH_IN;
    playing = start(want, buffer, at, position(at), 0.15);
    publishPulse();
    return;
  }
  // back out of the booth, or any other change: a crossfade at the same point
  // in the song (the same bar on another grid, both downbeats together)
  stop(was, now, XFADE);
  playing = handOver(was.track, want, buffer, now, position(now), XFADE);
  publishPulse();
}

/** How long one take crossfades into another (s). */
const XFADE = 1.5;

/**
 * How early each grid's attacks land, by pairs of bars of the shared song
 * (ms, measured on the takes), so a switch across grids meets on the attacks,
 * not just on the grids.
 */
const DRIFT = [
  -39, -39, -40, -36, -37, -33, -28, -25, -23, -21, -18, -16, -17, -17, -17,
  -16, -12, -12, -12, -16, -16, -23, -28, -33, -36,
];
const early = (g: Grid, s: number) =>
  g.own
    ? -0.0385
    : DRIFT[
        Math.min(
          DRIFT.length - 1,
          Math.max(0, Math.floor((s - g.first) / g.bar / 2)),
        )
      ] / 1000;

/**
 * Where `to` comes in for a switch at position `p` of `from`. On the same
 * grid it is the same point, wrapped into `to`'s loop. Across grids it is the
 * same bar: every take is an 8-bar intro, five 8-bar parts and the
 * turnaround, only the Encore's bars are shorter. So `to` is set to reach the
 * playing take's next downbeat on that same bar, both downbeats together, and
 * the beats stay locked 4:3 through the crossfade.
 */
function meet(p: number, from: Track, to: Track) {
  const a = TRACKS[from].grid;
  const b = TRACKS[to].grid;
  if (a === b) return { q: loopPosition(p, to), wait: 0 };
  const x = (p - a.first) / a.bar;
  const n = Math.max(0, Math.ceil(x - 1e-6));
  const wait = (n - x) * a.bar;
  let q = loopPosition(b.first + n * b.bar, to) - wait;
  q += early(b, q) - early(a, p);
  return { q, wait };
}

/** Starts `to` over `from` at the meeting point; a point before its own top waits that long. */
function handOver(
  from: Track,
  to: Track,
  buffer: AudioBuffer,
  now: number,
  p: number,
  fade: number,
) {
  const { q } = meet(p, from, to);
  const top = -TRACKS[to].intro;
  const cross = TRACKS[from].grid !== TRACKS[to].grid;
  return cross && q < top
    ? start(to, buffer, now + (top - q), top, fade)
    : start(to, buffer, now, q, fade);
}

/**
 * Outside the lobby the music plays open: every take at its level from the
 * panel (trimOf), before the master and music volumes. In the lobby it plays
 * through the wall: a 160 Hz high-pass and a 350 Hz low-pass, at 0.84.
 */
const OPEN_GAIN = 1;
const MUFFLE_GAIN = 0.84;
const MUFFLE_HZ = 350;
const MUFFLE_LOW_HZ = 160;
const OPEN_HZ = 20000;
const OPEN_LOW_HZ = 20;

function setMuffle() {
  if (!ctx || !muffleLow || !muffleFilter || !muffleGain) return;
  const hz = muffled ? MUFFLE_HZ : OPEN_HZ;
  const low = muffled ? MUFFLE_LOW_HZ : OPEN_LOW_HZ;
  const gain = muffled ? MUFFLE_GAIN : OPEN_GAIN;
  const t = ctx.currentTime;
  // opening takes about 1.5 s, like walking into the room; closing about 1 s.
  // With nothing playing yet it is set at once: a room opening on its lobby
  // starts behind the wall, not in the open for the first second.
  const tau = muffled ? 0.35 : 0.5;
  for (const [param, value] of [
    [muffleLow.frequency, low],
    [muffleFilter.frequency, hz],
    [muffleGain.gain, gain],
  ] as const) {
    param.cancelScheduledValues(t);
    if (playing) param.setTargetAtTime(value, t, tau);
    else param.setValueAtTime(value, t);
  }
}

/**
 * Muffles the music while `on` (the lobby); it opens up when `on` goes
 * false. Leaving the room keeps it as it was: the music fades out through
 * the same wall.
 */
export function useMusicMuffle(on: boolean) {
  useEffect(() => {
    muffled = on;
    setMuffle();
  }, [on]);
}

type Claim = { track: Track | null; rank: number; restartAt: number | null };
const claims = new Map<string, Claim>();

function resolve() {
  listen();
  let best: Claim | null = null;
  for (const c of claims.values()) if (!best || c.rank > best.rank) best = c;
  current = best?.track ?? null;
  currentRestart = best?.restartAt ?? null;
  apply();
}

/**
 * Asks for a track while mounted. The highest `rank` asking wins (null asks
 * for silence, undefined asks nothing); with nobody asking, the music fades out.
 * With `restartAt` (performance.now() ms) the track plays from its top at that
 * moment instead of taking over at the same point in the song: what plays
 * before stops at once, and it is quiet until then.
 */
export function useMusic(
  track: Track | null | undefined,
  rank = 0,
  restartAt: number | null = null,
) {
  const id = useId();
  useEffect(() => {
    if (track === undefined) claims.delete(id);
    else claims.set(id, { track, rank, restartAt });
    resolve();
  }, [id, track, rank, restartAt]);
  useEffect(
    () => () => {
      claims.delete(id);
      resolve();
    },
    [id],
  );
}

// -- the panel's sound desk ----------------------------------------------------
// The control panel plays the takes through this same engine, so what it
// hears is what a player hears: the same loops, levels, crossfades and wall.
// While the desk is open it owns the music: the claims wait until it closes.

let consoleMode = false;

/** A take as the desk draws it: its intro, its grid and its loop (seconds on its timeline). */
export function trackInfo(track: Track) {
  const { intro, grid } = TRACKS[track];
  return {
    intro,
    beat: grid.beat,
    bar: grid.bar,
    first: grid.first,
    own: grid.own,
    loop: loopOf(track),
    src: TRACKS[track].src,
  };
}

/** The decoded file of a take (its waveform, its loudness). */
export const trackBuffer = (track: Track) => load(TRACKS[track].src);

/** The desk takes the music over: claims are ignored until `releaseDesk`. */
export function takeDesk() {
  consoleMode = true;
  if (playing && ctx) {
    stop(playing, ctx.currentTime, 0.3);
    playing = null;
    publishPulse();
  }
}

/** The desk closes: the music goes back to whatever the page asks for. */
export function releaseDesk() {
  if (playing && ctx) stop(playing, ctx.currentTime, 0.3);
  playing = null;
  consoleMode = false;
  muffled = false;
  setMuffle();
  if (ctx && master) master.gain.value = musicVolume(getSettings());
  publishPulse();
  resolve();
}

/** The desk's volume, apart from the player's setting. */
export function deskVolume(v: number) {
  const c = context();
  master?.gain.setTargetAtTime(v, c.currentTime, 0.03);
}

/** Through the lobby's wall, or open. */
export function deskMuffle(on: boolean) {
  context();
  muffled = on;
  setMuffle();
}

/** Plays `track` from `from` (its own top, intro first, by default). */
export async function deskPlay(track: Track, from = Number.NEGATIVE_INFINITY) {
  const c = context();
  if (c.state !== "running") await c.resume().catch(() => {});
  const buffer = await load(TRACKS[track].src);
  if (!buffer) return;
  if (playing) stop(playing, c.currentTime, 0.03);
  playing = start(track, buffer, c.currentTime + 0.01, from, 0.03);
  publishPulse();
}

/** Stops; the position it stopped at. */
export function deskStop(): number | null {
  if (!playing || !ctx) return null;
  const at = position(ctx.currentTime);
  stop(playing, ctx.currentTime, 0.05);
  playing = null;
  publishPulse();
  return at;
}

/**
 * Switches to `to`: a crossfade at the same point in the song (the same bar
 * on another grid), or a hard cut to compare two takes.
 */
export async function deskSwitch(to: Track, hard = false) {
  const c = context();
  const buffer = await load(TRACKS[to].src);
  if (!buffer || !playing || playing.track === to) return;
  const now = c.currentTime;
  const was = playing;
  stop(was, now, hard ? 0.02 : XFADE);
  playing = handOver(
    was.track,
    to,
    buffer,
    now,
    position(now),
    hard ? 0.02 : XFADE,
  );
  publishPulse();
}

/** Where the desk is: the take, its position (s on its timeline), and how many times it wrapped. */
export function deskNow(): { track: Track; pos: number; wraps: number } | null {
  if (!playing || !ctx) return null;
  const t = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  const raw = t - playing.origin;
  const { start: a, end: e } = loopOf(playing.track);
  return {
    track: playing.track,
    pos: loopPosition(raw, playing.track),
    wraps: raw < e ? 0 : 1 + Math.floor((raw - e) / (e - a)),
  };
}

/** After an edit of a loop or a level: the take playing follows it at once. */
export function deskRefresh() {
  if (!playing || !ctx) return;
  const { intro } = TRACKS[playing.track];
  const { start: a, end: e } = loopOf(playing.track);
  playing.source.loopStart = a + intro;
  playing.source.loopEnd = e + intro;
  playing.gain.gain.setTargetAtTime(
    trimOf(playing.track),
    ctx.currentTime,
    0.05,
  );
}

const samples = new Float32Array(2048);

/** The output's level right now (dB RMS); -Infinity when silent. */
export function deskLevel(): number {
  if (!meter) return Number.NEGATIVE_INFINITY;
  meter.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const v of samples) sum += v * v;
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0 ? 20 * Math.log10(rms) : Number.NEGATIVE_INFINITY;
}

/** A take's loudness over its loop (dB RMS of the file, before its level). */
export async function trackLoudness(track: Track): Promise<number | null> {
  const b = await trackBuffer(track);
  if (!b) return null;
  const { intro } = TRACKS[track];
  const { start, end } = loopOf(track);
  const data = b.getChannelData(0);
  const from = Math.max(0, Math.floor((start + intro) * b.sampleRate));
  const to = Math.min(data.length, Math.floor((end + intro) * b.sampleRate));
  let sum = 0;
  let n = 0;
  for (let i = from; i < to; i += 16) {
    sum += data[i] * data[i];
    n++;
  }
  return n ? 10 * Math.log10(sum / n) : null;
}
