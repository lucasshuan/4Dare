// The Impostor's bots: they answer each question with any answer it allows,
// vote for anyone else, and a caught impostor guesses at random.
import type { ImpAnswer } from "../impostor/types";
import type { GameEvent, PlayerId, RoomState } from "../types";
import { type BotRandom, pick } from "./kit";

const WORDS = ["grande", "rápido", "estranho", "feliz", "antigo", "famoso"];

export function impostorMove(
  s: RoomState,
  seat: PlayerId,
  random: BotRandom,
): GameEvent | null {
  const imp = s.imp;
  if (!imp?.dealt.includes(seat)) return null;
  if (imp.outs.some((o) => o.id === seat)) return null;
  switch (s.phase) {
    case "replying": {
      const open = imp.asked.at(-1);
      if (!open || open.revealed || open.answers[seat]) return null;
      const q = open.question;
      const answer: ImpAnswer =
        q.kind === "word"
          ? { word: WORDS[pick(random, WORDS.length)] }
          : q.kind === "scale"
            ? { n: 1 + pick(random, 10) }
            : { n: pick(random, Math.max(1, q.choices)) };
      return { type: "REPLY", playerId: seat, answer };
    }
    case "talking": {
      if (imp.vote?.votes[seat]) return null;
      const out = new Set(imp.outs.map((o) => o.id));
      const left = imp.dealt.filter((id) => id !== seat && !out.has(id));
      if (!left.length) return null;
      return {
        type: "ACCUSE",
        playerId: seat,
        targetId: left[pick(random, left.length)],
      };
    }
    case "last_chance":
      return imp.guessing === seat
        ? { type: "LAST_GUESS", playerId: seat, text: imp.crew.name }
        : null;
    default:
      return null;
  }
}
