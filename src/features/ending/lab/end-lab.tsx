"use client";

// The end scenes' lab (dev only): a made-up room at a match's end, any game,
// any number of players and outcome, held at any moment or played from it:
// /en/dev/end?game=impostor&players=6&outcome=crew&at=9&viewer=player
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RoomProvider } from "@/features/data/room-context";
import { StageProvider } from "@/features/stage/stage-context";
import type { GameKey } from "@/game/games";
import type { ImpDeal, ImpQuestion } from "@/game/impostor/types";
import type { LineupView, LuCard, LuRoundView } from "@/game/lineup/types";
import type { MatchReward } from "@/game/profile/reward";
import { levelOf } from "@/game/profile/xp";
import { char, Game, THEMES } from "@/game/test-utils";
import type { Lang, RoomView } from "@/game/types";
import { toView } from "@/game/view";
import { type Figure, figureUri } from "@/lib/figures";
import type { ServerClock } from "@/lib/hooks/use-server-clock";
import { EndScene } from "../end-scene";

type Query = Record<string, string | string[] | undefined>;
const one = (q: Query, k: string) => {
  const v = q[k];
  return Array.isArray(v) ? v[0] : v;
};

const FIGS: Figure[] = [
  "cat",
  "lion",
  "giraffe",
  "lady",
  "king",
  "owl",
  "astronaut",
  "fox",
  "robot",
  "pirate",
  "witch",
];

const Q: ImpQuestion[] = [
  { id: "g-brave", kind: "scale", choices: 10, spice: 1 },
  { id: "g-food", kind: "word", choices: 0, spice: 2 },
];
const deal = (k: number): ImpDeal => ({
  crew: { ...char(`crew-${k}`, "Leão"), imageUrl: figureUri("lion") },
  impostor: { ...char(`imp-${k}`, "Girafa"), imageUrl: figureUri("giraffe") },
  spares: [],
  questions: Q,
});

/** A Who am I? match to its end: player i finds their card on turn `found[i]` (0: never). */
function whoEnd(n: number, outcome: string) {
  const g = new Game(n, 3);
  g.start();
  g.pickAll();
  g.skipShow();
  const order = [...g.state.order];
  // the winner, a tie or nobody: the turn each player guesses right on (0: gives up)
  const round = (id: string) => {
    const i = order.indexOf(id);
    if (outcome === "nobody") return 0;
    if (outcome === "tie") return i < 2 ? 1 : i === n - 1 ? 0 : 2;
    return i === 0 ? 1 : i === n - 1 ? 0 : 2;
  };
  for (let guard = 0; g.state.phase !== "finished" && guard < 200; guard++) {
    const asker = g.askAndAnswer();
    const r = round(asker);
    if (r === 0) g.do({ type: "GIVE_UP", playerId: asker });
    else if ((g.state.turnNumber ?? 0) / order.length >= r - 1)
      g.do({ type: "GUESS", playerId: asker, text: `Name ${asker}` });
    else g.do({ type: "PASS", playerId: asker });
  }
  return g;
}

/** An Impostor match to its end: the crew catches the impostor, or the impostors outlast the crew. */
function impostorEnd(n: number, outcome: string) {
  const g = new Game(n, 2, { game: "impostor", seats: 10, impostors: null });
  g.do({
    type: "START",
    playerId: g.state.hostId,
    themes: THEMES,
    deals: THEMES.map((_, i) => deal(i)),
  });
  g.skipShow();
  g.voteAll(0);
  g.skipShow();
  g.skipReveal();
  const m = () => g.state.imp ?? (null as never);
  const answerAll = () => {
    const q = m().asked.at(-1);
    for (const id of [...m().dealt]) {
      if (g.state.phase !== "replying") break;
      if (m().outs.some((o) => o.id === id)) continue;
      g.do({
        type: "REPLY",
        playerId: id,
        answer: q?.question.kind === "word" ? { word: "pizza" } : { n: 5 },
      });
    }
    g.skipReveal();
  };
  const voteOut = (target: string) => {
    const still = m().dealt.filter((id) => !m().outs.some((o) => o.id === id));
    const other = still.find((id) => id !== target) ?? target;
    for (const id of still) {
      if (g.state.phase !== "talking") break;
      g.do({
        type: "ACCUSE",
        playerId: id,
        targetId: id === target ? other : target,
      });
    }
    g.skipReveal();
  };
  for (let guard = 0; g.state.phase !== "finished" && guard < 40; guard++) {
    if (g.state.phase === "replying") answerAll();
    else if (g.state.phase === "talking") {
      const crew = m().dealt.filter(
        (id) =>
          !m().impostors.includes(id) && !m().outs.some((o) => o.id === id),
      );
      const bad = m().impostors.find(
        (id) => !m().outs.some((o) => o.id === id),
      );
      voteOut((outcome === "impostors" ? crew[0] : bad) ?? crew[0]);
    } else if (g.state.phase === "last_chance") {
      g.skipReveal();
      g.do({
        type: "LAST_GUESS",
        playerId: m().guessing ?? "",
        text: "Zebra",
      });
    } else g.timeout();
  }
  return g;
}

/** What for?'s end, drawn over a finished room: three rounds, their winning boards and votes. */
function lineupView(base: RoomView, outcome: string, lang: Lang): RoomView {
  const ids = base.players.map((p) => p.id);
  const cards: Record<number, LuCard> = Object.fromEntries(
    FIGS.slice(0, 8).map((f, i) => [
      i,
      {
        id: `wd-${i}`,
        name: f,
        origin: "Lab",
        imageUrl: figureUri(f),
      },
    ]),
  );
  const board = (name: string, from: number) => ({
    name,
    stickers: [0, 1, 2, 3].map((k) => ({
      c: (from + k) % 8,
      x: k % 2 ? 276 : 96,
      y: k < 2 ? 160 : 360,
      w: 110,
      r: k % 2 ? 4 : -5,
    })),
    texts: [
      { t: "força bruta", x: 186, y: 270, s: 26, r: -3 },
      { t: "ama chuva!", x: 186, y: 500, s: 28, r: 4 },
    ],
  });
  const votes = ids.map((_, i) => Math.max(0, 5 - i));
  if (outcome === "tie") votes[1] = votes[0];
  const results: LuRoundView[] = [1, 2, 3].map((n) => {
    const winner = ids[n === 2 && outcome === "tie" ? 1 : 0];
    return {
      n,
      mission: {
        id: null,
        text: {
          pt: "Pra trocar o pneu do carro, na chuva, à meia-noite.",
          en: "To change the car's tyre, in the rain, at midnight.",
          es: "Para cambiar la rueda del coche, bajo la lluvia, a medianoche.",
          ja: "真夜中の雨の中で車のタイヤを替えるため。",
        },
      },
      winners: [winner],
      crowd: n === 1 ? winner : null,
      points: Object.fromEntries(ids.map((id, i) => [id, votes[i]])),
      votes: Object.fromEntries(
        ids.map((id, i) => [id, Math.round(votes[i] / 3)]),
      ),
      tieVotes: null,
      laughs: {},
      boards: { [winner]: board(n === 2 ? "Sem Manual FC" : "Pit Stop", n) },
      cards,
      tags: {},
      verdict: null,
    };
  });
  const totals = Object.fromEntries(
    ids.map((id, i) => [id, votes[i] * 3 + (i === 0 ? 4 : 0)]),
  );
  if (outcome === "tie") totals[ids[1]] = totals[ids[0]];
  void lang;
  return {
    ...base,
    settings: { ...base.settings, game: "lineup" },
    imp: null,
    lu: {
      dealtIds: ids,
      presenterId: null,
      results,
      totals,
    } as unknown as LineupView,
  };
}

/** A reward as the server would give it: an account levelling up with a badge, or a guest. */
function labReward(viewer: string): MatchReward {
  const rows: MatchReward["rows"] = [
    { kind: "finish", xp: 10 },
    { kind: "first", xp: 15 },
    { kind: "discovered", round: 2, xp: 10 },
  ];
  if (viewer === "guest") return { rows, xp: 35, level: null, badge: null };
  rows.push({ kind: "dayFirst", xp: 5 });
  return {
    rows,
    xp: 40,
    level: { before: levelOf(560), after: levelOf(600) },
    badge: { id: "discovered", tier: 2, goal: 100 },
  };
}

export function EndLab({ lang, query }: { lang: Lang; query: Query }) {
  const game = (one(query, "game") ?? "who-am-i") as GameKey;
  const n = Number(one(query, "players") ?? 6);
  const outcome = one(query, "outcome") ?? "one";
  const viewer = one(query, "viewer") ?? "player";
  const at = Number(one(query, "at") ?? 2);
  const playing = one(query, "play") === "1";
  const room = useMemo(() => {
    const g =
      game === "impostor" ? impostorEnd(n, outcome) : whoEnd(n, outcome);
    const s = g.state;
    const host = s.hostId;
    const me =
      viewer === "host"
        ? host
        : (s.players.find(
            (p) => p.id !== host && (viewer === "guest") === p.isGuest,
          )?.id ?? s.players[1].id);
    let view = toView(s, 1, me, g.now, lang);
    // the cards' pictures, as the library would have them
    view = {
      ...view,
      players: view.players.map((p, i) => ({
        ...p,
        card: p.card
          ? { ...p.card, imageUrl: figureUri(FIGS[i % FIGS.length]) }
          : p.card,
      })),
    };
    if (game === "lineup") view = lineupView(view, outcome, lang);
    return { view, startsAt: view.stepStartsAt ?? g.now };
  }, [game, n, outcome, viewer, lang]);
  const [wall] = useState(() => Date.now());
  const clock = useMemo<ServerClock>(
    () =>
      playing
        ? {
            now: () => room.startsAt + at * 1000 + (Date.now() - wall),
            frozen: false,
            rate: 1,
          }
        : { now: () => room.startsAt + at * 1000, frozen: true, rate: 1 },
    [room, at, playing, wall],
  );
  const client = useMemo(() => {
    const c = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Number.POSITIVE_INFINITY, retry: false },
      },
    });
    c.setQueryData(
      ["match-reward", room.view.code, room.startsAt],
      labReward(viewer),
    );
    return c;
  }, [room, viewer]);
  return (
    <QueryClientProvider client={client}>
      <RoomProvider
        code={room.view.code}
        view={room.view}
        offset={clock.now() - Date.now()}
        refresh={async () => {}}
        apply={() => {}}
        clock={clock}
      >
        <StageProvider>
          <EndScene />
          <span data-lab-ready hidden />
        </StageProvider>
      </RoomProvider>
    </QueryClientProvider>
  );
}
