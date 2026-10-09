import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalScreen } from "@/features/legal/legal-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { TERMS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: TERMS,
    title: t("terms.title"),
    description: t("terms.description"),
  });
}

/** /terms: the rules for playing 4Dare, the essentials first. */
export default async function Terms({ params }: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["legal"]}>
      <LegalScreen doc="terms" />
    </PageMessages>
  );
}
