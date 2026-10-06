"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { PlayerName } from "@/components/ui/player-name";
import { RoomProvider } from "@/features/data/room-context";
import { RoomStage } from "@/features/room/room-stage";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import { LANGS, type Lang, type RoomView } from "@/game/types";
import { cn } from "@/lib/cn";
import { type ServerClock, useServerClock } from "@/lib/hooks/use-server-clock";
import { StageProvider, useStage } from "../stage-context";
import {
  LAB_SHOWS,
  type LabParams,
  type LabShow,
  labSearch,
  parseLabParams,
} from "./params";
import { type LabRoom, labRoom, labTime } from "./scenarios";
import { TimelineDemo } from "./timeline-demo";

type Query = Record<string, string | string[] | undefined>;
interface Moment {
  show: LabShow;
  at: number;
}
/** Where the lab's clock is: a moment of the match, stopped or running from there. */
interface Run {
  moment: Moment;
  playing: boolean;
  /** Local time the clock started running from `moment`. */
  wall: number;
}

/** The settings that make a different room (the rest only move the clock or the page). */
const ROOM_KEYS = [
  "lang",
  "players",
  "you",
  "match",
  "rule",
  "typed",
  "tie",
  "timeout",
  "guess",
  "set",
  "names",
] as const;

const noop = async () => {};

/**
 * /dev/stage: the room's stage for any made-up match, at any moment, stopped
 * or running, with a scrubber. The room is played by the real engine and seen
 * through the real view; the screens are the room's own (RoomStage).
 */
export function LabScreen(props: { lang: Lang; query: Query }) {
  // the browser only: the room runs on the page's clock, and its pictures load at once
  const browser = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  return browser ? <Lab {...props} /> : null;
}

const subscribeNothing = () => () => {};

function Lab({ lang, query }: { lang: Lang; query: Query }) {
  const [params, setParams] = useState(() => parseLabParams(query, lang));
  const roomKey = ROOM_KEYS.map((k) => params[k]).join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: roomKey lists the settings the room is built from
  const built = useMemo(() => {
    try {
      return { room: labRoom(params), error: null };
    } catch (e) {
      return { room: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [roomKey]);
  const [run, setRun] = useState<Run>(() => ({
    moment: { show: params.show, at: params.at },
    playing: params.play,
    wall: Date.now(),
  }));

  // the URL follows, so the moment is a link
  useEffect(() => {
    const search = labSearch({
      ...params,
      show: run.moment.show,
      at: run.moment.at,
      play: run.playing,
    });
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search}`,
    );
  }, [params, run]);

  useLabTheme(params.theme);

  if (!built.room)
    return (
      <pre className="m-6 whitespace-pre-wrap rounded-2xl bg-no-soft p-4 text-sm">
        Lab room failed: {built.error}
      </pre>
    );
  return (
    <LabRoomStage
      room={built.room}
      params={params}
      run={run}
      setRun={setRun}
      setParams={setParams}
    />
  );
}

function LabRoomStage({
  room,
  params,
  run,
  setRun,
  setParams,
}: {
  room: LabRoom;
  params: LabParams;
  run: Run;
  setRun: (run: Run) => void;
  setParams: (params: LabParams) => void;
}) {
  const origin = labTime(room, run.moment.show, run.moment.at);
  const clock = useMemo<ServerClock>(
    () =>
      run.playing
        ? {
            now: () => origin + (Date.now() - run.wall) * params.speed,
            frozen: false,
            rate: params.speed,
          }
        : { now: () => origin, frozen: true, rate: params.speed },
    [origin, run, params.speed],
  );
  const view = useLabView(room, clock);
  const offset = useMemo(() => clock.now() - Date.now(), [clock]);
  const client = useMemo(() => {
    const c = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Number.POSITIVE_INFINITY, retry: false },
      },
    });
    for (const q of room.queries) c.setQueryData(q.key, q.data);
    return c;
  }, [room]);

  // a running clock stops at the end of the match
  useEffect(() => {
    if (!run.playing) return;
    const wait = (room.end - clock.now()) / params.speed;
    const id = window.setTimeout(
      () =>
        setRun({
          moment: momentOf(room, room.end),
          playing: false,
          wall: Date.now(),
        }),
      Math.max(0, wait),
    );
    return () => window.clearTimeout(id);
  }, [run, room, clock, params.speed, setRun]);

  const seek = (at: number) =>
    setRun({ moment: momentOf(room, at), playing: false, wall: Date.now() });
  const toggle = () =>
    setRun({
      moment: momentOf(
        room,
        run.playing || clock.now() < room.end ? clock.now() : room.start,
      ),
      playing: !run.playing,
      wall: Date.now(),
    });

  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion={params.reduced ? "always" : "user"}>
        <RoomProvider
          code={view.code}
          view={view}
          offset={offset}
          refresh={noop}
          apply={() => {}}
          clock={clock}
        >
          <StageProvider>
            <RoomStage />
            {/* for the screenshot runner: the stage is up */}
            <span data-lab-ready hidden />
            {params.demo ? (
              <div className="pointer-events-none fixed inset-x-0 top-24 z-[45] flex justify-center px-4">
                <TimelineDemo startsAt={room.marks[run.moment.show]} />
              </div>
            ) : null}
            {params.ui ? (
              <LabPanel
                room={room}
                view={view}
                params={params}
                playing={run.playing}
                onSeek={seek}
                onToggle={toggle}
                onChange={setParams}
              />
            ) : null}
          </StageProvider>
        </RoomProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

/** The latest mark at or before `now`, and how far past it. */
function momentOf(room: LabRoom, now: number): Moment {
  let show: LabShow = "lobby";
  for (const s of LAB_SHOWS) if (room.marks[s] <= now) show = s;
  return { show, at: Math.round(now - room.marks[show]) / 1000 };
}

/**
 * The room as the viewer sees it at the clock's time: worked out as the clock
 * is drawn when it is stopped, and a few times a second while it runs (kept
 * as it was when nothing in it changed, like a fetched view).
 */
function useLabView(room: LabRoom, clock: ServerClock): RoomView {
  const still = useMemo(
    () => (clock.frozen ? room.view(clock.now()) : null),
    [room, clock],
  );
  const [running, setRunning] = useState(() => room.view(clock.now()));
  useEffect(() => {
    if (clock.frozen) return;
    const update = () =>
      setRunning((prev) => {
        const next = room.view(clock.now());
        return sameView(prev, next) ? prev : next;
      });
    update();
    const id = window.setInterval(update, 200);
    return () => window.clearInterval(id);
  }, [room, clock]);
  return still ?? running;
}

const sameView = (a: RoomView, b: RoomView) =>
  JSON.stringify({ ...a, serverNow: 0 }) ===
  JSON.stringify({ ...b, serverNow: 0 });

/** Light or dark for the lab only: put back what was there when it leaves. */
function useLabTheme(theme: "light" | "dark") {
  useEffect(() => {
    const html = document.documentElement;
    const before = {
      theme: html.dataset.theme,
      scheme: html.style.colorScheme,
    };
    html.dataset.theme = theme;
    html.style.colorScheme = theme;
    return () => {
      if (before.theme) html.dataset.theme = before.theme;
      else delete html.dataset.theme;
      html.style.colorScheme = before.scheme;
    };
  }, [theme]);
}

const secs = (ms: number) => `${ms >= 0 ? "+" : ""}${(ms / 1000).toFixed(2)} s`;

function LabPanel({
  room,
  view,
  params,
  playing,
  onSeek,
  onToggle,
  onChange,
}: {
  room: LabRoom;
  view: RoomView;
  params: LabParams;
  playing: boolean;
  onSeek: (at: number) => void;
  onToggle: () => void;
  onChange: (params: LabParams) => void;
}) {
  const [open, setOpen] = useState(true);
  const now = useServerClock(0, 100);
  const frame = useStage();
  const moment = momentOf(room, now);
  const set = <K extends keyof LabParams>(k: K, v: LabParams[K]) =>
    onChange({ ...params, [k]: v });
  const rel = (t: number | null) =>
    t === null ? "—" : t === 0 ? "always" : secs(t - now);

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-16 z-[60] rounded-full bg-ink px-4 py-2 font-semibold text-on-ink text-sm shadow-pop"
      >
        Lab · {moment.show} {secs(moment.at * 1000)}
      </button>
    );
  return (
    <section
      aria-label="Stage lab"
      className="fixed bottom-3 left-16 z-[60] flex max-h-[70dvh] w-[min(560px,calc(100vw-76px))] flex-col gap-2 overflow-auto rounded-2xl border border-line bg-surface p-3 text-ink text-xs shadow-pop"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="h-8 rounded-full bg-sky px-3 font-semibold text-on-sky"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <Select
          label="Speed"
          value={String(params.speed)}
          options={["1", "0.5", "0.25"]}
          onChange={(v) => set("speed", Number(v))}
        />
        <span className="font-mono">
          {moment.show} {secs(moment.at * 1000)}
        </span>
        <span className="ml-auto flex gap-1">
          {LANGS.map((l) => (
            <a
              key={l}
              href={`/${l}/dev/stage${labSearch({ ...params, ...moment, play: false })}`}
              className={cn(
                "rounded-full px-2 py-1 font-semibold",
                l === params.lang ? "bg-ink text-on-ink" : "bg-sunken",
              )}
            >
              {l}
            </a>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full bg-sunken px-2 py-1 font-semibold"
          >
            Hide
          </button>
        </span>
      </div>
      <input
        type="range"
        aria-label="Time"
        min={room.start}
        max={room.end}
        step={10}
        value={Math.min(room.end, Math.max(room.start, now))}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full accent-sky"
      />
      <div className="flex flex-wrap gap-1">
        {LAB_SHOWS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSeek(room.marks[s])}
            className={cn(
              "rounded-full px-2 py-1 font-semibold",
              s === moment.show ? "bg-ink text-on-ink" : "bg-sunken",
            )}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSeek(now - 100)}
          className="rounded-full bg-sunken px-2 py-1 font-semibold"
        >
          −0.1
        </button>
        <button
          type="button"
          onClick={() => onSeek(now + 100)}
          className="rounded-full bg-sunken px-2 py-1 font-semibold"
        >
          +0.1
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Select
          label="Players"
          value={String(params.players)}
          options={["2", "3", "4"]}
          onChange={(v) => {
            const players = Number(v) as 2 | 3 | 4;
            onChange({
              ...params,
              players,
              you: Math.min(params.you, players - 1),
            });
          }}
        />
        <Field label="You">
          <span className="flex gap-1">
            {view.players.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("you", p.seat)}
                className={cn(
                  "rounded-full px-2 py-0.5",
                  p.isYou ? "bg-sky-soft font-semibold" : "bg-sunken",
                )}
              >
                <PlayerName player={p} className="max-w-28 truncate" />
              </button>
            ))}
          </span>
        </Field>
        <Select
          label="Match"
          value={params.match}
          options={["first", "later"]}
          onChange={(v) => set("match", v as LabParams["match"])}
        />
        <Select
          label="Rule"
          value={params.rule}
          options={["cards", "sentence"]}
          onChange={(v) => set("rule", v as LabParams["rule"])}
        />
        <Select
          label="Guess"
          value={params.guess}
          options={["hit", "miss", "pass"]}
          onChange={(v) => set("guess", v as LabParams["guess"])}
        />
        <Select
          label="Set"
          value={params.set}
          options={THEME_SET_KEYS}
          onChange={(v) => set("set", v as LabParams["set"])}
        />
        <Select
          label="Names"
          value={params.names}
          options={["short", "long"]}
          onChange={(v) => set("names", v as LabParams["names"])}
        />
        <Select
          label="Theme"
          value={params.theme}
          options={["light", "dark"]}
          onChange={(v) => set("theme", v as LabParams["theme"])}
        />
        {(["typed", "tie", "timeout", "demo", "reduced"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={params[k]}
              onChange={(e) => set(k, e.target.checked)}
            />
            {k}
          </label>
        ))}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-xl bg-sunken p-2 font-mono">
        <dt>frame</dt>
        <dd>
          {frame.area} · {frame.screen ?? "—"}
          {frame.finishedWait ? " · finishedWait" : ""}
        </dd>
        <dt>show</dt>
        <dd>
          {frame.show
            ? `${frame.show.kind} ${frame.show.first ? "first" : "later"} · ${
                frame.beat
                  ? `${frame.beat.kind} ${secs(now - frame.beat.startsAt)} of ${secs(frame.beat.until - frame.beat.startsAt)}`
                  : "before its first beat"
              }`
            : "—"}
        </dd>
        <dt>look</dt>
        <dd>
          {frame.look.tone} · {frame.look.glyphs} · {frame.look.glyphColor} ·{" "}
          {frame.look.fade} s
        </dd>
        <dt>tag · clock · history</dt>
        <dd>
          {rel(frame.themeFrom)} · {rel(frame.clockFrom)}
          {frame.clockPops ? " (pops)" : ""} · {rel(frame.historyFrom)}
        </dd>
        <dt>next</dt>
        <dd>{frame.next === null ? "—" : secs(frame.next - now)}</dd>
      </dl>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-ink-muted">{label}</span>
      {children}
    </span>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-ink-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-surface px-1 py-0.5"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
