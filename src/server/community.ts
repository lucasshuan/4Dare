import "server-only";
import type { GameKey } from "@/game/games";
import { BADGES, TIERS } from "@/game/profile/badges";
import { sees } from "@/game/profile/profile";
import { levelOf } from "@/game/profile/xp";
import type { Lang } from "@/game/types";
import { getBackend } from "./backend";
import type { FeedRow, StoredSuggestion } from "./backend/community-types";
import { appId, catalog, peopleOf } from "./catalog";
import type {
  ContributionItem,
  ContributionsPage,
  FeedFilter,
  PlayersFilter,
  PlayersPage,
  PlayerTile,
  RankingPage,
  RankingPeriod,
} from "./community-contract";
import { person } from "./profiles";
import { piecesOf } from "./workshop";

const DAY = 86_400_000;
const sinceOf = (period: RankingPeriod, now = Date.now()) =>
  period === "week"
    ? now - 7 * DAY
    : period === "month"
      ? now - 30 * DAY
      : null;

/** The ranking of a game (null: all) in a period, the reader's place, and who helped the library most. */
export async function rankingPage(
  game: GameKey | null,
  period: RankingPeriod,
  lang: Lang,
): Promise<RankingPage> {
  const me = await getBackend().auth.identity(lang);
  return buildRanking(game, period, lang, 20, me.isGuest ? null : me.id);
}

/**
 * A game's top three this week and the month's helpers: the same for
 * everyone (no reader's place), so a game page can cache it.
 */
export const podium = (game: GameKey, lang: Lang) =>
  buildRanking(game, "week", lang, 3, null);

async function buildRanking(
  game: GameKey | null,
  period: RankingPeriod,
  lang: Lang,
  top: number,
  meId: string | null,
): Promise<RankingPage> {
  const { community } = getBackend();
  const since = sinceOf(period);
  const [rows, overall, mine, helpers] = await Promise.all([
    community.ranking(game, since, top),
    // everyone's level comes from all their XP
    community.ranking(null, null, 500),
    meId ? community.place(meId, game, since) : Promise.resolve(null),
    community.contributors(Date.now() - 30 * DAY, 3),
  ]);
  const totals = new Map(overall.map((r) => [r.userId, r.xp]));
  const people = await peopleOf(
    [
      ...rows.map((r) => r.userId),
      ...helpers.map((h) => h.userId),
      mine ? meId : null,
    ],
    lang,
  );
  const level = (id: string) => levelOf(totals.get(id) ?? 0).level;
  return {
    rows: rows.flatMap((r, i) => {
      const p = people.get(r.userId);
      return p
        ? [
            {
              person: p,
              place: i + 1,
              xp: r.xp,
              matches: r.matches,
              wins: r.wins,
              level: level(r.userId),
            },
          ]
        : [];
    }),
    me:
      mine && meId && people.get(meId)
        ? {
            person: people.get(meId) as NonNullable<
              ReturnType<typeof people.get>
            >,
            place: mine.place,
            xp: mine.xp,
            matches: mine.matches,
            wins: mine.wins,
            level: level(meId),
          }
        : null,
    helpers: helpers.flatMap((h) => {
      const p = people.get(h.userId);
      return p
        ? [
            {
              person: p,
              total: h.total,
              pictures: h.pictures,
              aliases: h.aliases,
              characters: h.characters,
              live: h.live,
            },
          ]
        : [];
    }),
  };
}

const PLAYERS_PAGE = 30;

/** People to play with, as each one lets the reader see them. */
export async function playersPage(
  q: string,
  filter: PlayersFilter,
  offset: number,
  lang: Lang,
): Promise<PlayersPage> {
  const { auth, community, profiles } = getBackend();
  const me = await auth.identity(lang);
  const [mates, seated] = await Promise.all([
    me.isGuest
      ? Promise.resolve(new Map<string, number>())
      : community.coPlayers(me.id),
    community.seated(Date.now() - 20 * 60_000),
  ]);
  let ids: string[];
  let more = false;
  if (filter === "with") {
    const all = [...mates.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    ids = all.slice(offset, offset + PLAYERS_PAGE);
    more = all.length > offset + PLAYERS_PAGE;
  } else if (filter === "now") {
    const all = [...seated.keys()];
    ids = all.slice(offset, offset + PLAYERS_PAGE);
    more = all.length > offset + PLAYERS_PAGE;
  } else {
    const rows = await community.players(q, offset, PLAYERS_PAGE + 1);
    more = rows.length > PLAYERS_PAGE;
    ids = rows.slice(0, PLAYERS_PAGE).map((r) => r.id);
  }
  const found = await profiles.byIds(ids.filter((id) => id !== me.id));
  const byId = new Map(found.map((p) => [p.id, p]));
  const needle = q.trim().toLowerCase();
  const overall = await community.ranking(null, null, 500);
  const totals = new Map(overall.map((r) => [r.userId, r.xp]));
  const tiles: PlayerTile[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p) continue;
    const ref = person(p, lang);
    if (
      needle &&
      filter !== "all" &&
      !`${ref.name} ${p.handle}`.toLowerCase().includes(needle)
    )
      continue;
    const reader = { isOwner: false, playedWith: mates.has(id) };
    const open = sees(p.privacy.profile, reader);
    const seat = seated.get(id);
    if (filter === "now" && (!seat || !p.privacy.playing || !open)) continue;
    tiles.push({
      person: ref,
      level:
        open && sees(p.privacy.activity, reader)
          ? levelOf(totals.get(id) ?? 0).level
          : null,
      together: mates.get(id) ?? 0,
      playing:
        open && p.privacy.playing && seat
          ? { game: seat.game as GameKey, code: seat.public ? seat.code : null }
          : null,
    });
  }
  return { players: tiles, next: more ? offset + PLAYERS_PAGE : null };
}

const FEED_PAGE = 30;

const titleOf = (
  s: {
    kind: StoredSuggestion["kind"];
    payload: unknown;
    lang: Lang;
    translations: StoredSuggestion["translations"];
  },
  lang: Lang,
) => {
  const draft = { kind: s.kind, [s.kind]: s.payload } as Parameters<
    typeof piecesOf
  >[0];
  const own = piecesOf(draft);
  const key = s.kind === "theme" ? "name" : "text";
  return (lang !== s.lang && s.translations[lang]?.[key]) || own[key] || "";
};

/** What the community put into the library and the Workshop, newest first; `mine` for the reader's own. */
export async function contributionsPage(
  kind: FeedFilter,
  before: number | null,
  mineOnly: boolean,
  lang: Lang,
): Promise<ContributionsPage> {
  const { auth, community } = getBackend();
  const me = await auth.identity(lang);
  const account = !me.isGuest;
  const rows = await community.feed(
    kind === "all" ? null : kind,
    mineOnly && account ? me.id : null,
    before,
    FEED_PAGE,
  );
  const [people, cat] = await Promise.all([
    peopleOf(
      rows.map((r) => r.userId),
      lang,
    ),
    catalog(lang),
  ]);
  const items = rows.flatMap((r: FeedRow): ContributionItem[] => {
    const by = people.get(r.userId);
    if (!by) return [];
    const row = r.characterId ? cat.byId.get(r.characterId) : null;
    const d = r.detail;
    return [
      {
        id: `${r.kind}:${r.ref}:${r.at}`,
        kind: r.kind,
        at: r.at,
        by,
        character:
          row && r.characterId
            ? {
                id: appId(lang, r.characterId),
                name: row.name,
                imageUrl: row.imageUrl,
              }
            : null,
        alias:
          r.kind === "alias"
            ? {
                name: String(d.name ?? ""),
                before: typeof d.before === "string" ? d.before : null,
                edited: d.action === "edit",
              }
            : null,
        suggestion:
          r.kind === "suggestion" || r.kind === "live"
            ? {
                id: r.ref,
                kind: d.kind as StoredSuggestion["kind"],
                title: titleOf(
                  {
                    kind: d.kind as StoredSuggestion["kind"],
                    payload: d.payload,
                    lang: d.lang as Lang,
                    translations: (d.translations ??
                      {}) as StoredSuggestion["translations"],
                  },
                  lang,
                ),
                status: d.status as StoredSuggestion["status"],
              }
            : null,
      },
    ];
  });
  let mine: ContributionsPage["mine"] = null;
  if (account) {
    const counts = await community.mine(me.id);
    const rule = BADGES.find((b) => b.id === "pictures");
    const goals = rule?.goals ?? [1, 10, 50];
    const reached = goals.filter((g) => counts.pictures >= g).length;
    mine = {
      ...counts,
      badge: {
        id: "pictures",
        tier: reached ? TIERS[reached - 1] : null,
        next: reached < goals.length ? goals[reached] : null,
        value: counts.pictures,
      },
    };
  }
  return {
    items,
    next: rows.length === FEED_PAGE ? (rows.at(-1)?.at ?? null) : null,
    mine,
  };
}
