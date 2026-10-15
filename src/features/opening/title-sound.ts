"use client";

import { useEffect, useRef } from "react";
import { useClock } from "@/lib/hooks/use-server-clock";
import { audioContext } from "@/lib/music";
import { getSettings, type Settings, subscribeSettings } from "@/lib/settings";

/** A sound of a title scene: its file, when it plays (s from the beat's start) and how loud, against the match sounds' level. */
export interface TitleCue {
  src: string;
  at: number;
  gain: number;
  /**
   * A whole scene's mixed track: joined late (a reload), it still plays from
   * where the scene is. A short one-off that was missed stays missed.
   */
  track?: boolean;
  /** The part of the file that plays (s), and its soft start and end (s). */
  from?: number;
  to?: number;
  fadeIn?: number;
  fadeOut?: number;
}

/** The scene sounds' level: the match group's and the overall one; nothing when muted or the group is off. */
export function titleVolume(settings: Settings): number {
  const g = settings.sounds.match;
  if (settings.muted || !g.on) return 0;
  return g.volume * settings.volume;
}

const buffers = new Map<string, Promise<AudioBuffer | null>>();

function load(src: string): Promise<AudioBuffer | null> {
  let p = buffers.get(src);
  if (!p) {
    const c = audioContext();
    p = fetch(src)
      .then((r) => r.arrayBuffer())
      .then((data) => c.decodeAudioData(data))
      .catch(() => null);
    buffers.set(src, p);
  }
  return p;
}

/** A sound's decoded file (its waveform in the panel), null when it doesn't load. */
export const soundBuffer = (src: string) => load(src);

/** Fetches and decodes a scene's sounds ahead of time, so they play on the dot. Resolves when they are in (a failed one counts). */
export function preloadTitleSounds(srcs: readonly string[]): Promise<unknown> {
  return Promise.all(srcs.map(load));
}

/** One gain for every scene sound, following the settings while they play. */
let bus: GainNode | null = null;
function output(c: AudioContext) {
  if (bus) return bus;
  const g = c.createGain();
  g.gain.value = titleVolume(getSettings());
  g.connect(c.destination);
  subscribeSettings(() =>
    g.gain.setTargetAtTime(titleVolume(getSettings()), c.currentTime, 0.03),
  );
  bus = g;
  return g;
}

/** How late a one-off may start and still read as on time (s). */
const LATE = 0.15;

/**
 * Plays sounds from `t0` (this page's performance clock, ms): each cue at its
 * `at`, through `out` (the scene sounds' gain by default). Cues already past
 * are skipped, a whole track joins where it is (`late`: every cue does, as
 * the panel's preview from the middle). Returns what stops them all.
 */
export function playCues(
  cues: readonly TitleCue[],
  t0: number,
  {
    late = false,
    out,
    gain = 1,
  }: { late?: boolean; out?: AudioNode; gain?: number } = {},
): (fade?: number) => void {
  const c = audioContext();
  const dest = out ?? output(c);
  const sources: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  let live = true;
  for (const cue of cues)
    void load(cue.src).then((buffer) => {
      if (!live || !buffer) return;
      const lag = Math.min(0.08, c.outputLatency || c.baseLatency || 0);
      const wait = (t0 + cue.at * 1000 - performance.now()) / 1000 - lag;
      if (wait < -LATE && !cue.track && !late) return;
      const from = cue.from ?? 0;
      const to = Math.min(buffer.duration, cue.to ?? buffer.duration);
      const length = to - from;
      const into = Math.max(0, -wait);
      if (into >= length) return;
      const source = c.createBufferSource();
      const g = c.createGain();
      source.buffer = buffer;
      const start = c.currentTime + Math.max(0, wait);
      const level = cue.gain * gain;
      // the soft start and end, on the clip's own timeline
      const fi = cue.fadeIn ?? 0;
      const fo = cue.fadeOut ?? 0;
      const at = (x: number) => start + (x - into);
      g.gain.setValueAtTime(fi > into ? (level * into) / fi : level, start);
      if (fi > into) g.gain.linearRampToValueAtTime(level, at(fi));
      if (fo > 0 && length - fo > into) {
        g.gain.setValueAtTime(level, at(length - fo));
        g.gain.linearRampToValueAtTime(0, at(length));
      }
      source.connect(g).connect(dest);
      source.start(start, from + into, length - into);
      sources.push({ source, gain: g });
    });
  return (fade = 0.03) => {
    live = false;
    const at = c.currentTime;
    for (const { source, gain: g } of sources) {
      g.gain.cancelScheduledValues(at);
      g.gain.setTargetAtTime(0, at, fade);
      try {
        source.stop(at + fade * 6);
      } catch {}
    }
  };
}

/**
 * Plays a title scene's sounds on the server clock, t = 0 at `startsAt`.
 * Each starts what the speakers lag ahead of its moment, so it is heard with
 * the frame it belongs to. Leaving before `endsAt` (the scene cut short)
 * silences them; at the natural end their tails ring out. A `silent` scene
 * (the rehearsal) plays none.
 */
export function useTitleSounds(
  cues: readonly TitleCue[],
  startsAt: number,
  endsAt: number,
  silent = false,
) {
  const clock = useClock();
  // read when the scene starts: a clock re-estimated mid-scene doesn't replay anything
  const serverNow = useRef(clock.now);
  serverNow.current = clock.now;
  const still = silent || clock.frozen || clock.rate !== 1;
  const key = JSON.stringify(cues);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cues are keyed by their content
  useEffect(() => {
    // a stopped or slowed clock (the lab) has no sound
    if (still) return;
    // the beat's start on this page's clock
    const t0 = performance.now() + (startsAt - serverNow.current());
    const stop = playCues(cues, t0);
    return () => {
      if (performance.now() >= t0 + (endsAt - startsAt) - 200) return;
      stop();
    };
  }, [key, startsAt, endsAt, still]);
}
