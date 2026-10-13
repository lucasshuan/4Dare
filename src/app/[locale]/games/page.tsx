import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GamesScreen } from "@/features/games/games-screen";
import type { Lang } from "@/game/types";
import { GAME_LIST } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/games">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: GAME_LIST,
    title: t("games.title"),
    description: t("games.description"),
  });
}

/** /games?q=vote&players=4&tags=bluff&online=1&sort=name: every game. Static: the screen reads the filters. */
export default async function Games({ params }: PageProps<"/[locale]/games">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GamesScreen />;
}
