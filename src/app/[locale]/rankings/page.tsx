import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RankingsScreen } from "@/features/community/rankings-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { RANKINGS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/rankings">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: RANKINGS,
    title: t("rankings.title"),
    description: t("rankings.description"),
  });
}

/** /rankings: the XP ranking, per game and period. */
export default async function Rankings({
  params,
}: PageProps<"/[locale]/rankings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["community"]}>
      <RankingsScreen />
    </PageMessages>
  );
}
