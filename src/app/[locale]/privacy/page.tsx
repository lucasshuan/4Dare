import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalScreen } from "@/features/legal/legal-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { PRIVACY } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: PRIVACY,
    title: t("privacy.title"),
    description: t("privacy.description"),
  });
}

/** /privacy: what 4Dare keeps and why, the essentials first. */
export default async function Privacy({
  params,
}: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["legal"]}>
      <LegalScreen doc="privacy" />
    </PageMessages>
  );
}
