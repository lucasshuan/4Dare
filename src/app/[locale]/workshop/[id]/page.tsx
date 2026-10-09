import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { WorkshopScreen } from "@/features/workshop/workshop-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { workshopPath } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/workshop/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({
    locale: locale as Lang,
    namespace: "meta",
  });
  return pageMetadata({
    lang: locale as Lang,
    path: workshopPath(id),
    title: t("workshop.title"),
    description: t("workshop.description"),
    index: false,
  });
}

/** A shared link to one suggestion: the Workshop with its card first, ready for a vote. */
export default async function WorkshopSuggestion({
  params,
}: PageProps<"/[locale]/workshop/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["workshop", "library"]}>
      <WorkshopScreen focus={decodeURIComponent(id)} />
    </PageMessages>
  );
}
