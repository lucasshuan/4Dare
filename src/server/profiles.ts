import "server-only";
import { GAME_KEYS } from "@/game/games";
import { displayName } from "@/game/guest-names";
import {
  factsOf,
  type PlayedMatch,
  totalsOf,
  whoAmINumbers,
} from "@/game/profile/history";
import type { Lang, PlayerId } from "@/game/types";
import { getBackend } from "./backend";
import { entryId } from "./backend/seed-format";
import type { StoredProfile } from "./backend/types";
import type {
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

const person = (p: StoredProfile, lang: Lang): PersonRef => ({
  id: p.id,
  handle: p.handle,
  name: displayName({ isGuest: false, ...p }, lang),
  avatar: p.avatar,
});

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
  lang: Lang,
): Promise<PlayerCard | null> {
  const backend = getBackend();
  const [profile] = await backend.profiles.byIds([id]);
  if (!profile) return null;
  const totals = await backend.matches.totals(id);
  return {
    ...person(profile, lang),
    accent: profile.accent,
    quote: profile.quote,
    createdAt: profile.createdAt,
    ...totals,
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
  const [history, playing, pictures, characters] = await Promise.all([
    backend.matches.history(profile.id),
    currentMatch(profile.id),
    backend.images.byAuthor(profile.id, isMe, PICTURES),
    backend.characters.createdBy(profile.id, CHARACTERS),
  ]);

  const facts = factsOf(history);
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
  const shown = await backend.characters.getMany(
    pictures.flatMap(({ characterId: id }) =>
      !id ? [] : id.startsWith("u-") ? [id] : [entryId(lang, id)],
    ),
    lang,
  );
  const byKey = new Map(shown.map((c) => [pickKey(c.id), c]));
  const pictureViews = pictures.map((p): ContributedPicture => {
    const c = p.characterId ? byKey.get(pickKey(p.characterId)) : undefined;
    return {
      id: p.id,
      url: p.url,
      status: p.status === "pending" ? "pending" : "active",
      cover: !!c && c.imageUrl === p.url,
      character: c ? { id: c.id, name: c.name, origin: c.origin } : null,
    };
  });

  return {
    ...person(profile, lang),
    accent: profile.accent,
    quote: profile.quote,
    createdAt: profile.createdAt,
    isMe,
    ...totalsOf(history),
    playing: playing?.game ?? null,
    plays: history
      .filter((m) => m.finishedAt > now - GARDEN_MS)
      .map((m) => ({ at: m.finishedAt, game: m.game, won: m.place === 1 })),
    games: GAME_KEYS.map((g) => gameView(g, history, now)).filter(
      (g) => g.matches > 0,
    ),
    facts: factViews,
    pictures: pictureViews,
    characters: characters.map(({ id, lang: l, name, origin, imageUrl }) => ({
      id,
      lang: l,
      name,
      origin,
      imageUrl,
    })),
  };
}
