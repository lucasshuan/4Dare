import { getBackend } from "@/server/backend";
import { failure, handle, noStore } from "@/server/http";
import { allow } from "@/server/rate-limit";

const ALL = 5000;

/**
 * Everything kept about the signed-in account, as a JSON file to save: the
 * account, the profile, every match, the badges' days, the pictures sent and
 * the characters made.
 */
export async function GET() {
  return handle(async () => {
    const backend = getBackend();
    const me = await backend.auth.me("en");
    if (me.isGuest) return failure("unauthorized");
    if (!allow(`export:${me.id}`, 5, 60_000)) return failure("rate_limited");
    const [info, [profile], matches, badges, pictures, characters] =
      await Promise.all([
        backend.auth.accountInfo(),
        backend.profiles.byIds([me.id]),
        backend.matches.history(me.id),
        backend.badges.earned(me.id),
        backend.images.byAuthor(me.id, true, ALL),
        backend.characters.createdBy(me.id, ALL),
      ]);
    const body = {
      exportedAt: new Date().toISOString(),
      account: {
        id: me.id,
        name: me.name,
        email: info?.email ?? null,
        providers: info?.providers ?? [],
        settings: me.settings,
      },
      profile: profile ?? null,
      matches,
      badges: Object.fromEntries(
        [...badges].map(([k, at]) => [k, new Date(at).toISOString()]),
      ),
      pictures: pictures.map(({ id, characterId, url, status }) => ({
        id,
        characterId,
        url,
        status,
      })),
      characters: characters.map(({ id, lang, name, origin, imageUrl }) => ({
        id,
        lang,
        name,
        origin,
        imageUrl,
      })),
    };
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        ...noStore,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="4dare-${profile?.handle ?? me.id}.json"`,
      },
    });
  });
}
