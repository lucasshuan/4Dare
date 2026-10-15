"use client";

// One seat's screen of the lab's match, inside an iframe of the lab's page at
// the device's size, so the room's media queries hold. The page sends the
// scene (settings, kit, moves) and the clock; every frame plays the same match
// itself (the simulation is deterministic), so all seats stay on the same
// moment. A move made on this screen goes back to the page as an input.
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { setLabActions } from "@/features/data/room-actions";
import { RoomProvider } from "@/features/data/room-context";
import { RoomStage } from "@/features/room/room-stage";
import { StageProvider } from "@/features/stage/stage-context";
import type { RoomView } from "@/game/types";
import type { ServerClock } from "@/lib/hooks/use-server-clock";
import { labEvent } from "./actions";
import type { LabScene } from "./scene";
import { simulate } from "./sim";

/** What the lab's page sends its frames. */
export type FrameMessage =
  | { kind: "scene"; scene: LabScene }
  | {
      kind: "clock";
      origin: number;
      wall: number;
      playing: boolean;
      speed: number;
    }
  | { kind: "seat"; seat: number; active: boolean };

/** What a frame sends back. */
export type FrameReply =
  | { kind: "ready"; seat: number }
  | { kind: "input"; seat: number; at: number; event: unknown };

const noop = async () => {};

/**
 * The lab's room isn't on the server: its chat and other room calls get an
 * empty answer here instead of a 404 (a line typed in the chat isn't sent).
 */
function quietRoomCalls() {
  const w = window as Window & { labQuiet?: boolean };
  if (w.labQuiet) return;
  w.labQuiet = true;
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!new URL(url, window.location.href).pathname.startsWith("/api/rooms/"))
      return real(input, init);
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      });
    if (init?.method === "POST") return new Response(null, { status: 503 });
    return json(url.includes("/messages") ? { messages: [] } : {});
  };
}

export function LabFrame({ seat }: { seat: number }) {
  const [scene, setScene] = useState<LabScene | null>(null);
  const [clock, setClock] = useState({
    origin: 0,
    wall: 0,
    playing: false,
    speed: 1,
  });
  const [active, setActive] = useState(true);
  useEffect(() => {
    quietRoomCalls();
    const on = (e: MessageEvent<FrameMessage>) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data;
      if (m?.kind === "scene") setScene(m.scene);
      if (m?.kind === "clock")
        setClock({
          origin: m.origin,
          wall: m.wall,
          playing: m.playing,
          speed: m.speed,
        });
      if (m?.kind === "seat" && m.seat === seat) setActive(m.active);
    };
    window.addEventListener("message", on);
    window.parent.postMessage(
      { kind: "ready", seat } satisfies FrameReply,
      window.location.origin,
    );
    return () => window.removeEventListener("message", on);
  }, [seat]);
  useLabTheme(scene?.theme ?? "light");
  if (!scene) return null;
  return <Seat scene={scene} seat={seat} clock={clock} active={active} />;
}

function Seat({
  scene,
  seat,
  clock,
  active,
}: {
  scene: LabScene;
  seat: number;
  clock: { origin: number; wall: number; playing: boolean; speed: number };
  active: boolean;
}) {
  const key = JSON.stringify([
    scene.settings,
    scene.kit,
    scene.inputs,
    scene.hand ? scene.seat : null,
    scene.from?.code,
  ]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by what makes the match
  const run = useMemo(
    () =>
      simulate(scene.kit, scene.settings, scene.inputs, {
        hand: scene.hand ? scene.seat : null,
        from: scene.from,
      }),
    [key],
  );
  const server = useMemo<ServerClock>(
    () =>
      clock.playing
        ? {
            now: () => clock.origin + (Date.now() - clock.wall) * clock.speed,
            frozen: false,
            rate: clock.speed,
          }
        : { now: () => clock.origin, frozen: true, rate: clock.speed },
    [clock],
  );
  const [view, setView] = useState<RoomView>(() =>
    run.viewAt(server.now(), seat),
  );
  useEffect(() => {
    const update = () =>
      setView((prev) => {
        const next = run.viewAt(server.now(), seat);
        return sameView(prev, next) ? prev : next;
      });
    update();
    // a hidden seat stays in step, at a slower pace
    if (server.frozen) return;
    const id = window.setInterval(update, active ? 150 : 600);
    return () => window.clearInterval(id);
  }, [run, server, seat, active]);

  // this screen's moves go to the page, which plays them into the match
  const latest = useRef({ run, server, view });
  latest.current = { run, server, view };
  useEffect(() => {
    setLabActions(async (name, args) => {
      const { run: r, server: c, view: v } = latest.current;
      const at = c.now();
      const state = r.stateAt(at);
      const id = r.players[seat]?.id;
      if (!id) return { ok: false, error: "not_member" };
      const event = labEvent(name, args, id, state, scene.kit.bot.characters);
      if (event === "skip") return { ok: true, data: v };
      if (!event) return { ok: false, error: "wrong_phase" };
      window.parent.postMessage(
        { kind: "input", seat, at, event } satisfies FrameReply,
        window.location.origin,
      );
      return { ok: true, data: v };
    });
    return () => setLabActions(null);
  }, [seat, scene.kit]);

  const client = useLabQueries();
  const offset = useMemo(() => server.now() - Date.now(), [server]);
  return (
    <QueryClientProvider client={client}>
      <RoomProvider
        code={view.code}
        view={view}
        offset={offset}
        refresh={noop}
        apply={() => {}}
        clock={server}
      >
        <StageProvider>
          <RoomStage />
          <span data-lab-ready hidden />
        </StageProvider>
      </RoomProvider>
    </QueryClientProvider>
  );
}

/** The page's own queries (the account, the settings) carry on; the room's are the lab's. */
function useLabQueries() {
  const parent = useQueryClient();
  return useMemo(() => {
    const c = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Number.POSITIVE_INFINITY, retry: false },
      },
    });
    for (const q of parent.getQueryCache().getAll())
      c.setQueryData(q.queryKey, q.state.data);
    return c;
  }, [parent]);
}

const sameView = (a: RoomView, b: RoomView) =>
  JSON.stringify({ ...a, serverNow: 0 }) ===
  JSON.stringify({ ...b, serverNow: 0 });

/** Light or dark for the frame. */
function useLabTheme(theme: "light" | "dark") {
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = theme;
    html.style.colorScheme = theme;
  }, [theme]);
}
