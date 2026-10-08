// Chat lines as a reader gets them: names in their language. The server sends
// lines this way (and the stage lab builds them), so the browser never needs
// the guest name lists.
import type {
  ChatMessage,
  ChatPerson,
  ShownLine,
  ShownPerson,
  SystemLine,
} from "./chat";
import { displayName } from "./guest-names";
import type { Lang } from "./types";

export const showPerson = (p: ChatPerson, lang: Lang): ShownPerson => ({
  id: p.id,
  isGuest: p.isGuest,
  name: displayName(p, lang),
  avatar: p.avatar,
});

function showSystem(s: SystemLine, lang: Lang): SystemLine<ShownPerson> {
  if (s.type === "order")
    return { ...s, players: s.players.map((p) => showPerson(p, lang)) };
  if (s.type === "firstTurn" || s.type === "sold" || s.type === "freebie")
    return { ...s, player: showPerson(s.player, lang) };
  if (s.type === "trade")
    return { ...s, from: showPerson(s.from, lang), to: showPerson(s.to, lang) };
  if (s.type === "roundWon")
    return { ...s, players: s.players.map((p) => showPerson(p, lang)) };
  return s;
}

export const showLine = (m: ChatMessage, lang: Lang): ShownLine => ({
  ...m,
  author: m.author && showPerson(m.author, lang),
  system: m.system && showSystem(m.system, lang),
});
