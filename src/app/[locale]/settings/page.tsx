import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsScreen } from "@/features/settings/settings-screen";
import type { Lang } from "@/game/types";
import { SETTINGS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/settings">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: SETTINGS,
    title: t("settings.title"),
    description: t("settings.description"),
    index: false,
  });
}

/** /settings: sound, look, game options and language, kept on this device (and the account). */
export default async function Settings({
  params,
}: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SettingsScreen />;
}
