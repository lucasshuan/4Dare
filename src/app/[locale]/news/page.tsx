import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsScreen } from "@/features/news/news-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { NEWS } from "@/lib/routes";
import { publicNews } from "@/server/news";
import { pageMetadata } from "@/server/seo";

// the posts are rendered with the page and kept ten minutes
export const revalidate = 600;

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
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const initial = await publicNews(locale).catch(() => null);
  return (
    <PageMessages only={["news"]}>
      <NewsScreen initial={initial} />
    </PageMessages>
  );
}
