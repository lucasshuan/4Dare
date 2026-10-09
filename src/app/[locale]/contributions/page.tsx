import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContributionsScreen } from "@/features/community/contributions-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { CONTRIBUTIONS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contributions">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: CONTRIBUTIONS,
    title: t("contributions.title"),
    description: t("contributions.description"),
  });
}

/** /contributions: what the community added to the library and the Workshop. */
export default async function Contributions({
  params,
}: PageProps<"/[locale]/contributions">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["community"]}>
      <ContributionsScreen />
    </PageMessages>
  );
}
