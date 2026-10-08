import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { APP_NAME } from "@/config";
import { LineupHub } from "@/features/lineup/lineup-hub";
import type { Lang } from "@/game/types";
import { WHAT_FOR } from "@/lib/routes";
import {
  HREFLANG,
  jsonLd,
  localePath,
  pageMetadata,
  SITE_URL,
} from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/what-for">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta.whatFor" });
  return pageMetadata({
    lang: locale,
    path: WHAT_FOR,
    title: t("title"),
    description: t("description"),
  });
}

export default async function WhatFor({
  params,
}: PageProps<"/[locale]/what-for">) {
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const [meta, home] = await Promise.all([
    getTranslations({ locale, namespace: "meta.whatFor" }),
    getTranslations({ locale, namespace: "home.games.whatFor" }),
  ]);
  const game = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: home("name"),
    description: meta("description"),
    url: `${SITE_URL}${localePath(locale, WHAT_FOR)}`,
    inLanguage: HREFLANG[locale],
    genre: ["Party game", "Auction game"],
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    operatingSystem: "Any",
    playMode: "MultiPlayer",
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: 2,
      maxValue: 8,
    },
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: APP_NAME, url: SITE_URL },
  };
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON-LD
        dangerouslySetInnerHTML={{ __html: jsonLd(game) }}
      />
      <LineupHub />
    </>
  );
}
