import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RankingsScreen } from "@/features/community/rankings-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { RANKINGS } from "@/lib/routes";
import { rankingBoard, rankingQuery } from "@/server/community";
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

/**
 * /rankings?game=&period=: the XP ranking, per game and period. The board
 * comes from the server's cache (five minutes), so it paints with the page;
 * the reader's own row comes after, from the browser.
 */
export default async function Rankings({
  params,
  searchParams,
}: PageProps<"/[locale]/rankings">) {
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const sp = await searchParams;
  const { game, period } = rankingQuery(
    new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) =>
        typeof v === "string" ? [[k, v]] : [],
      ),
    ),
  );
  const board = await rankingBoard(game, period, locale).catch(() => null);
  return (
    <PageMessages only={["community"]}>
      <RankingsScreen
        // a link to another game or period starts the screen over
        key={`${game}-${period}`}
        game={game ?? "all"}
        period={period}
        board={board}
      />
    </PageMessages>
  );
}
