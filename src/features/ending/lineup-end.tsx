"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { memo, useId, useMemo } from "react";
import { Logo } from "@/components/ui/logo";
import { useRoomContext } from "@/features/data/room-context";
import { BoardView } from "@/features/lineup/board";
import { avatarSrc, seatOf } from "@/features/opening/title-kit";
import { sec } from "@/features/opening/title-timing";
import type {
  LineupView,
  LuBoard,
  LuCard,
  LuRoundView,
  LuTag,
} from "@/game/lineup/types";
import type { Avatar, Lang, PlayerView } from "@/game/types";
import { cn } from "@/lib/cn";
import { useGameOption } from "@/lib/settings";
import { END_ACTS, END_BEAT, type EndProps } from "./end-kit";
import s from "./lineup-end.module.css";

/** The pictures the scene paints, to fetch during the match. */
export const LINEUP_END_IMAGES = (_portrait: boolean) => [
  "/opening/end-table.webp",
  "/opening/end-paper.webp",
  "/opening/end-ink.webp",
  "/opening/grain.webp",
];

/** What shows past the canvas before the scene paints it: the black it opens from. */
export const LINEUP_END_BACKDROP = "#120803";

/**
 * The beats, from the scene's start: the paper's push on the first, the red
 * pen on the fourth; the camera makes room a moment before the card comes in.
 */
const BEAT0 = 0.35;
const T = {
  push: BEAT0,
  mark: BEAT0 + 3 * END_BEAT,
  aside: END_ACTS.lineup.card - 0.2,
};

const ChalkFont = dynamic(() => import("@/features/lineup/chalk-font"));
const ChalkFontJa = dynamic(() => import("@/features/lineup/chalk-font-ja"));
const PaperFont = dynamic(() => import("./paper-font"));

/**
 * The fonts the scene writes in: the newspaper's, and the board's chalk
 * (unless "Plain letters" is on). For the stage's `fonts`.
 */
export function LineupEndFonts() {
  const plain = useGameOption("lineup", "plainLetters");
  const ja = useLocale() === "ja";
  return (
    <>
      <PaperFont />
      {plain ? null : ja ? <ChalkFontJa /> : <ChalkFont />}
    </>
  );
}

/**
 * Fetches the scene's fonts ahead of the end: the newspaper's, and the
 * chalk unless `chalk` is off. Resolves once they are in (a face that fails
 * counts as in).
 */
export function preloadLineupEndFonts(o: {
  ja: boolean;
  chalk: boolean;
}): Promise<void> {
  const parts: Promise<unknown>[] = [
    import("./paper-font").then((m) => m.loadPaperFonts()),
  ];
  if (o.chalk)
    parts.push(
      (o.ja
        ? import("@/features/lineup/chalk-font-ja")
        : import("@/features/lineup/chalk-font")
      ).then((m) => m.loadChalkFonts()),
    );
  return Promise.allSettled(parts).then(() => undefined);
}

/** A circle in red pen, by hand: it starts a little before the top, goes past where it began and leaves a tail. */
function circlePath(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
) {
  const pts: [number, number][] = [];
  const N = 30;
  const a0 = -1.95;
  const span = Math.PI * 2 * 1.1;
  for (let i = 0; i <= N; i++) {
    const a = a0 + (span * i) / N;
    const j =
      1 +
      0.035 * Math.sin(i * 1.7 + seed) +
      (i > N * 0.85 ? (0.06 * (i - N * 0.85)) / (N * 0.15) : 0);
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const mx = (pts[k][0] + pts[k + 1][0]) / 2;
    const my = (pts[k][1] + pts[k + 1][1]) / 2;
    d += `Q${f(pts[k][0])} ${f(pts[k][1])} ${f(mx)} ${f(my)}`;
  }
  return d;
}

/** Someone printed in the paper. */
interface Person {
  id: string;
  name: string;
  avatar: Avatar;
  slot: number;
}

/** A champion, circled: what they scored over the match and its word ("6 votes"). */
interface Star extends Person {
  stat: number;
  word: string;
}

/** A line of the standings. */
interface Row extends Person {
  place: string;
  stat: number;
}

/** A winning board, photographed for the front page. */
interface Photo {
  key: string;
  board: LuBoard;
  cards: Record<number, LuCard>;
  tags: Record<number, LuTag>;
  /** The team's name in bold before the caption; empty when the board has none. */
  team: string;
  caption: string;
}

/** Everything the front page prints. */
interface Paper {
  mast: { before: string; after: string };
  half: string;
  game: string;
  total: string;
  head: string;
  /** Under the headline (a tie) or atop the side column (one champion); null: none. */
  deck: string | null;
  kick: string;
  table: string;
  statHead: string;
  tie: boolean;
  stars: Star[];
  rows: Row[];
  photos: Photo[];
  /** The standings' row height: tighter for a big group. */
  rowH: number;
}

/** The board on stage, as a photo: closed in on it, almost no wall around. */
const PHOTO = {
  one: { w: 262, h: 380, s: 0.61 },
  tie: { w: 200, h: 300, s: 0.47 },
} as const;
/** Each photo's board tilts its own way. */
const TILT = [-1.5, 1.4] as const;

/**
 * A headline's size: the prototype's, smaller for a long one so it keeps to
 * two lines (a wide character, Japanese, counts double).
 */
function headSize(text: string, base: number) {
  let n = 0;
  for (const ch of text) n += /[　-鿿＀-￯]/.test(ch) ? 2 : 1;
  return Math.max(34, Math.min(base, Math.floor(2450 / Math.max(1, n))));
}

/** The words a mission may open with, as an answer to "What for?": the sentence brings its own. */
const PURPOSE: Partial<Record<Lang, RegExp>> = {
  pt: /^(pra|para)\s+/i,
  es: /^para\s+/i,
  en: /^to\s+/i,
};

/** The mission as it reads after "with a team to": no "to" of its own, no capital, no full stop. */
function missionClause(text: string, lang: Lang) {
  const t = text
    .trim()
    .replace(PURPOSE[lang] ?? /^$/, "")
    .replace(/[.。]+$/, "");
  return lang === "ja" ? t : t.charAt(0).toLocaleLowerCase(lang) + t.slice(1);
}

const capital = (t: string, lang: Lang) =>
  t.charAt(0).toLocaleUpperCase(lang) + t.slice(1);

type Tr = ReturnType<typeof useTranslations<"lineup.end">>;

/** "A and B", "A, B and C", "A, B and 2 more". */
function listOf(t: Tr, names: string[]) {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return t("names2", { a: names[0], b: names[1] });
  if (names.length === 3)
    return t("names3", { a: names[0], b: names[1], c: names[2] });
  return t("namesMore", { a: names[0], b: names[1], n: names.length - 2 });
}

/**
 * The front page, from the finished match. Places and champions go by points
 * (ties share), as on the podium; the stars and the standings print each
 * player's votes over the match, or their rounds won when a presenter
 * decided (no votes then). The photo is the champion's winning board: the
 * one with the most votes if they won several, else the match's best.
 */
function buildPaper(
  lu: LineupView,
  playerById: (id: string) => PlayerView | undefined,
  o: {
    t: Tr;
    lang: Lang;
    half: string;
    game: string;
    mast: { before: string; after: string };
  },
): Paper | null {
  const { t, lang } = o;
  const people = lu.dealtIds.flatMap((id) => {
    const p = playerById(id);
    return p
      ? [{ id, name: p.name, avatar: p.avatar, slot: p.colorSlot } as Person]
      : [];
  });
  if (!people.length) return null;
  const nameOf = (id: string | null | undefined) =>
    (id ? playerById(id)?.name : undefined) ?? null;
  const hosted = lu.results.some((r) => r.verdict);
  const wins = (id: string) =>
    lu.results.filter((r) => r.winners.includes(id)).length;
  const votes = (id: string) =>
    lu.results.reduce((sum, r) => sum + (r.votes[id] ?? 0), 0);
  const stat = hosted ? wins : votes;
  const points = (id: string) => lu.totals[id] ?? 0;
  const seat = (id: string) => lu.dealtIds.indexOf(id);
  const ranked = [...people].sort(
    (a, b) =>
      points(b.id) - points(a.id) ||
      stat(b.id) - stat(a.id) ||
      seat(a.id) - seat(b.id),
  );
  const best = points(ranked[0].id);
  const champs = ranked.filter((p) => points(p.id) === best);
  const tie = champs.length > 1;
  const starred = champs.slice(0, 3);
  const place = (id: string) =>
    1 + people.filter((q) => points(q.id) > points(id)).length;
  const rounds = lu.results.length;
  const total = lu.results.reduce(
    (sum, r) => sum + Object.values(r.votes).reduce((a, v) => a + v, 0),
    0,
  );

  // the winning boards, the most voted first, then the latest
  type Won = { r: LuRoundView; id: string; board: LuBoard };
  const byVotes = (a: Won, b: Won) =>
    (b.r.votes[b.id] ?? 0) - (a.r.votes[a.id] ?? 0) || b.r.n - a.r.n;
  const won: Won[] = lu.results.flatMap((r) =>
    r.winners.flatMap((id) =>
      r.boards[id] ? [{ r, id, board: r.boards[id] }] : [],
    ),
  );
  const wonBy = (id: string) =>
    won.filter((w) => w.id === id).sort(byVotes)[0] ?? null;
  const own = starred.map((p) => wonBy(p.id));
  const shots = (
    tie ? own.filter((w) => w !== null).slice(0, 2) : own.slice(0, 1)
  ).filter((w): w is Won => w !== null);
  // a champion who won no round: the match's best board, under its owner's name
  if (!shots.length && won.length) shots.push([...won].sort(byVotes)[0]);
  const teamOf = (w: Won | null, name: string) =>
    w?.board.name || t("teamOf", { name });
  const photos: Photo[] = shots.map((w) => ({
    key: `${w.r.n}-${w.id}`,
    board: w.board,
    cards: w.r.cards,
    tags: w.r.tags,
    team: w.board.name,
    caption: t("caption", { name: nameOf(w.id) ?? "", n: w.r.n }),
  }));

  const names = champs.map((p) => p.name);
  const lead = starred[0];
  const head = tie
    ? t("headTie", { names: listOf(t, names) })
    : t("head", { name: lead.name });

  let deck: string | null = null;
  if (tie) {
    const teams = listOf(
      t,
      starred.map((p, k) => teamOf(own[k], p.name)),
    );
    const even = (f: (id: string) => number) =>
      starred.every((p) => f(p.id) === f(lead.id));
    deck = hosted
      ? even(wins)
        ? t("deckTieWins", { teams, wins: wins(lead.id) })
        : t("deckTiePoints", { teams, points: best })
      : even(votes)
        ? t("deckTie", { teams, votes: votes(lead.id), total })
        : t("deckTiePoints", { teams, points: best });
  } else {
    const w = own[0];
    if (w) {
      const team = teamOf(w, lead.name);
      const mission = missionClause(w.r.mission.text[lang] ?? "", lang);
      const host = nameOf(w.r.verdict?.by ?? lu.presenterId);
      if (!hosted)
        deck = t("deck", { team, votes: votes(lead.id), total, mission });
      else if (host) deck = t("deckHosted", { team, host, mission });
    }
  }

  const host = nameOf(lu.presenterId);
  const word = (n: number) =>
    hosted ? t("winsWord", { n }) : t("votesWord", { n });
  const rest = ranked.filter((p) => !starred.includes(p));
  return {
    mast: o.mast,
    half: o.half,
    game: o.game,
    total: hosted
      ? host
        ? t("totalHosted", { rounds, name: host })
        : t("rounds", { rounds })
      : t("total", { votes: total, rounds }),
    head,
    deck: deck ? capital(deck, lang) : null,
    kick: tie ? t("kickTie") : t("kick"),
    table: t("table"),
    statHead: hosted ? t("winsHead") : t("votesHead"),
    tie,
    stars: starred.map((p) => ({
      ...p,
      stat: stat(p.id),
      word: word(stat(p.id)),
    })),
    rows: rest.map((p) => ({
      ...p,
      place: t("place", { n: place(p.id) }),
      stat: stat(p.id),
    })),
    photos,
    rowH: people.length > 6 ? 24 : 27,
  };
}

/**
 * The front page as the viewer reads it, the same object while what it
 * prints is the same, so the scene isn't drawn again on every room update.
 */
function usePaper(): Paper | null {
  const { view, playerById } = useRoomContext();
  const t = useTranslations("lineup.end");
  const tt = useTranslations("room.title");
  const tg = useTranslations("home.games");
  const lang = useLocale() as Lang;
  // this game's match number in the room, as the opening wrote it ("1st half")
  const n = view.gameRound;
  const paper = view.lu
    ? buildPaper(view.lu, playerById, {
        t,
        lang,
        half: `${tt("halfNumber", { n })}${tt("halfRest")}`,
        game: tg("whatFor.name"),
        mast: { before: t("mastBefore"), after: t("mastAfter") },
      })
    : null;
  const key = JSON.stringify(paper);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on what the page prints
  return useMemo(() => paper, [key]);
}

/**
 * What for?'s end: a close-up on the table, the next day's newspaper pushed
 * in from below, turning, and landing. Its front page has the champion's
 * winning board as the photo, the headline, the star of the match and the
 * standings; a red pen circles the star. Then the camera pulls back and the
 * paper slides aside for the reward card.
 */
export function LineupEndScene({ portrait }: EndProps) {
  const paper = usePaper();
  return paper ? <LineupEnd paper={paper} portrait={portrait} /> : null;
}

const LineupEnd = memo(function LineupEnd({
  paper,
  portrait,
}: {
  paper: Paper;
  portrait: boolean;
}) {
  return (
    <div className={cn(s.root, portrait && s.portrait)} aria-hidden="true">
      <div className={s.grade}>
        <div className={s.screen}>
          <div
            className={s.cam}
            style={{ animationDelay: `0s, ${sec(T.aside)}` }}
          >
            <div className={cn(s.tableBox, s.wood)} />
            <div className={cn(s.tableBox, s.varnish)} />
            <span className={s.ring} />
            <div className={s.slide} style={{ animationDelay: sec(T.aside) }}>
              <div className={s.move} style={{ animationDelay: sec(T.push) }}>
                <span
                  className={s.shade}
                  style={{ animationDelay: sec(T.push) }}
                />
                <span className={cn(s.sheet, s.sheetB)} />
                <span className={cn(s.sheet, s.sheetA)} />
                <span className={s.contact} />
                <Page paper={paper} portrait={portrait} />
              </div>
            </div>
          </div>
        </div>
        <span className={cn(s.layer, s.light)} />
        <span className={s.grain} />
      </div>
      <span className={s.black} />
    </div>
  );
});

/** The front page: masthead, folio, headline, the photo, the star and the standings, inked and folded. */
function Page({ paper, portrait }: { paper: Paper; portrait: boolean }) {
  const { tie } = paper;
  return (
    // the light theme's tokens for what the page borrows from the app (the logo's letters, a
    // character's picture on the board): a printed page looks the same in both themes
    <div className={s.paper} data-art-theme="light">
      <div className={cn(s.layer, s.tex)} />
      <div className={cn(s.layer, s.thru)} />
      <div className={s.ink}>
        <div className={s.mast}>
          {paper.mast.before ? (
            <span className={s.name}>{paper.mast.before}</span>
          ) : null}
          <Logo className={s.logo} />
          {paper.mast.after ? (
            <span className={s.name}>{paper.mast.after}</span>
          ) : null}
        </div>
        <span className={s.rule} style={{ top: 98 }} />
        <span className={cn(s.rule, s.thin)} style={{ top: 103 }} />
        <div className={s.folio}>
          <span className={s.fb}>{paper.half}</span>
          <span>{paper.game}</span>
          <span className={s.fb}>{paper.total}</span>
        </div>
        <span className={cn(s.rule, s.thin)} style={{ top: 130 }} />
        <h1
          className={s.head}
          style={{ fontSize: headSize(paper.head, tie ? 52 : 56) }}
        >
          {paper.head}
        </h1>
        {tie && paper.deck ? (
          <p className={s.deck} style={{ top: 258 }}>
            {paper.deck}
          </p>
        ) : null}
        <div className={s.body} style={{ top: tie ? 322 : 270 }}>
          <div className={s.photos}>
            {paper.photos.map((p, k) => (
              <PhotoOf key={p.key} photo={p} tie={tie} tilt={TILT[k] ?? 0} />
            ))}
          </div>
          <div className={s.side}>
            {!tie && paper.deck ? (
              <p className={cn(s.deck, s.deckSide)}>{paper.deck}</p>
            ) : null}
            <div className={s.kick}>{paper.kick}</div>
            <div className={s.stars}>
              {paper.stars.map((p, k) => (
                <StarOf
                  key={p.id}
                  star={p}
                  k={k}
                  tie={tie}
                  three={paper.stars.length > 2}
                />
              ))}
            </div>
            <div className={s.table}>
              <div className={s.th}>
                <span>{paper.table}</span>
                <span>{paper.statHead}</span>
              </div>
              {paper.rows.map((r) => (
                <div key={r.id} className={s.tr} style={{ height: paper.rowH }}>
                  <span className={s.pos}>{r.place}</span>
                  <span
                    className={s.av}
                    style={{
                      width: 24,
                      height: 24,
                      background: r.avatar.color,
                      boxShadow: `0 0 0 1.5px #ece6d5, 0 0 0 3px ${seatOf(r.slot)}`,
                    }}
                  >
                    {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
                    <img src={avatarSrc(r.avatar)} alt="" />
                  </span>
                  <span className={s.tname}>{r.name}</span>
                  <span className={s.tv}>{r.stat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {portrait ? <span className={s.copy} /> : null}
      </div>
      <div className={cn(s.layer, s.fold)} />
      <div className={cn(s.layer, s.fold2)} />
      <div className={cn(s.layer, s.wave)} />
      <span className={s.curl} />
    </div>
  );
}

/** A winning board on its wall, photographed and printed in halftone, with its caption. */
function PhotoOf({
  photo,
  tie,
  tilt,
}: {
  photo: Photo;
  tie: boolean;
  tilt: number;
}) {
  const ph = tie ? PHOTO.tie : PHOTO.one;
  const wall = `lu-end-wall-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className={s.figure} style={{ width: ph.w }}>
      <div className={s.photo} style={{ width: ph.w, height: ph.h }}>
        <div className={s.photoGrade}>
          <svg className={s.wall} width={ph.w} height={ph.h} aria-hidden="true">
            <defs>
              <pattern
                id={wall}
                width="40"
                height="60"
                patternUnits="userSpaceOnUse"
                x="-6"
                y="-10"
              >
                <rect width="40" height="60" fill="#c4834a" />
                <path d="M20 0L40 30L20 60L0 30Z" fill="#dfbf8a" />
                <path
                  d="M20 0L40 30L20 60L0 30Z"
                  fill="none"
                  stroke="#6e4120"
                  strokeWidth="1.4"
                  strokeOpacity=".6"
                />
                <circle
                  cx="20"
                  cy="30"
                  r="3"
                  fill="#7a3f18"
                  fillOpacity=".85"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${wall})`} />
            <rect width="100%" height="100%" fill="#2a1406" fillOpacity=".18" />
          </svg>
          <div
            className={s.shot}
            style={{
              transform: `translate(-50%, -50%) scale(${ph.s}) rotate(${tilt}deg)`,
            }}
          >
            <BoardView
              board={photo.board}
              cards={photo.cards}
              tags={photo.tags}
            />
          </div>
        </div>
        <span className={s.dots} />
      </div>
      <div className={s.cap}>
        {photo.team ? (
          <>
            <b className={s.cb}>{photo.team}</b> ·{" "}
          </>
        ) : null}
        {photo.caption}
      </div>
    </div>
  );
}

/** A champion: their picture in their seat's colour, their name and score, circled in red pen. */
function StarOf({
  star,
  k,
  tie,
  three,
}: {
  star: Star;
  k: number;
  tie: boolean;
  three: boolean;
}) {
  const avS = tie ? (three ? 56 : 72) : 92;
  const mw = avS + 34;
  const align = tie ? "center" : "flex-start";
  return (
    <div
      className={s.star}
      style={{ flexDirection: tie ? "column" : "row", alignItems: align }}
    >
      <span
        className={s.av}
        style={{
          width: avS,
          height: avS,
          background: star.avatar.color,
          boxShadow: `0 0 0 3px #ece6d5, 0 0 0 6px ${seatOf(star.slot)}`,
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
        <img src={avatarSrc(star.avatar)} alt="" />
      </span>
      <div className={s.starText} style={{ alignItems: align }}>
        <span
          className={s.sname}
          style={{ fontSize: tie ? (three ? 20 : 24) : 36 }}
        >
          {star.name}
        </span>
        <span className={s.votes}>
          <b
            className={s.vn}
            style={{ fontSize: tie ? (three ? 34 : 42) : 58 }}
          >
            {star.stat}
          </b>
          <span className={s.vl}>{star.word}</span>
        </span>
      </div>
      {/* in a tie the circle sits on the avatar, centred in its column */}
      <svg
        className={s.mark}
        style={{ left: tie ? `calc(50% - ${mw / 2}px)` : -17, top: -17 }}
        width={mw}
        height={mw}
        aria-hidden="true"
      >
        <path
          pathLength={1}
          d={circlePath(mw / 2, mw / 2, avS / 2 + 11, avS / 2 + 9, k * 2.3 + 1)}
          style={{ animationDelay: sec(T.mark) }}
        />
      </svg>
    </div>
  );
}
