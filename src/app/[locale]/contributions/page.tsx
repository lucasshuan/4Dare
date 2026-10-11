import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContributionsScreen } from "@/features/community/contributions-screen";
import { SheetDrawerProvider } from "@/features/library/sheet-drawer";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { CONTRIBUTIONS } from "@/lib/routes";
import { helperBoard } from "@/server/community";
import { pageMetadata } from "@/server/seo";

// the top helpers are rendered with the page and kept five minutes
export const revalidate = 300;

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

/**
 * /contributions: what the community added to the library and the Workshop.
 * The top helpers come from the server's cache (five minutes), so they paint
 * with the page.
 */
export default async function Contributions({
  params,
}: PageProps<"/[locale]/contributions">) {
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const helpers = await helperBoard("month", locale).catch(() => null);
  return (
    <PageMessages only={["community", "library"]}>
      <SheetDrawerProvider>
        <ContributionsScreen helpers={helpers} />
      </SheetDrawerProvider>
    </PageMessages>
  );
}
