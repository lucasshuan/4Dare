import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlayersScreen } from "@/features/community/players-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { PLAYERS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/players">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: PLAYERS,
    title: t("players.title"),
    description: t("players.description"),
  });
}

/** /players: people to play with. */
export default async function Players({
  params,
}: PageProps<"/[locale]/players">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["community"]}>
      <PlayersScreen />
    </PageMessages>
  );
}
