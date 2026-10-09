import { describe, expect, it } from "vitest";
import type { GameKey } from "@/game/games";
import type { Lang, PublicRoom } from "@/game/types";
import { gameRooms } from "./game-rooms";

const room = (
  code: string,
  lang: Lang,
  createdAt: number,
  status: PublicRoom["status"] = "open",
  game: GameKey = "who-am-i",
): PublicRoom => ({
  code,
  game,
  name: "",
  locked: false,
  status,
  host: {
    id: `host-${code}`,
    isGuest: true,
    name: "Host",
    lang,
    avatar: { kind: "creature", dna: "Cat..Happy..0", color: "#DCE8FA" },
  },
  players: 1,
  seats: 4,
  createdAt,
  voteSeconds: 40,
  askSeconds: 60,
  guessSeconds: 60,
  answerSeconds: 30,
  validateSeconds: 30,
  replySeconds: 45,
  talkSeconds: 120,
  lastSeconds: 45,
  lotSeconds: 60,
  tradeSeconds: 30,
  defendSeconds: 90,
  judgeSeconds: 30,
  offTastes: [],
});

describe("gameRooms", () => {
  it("keeps the page's language only, the open rooms oldest first", () => {
    const rooms = [
      room("NEWER", "pt", 300),
      room("ENGLS", "en", 100),
      room("OLDER", "pt", 200),
      room("FULL1", "pt", 50, "full"),
      room("PLAYS", "pt", 10, "playing"),
    ];
    const { mine, open } = gameRooms(rooms, "who-am-i", "pt");
    expect(mine.map((r) => r.code).sort()).toEqual([
      "FULL1",
      "NEWER",
      "OLDER",
      "PLAYS",
    ]);
    expect(open.map((r) => r.code)).toEqual(["OLDER", "NEWER"]);
  });
});
