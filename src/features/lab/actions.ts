// The room's actions as the lab's match takes them: each becomes the event the
// server would dispatch for that seat (src/server/actions.ts). Actions with
// nothing to do in the lab (seen, shown, ratings) are let through as is; the
// ones that need the server's data (a character found by name, a queue of
// lots) take what the lab has.
import type { Character, GameEvent, PlayerId, RoomState } from "@/game/types";

type Args = unknown[];

/** The event for an action of `seat`, "skip" for one the lab lets pass, null when it can't be played here. */
export function labEvent(
  name: string,
  args: Args,
  seat: PlayerId,
  state: RoomState,
  characters: Character[],
): GameEvent | "skip" | null {
  const a = args.slice(1);
  const p = seat;
  switch (name) {
    case "setReady":
      return { type: "SET_READY", playerId: p, ready: a[0] === true };
    case "updateSettings":
      return {
        type: "UPDATE_SETTINGS",
        playerId: p,
        settings: (a[0] ?? {}) as never,
      };
    case "kickPlayer":
      return {
        type: "KICK",
        playerId: p,
        targetId: a[0] as string,
        ban: a[1] === true,
      } as GameEvent;
    case "transferHost":
      return { type: "TRANSFER_HOST", playerId: p, targetId: a[0] as string };
    case "mutePlayer":
      return {
        type: "MUTE",
        playerId: p,
        targetId: a[0] as string,
        muted: a[1] === true,
      };
    case "sitChair":
      return { type: "CHAIR", playerId: p, seat: (a[0] as string) ?? null };
    case "drawChair":
      return { type: "DRAW_CHAIR", playerId: p };
    case "chooseTheme":
      return { type: "SET_THEME", playerId: p, text: String(a[0] ?? "") };
    case "voteTheme":
      return a[0] === null
        ? { type: "UNVOTE", playerId: p }
        : { type: "VOTE", playerId: p, option: Number(a[0]) };
    case "unpickCard":
      return { type: "UNPICK", playerId: p };
    case "confirmCard":
    case "confirmPick": {
      const card = a[0] as { characterId?: string; name?: string } | string;
      const id = typeof card === "string" ? card : card?.characterId;
      const name = typeof card === "string" ? undefined : card?.name;
      const found =
        characters.find((c) => c.id === id) ??
        characters.find((c) => c.name === name) ??
        (name
          ? ({
              id: `lab-${name}`,
              name,
              aliases: [],
              lang: "pt",
              origin: null,
              imageUrl: null,
            } as unknown as Character)
          : characters[0]);
      return found ? { type: "PICK", playerId: p, character: found } : null;
    }
    case "askQuestion":
      return { type: "ASK", playerId: p, text: String(a[0] ?? "") };
    case "answerQuestion":
      return {
        type: "ANSWER",
        playerId: p,
        value: a[0] as never,
        note: (a[1] as string | null) ?? null,
      };
    case "submitGuess":
      return { type: "GUESS", playerId: p, text: String(a[0] ?? "") };
    case "passTurn":
      return { type: "PASS", playerId: p };
    case "validateGuess":
      return { type: "VALIDATE", playerId: p, correct: a[0] === true };
    case "giveUp":
      return { type: "GIVE_UP", playerId: p };
    case "backToLobby":
      return {
        type: "BACK_TO_LOBBY",
        playerId: p,
        ...(a[0] ? { game: a[0] as never } : {}),
      };
    case "replyCard":
      return a[0] === null
        ? { type: "UNREPLY", playerId: p }
        : { type: "REPLY", playerId: p, answer: a[0] as never };
    case "pointAt":
      return {
        type: "POINT",
        playerId: p,
        targetId: (a[0] as string | null) ?? null,
      };
    case "accuse":
      return a[0] === null
        ? { type: "UNACCUSE", playerId: p }
        : { type: "ACCUSE", playerId: p, targetId: a[0] as string };
    case "dontKnowCard":
      return { type: "DONT_KNOW", playerId: p };
    case "guessCrewCard":
      return { type: "LAST_GUESS", playerId: p, text: String(a[0] ?? "") };
    case "bidOnLot":
      return { type: "BID", playerId: p, amount: Number(a[0]) };
    case "foldLot":
      return { type: "FOLD", playerId: p };
    case "markDone":
      return { type: "DONE", playerId: p, done: a[0] === true };
    case "offerTrade": {
      const o = a[0] as { to: string; give: number[]; get: number[] } | null;
      return o
        ? { type: "OFFER", playerId: p, ...o }
        : { type: "CANCEL_OFFER", playerId: p };
    }
    case "answerTrade":
      return {
        type: "ANSWER_OFFER",
        playerId: p,
        from: a[0] as string,
        accept: a[1] === true,
      };
    case "endPresentation":
      return { type: "PRESENTED", playerId: p };
    case "judgeBoard":
      return { type: "JUDGE", playerId: p, ownerId: a[0] as string };
    case "rateMission":
      return {
        type: "RATE",
        playerId: p,
        up: (a[0] as boolean | null) ?? null,
      };
    case "chooseMission": {
      const c = a[0] as { pick?: number; text?: string };
      return {
        type: "MISSION",
        playerId: p,
        pick: c.pick ?? null,
        text: c.text ?? null,
      };
    }
    case "guessWhatFor":
      return { type: "HUNCH", playerId: p, text: String(a[0] ?? "") };
    case "giveVerdict":
      return {
        type: "VERDICT",
        playerId: p,
        ownerId: a[0] as string,
        why: String(a[1] ?? ""),
        final: a[2] === true,
      };
    case "playCue":
      return { type: "CUE", playerId: p, kind: a[0] as never };
    case "startGame":
      // the lab's match already starts on its own
      return state.phase === "lobby" ? "skip" : null;
    default:
      return "skip";
  }
}
