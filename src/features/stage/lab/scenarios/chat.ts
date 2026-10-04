// Lab fixtures for the chat: a demo conversation and the match's own system
// lines, seeded into the chat's React Query entry (the lab has no messages
// route). The room is replayed to find the system lines exactly where the
// server would post them; players' lines are tied to the match's moments and
// only those already written at the lab's moment are kept. Lines from the
// last 6 s before that moment are unread (the ones from the last 3 s pop a
// bubble), so `?show=vote&at=3` shows the tab lit up and `?show=lobby&at=-1`
// a quiet one.
import { chatCache, chatKey } from "@/features/chat/chat-cache";
import { seenKey } from "@/features/chat/chat-ui";
import { type ChatMessage, chatPerson, systemLines } from "@/game/chat";
import type { Lang } from "@/game/types";
import type { SceneFixtures } from "../fixtures";
import { labPlayers } from "../fixtures";
import type { LabParams, LabShow } from "../params";
import { labRoom, labTime } from "../scenarios";

/** Who says what, by seat, at `at` seconds from a moment of the match. */
const SCRIPT: {
  seat: number;
  from: LabShow;
  at: number;
  text: Record<Lang, string>;
}[] = [
  {
    seat: 1,
    from: "lobby",
    at: -40,
    text: { en: "here!! 👋", pt: "cheguei!! 👋", ja: "来たよ!! 👋" },
  },
  {
    seat: 0,
    from: "lobby",
    at: -34,
    text: { en: "hi everyone", pt: "oi gente", ja: "みんなこんにちは" },
  },
  {
    seat: 2,
    from: "lobby",
    at: -22,
    text: {
      en: "last time I was Shrek and nobody guessed it for ten minutes, so this time I'm picking someone really hard for you",
      pt: "da última vez eu era o Shrek e ninguém acertou por dez minutos, então dessa vez vou escolher alguém bem difícil pra vocês",
      ja: "前回シュレックだったのに10分もだれも当てられなかったから、今回はすごく難しいのを選ぶね",
    },
  },
  {
    seat: 3,
    from: "lobby",
    at: -12,
    text: { en: "ready when you are", pt: "bora", ja: "いつでもいいよ" },
  },
  { seat: 1, from: "vote", at: 1.2, text: { en: "😂", pt: "😂", ja: "😂" } },
  {
    seat: 2,
    from: "vote",
    at: 2.4,
    text: {
      en: "vote for this one!",
      pt: "vota nesse!",
      ja: "これに投票して！",
    },
  },
  {
    seat: 0,
    from: "pick",
    at: 3,
    text: { en: "this is hard", pt: "essa é difícil", ja: "これは難しい" },
  },
  {
    seat: 3,
    from: "turn",
    at: 1.5,
    text: { en: "good luck 🍀", pt: "boa sorte 🍀", ja: "がんばって 🍀" },
  },
  {
    seat: 1,
    from: "turn",
    at: 2.5,
    text: {
      en: "I have no idea who I am",
      pt: "não faço ideia de quem eu sou",
      ja: "自分がだれか全然わからない",
    },
  },
  {
    seat: 2,
    from: "result",
    at: 2,
    text: { en: "gg!", pt: "boa!", ja: "おつかれ！" },
  },
];

/** Lines newer than this before the lab's moment are unread. */
const UNREAD_MS = 6000;

let building = false;

export function scenario(params: LabParams): SceneFixtures {
  // the room below asks every scene for its fixtures again, this one included
  if (building) return {};
  building = true;
  try {
    return demoChat(params);
  } finally {
    building = false;
  }
}

function demoChat(params: LabParams): SceneFixtures {
  const room = labRoom(params);
  const people = labPlayers(params);
  const code = room.view(room.start).code;
  const moment = labTime(room, params.show, params.at);

  const lines: Omit<ChatMessage, "id">[] = [];
  // the system lines: every change of the room, as dispatch would see it
  // (from before an earlier match, for match=later)
  let before = room.state(room.start - 130_000);
  for (let t = room.start - 130_000; t <= room.end; t += 25) {
    const after = room.state(t);
    if (after === before) continue;
    for (const l of systemLines(before, after, t))
      if ("system" in l)
        lines.push({
          at: t,
          showAt: l.showAt ?? t,
          by: null,
          author: null,
          text: null,
          system: l.system,
        });
    before = after;
  }
  for (const s of SCRIPT) {
    const p = people[s.seat];
    const at = labTime(room, s.from, s.at);
    if (!p || at > moment) continue;
    lines.push({
      at,
      showAt: at,
      by: p.id,
      author: chatPerson(p),
      text: s.text[params.lang],
      system: null,
    });
  }
  const saved: ChatMessage[] = lines
    .sort((a, b) => a.at - b.at)
    .map((m, i) => ({ ...m, id: i + 1 }));

  // read up to UNREAD_MS before the moment
  let seen = 0;
  for (const m of saved) if (m.at <= moment - UNREAD_MS) seen = m.id;
  try {
    window.localStorage.setItem(seenKey(code), String(seen));
  } catch {
    // no browser (tests) or no storage: the chat starts all read
  }

  return { queries: [{ key: chatKey(code), data: chatCache(saved) }] };
}
