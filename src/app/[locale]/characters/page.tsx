import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CharactersScreen } from "@/features/library/characters-screen";
import type { Lang } from "@/game/types";
import { PageMessages } from "@/i18n/page-messages";
import { CHARACTERS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

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

/** /characters?q=&taste=&sort=&need=: the whole library; the screen reads the filters. */
export default async function Characters({
  params,
}: PageProps<"/[locale]/characters">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["library"]}>
      <CharactersScreen />
    </PageMessages>
  );
}
