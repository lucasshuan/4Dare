import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileScreen } from "@/features/profile/profile-screen";
import type { Lang } from "@/game/types";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/profile">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: "/profile",
    title: t("profile.title"),
    description: t("description"),
    index: false,
  });
}

export default async function Profile({
  params,
}: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileScreen />;
}
