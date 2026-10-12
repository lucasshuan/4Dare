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
  const key = cues.map((c) => `${c.src}@${c.at}`).join(" ");
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cues are keyed by their content
  useEffect(() => {
    // a stopped or slowed clock (the lab) has no sound
    if (still) return;
    const c = audioContext();
    const out = output(c);
    // the beat's start on this page's clock
    const t0 = performance.now() + (startsAt - serverNow.current());
    const sources: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
    let live = true;
    for (const cue of cues)
      void load(cue.src).then((buffer) => {
        if (!live || !buffer) return;
        const lag = Math.min(0.08, c.outputLatency || c.baseLatency || 0);
        const wait = (t0 + cue.at * 1000 - performance.now()) / 1000 - lag;
        if (wait < -LATE && !cue.track) return;
        const into = Math.max(0, -wait);
        if (into >= buffer.duration) return;
        const source = c.createBufferSource();
        const gain = c.createGain();
        source.buffer = buffer;
        gain.gain.value = cue.gain;
        source.connect(gain).connect(out);
        source.start(c.currentTime + Math.max(0, wait), into);
        sources.push({ source, gain });
      });
    return () => {
      live = false;
      if (performance.now() >= t0 + (endsAt - startsAt) - 200) return;
      const at = c.currentTime;
      for (const { source, gain } of sources) {
        gain.gain.setTargetAtTime(0, at, 0.03);
        source.stop(at + 0.2);
      }
    };
  }, [key, startsAt, endsAt, still]);
}
