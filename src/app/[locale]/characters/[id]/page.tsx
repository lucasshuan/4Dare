import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SheetScreen } from "@/features/library/sheet-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { characterPath } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/characters/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({
    locale: locale as Lang,
    namespace: "meta",
  });
  return pageMetadata({
    lang: locale as Lang,
    path: characterPath(id),
    title: t("characters.title"),
    description: t("characters.description"),
    index: false,
  });
}

/** A character's sheet as a page: a shared link or a reload. */
export default async function CharacterPage({
  params,
}: PageProps<"/[locale]/characters/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["library"]}>
      <SheetScreen id={decodeURIComponent(id)} />
    </PageMessages>
  );
}
