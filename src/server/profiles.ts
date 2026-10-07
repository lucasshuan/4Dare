import "server-only";
import { GAME_KEYS } from "@/game/games";
import { displayName } from "@/game/guest-names";
import {
  BADGES,
  badgeValues,
  type Contributions,
  tierKey,
  tierOf,
} from "@/game/profile/badges";
import {
  factsOf,
  type PlayedMatch,
  totalsOf,
  whoAmINumbers,
} from "@/game/profile/history";
import { sees } from "@/game/profile/profile";
import type { Character, Lang, PlayerId } from "@/game/types";
import { getBackend } from "./backend";
import { entryId } from "./backend/seed-format";
import type { StoredProfile } from "./backend/types";
import type {
  BadgeView,
  CharacterDTO,
  ContributedPicture,
  FactView,
  GameView,
  PersonRef,
  PlayerCard,
  ProfileView,
} from "./contract";
import { currentMatch } from "./rooms";
import { pickKey } from "./theme-picks";

const DAY = 24 * 60 * 60 * 1000;
/** The garden's reach: 53 weeks and a day, so a whole first week fits. */
const GARDEN_MS = 372 * DAY;
const PICTURES = 24;
const CHARACTERS = 24;
/** Read for the library badges' counts; the page shows the first few. */
const COUNTED = 500;

export const person = (p: StoredProfile, lang: Lang): PersonRef => ({
  id: p.id,
  handle: p.handle,
  name: displayName({ isGuest: false, ...p }, lang),
  avatar: p.avatar,
});

const dto = ({
  id,
  lang,
  name,
  origin,
  imageUrl,
}: Character): CharacterDTO => ({
  id,
  lang,
  name,
  origin,
  imageUrl,
});

/**
 * Characters by their language-free ids, in the reader's language; one a
 * player made in another language comes in that one.
 */
async function charactersFor(keys: string[], lang: Lang) {
  const { characters } = getBackend();
  const found = await characters.getMany(
    keys.map((k) => (k.startsWith("u-") ? k : entryId(lang, k))),
    lang,
  );
  const byKey = new Map(found.map((c) => [pickKey(c.id), c]));
  const missing = keys.filter((k) => k.startsWith("u-") && !byKey.has(k));
  for (const c of await Promise.all(missing.map((k) => characters.get(k))))
    if (c) byKey.set(pickKey(c.id), c);
  return byKey;
}

/**
 * Every badge with how far the player got, the library's only when their
 * contributions show; tiers reached for the first time are kept with today.
 */
async function badgeViews(
  userId: PlayerId,
  matches: PlayedMatch[],
  made: Contributions | null,
): Promise<BadgeView[]> {
  const { badges } = getBackend();
  const values = badgeValues(
    matches,
    made ?? { pictures: 0, covers: 0, characters: 0 },
  );
  const rules = BADGES.filter((b) => made || b.group !== "library");
  const reached = rules.flatMap((b) => {
    const { tier } = tierOf(b.goals, values[b.id]);
    return Array.from({ length: tier }, (_, i) => ({
      key: tierKey(b.id, i + 1),
      game: b.group === "general" || b.group === "library" ? null : b.group,
    }));
  });
  const known = await badges.earned(userId);
  const fresh = reached.filter((r) => !known.has(r.key));
  if (fresh.length) {
    await badges.grant(userId, fresh);
    for (const r of fresh) known.set(r.key, Date.now());
  }
  return rules.map((b) => {
    const { tier } = tierOf(b.goals, values[b.id]);
    return {
      id: b.id,
      group: b.group,
      goals: b.goals,
      value: values[b.id],
      tier,
      earnedAt: tier ? (known.get(tierKey(b.id, tier)) ?? null) : null,
    };
  });
}

/** One game's card: every game's numbers plus its own. */
function gameView(
  game: GameView["game"],
  all: PlayedMatch[],
  now: number,
): GameView {
  const mine = all.filter((m) => m.game === game);
  const { xp: _xp, ...totals } = totalsOf(mine);
  return {
    game,
    ...totals,
    recent: mine.filter((m) => m.finishedAt > now - 30 * DAY).length,
    ...whoAmINumbers(mine),
  };
}

/** The quick card of an account, or null for a guest or an unknown id. */
export async function playerCard(
  id: PlayerId,
  viewer: PlayerId,
  lang: Lang,
): Promise<PlayerCard | null> {
  const { profiles, matches } = getBackend();
  const [profile] = await profiles.byIds([id]);
  if (!profile) return null;
  const { privacy } = profile;
  const isOwner = id === viewer;
  // "who played with me" is only asked when it matters
  const needsMate =
    !isOwner && [privacy.profile, privacy.activity].includes("played");
  const reader = {
    isOwner,
    playedWith: needsMate ? await matches.playedTogether(id, viewer) : false,
  };
  const open = sees(privacy.profile, reader);
  return {
    ...person(profile, lang),
    accent: profile.accent,
    banner: profile.banner,
    quote: open ? profile.quote : null,
    createdAt: profile.createdAt,
    numbers:
      open && sees(privacy.activity, reader) ? await matches.totals(id) : null,
  };
}

/** An account's profile page as `viewer` reads it, or null when no account has `handle`. */
export async function profileView(
  handle: string,
  viewer: PlayerId,
  lang: Lang,
): Promise<ProfileView | null> {
  const backend = getBackend();
  const profile = await backend.profiles.byHandle(handle);
  if (!profile) return null;
  const isMe = profile.id === viewer;
  const now = Date.now();
  const history = await backend.matches.history(profile.id);
  const reader = {
    isOwner: isMe,
    playedWith: history.some((m) => m.others.some((o) => o.id === viewer)),
  };
  const { privacy } = profile;
  const open = sees(privacy.profile, reader);
  const hidden = {
    profile: !open,
    mural: !open || !sees(privacy.mural, reader),
    activity: !open || !sees(privacy.activity, reader),
    showcase: !open || !sees(privacy.showcase, reader),
    contributions: !open || !sees(privacy.contributions, reader),
  };
  const base = {
    ...person(profile, lang),
    accent: profile.accent,
    banner: profile.banner,
    createdAt: profile.createdAt,
    isMe,
    hidden,
    own: isMe ? { privacy, handleChangedAt: profile.handleChangedAt } : null,
  };
  if (!open)
    return {
      ...base,
      quote: null,
      about: { time: null, langs: [] },
      showcase: [],
      xp: 0,
      matches: 0,
      wins: 0,
      timeMs: 0,
      playing: null,
      plays: [],
      games: [],
      facts: [],
      pictures: [],
      characters: [],
      badges: [],
    };

  const [playing, pictures, made, shown] = await Promise.all([
    privacy.playing || isMe ? currentMatch(profile.id) : null,
    hidden.contributions
      ? []
      : backend.images.byAuthor(profile.id, isMe, COUNTED),
    hidden.contributions
      ? []
      : backend.characters.createdBy(profile.id, COUNTED),
    hidden.showcase
      ? new Map<string | null, Character>()
      : charactersFor(
          profile.showcase.map((s) => s.characterId),
          lang,
        ),
  ]);

  const activity = hidden.activity ? [] : history;
  const facts = factsOf(activity);
  const named = new Map(
    (
      await backend.profiles.byIds(
        facts.flatMap((f) =>
          f.kind === "partner"
            ? [f.id]
            : f.kind === "hardest" && f.to
              ? [f.to]
              : [],
        ),
      )
    ).map((p) => [p.id, person(p, lang)]),
  );
  const factViews = facts.flatMap((f): FactView[] => {
    if (f.kind === "partner") {
      const { id, ...rest } = f;
      const who = named.get(id);
      return who ? [{ ...rest, person: who }] : [];
    }
    if (f.kind === "hardest")
      return [{ ...f, to: f.to ? (named.get(f.to) ?? null) : null }];
    return [f];
  });

  // the pictures' characters in the reader's language
  // the pictures' characters in the reader's language
  const pictured = await charactersFor(
    pictures.flatMap((p) => (p.characterId ? [p.characterId] : [])),
    lang,
  );
  const isCover = (p: (typeof pictures)[number]) => {
    const c = p.characterId ? pictured.get(pickKey(p.characterId)) : undefined;
    return !!c && c.imageUrl === p.url;
  };
  const pictureViews = pictures
    .slice(0, PICTURES)
    .map((p): ContributedPicture => {
      const c = p.characterId
        ? pictured.get(pickKey(p.characterId))
        : undefined;
      return {
        id: p.id,
        url: p.url,
        status: p.status === "pending" ? "pending" : "active",
        cover: isCover(p),
        character: c ? { id: c.id, name: c.name, origin: c.origin } : null,
      };
    });

  const badges = hidden.activity
    ? []
    : await badgeViews(
        profile.id,
        activity,
        hidden.contributions
          ? null
          : {
              pictures: pictures.filter((p) => p.status === "active").length,
              covers: pictures.filter(
                (p) => p.status === "active" && isCover(p),
              ).length,
              characters: made.length,
            },
      );

  return {
    ...base,
    quote: profile.quote,
    about: profile.about,
    showcase: hidden.showcase
      ? []
      : profile.showcase.map((s) => {
          const c = shown.get(pickKey(s.characterId));
          return { ...s, character: c ? dto(c) : null };
        }),
    ...totalsOf(activity),
    playing: playing?.game ?? null,
    plays: activity
      .filter((m) => m.finishedAt > now - GARDEN_MS)
      .map((m) => ({ at: m.finishedAt, game: m.game, won: m.place === 1 })),
    games: GAME_KEYS.map((g) => gameView(g, activity, now)).filter(
      (g) => g.matches > 0,
    ),
    facts: factViews,
    pictures: pictureViews,
    characters: made.slice(0, CHARACTERS).map(dto),
    badges,
  };
}
