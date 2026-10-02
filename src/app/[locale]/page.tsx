import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { APP_NAME } from "@/config";
import { HomeScreen } from "@/features/home/home-screen";
import type { Lang } from "@/game/types";
import {
  HREFLANG,
  jsonLd,
  localePath,
  pageMetadata,
  SITE_URL,
} from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: "/",
    title: { absolute: t("title") },
    description: t("description"),
  });
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: `${SITE_URL}${localePath(locale, "/")}`,
    description: t("description"),
    inLanguage: HREFLANG[locale],
  };
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON-LD
        dangerouslySetInnerHTML={{ __html: jsonLd(site) }}
      />
      <HomeScreen />
    </>
  );
}
