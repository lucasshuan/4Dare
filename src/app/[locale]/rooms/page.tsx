import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Access, RoomsScreen } from "@/features/rooms/rooms-screen";
import { isGameKey } from "@/game/games";
import type { Lang } from "@/game/types";
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

/** /rooms?game=who-am-i&q=crew&access=private: every listed room; each filter is optional. */
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
      }}
    />
  );
}
