// What one player may see of an Impostor match: their own card and never
// which side it is, everyone's answers once they land, the votes, who went
// out and whether they were one. The other card, who the impostors were and
// the last guesses wait for the end.
import type {
  CardView,
  Character,
  ImpostorView,
  PlayerId,
  PlayerStatus,
  Reveal,
  RevealView,
  RoomPlayer,
  RoomState,
} from "../types";
import { cardOf, impPoints, playing } from "./engine";

const toCard = (c: Character): CardView => ({
  characterId: c.id,
  name: c.name,
  origin: c.origin,
  imageUrl: c.imageUrl,
});

export function impView(s: RoomState, viewer: PlayerId): ImpostorView | null {
  const imp = s.imp;
  if (!imp) return null;
  const still = playing(s);
  const over = s.phase === "finished" && imp.winner !== null;
  const v = imp.vote;
  return {
    card: imp.dealt.includes(viewer) ? toCard(cardOf(imp, viewer)) : null,
    impostors: imp.impostors.length,
    round: imp.round,
    playingIds: still,
    asked: imp.asked.map((a) => ({
      round: a.round,
      question: { ...a.question },
      answeredIds: Object.keys(a.answers),
      yours: a.answers[viewer] ?? null,
      answers: a.revealed
        ? Object.entries(a.answers).map(([byId, answer]) => ({
            byId,
            answer,
          }))
        : null,
    })),
    vote: v
      ? {
          round: v.round,
          points: Object.entries(v.points).map(([byId, targetId]) => ({
            byId,
            targetId,
          })),
          votes: Object.entries(v.votes).map(([byId, targetId]) => ({
            byId,
            targetId,
          })),
          yourPoint: v.points[viewer] ?? null,
          yourVote: v.votes[viewer] ?? null,
        }
      : null,
    outs: imp.outs.map(({ id, round, impostor, left }) => ({
      id,
      round,
      impostor,
      left,
    })),
    guessing: imp.guessing,
    swaps: imp.swaps,
    end:
      over && imp.winner && imp.reason
        ? {
            winner: imp.winner,
            reason: imp.reason,
            crew: toCard(imp.crew),
            impostor: toCard(imp.impostor),
            impostorIds: [...imp.impostors],
            outs: imp.outs.map((o) => ({ ...o, by: [...o.by] })),
            points: impPoints(imp),
          }
        : null,
  };
}

/** A player's status in an Impostor step, or null outside them. */
export function impStatus(s: RoomState, p: RoomPlayer): PlayerStatus | null {
  const imp = s.imp;
  if (!imp) return null;
  const out = imp.outs.some((o) => o.id === p.id);
  switch (s.phase) {
    case "replying": {
      if (out || !imp.dealt.includes(p.id)) return "out";
      const q = imp.asked.at(-1);
      return q?.answers[p.id] !== undefined ? "replied" : "replying";
    }
    case "talking":
      if (out || !imp.dealt.includes(p.id)) return "out";
      return imp.vote?.votes[p.id] !== undefined ? "accused" : "talking";
    case "last_chance":
      return imp.guessing === p.id ? "guessing" : out ? "out" : "waiting";
    default:
      return null;
  }
}

/** The Impostor's reveals as everyone sees them. */
export function impReveal(s: RoomState, r: Reveal): RevealView | null {
  const imp = s.imp;
  if (!imp) return null;
  switch (r.kind) {
    case "replies":
      return {
        kind: "replies",
        n: r.n,
        startsAt: r.startsAt,
        until: r.until,
      };
    case "swap":
      return { kind: "swap", n: r.n, startsAt: r.startsAt, until: r.until };
    case "out": {
      const out = imp.outs.find((o) => o.round === r.n && !o.left);
      return {
        kind: "out",
        n: r.n,
        id: out?.id ?? null,
        impostor: out ? out.impostor : null,
        startsAt: r.startsAt,
        until: r.until,
      };
    }
    default:
      return null;
  }
}
