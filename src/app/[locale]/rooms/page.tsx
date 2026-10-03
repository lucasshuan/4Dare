import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Access, RoomsScreen } from "@/features/rooms/rooms-screen";
import { isGameKey } from "@/game/games";
import { LANGS, type Lang } from "@/game/types";
import { ROOMS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/rooms">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: ROOMS,
    title: t("rooms.title"),
    description: t("rooms.description"),
  });
}

const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

/** The `lang` param: "all", or languages separated by commas; anything else is the viewer's. */
function parseLangs(raw: string | undefined, locale: Lang) {
  if (raw === "all") return null;
  const picked = LANGS.filter((l) => raw?.split(",").includes(l));
  return picked.length ? picked : [locale];
}

/** /rooms?game=who-am-i&q=crew&access=private&lang=pt,ja: every listed room; each filter is optional. */
export default async function Rooms({
  params,
  searchParams,
}: PageProps<"/[locale]/rooms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const game = one(sp.game);
  const access = one(sp.access);
  return (
    <RoomsScreen
      initial={{
        game: isGameKey(game) ? game : null,
        q: (one(sp.q) ?? "").slice(0, 50),
        access:
          access === "public" || access === "private"
            ? (access as Access)
            : "all",
        langs: parseLangs(one(sp.lang), locale as Lang),
      }}
    />
  );
}
