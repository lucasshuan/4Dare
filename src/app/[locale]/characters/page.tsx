import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CharactersScreen } from "@/features/library/characters-screen";
import { SheetDrawerProvider } from "@/features/library/sheet-drawer";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { CHARACTERS } from "@/lib/routes";
import { browse } from "@/server/catalog";
import { pageMetadata } from "@/server/seo";

// the first page of the list is rendered with the page and kept ten minutes
export const revalidate = 600;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/characters">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: CHARACTERS,
    title: t("characters.title"),
    description: t("characters.description"),
  });
}

/**
 * /characters?q=&taste=&sort=&need=: the whole library; the screen reads the
 * filters. The page comes with the list's first page, unfiltered, so it
 * paints (and search engines read it) without waiting for the browser.
 */
export default async function Characters({
  params,
}: PageProps<"/[locale]/characters">) {
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const firstPage = await browse(
    { q: "", taste: null, sort: "top", need: null, offset: 0 },
    locale,
  ).catch(() => null);
  return (
    <PageMessages only={["library"]}>
      <SheetDrawerProvider>
        <CharactersScreen firstPage={firstPage} />
      </SheetDrawerProvider>
    </PageMessages>
  );
}
