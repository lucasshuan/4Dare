"use client";

import {
  AudioLines,
  Check,
  Copy,
  LayoutGrid,
  Music,
  Pause,
  Play,
  Search,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Switch } from "@/components/ui/switch";
import { GameThumb } from "@/features/create/game-info";
import { GAME_KEYS, type GameKey } from "@/game/games";
import {
  MOMENT_TRACKS,
  MOMENTS,
  TRACK_IDS,
  type TrackId,
} from "@/game/music-tunes";
import {
  ROOM_SOUNDS,
  SOUND_LIBRARY,
  type SoundId,
  soundSrc,
} from "@/game/sounds";
import {
  deskLevel,
  deskMuffle,
  deskNow,
  deskPlay,
  deskRefresh,
  deskStop,
  deskSwitch,
  deskVolume,
  releaseDesk,
  takeDesk,
  trackBuffer,
  trackInfo,
  trackLoudness,
} from "@/lib/music";
import { useDraft, useDraftInForce } from "../config/draft";
import { ResetEdits, TuneChoice, TuneNumber } from "../config/fields";
import { useAdminHref } from "../shell/base";
import { SUNO_PROMPTS } from "./suno-prompts";

const TRACK_NOTES: Record<TrackId, string> = {
  stage: "Lounge do palco",
  booth: "Rádio da cabine",
  impostor: "Espião, noir",
  precinct: "Delegacia, “Ticking Clock”",
  bidding: "Leilão",
  matchday: "Esportes",
  recess: "Recreio",
  encore: "Vitória, “Samba de Noche”",
};
const MOMENT_PT = {
  room: "Sala",
  opening: "Abertura",
  host: "Apresentador",
  end: "Fim de jogo",
} as const;
const name = (id: string) => id[0].toUpperCase() + id.slice(1);
const fmtS = (s: number) =>
  `${s < 0 ? "−" : ""}${Math.abs(s).toFixed(2).replace(".", ",")} s`;
const MIN = -21;

type Filter = "all" | "used" | "free";

/**
 * The sound desk: every take and every sound of the site, played by the
 * site's own engine. Levels and loops are the panel's values: change them,
 * hear the change at once, save them with the tray.
 */
export function MixerScreen({ games }: { games: Record<GameKey, string> }) {
  const d = useDraft();
  useDraftInForce();
  const [tab, setTab] = useState<"music" | "sfx">("music");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sel, setSel] = useState<TrackId>("stage");
  const [selS, setSelS] = useState<SoundId>(SOUND_LIBRARY[0].id);
  const [side, setSide] = useState(false);

  useEffect(() => {
    takeDesk();
    return () => releaseDesk();
  }, []);
  // a level or a loop changed: the take playing follows at once
  const edits = JSON.stringify(d.edits);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by the edits
  useEffect(() => deskRefresh(), [edits]);

  const usedTrack = useCallback(
    (id: TrackId) =>
      GAME_KEYS.flatMap((g) =>
        MOMENTS.filter(
          (m) => m in MOMENT_TRACKS[g] && d.value(`moments.${g}.${m}`) === id,
        ).map((m) => ({ game: g, moment: m })),
      ),
    [d],
  );
  const usedSound = useCallback(
    (id: SoundId) =>
      (Object.keys(ROOM_SOUNDS) as (keyof typeof ROOM_SOUNDS)[]).filter(
        (k) => d.value(`roomSounds.${k}.sound`) === id,
      ),
    [d],
  );
  const needle = q.trim().toLowerCase();
  const tracks = TRACK_IDS.filter(
    (t) =>
      (!needle || `${t} ${TRACK_NOTES[t]}`.toLowerCase().includes(needle)) &&
      (filter === "all" ||
        (filter === "used" ? usedTrack(t).length : !usedTrack(t).length)),
  );
  const sounds = SOUND_LIBRARY.filter(
    (s) =>
      (!needle || `${s.name} ${s.what}`.toLowerCase().includes(needle)) &&
      (filter === "all" ||
        (filter === "used" ? usedSound(s.id).length : !usedSound(s.id).length)),
  );

  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Jogos · áudio</p>
          <h1>Mesa de som</h1>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn mx-side-btn"
            onClick={() => setSide(true)}
          >
            {tab === "music" ? (
              <Music className="i" />
            ) : (
              <AudioLines className="i" />
            )}
            {tab === "music" ? "Músicas" : "Sons"}
          </button>
        </div>
      </div>
      <div className="mxwrap">
        <div className="stack">
          {tab === "music" ? (
            <MusicDesk
              track={sel}
              used={usedTrack(sel)}
              games={games}
              onPick={setSel}
            />
          ) : (
            <SoundDesk sound={selS} used={usedSound(selS)} />
          )}
        </div>
        {side ? (
          <button
            type="button"
            className="scrim"
            aria-label="Fechar"
            onClick={() => setSide(false)}
          />
        ) : null}
        <aside className={side ? "mxside open" : "mxside"} aria-label="Áudios">
          <div className="seg mx-tabs">
            <button
              type="button"
              aria-pressed={tab === "music"}
              onClick={() => setTab("music")}
            >
              <Music className="i" />
              Músicas <span className="mono muted">{TRACK_IDS.length}</span>
            </button>
            <button
              type="button"
              aria-pressed={tab === "sfx"}
              onClick={() => setTab("sfx")}
            >
              <AudioLines className="i" />
              Sons <span className="mono muted">{SOUND_LIBRARY.length}</span>
            </button>
          </div>
          <header>
            <label className="field" style={{ flex: 1 }}>
              <Search className="i" />
              <input
                type="search"
                placeholder={tab === "music" ? "Buscar música" : "Buscar som"}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar"
              />
            </label>
          </header>
          <fieldset className="seg sm" aria-label="Filtro">
            {(
              [
                ["all", "Todas", null],
                ["used", "Em uso", Volume2],
                ["free", "Sem uso", VolumeX],
              ] as const
            ).map(([k, l, I]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
              >
                {I ? <I className="i" /> : null}
                {l}
              </button>
            ))}
          </fieldset>
          <div className="trk-list">
            {tab === "music"
              ? tracks.map((t) => {
                  const u = usedTrack(t).length;
                  const dirty = Object.keys(d.edits).some((k) =>
                    k.startsWith(`music.${t}.`),
                  );
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={sel === t}
                      className={dirty ? "trk dirty" : "trk"}
                      onClick={() => {
                        setSel(t);
                        setSide(false);
                        if (deskNow()) void deskSwitch(t);
                      }}
                    >
                      <UseIcon used={u > 0} />
                      <span style={{ minWidth: 0 }}>
                        <b>{name(t)}</b>
                        <small>
                          {u
                            ? `Em uso · ${u} ${u === 1 ? "lugar" : "lugares"}`
                            : "Sem uso"}{" "}
                          · {TRACK_NOTES[t]}
                        </small>
                      </span>
                    </button>
                  );
                })
              : sounds.map((s) => {
                  const u = usedSound(s.id).length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selS === s.id}
                      className="trk"
                      onClick={() => {
                        setSelS(s.id);
                        setSide(false);
                        void playSfx(s.id);
                      }}
                    >
                      <UseIcon used={u > 0} />
                      <span style={{ minWidth: 0 }}>
                        <b>{s.name}</b>
                        <small>
                          {u
                            ? `Em uso · ${u} ${u === 1 ? "lugar" : "lugares"}`
                            : "Sem uso"}{" "}
                          · {s.cat}
                        </small>
                      </span>
                    </button>
                  );
                })}
            {(tab === "music" ? tracks.length : sounds.length) === 0 ? (
              <div className="empty" style={{ padding: 16 }}>
                Nada encontrado.
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}

function UseIcon({ used }: { used: boolean }) {
  return used ? (
    <span className="st used" title="Em uso">
      <Volume2 className="i" />
    </span>
  ) : (
    <span className="st free" title="Sem uso">
      <VolumeX className="i" />
    </span>
  );
}

let sfxCtx: AudioContext | null = null;
const sfxBuffers = new Map<string, Promise<AudioBuffer | null>>();
function sfxBuffer(id: string) {
  let p = sfxBuffers.get(id);
  if (!p) {
    sfxCtx ??= new AudioContext();
    const c = sfxCtx;
    p = fetch(soundSrc(id))
      .then((r) => r.arrayBuffer())
      .then((b) => c.decodeAudioData(b))
      .catch(() => null);
    sfxBuffers.set(id, p);
  }
  return p;
}
async function playSfx(id: string, gain = 1) {
  const b = await sfxBuffer(id);
  if (!b || !sfxCtx) return;
  if (sfxCtx.state !== "running") await sfxCtx.resume().catch(() => {});
  const src = sfxCtx.createBufferSource();
  const g = sfxCtx.createGain();
  g.gain.value = gain;
  src.buffer = b;
  src.connect(g).connect(sfxCtx.destination);
  src.start();
}

/** The player, the take's level and loop, how a player hears it, and a log. */
function MusicDesk({
  track,
  used,
  games,
  onPick,
}: {
  track: TrackId;
  used: { game: GameKey; moment: keyof typeof MOMENT_PT }[];
  games: Record<GameKey, string>;
  onPick: (t: TrackId) => void;
}) {
  const href = useAdminHref();
  const d = useDraft();
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState<{
    track: TrackId;
    pos: number;
    wraps: number;
  } | null>(null);
  const [level, setLevel] = useState(Number.NEGATIVE_INFINITY);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const logId = useRef(0);
  const [muffled, setMuffled] = useState(false);
  const [hard, setHard] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [custom, setCustom] = useState(4);
  const [loud, setLoud] = useState<Partial<Record<TrackId, number>>>({});
  const [lengths, setLengths] = useState<Partial<Record<TrackId, number>>>({});
  const paused = useRef<number | null>(null);
  const wraps = useRef(0);
  const playingTrack = now?.track ?? track;
  // biome-ignore lint/correctness/useExhaustiveDependencies: redrawn when the loop changes
  const info = useMemo(
    () => trackInfo(playingTrack),
    [playingTrack, d.edits, d.saved],
  );

  const note = useCallback((line: string) => {
    const at = deskNow()?.pos ?? 0;
    logId.current += 1;
    const id = logId.current;
    setLog((l) => [{ id, text: `${fmtS(at)} · ${line}` }, ...l].slice(0, 40));
  }, []);

  useEffect(() => {
    deskVolume(volume);
  }, [volume]);
  useEffect(() => {
    deskMuffle(muffled);
  }, [muffled]);
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const n = deskNow();
      setNow(n);
      if (n) {
        if (n.wraps > wraps.current)
          note(`voltou ao começo do loop (volta ${n.wraps})`);
        wraps.current = n.wraps;
        setLevel(deskLevel());
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [note]);
  // the last whole bar the file holds: the loop can't end past it
  useEffect(() => {
    void trackBuffer(track).then((buf) => {
      if (!buf) return;
      const t = trackInfo(track);
      const n = Math.floor((buf.duration - t.intro + 0.09 - t.first) / t.bar);
      setLengths((l) => ({ ...l, [track]: n - 1 }));
    });
  }, [track]);
  const fileBars = lengths[track];
  // measure each take's loudness once, for the level suggestion
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per take and loop
  useEffect(() => {
    for (const t of new Set<TrackId>(["stage", track]))
      void trackLoudness(t).then((v) => {
        if (v !== null) setLoud((l) => ({ ...l, [t]: v }));
      });
  }, [track, d.edits]);

  const toggle = async () => {
    if (running) {
      paused.current = deskStop();
      setRunning(false);
      note("pausou");
      return;
    }
    await deskPlay(track, paused.current ?? Number.NEGATIVE_INFINITY);
    setRunning(true);
    note(`play em ${name(track)}`);
  };
  // the list picked another take: a crossfade (or a cut) at the same point
  // biome-ignore lint/correctness/useExhaustiveDependencies: on a pick only
  useEffect(() => {
    if (!running || !now || now.track === track) return;
    void deskSwitch(track, hard).then(() =>
      note(
        `${name(now.track)} → ${name(track)} ${hard ? "troca seca" : "crossfade 1,5 s"}`,
      ),
    );
  }, [track]);
  const seek = async (pos: number, why: string) => {
    paused.current = pos;
    if (running) await deskPlay(playingTrack, pos);
    else {
      await deskPlay(playingTrack, pos);
      setRunning(true);
    }
    note(why);
  };
  const seam = (v: "6" | "bars" | "custom" | "loop" | "top") => {
    const { loop, bar, intro } = info;
    const target =
      v === "6"
        ? loop.end - 6
        : v === "bars"
          ? loop.end - 2 * bar
          : v === "custom"
            ? loop.end - custom * bar
            : v === "loop"
              ? loop.start
              : -intro;
    void seek(
      target,
      {
        "6": "6 s antes da volta",
        bars: "2 compassos antes da volta",
        custom: `${custom} compassos antes da volta`,
        loop: "começo do loop",
        top: "do início",
      }[v],
    );
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,select,textarea,.trk-list"))
        return;
      if (e.key === " ") {
        e.preventDefault();
        void toggle();
      } else if (e.key === "l" || e.key === "L") seam("6");
      const k = Number(e.key);
      if (k >= 1 && k <= TRACK_IDS.length) onPick(TRACK_IDS[k - 1]);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });

  const s = now?.pos ?? paused.current ?? 0;
  // the scale holds the whole file, so moving the loop doesn't redraw it
  const fileEnd =
    lengths[playingTrack] !== undefined
      ? info.first + ((lengths[playingTrack] ?? 0) + 1) * info.bar
      : null;
  const xmax =
    Math.max(
      fileEnd ?? info.first + (info.loop.end / info.bar + 1) * info.bar,
      info.loop.end,
      1,
    ) + 0.5;
  const xs = (t: number) => ((t - MIN) / (xmax - MIN)) * 100;
  const b = (s - info.first) / info.beat;
  // bars count from the cut, 90 ms ahead of the downbeat, like the loop's ends
  const bar = Math.floor((s + 0.09 - info.first) / info.bar);
  const beat = ((Math.floor(b) % 4) + 4) % 4;
  const barsTotal = Math.round((info.loop.end + 0.09 - info.first) / info.bar);
  const ticks = Array.from({ length: barsTotal + 1 }, (_, n) => ({
    n,
    at: info.first + n * info.bar,
    phrase: n % 8 === 0,
  }));
  const startBar = Math.round((info.loop.start + 0.09 - info.first) / info.bar);
  const maxBar = fileBars ?? 63;
  const onTimeline = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = MIN + ((e.clientX - r.left) / r.width) * (xmax - MIN);
    const target =
      t < 0
        ? Math.max(-info.intro, t)
        : t < info.first
          ? 0
          : Math.min(
              info.loop.end - 0.05,
              info.first + Math.round((t - info.first) / info.bar) * info.bar,
            );
    void seek(
      target,
      t < 0
        ? `pulou para ${fmtS(target)}`
        : `pulou para o compasso ${Math.round((target - info.first) / info.bar)}`,
    );
  };
  const stageLoud = loud.stage;
  const thisLoud = loud[track];
  const gainKey = `music.${track}.gainDb`;
  const suggest =
    stageLoud !== undefined && thisLoud !== undefined && track !== "stage"
      ? Math.round((stageLoud - thisLoud) * 2) / 2
      : null;

  return (
    <>
      <div className="card mixer">
        <div className="mx-top">
          <button
            type="button"
            className="bigplay"
            onClick={toggle}
            aria-label={running ? "Pausar" : "Tocar"}
          >
            {running ? <Pause className="i" /> : <Play className="i" />}
          </button>
          <div className="readout">
            <div>
              <div className="k">Posição</div>
              <div className="v">{running ? fmtS(s) : "–"}</div>
            </div>
            <div>
              <div className="k">Compasso · tempo</div>
              <div className="v">
                {running && s >= info.first ? `${bar} · ${beat + 1}` : "–"}
              </div>
            </div>
            <div>
              <div className="k">Tempo</div>
              <div className="lamps">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`lamp${i === 0 ? " down" : ""}${running && s >= info.first && i === beat ? " on" : ""}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="k">Voltas do loop</div>
              <div className="v">{now?.wraps ?? 0}</div>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <div className="k">Onde está</div>
              <div style={{ fontSize: 14 }}>
                {!running
                  ? "Aperte play."
                  : s < 0
                    ? "Intro da faixa: toca só na primeira vez"
                    : s < info.loop.start
                      ? `Intro da música, compasso ${Math.max(0, bar)}: toca só na primeira vez`
                      : `Loop, compasso ${bar} de ${startBar}–${barsTotal - 1}${bar >= barsTotal - 2 ? ": a volta vem aí" : ""}`}
              </div>
            </div>
          </div>
          <div className="meter">
            <span
              className="k"
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: 10.5,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "var(--ink-muted)",
              }}
            >
              Nível na saída
            </span>
            <div className="m">
              <i
                style={{
                  width: `${running ? Math.max(0, (level + 48) / 48) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="mono" style={{ fontSize: 12 }}>
              {running && Number.isFinite(level)
                ? `${level.toFixed(1).replace(".", ",")} dB RMS`
                : "−∞ dB"}
            </span>
          </div>
        </div>
        <div>
          <div className="mtl" onPointerDown={onTimeline}>
            {info.intro ? (
              <div
                className="seg-i"
                style={{
                  left: `${xs(-info.intro)}%`,
                  width: `${xs(0) - xs(-info.intro)}%`,
                  background: "var(--apricot-soft)",
                }}
              />
            ) : null}
            {info.loop.start > 0.5 ? (
              <div
                className="seg-i"
                style={{
                  left: `${xs(0)}%`,
                  width: `${xs(info.loop.start) - xs(0)}%`,
                  background: "var(--grape-soft)",
                }}
              />
            ) : null}
            <div
              className="seg-i"
              style={{
                left: `${xs(info.loop.start)}%`,
                width: `${xs(info.loop.end) - xs(info.loop.start)}%`,
                background: "var(--yes-soft)",
              }}
            />
            {fileEnd !== null && fileEnd > info.loop.end + 0.1 ? (
              <div
                className="seg-i"
                style={{
                  left: `${xs(info.loop.end)}%`,
                  width: `${xs(fileEnd) - xs(info.loop.end)}%`,
                  background: "var(--sunken)",
                }}
                title="Resto do arquivo, fora do loop"
              />
            ) : null}
            {ticks.map((t) => (
              <div
                key={t.at}
                className={t.phrase ? "tk ph" : "tk"}
                style={{ left: `${xs(t.at)}%` }}
              />
            ))}
            <div className="mk" style={{ left: `${xs(info.loop.start)}%` }} />
            <div
              className="mk"
              style={{ left: `calc(${xs(info.loop.end)}% - 2px)` }}
            />
            {info.intro >= 5 ? (
              <span className="lb" style={{ left: `${xs(-info.intro)}%` }}>
                intro {name(playingTrack)}
              </span>
            ) : null}
            <span className="lb" style={{ left: `${xs(info.loop.start)}%` }}>
              loop
            </span>
            <div className="hd" style={{ left: `${xs(s)}%` }} />
          </div>
          <div className="scale">
            {ticks
              .filter((t) => t.phrase)
              .map((t) => (
                <span key={t.at} style={{ left: `${xs(t.at)}%` }}>
                  c.{t.n}
                </span>
              ))}
            <span style={{ left: `${xs(-20)}%` }}>−20 s</span>
          </div>
        </div>
      </div>

      <div className="card">
        <header>
          <UseIcon used={used.length > 0} />
          <h2 style={{ flex: 1, minWidth: 0 }}>{name(track)}</h2>
          <span className="note">{TRACK_NOTES[track]}</span>
        </header>
        <div
          className="slot"
          style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}
        >
          <span className="lbl">
            <b>Volume-base</b>
            <small>
              {thisLoud !== undefined
                ? `medido ${thisLoud.toFixed(1).replace(".", ",")} dB RMS no loop`
                : "medindo…"}
              {suggest !== null
                ? ` · para igualar à Stage: ${suggest > 0 ? "+" : ""}${suggest.toLocaleString("pt-BR")} dB`
                : ""}
            </small>
          </span>
          <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
            <TuneNumber k={gainKey} label="Volume-base" />
            {suggest !== null ? (
              <button
                type="button"
                className="btn sm"
                onClick={() => d.set(gainKey, suggest)}
              >
                <Wand2 className="i" />
                Igualar
              </button>
            ) : null}
          </span>
          <ResetEdits keys={[gainKey]} />
        </div>
        <h3 style={{ margin: "16px 0 8px" }}>Onde é usada</h3>
        {used.length ? (
          <div className="used">
            {used.map((u) => (
              <Link
                key={`${u.game}${u.moment}`}
                className="gchip"
                href={href(`/games/${u.game}?tab=music`)}
              >
                <GameThumb game={u.game} size="tiny" />
                {games[u.game]} · {MOMENT_PT[u.moment]}
              </Link>
            ))}
          </div>
        ) : (
          <p className="note">Em nenhum lugar.</p>
        )}
      </div>

      <PromptCard track={track} />

      <div className="grid g3">
        <div className="card">
          <header>
            <h2>Loop</h2>
            <ResetEdits keys={[`music.${track}.start`, `music.${track}.end`]} />
          </header>
          <BarStepper
            k={`music.${track}.start`}
            label="Começa no compasso"
            hint={startBar === 0 ? "junto com a intro da música" : undefined}
            min={0}
            max={barsTotal - 1}
          />
          <BarStepper
            k={`music.${track}.end`}
            label="Último compasso"
            hint={`depois dele, volta ao ${startBar}`}
            shift={1}
            min={startBar}
            max={maxBar}
          />
          <h3 style={{ margin: "12px 0 6px" }}>Testar a volta</h3>
          <div className="row" style={{ gap: 6 }}>
            <button
              type="button"
              className="btn sm primary"
              onClick={() => seam("6")}
            >
              6 s antes
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => seam("bars")}
            >
              2 compassos antes
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => seam("loop")}
            >
              Começo do loop
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => seam("top")}
            >
              Do início
            </button>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <span className="step">
              <button
                type="button"
                onClick={() => setCustom((c) => Math.max(1, c - 1))}
              >
                −
              </button>
              <output>{custom}</output>
              <button
                type="button"
                onClick={() => setCustom((c) => Math.min(32, c + 1))}
              >
                +
              </button>
            </span>
            <span className="note">compassos antes</span>
            <button
              type="button"
              className="btn sm"
              onClick={() => seam("custom")}
            >
              Ir
            </button>
          </div>
        </div>
        <div className="card">
          <header>
            <h2>Como o jogador ouve</h2>
          </header>
          <div
            className="row"
            style={{ gap: 8, fontSize: 13.5, fontWeight: 600 }}
          >
            <Switch
              checked={muffled}
              onCheckedChange={setMuffled}
              aria-label="Versão de lobby"
            />
            Versão de lobby (abafada)
          </div>
          <p className="note" style={{ margin: "4px 0 12px" }}>
            Passa-alta 160 Hz · passa-baixa 350 Hz · ×0,84
          </p>
          <label
            style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600 }}
          >
            Volume do jogador
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
            <span className="note">Padrão 0,25</span>
          </label>
          <div
            className="row"
            style={{ gap: 8, fontSize: 13.5, fontWeight: 600, marginTop: 12 }}
          >
            <Switch
              checked={hard}
              onCheckedChange={setHard}
              aria-label="Troca seca"
            />
            Troca seca (A/B sem crossfade)
          </div>
        </div>
        <div className="card">
          <header>
            <h2>Registro</h2>
            <span className="spacer" />
            <span className="note">
              <span className="kbd">espaço</span> toca ·{" "}
              <span className="kbd">L</span> volta
            </span>
          </header>
          <ul className="log">
            {log.length ? (
              log.map((l) => <li key={l.id}>{l.text}</li>)
            ) : (
              <li>Nada tocou ainda.</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}

/**
 * A loop end in bars, changed at once (no save, no leaving the field): the
 * take playing follows. `shift` shows the stored value minus it: the panel
 * keeps the bar the loop goes back before, the desk shows the last one heard.
 */
function BarStepper({
  k,
  label,
  hint,
  shift = 0,
  min,
  max,
}: {
  k: string;
  label: string;
  hint?: string;
  shift?: number;
  min: number;
  max: number;
}) {
  const d = useDraft();
  const v = d.value(k);
  const shown = typeof v === "number" ? v - shift : 0;
  const [text, setText] = useState(String(shown));
  useEffect(() => setText(String(shown)), [shown]);
  const put = (n: number) => {
    const c = Math.min(max, Math.max(min, Math.round(n)));
    d.set(k, c + shift);
    setText(String(c));
  };
  return (
    <div
      className={k in d.edits ? "slot dirty" : "slot"}
      style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
    >
      <span className="lbl">
        <b>{label}</b>
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className="step">
        <button
          type="button"
          aria-label={`${label}: menos um`}
          disabled={shown <= min}
          onClick={() => put(shown - 1)}
        >
          −
        </button>
        <input
          className="num"
          inputMode="numeric"
          value={text}
          aria-label={label}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (
              e.target.value !== "" &&
              Number.isInteger(n) &&
              n >= min &&
              n <= max
            )
              d.set(k, n + shift);
          }}
          onBlur={() => setText(String(shown))}
        />
        <button
          type="button"
          aria-label={`${label}: mais um`}
          disabled={shown >= max}
          onClick={() => put(shown + 1)}
        >
          +
        </button>
      </span>
    </div>
  );
}

/** The Suno prompt the take came from: its style and exclude list, to copy. */
function PromptCard({ track }: { track: TrackId }) {
  const p = SUNO_PROMPTS[track];
  return (
    <div className="card">
      <header>
        <h2 style={{ flex: 1 }}>Prompt do Suno</h2>
        {p?.title ? <span className="chip">“{p.title}”</span> : null}
        {p && !p.sure ? (
          <span className="chip warn">refeito da conversa, confira</span>
        ) : null}
      </header>
      {p ? (
        <div className="suno">
          <PromptPart label="Style" text={p.style} />
          <PromptPart label="Exclude styles" text={p.exclude} />
          {p.lyrics ? (
            <PromptPart label="Letra (tags)" text={p.lyrics} />
          ) : null}
          {p.note ? <p className="note">{p.note}</p> : null}
        </div>
      ) : (
        <p className="note">
          O prompt desta faixa não ficou salvo no código. Mande o Style e o
          Exclude que estão no Suno para guardar aqui.
        </p>
      )}
    </div>
  );
}

function PromptPart({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="suno-part">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{label}</h3>
        <button
          type="button"
          className="btn sm ghost"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? <Check className="i" /> : <Copy className="i" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

/** A sound: its waveform, where it plays, and the room's sounds with their levels. */
function SoundDesk({ sound, used }: { sound: SoundId; used: string[] }) {
  const s = SOUND_LIBRARY.find((x) => x.id === sound) ?? SOUND_LIBRARY[0];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [dur, setDur] = useState<number | null>(null);
  useEffect(() => {
    let off = false;
    void sfxBuffer(s.id).then((b) => {
      const c = canvas.current;
      if (!b || !c || off) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth * dpr;
      const h = 96 * dpr;
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      if (!x) return;
      const data = b.getChannelData(0);
      const step = Math.max(1, Math.floor(data.length / w));
      x.clearRect(0, 0, w, h);
      x.fillStyle =
        getComputedStyle(c).getPropertyValue("--sky").trim() || "#2b69c8";
      for (let i = 0; i < w; i++) {
        let m = 0;
        for (let j = 0; j < step; j += 4)
          m = Math.max(m, Math.abs(data[i * step + j] || 0));
        const bh = Math.max(1, m * h * 0.95);
        x.fillRect(i, (h - bh) / 2, 1, bh);
      }
      setDur(b.duration);
    });
    return () => {
      off = true;
    };
  }, [s.id]);
  const SLOT_PT: Record<string, string> = {
    join: "Alguém entra na sala",
    leave: "Alguém sai da sala",
    chat: "Mensagem no chat fechado",
    step: "Passo que espera você",
    tick: "Relógio acabando",
    complete: "Pódio",
  };
  return (
    <>
      <div className="card">
        <header>
          <UseIcon used={used.length > 0} />
          <h2 style={{ flex: 1, minWidth: 0 }}>{s.name}</h2>
          <button
            type="button"
            className="btn sm sky"
            onClick={() => playSfx(s.id)}
          >
            <Play className="i" />
            Ouvir
          </button>
        </header>
        <div className="wave">
          <canvas ref={canvas} height={96} aria-label="Forma de onda" />
          <span className="mono muted">
            {dur !== null ? `${dur.toFixed(2).replace(".", ",")} s` : ""}
          </span>
        </div>
        <p className="note" style={{ marginTop: 8 }}>
          {s.what} · {s.cat} · <span className="mono">{soundSrc(s.id)}</span>
        </p>
        <h3 style={{ margin: "16px 0 8px" }}>Onde é usado</h3>
        {used.length ? (
          <div className="used">
            {used.map((k) => (
              <span key={k} className="gchip">
                <LayoutGrid className="i" />
                {SLOT_PT[k]}
              </span>
            ))}
          </div>
        ) : (
          <p className="note">Em nenhum lugar da sala.</p>
        )}
      </div>
      <div className="card">
        <header>
          <h2>Sons da sala e da partida</h2>
          <span className="chip">todos os jogos</span>
        </header>
        {(Object.keys(SLOT_PT) as (keyof typeof ROOM_SOUNDS)[]).map((k) => (
          <RoomSoundRow key={k} slot={k} label={SLOT_PT[k]} />
        ))}
      </div>
    </>
  );
}

function RoomSoundRow({
  slot,
  label,
}: {
  slot: keyof typeof ROOM_SOUNDS;
  label: string;
}) {
  const d = useDraft();
  const sk = `roomSounds.${slot}.sound`;
  const vk = `roomSounds.${slot}.volume`;
  const dirty = sk in d.edits || vk in d.edits;
  return (
    <div className={dirty ? "slot aslot dirty" : "slot aslot"}>
      <span className="lbl">
        <b>{label}</b>
      </span>
      <span
        className="row"
        style={{ gap: 10, flexWrap: "nowrap", minWidth: 0 }}
      >
        <TuneChoice
          k={sk}
          label={label}
          size="sm"
          icons={Object.fromEntries(
            SOUND_LIBRARY.map((x) => [
              x.id,
              <AudioLines key={x.id} className="size-4" />,
            ]),
          )}
        />
        <TuneNumber k={vk} label={`${label}: volume`} />
      </span>
      <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
        <button
          type="button"
          className="btn sm icon"
          aria-label="Ouvir"
          onClick={() => {
            const id = d.value(sk);
            const v = d.value(vk);
            if (typeof id === "string")
              void playSfx(id, typeof v === "number" ? v : 1);
          }}
        >
          <Play className="i" />
        </button>
        <ResetEdits keys={[sk, vk]} />
      </span>
    </div>
  );
}
