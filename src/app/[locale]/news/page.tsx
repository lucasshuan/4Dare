import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsScreen } from "@/features/news/news-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { NEWS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/news">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: NEWS,
    title: t("news.title"),
    description: t("news.description"),
  });
}

/** /news?game=&kind=: what changed in 4Dare, by day; #post opens on one. */
export default async function News({ params }: PageProps<"/[locale]/news">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["news"]}>
      <NewsScreen />
    </PageMessages>
  );
}
