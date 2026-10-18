import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SheetScreen } from "@/features/library/sheet-screen";
import { LANGS, type Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { characterPath } from "@/lib/routes";
import { characterPage, characterSheet } from "@/server/library-sheet";
import { pageMetadata } from "@/server/seo";

// each sheet is rendered on its first visit and kept a day: the browser
// fetches the reader's own sheet on mount, so this copy is mostly for crawlers
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/characters/[id]/[[...slug]]">): Promise<Metadata> {
  const { locale, id } = await params;
  const lang = locale as Lang;
  const t = await getTranslations({ locale: lang, namespace: "meta" });
  const page = await characterPage(decodeURIComponent(id));
  if (!page)
    return pageMetadata({
      lang,
      path: characterPath(id),
      title: t("characters.title"),
      description: t("characters.description"),
      index: false,
    });
  // whatever slug the link had, the canonical one is the name in each language
  const path = Object.fromEntries(
    LANGS.map((l) => [l, characterPath(page.id, page.names[l])]),
  ) as Record<Lang, string>;
  return pageMetadata({
    lang,
    path,
    title: page.names[lang],
    description: t("characters.description"),
    // players' own characters stay out of search results
    index: page.library,
  });
}

/**
 * A character's sheet as a page: a shared link or a reload. The slug after
 * the id is only for reading. The sheet comes with the page as a signed-out
 * reader sees it; the reader's own (hidden nicknames, theirs) follows from
 * the browser.
 */
export default async function CharacterPage({
  params,
}: PageProps<"/[locale]/characters/[id]/[[...slug]]">) {
  const { locale, id: rawId } = await params;
  setRequestLocale(locale);
  const id = decodeURIComponent(rawId);
  // nobody as the viewer: no hidden nicknames, none marked as theirs
  const sheet = await characterSheet(id, locale as Lang, "").catch(
    () => undefined,
  );
  if (sheet === null) notFound();
  return (
    <PageMessages only={["library"]}>
      <SheetScreen id={id} sheet={sheet ?? null} />
    </PageMessages>
  );
}
