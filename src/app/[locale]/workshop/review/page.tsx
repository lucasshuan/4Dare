import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReviewScreen } from "@/features/workshop/review-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { WORKSHOP_REVIEW } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workshop/review">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: WORKSHOP_REVIEW,
    title: t("workshop.title"),
    description: t("workshop.description"),
    index: false,
  });
}

/** /workshop/review: the curators' queue. */
export default async function WorkshopReview({
  params,
}: PageProps<"/[locale]/workshop/review">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["workshop", "library"]}>
      <ReviewScreen />
    </PageMessages>
  );
}
