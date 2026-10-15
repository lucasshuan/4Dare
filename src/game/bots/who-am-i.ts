// Who am I?'s bots: they pick any character, ask short questions, answer at
// random and guess wrong two times in three.
import { isActive, openQuestion, pendingGuess, validatorOf } from "../helpers";
import { isCloseMatch } from "../match";
import {
  ANSWERS,
  type GameEvent,
  type PlayerId,
  type RoomState,
} from "../types";
import { type BotKit, type BotRandom, pick } from "./kit";

export function whoMove(
  s: RoomState,
  seat: PlayerId,
  random: BotRandom,
  kit: BotKit,
): GameEvent | null {
  switch (s.phase) {
    case "picking": {
      const card = Object.entries(s.assignments).find(
        ([, a]) => a.pickerId === seat && !a.character,
      );
      if (!card || !kit.characters.length) return null;
      // a card nobody else has, so the table stays readable
      const taken = new Set(
        Object.values(s.assignments).map((a) => a.character?.id),
      );
      const free = kit.characters.filter((c) => !taken.has(c.id));
      const list = free.length ? free : kit.characters;
      return {
        type: "PICK",
        playerId: seat,
        character: list[pick(random, list.length)],
      };
    }
    case "asking":
      return s.turnPlayerId === seat && kit.questions.length
        ? {
            type: "ASK",
            playerId: seat,
            text: kit.questions[pick(random, kit.questions.length)],
          }
        : null;
    case "answering": {
      const q = openQuestion(s);
      if (!q || seat === s.turnPlayerId) return null;
      if (q.answers.some((a) => a.by === seat)) return null;
      return {
        type: "ANSWER",
        playerId: seat,
        value: ANSWERS[pick(random, ANSWERS.length)],
        note: null,
      };
    }
    case "guessing": {
      if (s.turnPlayerId !== seat || !isActive(s, seat)) return null;
      const mine = s.assignments[seat]?.character;
      if (random() < 0.15) return { type: "PASS", playerId: seat };
      const right = random() < 0.34 && mine;
      const wrong =
        kit.characters[pick(random, kit.characters.length)]?.name ?? "?";
      return {
        type: "GUESS",
        playerId: seat,
        text: right ? mine.name : wrong,
      };
    }
    case "validating": {
      const g = pendingGuess(s);
      if (!g || validatorOf(s, g.by) !== seat) return null;
      const name = s.assignments[g.by]?.character?.name ?? "";
      return {
        type: "VALIDATE",
        playerId: seat,
        correct: isCloseMatch(g.text, [name]),
      };
    }
    default:
      return null;
  }
}
