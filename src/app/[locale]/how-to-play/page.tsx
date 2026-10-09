import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HowToScreen } from "@/features/how-to/how-to-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { HOW_TO_PLAY } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/how-to-play">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: HOW_TO_PLAY,
    title: t("howTo.title"),
    description: t("howTo.description"),
  });
}

/** /how-to-play: the three games' rules on one page. */
export default async function HowToPlay({
  params,
}: PageProps<"/[locale]/how-to-play">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["howTo"]}>
      <HowToScreen />
    </PageMessages>
  );
}
