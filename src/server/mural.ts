import "server-only";
// A profile's mural: short lines from accounts, one level of replies. Who
// reads it, writes on it and replies follows the owner's privacy; the owner
// may take any line down; three reports hide one.
import { sees } from "@/game/profile/profile";
import {
  GameError,
  type Identity,
  type Lang,
  type PlayerId,
} from "@/game/types";
import { getBackend } from "./backend";
import type { StoredComment, StoredProfile } from "./backend/types";
import type { MuralLine, MuralView } from "./contract";
import { person } from "./profiles";

export const MURAL_PAGE = 10;
export const MURAL_BODY_MAX = 200;

/** A line as kept: one paragraph, trimmed, 1 to 200 characters; null when it is none. */
export function cleanBody(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const body = raw.replace(/\s+/g, " ").trim();
  return body && [...body].length <= MURAL_BODY_MAX ? body : null;
}

/** What `viewer` may do on `profile`'s mural. Guests only read. */
async function access(profile: StoredProfile, viewer: Identity) {
  const { privacy } = profile;
  const isOwner = profile.id === viewer.id;
  const needsMate =
    !isOwner &&
    !viewer.isGuest &&
    [
      privacy.profile,
      privacy.mural,
      privacy.muralWrite,
      privacy.muralReply,
    ].includes("played");
  const reader = {
    isOwner,
    playedWith: needsMate
      ? await getBackend().matches.playedTogether(profile.id, viewer.id)
      : false,
  };
  const see = sees(privacy.profile, reader) && sees(privacy.mural, reader);
  const account = !viewer.isGuest;
  return {
    isOwner,
    see,
    write: see && account && sees(privacy.muralWrite, reader),
    reply: see && account && (isOwner || sees(privacy.muralReply, reader)),
  };
}

const profileOf = async (handle: string) => {
  const profile = await getBackend().profiles.byHandle(handle);
  if (!profile) throw new GameError("not_found");
  return profile;
};

/** A page of the mural as `viewer` reads it, or null when they may not. */
export async function muralView(
  handle: string,
  viewer: Identity,
  lang: Lang,
  before: number | null,
): Promise<MuralView | null> {
  const { mural, profiles } = getBackend();
  const profile = await profiles.byHandle(handle);
  if (!profile) return null;
  const can = await access(profile, viewer);
  if (!can.see) return null;
  const page = await mural.page(profile.id, before, MURAL_PAGE);
  // a hidden line stays for its author only
  const visible = (c: StoredComment) => !c.hidden || c.authorId === viewer.id;
  const all = [...page.lines, ...page.replies].filter(visible);
  const authors = new Map(
    (await profiles.byIds([...new Set(all.map((c) => c.authorId))])).map(
      (p) => [p.id, person(p, lang)],
    ),
  );
  const line = (c: StoredComment): MuralLine | null => {
    const author = authors.get(c.authorId);
    // an account deleted since: its lines went with it
    if (!author) return null;
    return {
      id: c.id,
      author,
      body: c.body,
      at: c.createdAt,
      hidden: c.hidden,
      mine: c.authorId === viewer.id,
      canDelete: can.isOwner || c.authorId === viewer.id,
      replies: [],
    };
  };
  const lines = page.lines.filter(visible).flatMap((c) => line(c) ?? []);
  for (const r of page.replies.filter(visible)) {
    const parent = lines.find((l) => l.id === r.parentId);
    const reply = line(r);
    if (parent && reply) parent.replies.push(reply);
  }
  return {
    lines,
    more: page.more,
    canWrite: can.write,
    canReply: can.reply,
  };
}

/** A new line (or a reply to `parentId`) on `handle`'s mural; its id. */
export async function postLine(
  handle: string,
  viewer: Identity,
  rawBody: unknown,
  parentId: number | null,
): Promise<number> {
  const body = cleanBody(rawBody);
  if (!body) throw new GameError("invalid_input");
  const profile = await profileOf(handle);
  const can = await access(profile, viewer);
  if (parentId === null ? !can.write : !can.reply)
    throw new GameError("unauthorized");
  const id = await getBackend().mural.post({
    profileId: profile.id,
    authorId: viewer.id,
    parentId,
    body,
  });
  if (id === null) throw new GameError("rate_limited");
  return id;
}

/** Takes a line down: the mural's owner may take any, an author their own. */
export async function deleteLine(id: number, viewer: PlayerId) {
  const { mural } = getBackend();
  const line = await mural.get(id);
  if (!line) return;
  if (line.profileId !== viewer && line.authorId !== viewer)
    throw new GameError("unauthorized");
  await mural.remove(id);
}

/** Reports someone else's line; the third report hides it. */
export async function reportLine(id: number, viewer: Identity) {
  if (viewer.isGuest) throw new GameError("unauthorized");
  const { mural } = getBackend();
  const line = await mural.get(id);
  if (!line) throw new GameError("not_found");
  if (line.authorId === viewer.id) throw new GameError("invalid_input");
  return mural.report(id, viewer.id);
}
