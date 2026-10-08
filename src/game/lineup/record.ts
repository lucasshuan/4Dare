// What a What for? match leaves behind: each round (mission, lots, trades),
// each player's boards with what they cost and got, the XP, and what every
// mission and card did, for the curation and "the priciest of the week".
import { GAME_XP, XP } from "../profile/xp";
import type { Lang, PlayerId, RoomState } from "../types";
import { inPlay, reactionsOn } from "./engine";
import { luPlaces } from "./places";
import { boardOf } from "./rules";
import type { LineupMatch, LuCard, LuRound, LuText } from "./types";

/** A photo on a kept board: the card as it was dealt, its price and where it sat (slate units). */
export interface LuKeptCard {
  id: string;
  name: string;
  imageUrl: string | null;
  emoji?: string;
  tint?: string;
  /** What its team paid; 0 for a free leftover. */
  price: number;
  x: number;
  y: number;
  w: number;
  r: number;
}

/** A board as the profile shows it later, standing on its own. */
export interface LuKeptBoard {
  name: string;
  cards: LuKeptCard[];
  texts: LuText[];
}

/** A player's round (table lineup_boards). */
export interface LineupRoundPart {
  round: number;
  board: LuKeptBoard;
  /** Coins paid for the cards on the board. */
  spent: number;
  /** The most paid for one of them. */
  topPrice: number;
  votes: number;
  /** Votes in the tiebreak; null when there was none. */
  tieVotes: number | null;
  /** Reactions on stage. */
  laughs: number;
  won: boolean;
  /** The crowd's prize: most reactions, alone. */
  crowd: boolean;
  points: number;
}

/** A round of the match (table lineup_rounds). */
export interface LineupRoundRecord {
  round: number;
  missionId: string | null;
  /** A mission somebody wrote: then there is no id. */
  missionText: string | null;
  /** The lots in auction order: the card, who paid (null: nobody bid) and how much. */
  lots: { card: string; buyer: PlayerId | null; price: number }[];
  /** Trades that went through, by card id. */
  trades: { from: PlayerId; to: PlayerId; gave: string[]; got: string[] }[];
}

const count = (votes: Record<PlayerId, PlayerId>, owner: PlayerId) =>
  Object.values(votes).filter((v) => v === owner).length;

/** A board as it stood at the vote, with its cards spelled out. */
function keptBoard(lu: LineupMatch, round: LuRound, id: PlayerId) {
  const deck = lu.decks[round.n - 1];
  const hand = round.hands[id] ?? [];
  const board = boardOf(round.boards[id], hand);
  const cards = board.stickers.flatMap((s): LuKeptCard[] => {
    const card: LuCard | undefined = deck?.cards[s.c];
    if (!card) return [];
    return [
      {
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
        ...(card.emoji ? { emoji: card.emoji } : {}),
        ...(card.tint ? { tint: card.tint } : {}),
        price: round.tags[s.c]?.price ?? 0,
        x: s.x,
        y: s.y,
        w: s.w,
        r: s.r,
      },
    ];
  });
  return { name: board.name, cards, texts: board.texts };
}

/** A player's rounds, the ones played to the score. */
export function lineupPart(lu: LineupMatch, id: PlayerId): LineupRoundPart[] {
  return lu.rounds
    .filter((r) => Object.keys(r.points).length > 0)
    .map((r) => {
      const board = keptBoard(lu, r, id);
      const prices = board.cards.map((c) => c.price);
      return {
        round: r.n,
        board,
        spent: prices.reduce((a, b) => a + b, 0),
        topPrice: Math.max(0, ...prices),
        votes: count(r.votes, id),
        tieVotes: r.tie ? count(r.tie.votes, id) : null,
        laughs: reactionsOn(r, id),
        won: r.winners.includes(id),
        crowd: r.crowd === id,
        points: r.points[id] ?? 0,
      };
    });
}

/** The match's XP for a player: finishing, first place, each round won, each vote, the crowd's prize. */
export function lineupXp(
  rounds: readonly LineupRoundPart[],
  place: number | null,
  left: boolean,
): number {
  if (left) return 0;
  const X = GAME_XP.lineup;
  return (
    XP.finish +
    (place === 1 ? XP.first : 0) +
    rounds.reduce(
      (sum, r) =>
        sum +
        (r.won ? X.roundWon : 0) +
        X.vote * (r.votes + (r.tieVotes ?? 0)) +
        (r.crowd ? X.crowd : 0),
      0,
    )
  );
}

/** Each player dealt in: their rounds, place and whether they left. */
export function lineupPlayers(s: RoomState) {
  const lu = s.lu;
  if (!lu) return [];
  const places = luPlaces(lu);
  const still = new Set(inPlay(s));
  return lu.dealt.map((id) => {
    const rounds = lineupPart(lu, id);
    const left = !still.has(id);
    const place = left ? null : (places[id] ?? null);
    return { id, rounds, place, left, xp: lineupXp(rounds, place, left) };
  });
}

/** The match's rounds played to the score: missions, lots and trades. */
export function lineupRounds(lu: LineupMatch): LineupRoundRecord[] {
  return lu.rounds
    .filter((r) => Object.keys(r.points).length > 0)
    .flatMap((r) => {
      const deck = lu.decks[r.n - 1];
      if (!deck) return [];
      const idOf = (c: number) => deck.cards[c]?.id ?? "";
      return [
        {
          round: r.n,
          missionId: deck.mission.id,
          missionText: deck.mission.id ? null : deck.mission.text.en,
          lots: deck.cards.slice(0, deck.lots).map((card, i) => {
            const tag = r.tags[i];
            return {
              card: card.id,
              buyer: tag?.by ?? null,
              price: tag?.by ? tag.price : 0,
            };
          }),
          trades: r.trades.map((t) => ({
            from: t.from,
            to: t.to,
            gave: t.give.map(idOf),
            got: t.get.map(idOf),
          })),
        },
      ];
    });
}

/** What the match did with each mission (lineup_mission_stats), in the deck's language. */
export function missionCounts(lu: LineupMatch, lang: Lang) {
  return lu.rounds
    .filter((r) => Object.keys(r.points).length > 0)
    .flatMap((r) => {
      const id = lu.decks[r.n - 1]?.mission.id;
      if (!id) return [];
      const rated = Object.values(r.rated);
      return [
        {
          id,
          lang,
          played: 1,
          liked: rated.filter((v) => v === 1).length,
          disliked: rated.filter((v) => v === -1).length,
          laughs: lu.dealt.reduce((sum, p) => sum + reactionsOn(r, p), 0),
          ties: r.winners.length > 1 || r.tie ? 1 : 0,
        },
      ];
    });
}

/** What the match did with each card that went under the hammer (lineup_card_stats). */
export function cardCounts(lu: LineupMatch, lang: Lang) {
  const by = new Map<
    string,
    { lots: number; sold: number; price: number; traded: number; won: number }
  >();
  for (const r of lu.rounds) {
    if (!Object.keys(r.points).length) continue;
    const deck = lu.decks[r.n - 1];
    if (!deck) continue;
    const traded = new Set(r.trades.flatMap((t) => [...t.give, ...t.get]));
    const winning = new Set(r.winners.flatMap((id) => r.hands[id] ?? []));
    deck.cards.slice(0, deck.lots).forEach((card, i) => {
      const c = by.get(card.id) ?? {
        lots: 0,
        sold: 0,
        price: 0,
        traded: 0,
        won: 0,
      };
      const tag = r.tags[i];
      c.lots += 1;
      if (tag?.by) {
        c.sold += 1;
        c.price += tag.price;
      }
      if (traded.has(i)) c.traded += 1;
      if (winning.has(i)) c.won += 1;
      by.set(card.id, c);
    });
  }
  return [...by].map(([id, c]) => ({ id, lang, ...c }));
}
