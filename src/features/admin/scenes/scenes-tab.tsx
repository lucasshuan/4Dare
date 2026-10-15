"use client";

import {
  AudioWaveform,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flag,
  Headphones,
  Image as ImageIcon,
  Lock,
  Magnet,
  Monitor,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Smartphone,
  Trash2,
  Undo2,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Switch } from "@/components/ui/switch";
import { DEVICES } from "@/features/lab/scene";
import {
  clipCues,
  clipStarts,
  codeClips,
  musicAt,
  type SceneMoment,
  sceneLength,
  titleMoments,
} from "@/features/opening/scene-sound";
import { playCues, soundBuffer } from "@/features/opening/title-sound";
import type { GameKey } from "@/game/games";
import { MUSIC_BEAT, trackFor } from "@/game/music-tunes";
import { cleanClips, type SceneClip, type SceneKind } from "@/game/scene-clips";
import { SOUND_LIBRARY, soundSrc } from "@/game/sounds";
import {
  audioContext,
  deskPlay,
  deskStop,
  releaseDesk,
  takeDesk,
  trackBuffer,
  trackInfo,
} from "@/lib/music";
import { useDraft, useDraftInForce } from "../config/draft";
import { useAdminBase } from "../shell/base";
import { AdminSelect } from "../ui/select";
import { SCENE_T0, type SceneMessage } from "./scene-frame";

const KINDS: [SceneKind, string][] = [
  ["first", "Primeira partida"],
  ["later", "Revanche"],
];
const SPEEDS = [0.25, 0.5, 1] as const;
const FRAME = 1 / 24;
const RULER = 58;
const LANE = 46;
/** How close (px) a drag grabs a moment, a beat or another sound's edge. */
const GRAB = 7;
/** The music's first beat in its file (s). */
const BEAT0 = 0.5;

const secs = (v: number) => `${v.toFixed(2).replace(".", ",")} s`;
const signed = (v: number) =>
  `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2).replace(".", ",")} s`;
const ms = (v: number) => Math.round(v * 1000);
const times = (v: number) => `×${String(+v.toFixed(2)).replace(".", ",")}`;
const soundName = (id: string) =>
  SOUND_LIBRARY.find((s) => s.id === id)?.name ?? id;
const trackName = (id: string) => id[0].toUpperCase() + id.slice(1);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

type Part = "move" | "l" | "r" | "fi" | "fo";

/**
 * A game's title scenes and their sounds: the real scene in a frame at the
 * device's size, and under it the timeline, the moments of the scene on top
 * and a lane per sound, each held to a moment. Drag a sound to move it (let
 * go on a moment and it holds to it), its edges to cut the file, its top
 * corners for a soft start and end; everything snaps to moments, beats and
 * the other sounds (Alt lets go). What changes goes to the panel's draft.
 */
export function ScenesTab({ game }: { game: GameKey }) {
  useDraftInForce();
  const draft = useDraft();
  const params = useSearchParams();
  const { base } = useAdminBase();
  const [kind, setKind] = useState<SceneKind>(
    params.get("kind") === "later" ? "later" : "first",
  );
  const first = kind === "first";
  const [players, setPlayers] = useState(4);
  const [photos, setPhotos] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [sound, setSound] = useState(true);
  const [selected, setSelected] = useState<string | null>(params.get("clip"));
  const [mute, setMute] = useState<Set<string>>(() => new Set());
  const [solo, setSolo] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [snap, setSnap] = useState(true);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);

  // the scene's clips: the draft's, else the version's, else the code's
  const key = `scenes.${game}.${kind}`;
  const raw = draft.value(key);
  const code = useMemo(() => codeClips(game, first), [game, first]);
  const saved = useMemo(() => {
    if (typeof raw !== "string" || !raw) return code;
    try {
      return cleanClips(JSON.parse(raw)) ?? code;
    } catch {
      return code;
    }
  }, [raw, code]);
  const [preview, setPreview] = useState<SceneClip[] | null>(null);
  const clips = preview ?? saved;
  const commit = useCallback(
    (next: SceneClip[]) => {
      setPreview(null);
      draft.set(key, same(next, code) ? "" : JSON.stringify(next));
    },
    [draft, key, code],
  );

  const moments = useMemo(
    () => titleMoments(game, first, players),
    [game, first, players],
  );
  const total = sceneLength(game, first);
  const viewEnd = total + 1.2;
  const track = trackFor(game, "opening");
  const music = musicAt(first);
  const beats = useMemo(() => {
    const out: number[] = [];
    if (!track) return out;
    for (let x = music + BEAT0; x < viewEnd; x += MUSIC_BEAT) out.push(x);
    return out;
  }, [track, music, viewEnd]);

  // the files: their length and waveform
  const [buffers, setBuffers] = useState<Record<string, AudioBuffer | null>>(
    {},
  );
  const wanted = [...new Set(clips.map((c) => c.sound))].join(" ");
  useEffect(() => {
    let off = false;
    for (const id of wanted.split(" ").filter(Boolean))
      void soundBuffer(soundSrc(id)).then((b) => {
        if (!off) setBuffers((m) => (id in m ? m : { ...m, [id]: b }));
      });
    return () => {
      off = true;
    };
  }, [wanted]);
  const [musicBuffer, setMusicBuffer] = useState<AudioBuffer | null>(null);
  useEffect(() => {
    if (!track) return;
    let off = false;
    void trackBuffer(track).then((b) => !off && setMusicBuffer(b));
    return () => {
      off = true;
    };
  }, [track]);
  const fileLength = (c: SceneClip) => buffers[c.sound]?.duration ?? 1;
  const lengthOf = (c: SceneClip) =>
    Math.max(0.05, (c.trimOut ?? fileLength(c)) - c.trimIn);
  const audible = (c: { id: string; off?: boolean }) =>
    !c.off && !mute.has(c.id) && (!solo || solo === c.id);

  // -- the frame ---------------------------------------------------------------
  const frame = useRef<HTMLIFrameElement>(null);
  const post = useCallback((m: SceneMessage) => {
    frame.current?.contentWindow?.postMessage(m, window.location.origin);
  }, []);
  const spec = useMemo(
    () => ({
      game,
      first,
      players,
      photos,
      tunes: { ...draft.saved, ...draft.edits },
    }),
    [game, first, players, photos, draft.saved, draft.edits],
  );
  useEffect(() => post({ kind: "spec", spec }), [post, spec]);
  // the frame runs its own clock: a start, a seek, a pause or a new speed re-sends it
  const clockNow = useRef({ at: 0, playing: false, speed: 1 });
  const sendClock = useCallback(
    (at: number, on: boolean, spd: number) => {
      clockNow.current = { at, playing: on, speed: spd };
      post({
        kind: "clock",
        origin: SCENE_T0 + at * 1000,
        wall: Date.now(),
        playing: on,
        speed: spd,
      });
    },
    [post],
  );
  const resend = useRef(spec);
  resend.current = spec;
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.kind !== "ready")
        return;
      post({ kind: "spec", spec: resend.current });
      const c = clockNow.current;
      post({
        kind: "clock",
        origin: SCENE_T0 + c.at * 1000,
        wall: Date.now(),
        playing: c.playing,
        speed: c.speed,
      });
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [post]);
  // -- the clock: the frame follows it, the sounds play on it at 1× -------------
  const run = useRef({ t0: 0, at: 0 });
  const stops = useRef<(() => void)[]>([]);
  const silence = useCallback(() => {
    for (const s of stops.current) s();
    stops.current = [];
  }, []);
  useEffect(() => {
    takeDesk();
    return () => {
      silence();
      releaseDesk();
    };
  }, [silence]);
  const latest = useRef({
    clips,
    moments,
    audible,
    sound,
    speed,
    track,
    music,
  });
  latest.current = { clips, moments, audible, sound, speed, track, music };
  const sounds = useCallback(
    (from: number) => {
      silence();
      const l = latest.current;
      if (!l.sound || l.speed !== 1) return;
      const c = audioContext();
      void c.resume().catch(() => {});
      const t0 = performance.now() - from * 1000;
      const cues = clipCues(l.clips.filter(l.audible), l.moments);
      stops.current.push(
        playCues(cues, t0, { late: true, out: c.destination }),
      );
      if (l.track && l.audible({ id: "music" })) {
        const tr = l.track;
        const into = from - l.music;
        const intro = trackInfo(tr).intro;
        if (into >= 0) void deskPlay(tr, into - intro);
        else {
          const id = window.setTimeout(() => void deskPlay(tr), -into * 1000);
          stops.current.push(() => window.clearTimeout(id));
        }
        stops.current.push(() => deskStop());
      }
    },
    [silence],
  );
  const play = (from = t) => {
    const at = from >= total - 0.01 ? 0 : from;
    run.current = { t0: at, at: performance.now() };
    setT(at);
    setPlaying(true);
    sendClock(at, true, speed);
    sounds(at);
  };
  const pause = () => {
    const now = playing
      ? run.current.t0 + ((performance.now() - run.current.at) / 1000) * speed
      : t;
    const at = Math.min(total, now);
    setT(at);
    setPlaying(false);
    sendClock(at, false, speed);
    silence();
  };
  const seek = (to: number) => {
    const at = Math.max(0, Math.min(total, to));
    setT(at);
    sendClock(at, playing, speed);
    if (playing) {
      run.current = { t0: at, at: performance.now() };
      sounds(at);
    }
  };
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const now =
        run.current.t0 + ((performance.now() - run.current.at) / 1000) * speed;
      if (now >= total) {
        if (loop) {
          run.current = { t0: 0, at: performance.now() };
          setT(0);
          sendClock(0, true, speed);
          sounds(0);
        } else {
          setT(total);
          setPlaying(false);
          sendClock(total, false, speed);
          silence();
          return;
        }
      } else setT(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, total, loop, sounds, silence, sendClock]);
  // a change of what plays (a clip moved, muted) is heard from where the playhead is
  const heard = JSON.stringify([clips, [...mute], solo, sound, speed]);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by what plays
  useEffect(() => {
    if (!playingRef.current) return;
    const now =
      run.current.t0 + ((performance.now() - run.current.at) / 1000) * speed;
    run.current = { t0: now, at: performance.now() };
    sounds(now);
  }, [heard]);

  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const dev = DEVICES[device];
  const scale = Math.min(
    boxW / dev.w,
    (device === "phone" ? 520 : 460) / dev.h,
  );

  // -- the timeline ------------------------------------------------------------
  const scroll = useRef<HTMLDivElement>(null);
  const [scrollW, setScrollW] = useState(900);
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScrollW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const P = Math.max(55, ((scrollW - 16) / viewEnd) * zoom);
  const width = Math.ceil(viewEnd * P) + 16;
  const momentOf = (id: string) => moments.find((m) => m.id === id);
  const [snapAt, setSnapAt] = useState<number | null>(null);

  const snapTo = (
    x: number,
    self: SceneClip,
    list: SceneClip[],
    alt: boolean,
  ): { t: number; ev?: string } | null => {
    if (!snap || alt) return null;
    const cands: { t: number; ev?: string }[] = [];
    for (const m of moments) {
      cands.push({ t: m.times[0], ev: m.id });
      for (const y of m.times.slice(1)) cands.push({ t: y });
    }
    for (const c of list)
      if (c.id !== self.id && !c.off)
        for (const s of clipStarts(c, moments).slice(0, 1))
          cands.push({ t: s }, { t: s + lengthOf(c) });
    for (const b of beats) cands.push({ t: b });
    let best: { t: number; ev?: string; d: number } | null = null;
    for (const k of cands) {
      const d = Math.abs(k.t - x);
      if (d < GRAB / P && (!best || d < best.d || (d === best.d && k.ev)))
        best = { ...k, d };
    }
    return best;
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest(".flag")) return;
    const el = scroll.current;
    const canvas = el?.firstElementChild as HTMLElement | null;
    if (!el || !canvas) return;
    const r = canvas.getBoundingClientRect();
    const at = (cx: number) => Math.max(0, (cx - r.left) / P);
    if (target.closest(".ruler2")) {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      seek(at(e.clientX));
      const mv = (ev: PointerEvent) => seek(at(ev.clientX));
      const up = () => {
        el.removeEventListener("pointermove", mv);
        el.removeEventListener("pointerup", up);
      };
      el.addEventListener("pointermove", mv);
      el.addEventListener("pointerup", up);
      return;
    }
    const block = target.closest<HTMLElement>(".clip[data-id]");
    if (!block) {
      if (target.closest(".tl-canvas")) setSelected(null);
      return;
    }
    e.preventDefault();
    const id = block.dataset.id as string;
    const list = clips;
    const before = list.find((c) => c.id === id);
    if (!before) return;
    setSelected(id);
    const part = (target.dataset.part as Part | undefined) ?? "move";
    const s0 = clipStarts(before, moments)[0] ?? 0;
    const len0 = lengthOf(before);
    const end0 = before.trimOut ?? fileLength(before);
    const x0 = e.clientX;
    let moved = false;
    let last = list;
    el.setPointerCapture(e.pointerId);
    const mv = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - x0) > 2) moved = true;
      if (!moved) return;
      const dt = (ev.clientX - x0) / P;
      const c = { ...before };
      let snapped: number | null = null;
      if (part === "move") {
        let ns = s0 + dt;
        const sn = snapTo(ns, before, list, ev.altKey);
        if (sn) {
          ns = sn.t;
          snapped = sn.t;
        }
        const multi = (momentOf(c.anchor)?.times.length ?? 1) > 1;
        if (sn?.ev && !(c.each && multi)) {
          c.anchor = sn.ev;
          c.offset = 0;
          c.each = false;
        } else
          c.offset = +(ns - (momentOf(c.anchor)?.times[0] ?? 0)).toFixed(3);
      } else if (part === "l") {
        const nIn = Math.max(0, Math.min(end0 - 0.05, before.trimIn + dt));
        c.trimIn = +nIn.toFixed(3);
        c.offset = +(before.offset + (nIn - before.trimIn)).toFixed(3);
      } else if (part === "r") {
        let ne = s0 + Math.max(0.05, len0 + dt);
        const sn = snapTo(ne, before, list, ev.altKey);
        if (sn) {
          ne = sn.t;
          snapped = sn.t;
        }
        c.trimOut = +Math.min(
          fileLength(c),
          Math.max(c.trimIn + 0.05, c.trimIn + (ne - s0)),
        ).toFixed(3);
      } else if (part === "fi")
        c.fadeIn = +Math.max(
          0,
          Math.min(len0 - before.fadeOut, before.fadeIn + dt),
        ).toFixed(3);
      else if (part === "fo")
        c.fadeOut = +Math.max(
          0,
          Math.min(len0 - before.fadeIn, before.fadeOut - dt),
        ).toFixed(3);
      last = list.map((x) => (x.id === id ? c : x));
      setPreview(last);
      setSnapAt(snapped);
    };
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setSnapAt(null);
      if (moved) commit(last);
      else setPreview(null);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  // -- editing -------------------------------------------------------------------
  const sel = clips.find((c) => c.id === selected) ?? null;
  const change = (patch: Partial<SceneClip>) => {
    if (!sel) return;
    commit(clips.map((c) => (c.id === sel.id ? { ...c, ...patch } : c)));
  };
  const remove = () => {
    if (!sel) return;
    if (code.some((c) => c.id === sel.id)) change({ off: true });
    else {
      commit(clips.filter((c) => c.id !== sel.id));
      setSelected(null);
    }
  };
  const nextId = () => {
    let n = 1;
    while (clips.some((c) => c.id === `x${n}`)) n++;
    return `x${n}`;
  };
  const add = () => {
    const near = moments
      .filter((m) => m.id !== "end")
      .reduce((b, m) =>
        Math.abs(m.times[0] - t) < Math.abs(b.times[0] - t) ? m : b,
      );
    const id = nextId();
    commit([
      ...clips,
      {
        id,
        label: `Som ${id.slice(1)}`,
        sound: "pop",
        anchor: near.id,
        offset: +(t - near.times[0]).toFixed(3),
        gain: 1,
        trimIn: 0,
        trimOut: null,
        fadeIn: 0,
        fadeOut: 0,
        each: false,
      },
    ]);
    setSelected(id);
  };
  const duplicate = () => {
    if (!sel) return;
    const id = nextId();
    commit([
      ...clips,
      {
        ...sel,
        id,
        label: `${sel.label} (cópia)`,
        offset: +(sel.offset + 0.25).toFixed(3),
        off: undefined,
      },
    ]);
    setSelected(id);
  };
  const hear = () => {
    if (!sel) return;
    const c = audioContext();
    void c.resume().catch(() => {});
    silence();
    const [cue] = clipCues(
      [{ ...sel, off: false, each: false, anchor: "start", offset: 0 }],
      [{ id: "start", label: "", times: [0] }],
    );
    if (cue)
      stops.current.push(
        playCues([cue], performance.now() + 30, { out: c.destination }),
      );
  };

  // keys: space plays, Esc lets go, Delete takes out, ← → nudge 10 ms (100 with Shift)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input,select,textarea,[role=listbox],[role=slider]"))
        return;
      if (e.key === " ") {
        e.preventDefault();
        playing ? pause() : play();
      } else if (e.key === "Escape" && selected) setSelected(null);
      else if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        remove();
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && sel) {
        e.preventDefault();
        const d = (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 0.1 : 0.01);
        change({ offset: +(sel.offset + d).toFixed(3) });
      }
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  });

  // the ruler's flags take the row with room
  const flags = useMemo(() => {
    const rowsEnd = [-1e9, -1e9];
    const list = moments
      .map((m) => ({
        m,
        x: m.times[0] * P,
        w: (m.label.length + (m.times.length > 1 ? 4 : 0)) * 6.3 + 18,
        r: 0,
      }))
      .sort((a, b) => a.x - b.x);
    for (const f of list) {
      f.r =
        f.x >= rowsEnd[0]
          ? 0
          : f.x >= rowsEnd[1]
            ? 1
            : rowsEnd[0] <= rowsEnd[1]
              ? 0
              : 1;
      rowsEnd[f.r] = f.x + f.w;
    }
    return list.map((f, i) => {
      const next = list.slice(i + 1).find((g) => g.r === f.r);
      return { ...f, max: next ? Math.max(16, next.x - f.x - 3) : 400 };
    });
  }, [moments, P]);
  const step = P > 140 ? 0.25 : P > 60 ? 0.5 : 1;
  const ticks = useMemo(() => {
    const out: { x: number; major: boolean; s: number }[] = [];
    for (let k = 0; k * step <= viewEnd + 1e-6; k++) {
      const s = k * step;
      out.push({ x: s * P, major: Math.abs(s - Math.round(s)) < 1e-6, s });
    }
    return out;
  }, [step, viewEnd, P]);

  const lanes: { id: string; music?: true; clip?: SceneClip }[] = [
    ...(track ? [{ id: "music", music: true as const }] : []),
    ...clips.map((c) => ({ id: c.id, clip: c })),
  ];

  return (
    <div className="sc2">
      <div className="sc2-top">
        <div className="card sc2-stage">
          <div
            ref={box}
            className="lab-stage"
            style={{ height: dev.h * scale }}
          >
            <iframe
              ref={frame}
              title="Cena"
              src={`${base}/frame/scene`}
              className="lab-frame"
              style={{
                width: dev.w,
                height: dev.h,
                transform: `translateX(-50%) scale(${scale})`,
              }}
            />
          </div>
        </div>
        <div className="card sc2-side">
          <fieldset className="seg" aria-label="Cena">
            {KINDS.map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => {
                  pause();
                  setPreview(null);
                  setKind(k);
                  setSelected(null);
                  setT(0);
                  sendClock(0, false, speed);
                }}
              >
                {l}
              </button>
            ))}
          </fieldset>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span
              className="row"
              style={{ gap: 8, fontSize: 13, fontWeight: 600 }}
            >
              <Users className="i" />
              <span className="step">
                <button
                  type="button"
                  aria-label="Menos jogadores"
                  onClick={() => setPlayers((n) => Math.max(2, n - 1))}
                >
                  −
                </button>
                <output>{players}</output>
                <button
                  type="button"
                  aria-label="Mais jogadores"
                  onClick={() => setPlayers((n) => Math.min(10, n + 1))}
                >
                  +
                </button>
              </span>
            </span>
            <fieldset className="seg sm" aria-label="Aparelho">
              <button
                type="button"
                aria-pressed={device === "phone"}
                aria-label="Celular"
                onClick={() => setDevice("phone")}
              >
                <Smartphone className="i" />
              </button>
              <button
                type="button"
                aria-pressed={device === "desktop"}
                aria-label="Computador"
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="i" />
              </button>
            </fieldset>
          </div>
          <div className="row" style={{ gap: 18 }}>
            <span
              className="row"
              style={{ gap: 8, fontSize: 13, fontWeight: 600 }}
            >
              <Switch
                checked={sound}
                onCheckedChange={setSound}
                aria-label="Som"
              />
              <Volume2 className="i" />
            </span>
            <span
              className="row"
              style={{ gap: 8, fontSize: 13, fontWeight: 600 }}
            >
              <Switch
                checked={photos}
                onCheckedChange={setPhotos}
                aria-label="Com fotos"
              />
              <ImageIcon className="i" />
            </span>
          </div>
          <Inspector
            clips={clips}
            code={code}
            sel={sel}
            moments={moments}
            lengthOf={lengthOf}
            fileLength={fileLength}
            onSelect={setSelected}
            onChange={change}
            onRemove={remove}
            onDuplicate={duplicate}
            onHear={hear}
          />
        </div>
      </div>
      <div className="card tl-card">
        <div className="tl-bar">
          <button
            type="button"
            className="btn icon sm"
            aria-label="Quadro anterior"
            onClick={() => {
              silence();
              setPlaying(false);
              const at = Math.max(0, t - FRAME);
              setT(at);
              sendClock(at, false, speed);
            }}
          >
            <ChevronLeft className="i" />
          </button>
          <button
            type="button"
            className="btn sky sm"
            onClick={() => (playing ? pause() : play())}
          >
            {playing ? <Pause className="i" /> : <Play className="i" />}
            {playing ? "Pausar" : "Assistir"}
          </button>
          <button
            type="button"
            className="btn icon sm"
            aria-label="Próximo quadro"
            onClick={() => {
              silence();
              setPlaying(false);
              const at = Math.min(total, t + FRAME);
              setT(at);
              sendClock(at, false, speed);
            }}
          >
            <ChevronRight className="i" />
          </button>
          <span className="tc">{secs(t)}</span>
          <fieldset className="seg sm" aria-label="Velocidade">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                onClick={() => {
                  if (playing) {
                    run.current = { t0: t, at: performance.now() };
                    if (s === 1) sounds(t);
                    else silence();
                  }
                  sendClock(t, playing, s);
                  setSpeed(s);
                }}
              >
                {String(s).replace(".", ",")}×
              </button>
            ))}
          </fieldset>
          <button
            type="button"
            className={loop ? "btn sm primary" : "btn sm ghost"}
            aria-pressed={loop}
            onClick={() => setLoop((v) => !v)}
          >
            <Repeat className="i" />
            Repetir
          </button>
          <span className="spacer" />
          <button
            type="button"
            className={snap ? "btn sm primary" : "btn sm ghost"}
            aria-pressed={snap}
            title="Alt solta"
            onClick={() => setSnap((v) => !v)}
          >
            <Magnet className="i" />
            Grudar
          </button>
          <span className="zoom">
            <button
              type="button"
              className="btn icon sm ghost"
              aria-label="Menos zoom"
              onClick={() => setZoom((z) => Math.max(1, z / 1.5))}
            >
              −
            </button>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setZoom(1)}
            >
              Ajustar
            </button>
            <button
              type="button"
              className="btn icon sm ghost"
              aria-label="Mais zoom"
              onClick={() => setZoom((z) => Math.min(12, z * 1.5))}
            >
              +
            </button>
          </span>
          <button type="button" className="btn sm" onClick={add}>
            <Plus className="i" />
            Som
          </button>
        </div>
        <div className="stl">
          <div className="tl-heads">
            <div className="th ruler">Momentos</div>
            {lanes.map((l) => {
              const on = audible({ id: l.id, off: l.clip?.off });
              return (
                // biome-ignore lint/a11y/useSemanticElements: a row with its own buttons inside
                <div
                  key={l.id}
                  role="button"
                  tabIndex={-1}
                  className={[
                    "th",
                    selected === l.id ? "sel" : "",
                    on ? "" : "off",
                  ].join(" ")}
                  onClick={() => l.clip && setSelected(l.id)}
                  onKeyDown={() => {}}
                >
                  <span className="ti">
                    {l.music ? (
                      <Music className="i" />
                    ) : (
                      <AudioWaveform className="i" />
                    )}
                  </span>
                  <span className="tn">
                    <b>{l.music ? "Música" : l.clip?.label}</b>
                    <small>
                      {l.music && track
                        ? trackName(track)
                        : l.clip
                          ? soundName(l.clip.sound)
                          : ""}
                    </small>
                  </span>
                  <span className="tb">
                    <button
                      type="button"
                      className={
                        mute.has(l.id)
                          ? "btn icon sm ghost on"
                          : "btn icon sm ghost"
                      }
                      aria-pressed={mute.has(l.id)}
                      aria-label="Silenciar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMute((m) => {
                          const n = new Set(m);
                          if (n.has(l.id)) n.delete(l.id);
                          else n.add(l.id);
                          return n;
                        });
                      }}
                    >
                      {mute.has(l.id) ? (
                        <VolumeX className="i" />
                      ) : (
                        <Volume2 className="i" />
                      )}
                    </button>
                    <button
                      type="button"
                      className={
                        solo === l.id
                          ? "btn icon sm ghost on"
                          : "btn icon sm ghost"
                      }
                      aria-pressed={solo === l.id}
                      aria-label="Só este"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSolo((s) => (s === l.id ? null : l.id));
                      }}
                    >
                      <Headphones className="i" />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <div ref={scroll} className="tl-scroll" onPointerDown={onDown}>
            <div
              className="tl-canvas"
              style={{ width, height: RULER + lanes.length * LANE }}
            >
              <div className="ruler2">
                {ticks.map((k) => (
                  <i
                    key={k.s}
                    className={k.major ? "tk M" : "tk"}
                    style={{ left: k.x }}
                  >
                    {k.major ? <b>{Math.round(k.s)} s</b> : null}
                  </i>
                ))}
                {flags.map((f) => (
                  <span key={f.m.id}>
                    <button
                      type="button"
                      className={`flag r${f.r}`}
                      style={{ left: f.x, maxWidth: f.max }}
                      title={`${f.m.label} · ${secs(f.m.times[0])}`}
                      onClick={() => seek(f.m.times[0])}
                    >
                      {f.m.label}
                      {f.m.times.length > 1 ? ` ${f.m.times.length}×` : ""}
                    </button>
                    <i className="fl" style={{ left: f.x }} />
                  </span>
                ))}
              </div>
              {snap
                ? beats.map((b, k) => (
                    <i
                      key={b}
                      className={k % 4 === 0 ? "bt bar" : "bt"}
                      style={{ left: b * P }}
                    />
                  ))
                : null}
              <i className="tl-end" style={{ left: total * P }}>
                <b>fim</b>
              </i>
              {lanes.map((l, i) => (
                <div
                  key={l.id}
                  className={selected === l.id ? "lane2 sel" : "lane2"}
                  style={{ top: RULER + i * LANE }}
                >
                  {l.music && track ? (
                    <div
                      className={
                        audible({ id: "music" })
                          ? "clip music"
                          : "clip music off"
                      }
                      style={{
                        left: music * P,
                        width: (viewEnd - music) * P,
                        cursor: "default",
                      }}
                      title="Presa à coreografia da cena"
                    >
                      <Wave
                        buffer={musicBuffer}
                        from={0}
                        width={(viewEnd - music) * P}
                        pps={P}
                      />
                      <span className="cn">
                        <Lock className="i anc" />
                        {trackName(track)}
                      </span>
                      <span className="carry">
                        segue na partida
                        <ChevronRight className="i" />
                      </span>
                    </div>
                  ) : l.clip ? (
                    <ClipBlocks
                      c={l.clip}
                      starts={clipStarts(l.clip, moments)}
                      length={lengthOf(l.clip)}
                      buffer={buffers[l.clip.sound] ?? null}
                      pps={P}
                      selected={selected === l.id}
                      audible={audible(l.clip)}
                      anchor={momentOf(l.clip.anchor)?.label ?? "—"}
                    />
                  ) : null}
                </div>
              ))}
              {snapAt !== null ? (
                <i className="tl-snap" style={{ left: snapAt * P }} />
              ) : null}
              <i className="tl-ph" style={{ left: t * P }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClipBlocks({
  c,
  starts,
  length,
  buffer,
  pps,
  selected,
  audible,
  anchor,
}: {
  c: SceneClip;
  starts: number[];
  length: number;
  buffer: AudioBuffer | null;
  pps: number;
  selected: boolean;
  audible: boolean;
  anchor: string;
}) {
  const w = Math.max(6, length * pps);
  return (
    <>
      {starts.map((s, k) => (
        <div
          key={`${c.id}-${k.toString()}`}
          data-id={c.id}
          className={[
            "clip",
            k ? "ghost" : "",
            selected ? "sel" : "",
            audible ? "" : "off",
          ].join(" ")}
          style={{ left: s * pps, width: w }}
          title={`${soundName(c.sound)} · ${anchor} ${signed(c.offset)}`}
        >
          <Wave buffer={buffer} from={c.trimIn} width={w} pps={pps} />
          {k === 0 ? (
            <span className="cn">
              <Flag className="i anc" />
              {soundName(c.sound)}
            </span>
          ) : null}
          <svg
            className="fades"
            viewBox={`0 0 ${w} 40`}
            preserveAspectRatio="none"
            aria-hidden
          >
            {c.fadeIn ? (
              <polygon points={`0,0 ${c.fadeIn * pps},0 0,40`} />
            ) : null}
            {c.fadeOut ? (
              <polygon points={`${w},0 ${w - c.fadeOut * pps},0 ${w},40`} />
            ) : null}
          </svg>
          {k === 0 ? (
            <>
              <i className="h l" data-part="l" title="Cortar o começo" />
              <i className="h r" data-part="r" title="Cortar o fim" />
              <i
                className="fk l"
                data-part="fi"
                title="Entrada suave"
                style={{ left: c.fadeIn * pps }}
              />
              <i
                className="fk r"
                data-part="fo"
                title="Saída suave"
                style={{ left: w - c.fadeOut * pps }}
              />
            </>
          ) : null}
        </div>
      ))}
    </>
  );
}

/** The part of a file that plays, drawn as its peaks. */
function Wave({
  buffer,
  from,
  width,
  pps,
}: {
  buffer: AudioBuffer | null;
  from: number;
  width: number;
  pps: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.min(4000, Math.ceil(width));
  // biome-ignore lint/correctness/useExhaustiveDependencies: redrawn when the canvas's width changes
  useEffect(() => {
    const cn = ref.current;
    const g = cn?.getContext("2d");
    if (!cn || !g) return;
    g.clearRect(0, 0, cn.width, cn.height);
    if (!buffer) return;
    const data = buffer.getChannelData(0);
    const rate = buffer.sampleRate;
    const H = 40;
    g.fillStyle =
      getComputedStyle(cn.parentElement as HTMLElement).getPropertyValue(
        "--wv",
      ) || "#2b69c8";
    const per = rate / pps;
    for (let x = 0; x < cn.width; x++) {
      const a = Math.floor((from + x / pps) * rate);
      if (a >= data.length) break;
      const b = Math.min(data.length, a + Math.max(1, Math.floor(per)));
      let peak = 0;
      for (let i = a; i < b; i += 16) peak = Math.max(peak, Math.abs(data[i]));
      const h = Math.max(1, Math.min(1, peak * 1.4) * (H - 6));
      g.fillRect(x, (H - h) / 2, 1, h);
    }
  }, [buffer, from, pps, w]);
  return <canvas ref={ref} width={w} height={40} />;
}

function Inspector({
  clips,
  code,
  sel,
  moments,
  lengthOf,
  fileLength,
  onSelect,
  onChange,
  onRemove,
  onDuplicate,
  onHear,
}: {
  clips: SceneClip[];
  code: SceneClip[];
  sel: SceneClip | null;
  moments: SceneMoment[];
  lengthOf: (c: SceneClip) => number;
  fileLength: (c: SceneClip) => number;
  onSelect: (id: string | null) => void;
  onChange: (patch: Partial<SceneClip>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onHear: () => void;
}) {
  const label = (id: string) =>
    moments.find((m) => m.id === id)?.label ?? "fora desta cena";
  if (!sel)
    return (
      <div className="insp">
        <h3>Sons da cena</h3>
        <div className="clist">
          {clips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.off ? "markrow off" : "markrow"}
              onClick={() => onSelect(c.id)}
            >
              <span>
                {c.label}
                <small>
                  {c.off
                    ? "fora da cena"
                    : `${soundName(c.sound)} · ${label(c.anchor)} ${signed(c.offset)}`}
                </small>
              </span>
              <ChevronRight className="i" />
            </button>
          ))}
        </div>
      </div>
    );
  const moment = moments.find((m) => m.id === sel.anchor);
  const starts = clipStarts(sel, moments);
  const orig = code.find((c) => c.id === sel.id);
  const fromCode = !!orig;
  const num = (
    k: "offset" | "fadeIn" | "fadeOut" | "trimIn" | "trimOut",
    v: number,
  ) => {
    const s = v / 1000;
    if (k === "trimOut")
      onChange({
        trimOut: +Math.min(
          fileLength(sel),
          Math.max(sel.trimIn + 0.05, s),
        ).toFixed(3),
      });
    else if (k === "offset") onChange({ offset: +s.toFixed(3) });
    else onChange({ [k]: +Math.max(0, s).toFixed(3) });
  };
  const field = (
    k: "offset" | "fadeIn" | "fadeOut" | "trimIn" | "trimOut",
    label: string,
    v: number,
  ) => (
    <label className="fld">
      {label}
      <span className="unit">
        <input
          key={`${sel.id}-${k}-${ms(v)}`}
          type="number"
          step={10}
          defaultValue={ms(v)}
          onBlur={(e) => num(k, Number(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              num(k, Number((e.target as HTMLInputElement).value) || 0);
          }}
        />
        <i>ms</i>
      </span>
    </label>
  );
  return (
    <div className="insp">
      <header className="row">
        <span className="ti">
          <AudioWaveform className="i" />
        </span>
        <h3 style={{ flex: 1, minWidth: 0 }}>{sel.label}</h3>
        <button type="button" className="btn sm" onClick={onHear}>
          <Play className="i" />
          Ouvir
        </button>
        <button
          type="button"
          className="btn icon sm ghost"
          aria-label="Fechar"
          onClick={() => onSelect(null)}
        >
          <X className="i" />
        </button>
      </header>
      {sel.off ? (
        <button
          type="button"
          className="btn"
          onClick={() => onChange({ off: undefined })}
        >
          <Undo2 className="i" />
          Pôr de volta na cena
        </button>
      ) : null}
      <div className="fld">
        Som
        <AdminSelect
          label="Som"
          value={sel.sound}
          onChange={(v) => onChange({ sound: v, trimIn: 0, trimOut: null })}
          options={SOUND_LIBRARY.map((s) => ({
            value: s.id,
            label: s.name,
            icon: <AudioWaveform className="size-4" />,
          }))}
        />
      </div>
      <div className="fld">
        Preso a
        <AdminSelect
          label="Preso a"
          value={moment ? sel.anchor : ""}
          onChange={(v) => {
            const m = moments.find((x) => x.id === v);
            if (!m) return;
            const keep = starts[0] ?? m.times[0];
            const multi = m.times.length > 1;
            onChange({
              anchor: m.id,
              each: multi,
              offset: multi ? 0 : +(keep - m.times[0]).toFixed(3),
            });
          }}
          options={[
            ...(moment ? [] : [{ value: "", label: "Fora desta cena" }]),
            ...moments.map((m) => ({
              value: m.id,
              label: `${m.label} · ${m.times.length > 1 ? `${m.times.length}×` : secs(m.times[0])}`,
              icon:
                m.times.length > 1 ? (
                  <Users className="size-4" />
                ) : m.id === "start" ? (
                  <Play className="size-4" />
                ) : (
                  <Flag className="size-4" />
                ),
            })),
          ]}
        />
      </div>
      <div className="f2">
        {field("offset", "Deslocamento", sel.offset)}
        <span className="fld">
          Começa em
          <span className="ro mono">
            {starts.length ? secs(starts[0]) : "—"}
            {starts.length > 1 ? ` +${starts.length - 1}` : ""}
          </span>
        </span>
      </div>
      {moment && moment.times.length > 1 ? (
        <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}>
          <Switch
            checked={sel.each}
            onCheckedChange={(v) => onChange({ each: v })}
            aria-label="Toca em cada um"
          />
          Toca em cada um ({moment.times.length}×)
        </span>
      ) : null}
      <p className="note">Dura {secs(lengthOf(sel))}</p>
      <label className="fld">
        Volume
        <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
          <input
            key={`${sel.id}-gain-${sel.gain}`}
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            defaultValue={sel.gain}
            style={{ flex: 1 }}
            onPointerUp={(e) =>
              onChange({
                gain: +Number((e.target as HTMLInputElement).value).toFixed(2),
              })
            }
            onKeyUp={(e) =>
              onChange({
                gain: +Number((e.target as HTMLInputElement).value).toFixed(2),
              })
            }
          />
          <output className="mono">{times(sel.gain)}</output>
        </span>
      </label>
      <div className="f2">
        {field("fadeIn", "Entrada suave", sel.fadeIn)}
        {field("fadeOut", "Saída suave", sel.fadeOut)}
      </div>
      <div className="f2">
        {field("trimIn", "Do arquivo, a partir de", sel.trimIn)}
        {field("trimOut", "até", sel.trimOut ?? fileLength(sel))}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className="btn sm" onClick={onDuplicate}>
          <Copy className="i" />
          Duplicar
        </button>
        {sel.off ? null : (
          <button type="button" className="btn sm no" onClick={onRemove}>
            <Trash2 className="i" />
            {fromCode ? "Tirar desta cena" : "Apagar"}
          </button>
        )}
        {orig && !same(orig, sel) ? (
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => onChange({ ...orig, off: undefined })}
          >
            <RotateCcw className="i" />
            Original
          </button>
        ) : null}
      </div>
    </div>
  );
}
