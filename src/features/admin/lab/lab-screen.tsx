"use client";

import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Dices,
  Hand,
  Link2,
  Monitor,
  Moon,
  Pause,
  Play,
  Smartphone,
  Sun,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { GameThumb } from "@/features/create/game-info";
import type { FrameMessage, FrameReply } from "@/features/lab/lab-frame";
import { DEVICES, LAB_SPEEDS, type LabScene } from "@/features/lab/scene";
import {
  type BotMode,
  type LabInput,
  type LabKit,
  type LabSettings,
  phaseLabel,
  seatStatus,
  seatsOf,
  simulate,
} from "@/features/lab/sim";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { guestName } from "@/game/guest-names";
import type { GameEvent, RoomState } from "@/game/types";
import {
  deleteLabSceneAction,
  labKitAction,
  labRoomAction,
  saveLabSceneAction,
} from "@/server/admin/actions";
import type { StoredLabScene } from "@/server/backend/admin-types";
import { useAdminBase } from "../shell/base";
import { AdminSelect } from "../ui/select";

interface Clock {
  origin: number;
  wall: number;
  playing: boolean;
  speed: number;
}

const fmt = (ms: number) => {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(1).padStart(4, "0").replace(".", ",")}`;
};

/**
 * The lab: a whole match with bots, on the real engine and a clock you run.
 * One seat's screen at a time, at a phone's or a computer's size; switch
 * seats at once (every seat's frame keeps up in the background), go back to
 * any step, play your seat by hand, save the moment as a link.
 */
export function LabScreen({
  names,
  rooms,
  scenes,
  initial,
  room,
}: {
  names: Record<GameKey, string>;
  rooms: { code: string; game: GameKey; phase: string; players: number }[];
  scenes: StoredLabScene[];
  initial: (LabScene & { id?: string }) | null;
  /** A room to start from (the Rooms page's link). */
  room?: string | null;
}) {
  const router = useRouter();
  const { base } = useAdminBase();
  const [settings, setSettings] = useState<LabSettings>(
    initial?.settings ?? {
      game: "who-am-i",
      players: 4,
      seed: 4821,
      match: "first",
      bots: "fast",
      lang: "pt",
    },
  );
  const [kit, setKit] = useState<LabKit | null>(initial?.kit ?? null);
  const [kitFor, setKitFor] = useState<string | null>(
    initial ? JSON.stringify(initial.settings) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [inputs, setInputs] = useState<LabInput[]>(initial?.inputs ?? []);
  const [from, setFrom] = useState<RoomState | undefined>(initial?.from);
  const [seat, setSeat] = useState(initial?.seat ?? 0);
  const [hand, setHand] = useState(initial?.hand ?? false);
  const [device, setDevice] = useState(initial?.device ?? "phone");
  const [theme, setTheme] = useState<"light" | "dark">(
    initial?.theme ?? "light",
  );
  const [clock, setClock] = useState<Clock>({
    origin: 0,
    wall: 0,
    playing: false,
    speed: initial?.speed ?? 1,
  });
  const [saving, setSaving] = useState<null | "form" | "busy">(null);
  const [sceneName, setSceneName] = useState("");
  const [sceneNote, setSceneNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // the server deals for these settings, once: the same settings come back
  // to the same deal (the library's draws aren't seeded, the page keeps them)
  const want = JSON.stringify(settings);
  const dealt = useRef(
    new Map<string, LabKit>(initial?.kit ? [[want, initial.kit]] : []),
  );
  useEffect(() => {
    if (want === kitFor) return;
    const kept = dealt.current.get(want);
    if (kept) {
      setKit(kept);
      setKitFor(want);
      return;
    }
    let off = false;
    setError(null);
    void labKitAction(settings).then((r) => {
      if (off) return;
      if (!r.ok) return setError("Não deu para preparar a partida.");
      dealt.current.set(want, r.data);
      setKit(r.data);
      setKitFor(want);
    });
    return () => {
      off = true;
    };
  }, [want, kitFor, settings]);

  const ready = kit && kitFor === want;
  const run = useMemo(
    () =>
      ready && kit
        ? simulate(kit, settings, inputs, { hand: hand ? seat : null, from })
        : null,
    [ready, kit, settings, inputs, hand, seat, from],
  );

  // a new match starts at its first step's beginning
  const runKey = run ? `${run.start}|${want}|${from?.code ?? ""}` : "";
  const placed = useRef<string | null>(null);
  useEffect(() => {
    if (!run || placed.current === runKey) return;
    const at =
      placed.current === null && initial
        ? run.start + initial.at
        : (run.marks.find((m) => m.phase !== "lobby")?.at ?? run.start);
    placed.current = runKey;
    setClock((c) => ({ ...c, origin: at, wall: Date.now(), playing: false }));
  }, [run, runKey, initial]);

  const now = useNow(clock);
  const t = run ? Math.min(run.end, Math.max(run.start, now)) : 0;
  const state = run?.stateAt(t);
  const seats = run?.players.length ?? settings.players;

  // the running clock stops at the end
  useEffect(() => {
    if (run && clock.playing && now >= run.end)
      setClock((c) => ({
        ...c,
        origin: run.end,
        wall: Date.now(),
        playing: false,
      }));
  }, [run, clock.playing, now]);

  const seek = useCallback(
    (at: number, keepPlaying = false) =>
      setClock((c) => ({
        ...c,
        origin: at,
        wall: Date.now(),
        playing: keepPlaying && c.playing,
      })),
    [],
  );
  const toggle = () =>
    setClock((c) => ({
      ...c,
      origin: run && t >= run.end ? (run.marks[1]?.at ?? run.start) : t,
      wall: Date.now(),
      playing: !c.playing,
    }));
  const setSpeed = (speed: number) =>
    setClock((c) => ({ ...c, origin: t, wall: Date.now(), speed }));

  const marks = run?.marks ?? [];
  const strip = useRef<HTMLDivElement>(null);
  const stepIndex = Math.max(
    0,
    marks.findLastIndex((m) => m.at <= t),
  );
  useEffect(() => {
    const el = strip.current?.children[stepIndex] as HTMLElement | undefined;
    el?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [stepIndex]);
  const step = (d: number) => {
    const m = marks[Math.max(0, Math.min(marks.length - 1, stepIndex + d))];
    if (m) seek(m.at);
  };

  // frames: one per seat; the page tells each the match, the clock and if it's on screen
  const frames = useRef<(HTMLIFrameElement | null)[]>([]);
  const scene: LabScene | null = kit
    ? {
        settings,
        kit,
        inputs,
        at: run ? t - run.start : 0,
        seat,
        hand,
        device,
        theme,
        speed: clock.speed,
        ...(from ? { from } : {}),
      }
    : null;
  const post = useCallback((i: number, m: FrameMessage) => {
    frames.current[i]?.contentWindow?.postMessage(m, window.location.origin);
  }, []);
  const sceneKey = scene
    ? JSON.stringify([settings, inputs, hand, seat, theme, from?.code, kitFor])
    : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by the scene's content
  useEffect(() => {
    if (!scene) return;
    for (let i = 0; i < seats; i++) post(i, { kind: "scene", scene });
  }, [sceneKey, seats, post]);
  useEffect(() => {
    for (let i = 0; i < seats; i++) post(i, { kind: "clock", ...clock });
  }, [clock, seats, post]);
  useEffect(() => {
    for (let i = 0; i < seats; i++)
      post(i, { kind: "seat", seat: i, active: i === seat });
  }, [seat, seats, post]);
  const latest = useRef({ scene, clock, seat });
  latest.current = { scene, clock, seat };
  useEffect(() => {
    const on = (e: MessageEvent<FrameReply>) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data;
      if (m?.kind === "ready") {
        const { scene: sc, clock: c, seat: s } = latest.current;
        if (sc) post(m.seat, { kind: "scene", scene: sc });
        post(m.seat, { kind: "clock", ...c });
        post(m.seat, { kind: "seat", seat: m.seat, active: m.seat === s });
      }
      if (m?.kind === "input")
        setInputs((list) => [
          ...list,
          { at: m.at, seat: m.seat, event: m.event as GameEvent },
        ]);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [post]);

  // keys: 1–n seat, ← → step, + − speed, space play
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest("input,select,textarea") ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      const k = Number(e.key);
      if (k >= 1 && k <= seats) {
        e.preventDefault();
        setSeat(k - 1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        step(e.key === "ArrowRight" ? 1 : -1);
      } else if (["+", "=", "-", "_"].includes(e.key)) {
        e.preventDefault();
        const i = LAB_SPEEDS.indexOf(
          clock.speed as (typeof LAB_SPEEDS)[number],
        );
        const j = Math.max(
          0,
          Math.min(
            LAB_SPEEDS.length - 1,
            (i < 0 ? 2 : i) + (e.key === "-" || e.key === "_" ? -1 : 1),
          ),
        );
        setSpeed(LAB_SPEEDS[j]);
      } else if (e.key === " ") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });

  const change = (patch: Partial<LabSettings>) => {
    setInputs([]);
    setFrom(undefined);
    setSettings((s) => {
      const next = { ...s, ...patch };
      const r = seatsOf(next.game);
      next.players = Math.max(r.min, Math.min(r.max, next.players));
      return next;
    });
    setSeat((v) => Math.min(v, (patch.players ?? settings.players) - 1));
  };
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };
  const loadRoom = async (code: string) => {
    const r = await labRoomAction(code);
    if (!r.ok) return flash("A sala não abriu.");
    setInputs([]);
    setFrom(r.data);
    setSettings((s) => ({
      ...s,
      game: r.data.settings.game,
      players: r.data.players.length,
    }));
    setSeat(0);
    flash(`Sala ${code} carregada`);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, for the link's room
  useEffect(() => {
    if (room) void loadRoom(room);
  }, []);
  const save = async (copy: boolean) => {
    if (!scene) return;
    setSaving("busy");
    const name =
      sceneName.trim() ||
      `${names[settings.game]} · ${state ? phaseLabel(state.phase) : ""} · ${fmt(t - (run?.start ?? 0))}`;
    const r = await saveLabSceneAction(scene, name, sceneNote);
    setSaving(null);
    if (!r.ok) return flash("Não deu para salvar.");
    setSceneName("");
    setSceneNote("");
    const url = `${window.location.origin}${base}/lab?scene=${r.data}`;
    window.history.replaceState(null, "", url);
    if (copy) {
      await navigator.clipboard?.writeText(url).catch(() => {});
      flash("Link copiado");
    } else flash("Cena salva");
    router.refresh();
  };

  const r = DEVICES[device];
  const [box, setBox] = useState(460);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, box / r.w, device === "phone" ? 0.78 : 1);
  const onScrub = (e: PointerEvent<HTMLDivElement>) => {
    if (!run) return;
    const el = e.currentTarget;
    const at = (x: number) => {
      const b = el.getBoundingClientRect();
      return run.start + ((x - b.left) / b.width) * (run.end - run.start);
    };
    el.setPointerCapture(e.pointerId);
    seek(at(e.clientX));
    const move = (ev: globalThis.PointerEvent) => seek(at(ev.clientX));
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };
  const pct = (x: number) =>
    run ? ((x - run.start) / (run.end - run.start)) * 100 : 0;

  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Jogos · testes</p>
          <h1>Laboratório</h1>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            onClick={() => setSaving("form")}
            disabled={!scene}
          >
            <Bookmark className="i" />
            Salvar cena
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => save(true)}
            disabled={!scene || saving === "busy"}
          >
            <Link2 className="i" />
            Copiar link
          </button>
        </div>
      </div>
      {saving === "form" ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="form-grid">
            <label className="fld">
              Nome
              <input
                type="text"
                value={sceneName}
                maxLength={80}
                placeholder="O que esta cena mostra"
                onChange={(e) => setSceneName(e.target.value)}
              />
            </label>
            <label className="fld">
              Nota
              <input
                type="text"
                value={sceneNote}
                maxLength={500}
                placeholder="O que você viu (opcional)"
                onChange={(e) => setSceneNote(e.target.value)}
              />
            </label>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => save(false)}
            >
              Salvar
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setSaving(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      <div className="lab">
        <div className="card ctl">
          <div className="f">
            <span className="flbl">Jogo</span>
            <AdminSelect
              label="Jogo"
              value={settings.game}
              onChange={(v) => change({ game: v as GameKey })}
              options={GAME_KEYS.map((g) => ({
                value: g,
                label: names[g],
                icon: <GameThumb game={g} size="tiny" />,
              }))}
            />
          </div>
          <div className="f">
            <span className="flbl">Jogadores</span>
            <span className="step">
              <button
                type="button"
                onClick={() => change({ players: settings.players - 1 })}
              >
                −
              </button>
              <output>{settings.players}</output>
              <button
                type="button"
                onClick={() => change({ players: settings.players + 1 })}
              >
                +
              </button>
            </span>
          </div>
          <div className="f">
            <span className="flbl">Partida</span>
            <fieldset className="seg sm">
              {(
                [
                  ["first", "Primeira"],
                  ["later", "Revanche"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={settings.match === k}
                  onClick={() => change({ match: k })}
                >
                  {l}
                </button>
              ))}
            </fieldset>
          </div>
          <div className="f">
            <span className="flbl">Semente</span>
            <span className="row" style={{ gap: 6 }}>
              <input
                className="num"
                style={{ width: 96, textAlign: "left" }}
                inputMode="numeric"
                value={settings.seed}
                aria-label="Semente"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isInteger(n) && n >= 0) change({ seed: n });
                }}
              />
              <button
                type="button"
                className="btn sm icon"
                aria-label="Sortear"
                onClick={() =>
                  change({ seed: Math.floor(Math.random() * 99999) })
                }
              >
                <Dices className="i" />
              </button>
            </span>
          </div>
          <div className="f">
            <span className="flbl">Bots</span>
            <AdminSelect
              label="Bots"
              size="sm"
              value={settings.bots}
              onChange={(v) => change({ bots: v as BotMode })}
              options={[
                { value: "fast", label: "Respondem na hora" },
                { value: "clock", label: "Deixam o relógio acabar" },
                { value: "mix", label: "Misturado (semente)" },
              ]}
            />
          </div>
          <div className="f">
            <span className="flbl">Aparelho</span>
            <fieldset className="seg sm">
              <button
                type="button"
                aria-pressed={device === "phone"}
                onClick={() => setDevice("phone")}
              >
                <Smartphone className="i" />
                Celular
              </button>
              <button
                type="button"
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="i" />
                Computador
              </button>
            </fieldset>
          </div>
          <div className="f">
            <span className="flbl">Tema</span>
            <fieldset className="seg sm">
              <button
                type="button"
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
              >
                <Sun className="i" />
                Claro
              </button>
              <button
                type="button"
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
              >
                <Moon className="i" />
                Escuro
              </button>
            </fieldset>
          </div>
          <div
            className="row"
            style={{ gap: 8, fontSize: 13.5, fontWeight: 600 }}
          >
            <Switch
              checked={hand}
              onCheckedChange={setHand}
              aria-label="Jogar à mão"
            />
            <Hand className="i" />
            Jogar o assento da tela à mão
          </div>
          {rooms.length ? (
            <div className="f">
              <span className="flbl">Carregar sala</span>
              <AdminSelect
                label="Carregar sala"
                size="sm"
                value=""
                onChange={(v) => v && void loadRoom(v)}
                options={[
                  { value: "", label: "Uma sala aberta…" },
                  ...rooms.map((x) => ({
                    value: x.code,
                    label: `${x.code} · ${names[x.game]} · ${x.players} · ${phaseLabel(x.phase as RoomState["phase"])}`,
                    icon: <GameThumb game={x.game} size="tiny" />,
                  })),
                ]}
              />
            </div>
          ) : null}
          <div>
            <h3 style={{ margin: "6px 0 8px" }}>Cenas salvas</h3>
            <div className="marks">
              {scenes.length ? (
                scenes.map((s) => (
                  <div
                    key={s.id}
                    className="row"
                    style={{ gap: 4, flexWrap: "nowrap" }}
                  >
                    <a
                      className="markrow"
                      style={{ flex: 1, minWidth: 0 }}
                      href={`${base}/lab?scene=${s.id}`}
                    >
                      <span>
                        {s.name}
                        <small>
                          {s.note ?? names[s.game as GameKey] ?? s.game}
                        </small>
                      </span>
                      <ChevronRight className="i" />
                    </a>
                    <button
                      type="button"
                      className="btn sm ghost icon"
                      aria-label={`Apagar ${s.name}`}
                      onClick={async () => {
                        await deleteLabSceneAction(s.id);
                        router.refresh();
                      }}
                    >
                      <Trash2 className="i" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="note">Nenhuma ainda.</p>
              )}
            </div>
          </div>
        </div>
        <div className="stack">
          <div className="card" style={{ padding: 14 }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <b style={{ fontFamily: "var(--f-display)", fontSize: 17 }}>
                {state ? phaseLabel(state.phase) : "Preparando a partida…"}
              </b>
              <span className="gchip">
                <GameThumb game={settings.game} size="tiny" />
                {names[settings.game]}
              </span>
              <span className="chip">{seats} jogadores</span>
              <span
                className={settings.match === "first" ? "chip sky" : "chip"}
              >
                {settings.match === "first" ? "primeira partida" : "revanche"}
              </span>
              {from ? (
                <span className="chip butter">sala {from.code}</span>
              ) : null}
              {inputs.length ? (
                <button
                  type="button"
                  className="chip"
                  onClick={() => setInputs([])}
                  title="Desfazer as jogadas à mão"
                >
                  {inputs.length} {inputs.length === 1 ? "jogada" : "jogadas"} à
                  mão ×
                </button>
              ) : null}
            </div>
            {error ? <div className="empty">{error}</div> : null}
            <div className="seatbar" role="tablist" aria-label="Ver a tela de">
              {run?.players.map((p, i) => {
                const slot =
                  state?.players.find((x) => x.id === p.id)?.colorSlot ?? i;
                const status = state ? seatStatus(state, p.id) : "";
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    className="seat-tab"
                    aria-selected={i === seat}
                    style={
                      {
                        "--seat": `var(--seat-${(slot % 10) + 1})`,
                      } as CSSProperties
                    }
                    onClick={() => setSeat(i)}
                  >
                    <Avatar avatar={p.avatar} size={26} />
                    <span className="sn">
                      <b>{p.name ?? guestName(p.guestNumber, "pt")}</b>
                      <small
                        className={
                          /agora|ando$|indo$/.test(status) ? "hot" : undefined
                        }
                      >
                        {status}
                      </small>
                    </span>
                    <span className="kbd">{i + 1}</span>
                  </button>
                );
              })}
            </div>
            <div
              ref={stage}
              className="lab-stage"
              style={{ height: r.h * scale }}
            >
              {Array.from({ length: seats }, (_, i) => (
                <iframe
                  // biome-ignore lint/suspicious/noArrayIndexKey: one frame per seat, by its number
                  key={`${i}-${settings.game}-${from?.code ?? ""}`}
                  ref={(el) => {
                    frames.current[i] = el;
                  }}
                  title={`Tela do jogador ${i + 1}`}
                  src={`${base}/frame/lab?seat=${i}`}
                  className="lab-frame"
                  style={{
                    width: r.w,
                    height: r.h,
                    transform: `translateX(-50%) scale(${scale})`,
                    visibility: i === seat ? "visible" : "hidden",
                    zIndex: i === seat ? 1 : 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="tl lab-steps" ref={strip}>
              {marks.map((m, i) => (
                <button
                  key={`${m.at}-${m.label}-${i.toString()}`}
                  type="button"
                  aria-current={i === stepIndex ? "step" : undefined}
                  className={i < stepIndex ? "past" : undefined}
                  onClick={() => seek(m.at)}
                  title={`${m.label} · ${fmt(m.at - (run?.start ?? 0))}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="scrub" onPointerDown={onScrub}>
              <div className="track" />
              <div className="fill" style={{ width: `${pct(t)}%` }} />
              {inputs.map((x) => (
                <div
                  key={`${x.at}-${x.seat}`}
                  className="mk music"
                  style={{ left: `${pct(x.at)}%` }}
                />
              ))}
              <span className="head" style={{ left: `${pct(t)}%` }} />
            </div>
            <div className="transport">
              <button
                type="button"
                className="btn icon"
                onClick={() => step(-1)}
                aria-label="Passo anterior"
              >
                <ChevronLeft className="i" />
              </button>
              <button
                type="button"
                className="btn sky"
                onClick={toggle}
                disabled={!run}
              >
                {clock.playing ? (
                  <Pause className="i" />
                ) : (
                  <Play className="i" />
                )}
                {clock.playing ? "Pausar" : "Rodar"}
              </button>
              <button
                type="button"
                className="btn icon"
                onClick={() => step(1)}
                aria-label="Próximo passo"
              >
                <ChevronRight className="i" />
              </button>
              <span className="tc">
                {run
                  ? `${fmt(t - run.start)} / ${fmt(run.end - run.start)}`
                  : "—"}
              </span>
              <span className="spacer" />
              <span className="keys">
                <span className="kbd">1</span>–
                <span className="kbd">{seats}</span> jogador{" "}
                <span className="kbd">←</span>
                <span className="kbd">→</span> etapa{" "}
                <span className="kbd">−</span>
                <span className="kbd">+</span> velocidade
              </span>
              <fieldset className="seg sm" aria-label="Velocidade">
                {LAB_SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={clock.speed === s}
                    onClick={() => setSpeed(s)}
                  >
                    {String(s).replace(".", ",")}×
                  </button>
                ))}
              </fieldset>
            </div>
          </div>
        </div>
      </div>
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}

/** The lab's clock, read a few times a second while it runs. */
function useNow(clock: Clock) {
  const [now, setNow] = useState(clock.origin);
  useEffect(() => {
    const read = () =>
      setNow(
        clock.playing
          ? clock.origin + (Date.now() - clock.wall) * clock.speed
          : clock.origin,
      );
    read();
    if (!clock.playing) return;
    const id = window.setInterval(read, 100);
    return () => window.clearInterval(id);
  }, [clock]);
  return now;
}
