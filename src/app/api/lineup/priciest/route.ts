import { extraCard } from "@/game/lineup/bank";
import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "@/server/backend";
import { entryId } from "@/server/backend/seed-format";
import type { PriciestCard } from "@/server/contract";

/**
 * What for?'s dearest characters in `?lang=`, by their average price at
 * auction: `{ cards: PriciestCard[] }`, empty until enough were sold. The
 * same for everyone, so CDNs keep it an hour.
 */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("lang");
  const lang: Lang = LANGS.includes(asked as Lang) ? (asked as Lang) : "en";
  const { lineup, characters } = getBackend();
  const top = await lineup.priciest(lang);
  const extras = new Map((await lineup.extras()).map((x) => [`x:${x.id}`, x]));
  const found = new Map(
    (
      await characters.getMany(
        top.flatMap((t) =>
          t.id.startsWith("x:") ? [] : [entryId(lang, t.id)],
        ),
        lang,
      )
    ).map((c) => [c.id, c]),
  );
  const cards = top.flatMap((t): PriciestCard[] => {
    const extra = extras.get(t.id);
    if (extra) {
      const card = extraCard(extra, lang);
      return [{ ...card, avg: t.avg, sold: t.sold }];
    }
    const c = found.get(entryId(lang, t.id));
    return c?.imageUrl
      ? [
          {
            id: t.id,
            name: c.name,
            origin: c.origin ?? null,
            imageUrl: c.imageUrl,
            avg: t.avg,
            sold: t.sold,
          },
        ]
      : [];
  });
  return Response.json(
    { cards },
    {
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
