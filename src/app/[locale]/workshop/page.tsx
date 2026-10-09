import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WorkshopScreen } from "@/features/workshop/workshop-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { WORKSHOP } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workshop">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: WORKSHOP,
    title: t("workshop.title"),
    description: t("workshop.description"),
  });
}

/** /workshop: the games' themes, questions and missions, the votes and the composer. */
export default async function Workshop({
  params,
}: PageProps<"/[locale]/workshop">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["workshop", "library"]}>
      <WorkshopScreen />
    </PageMessages>
  );
}
