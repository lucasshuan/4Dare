import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { APP_NAME } from "@/config";
import { ImpostorHub } from "@/features/impostor/impostor-hub";
import type { Lang } from "@/game/types";
import { IMPOSTOR } from "@/lib/routes";
import { gameFacts } from "@/server/game-facts";
import {
  HREFLANG,
  jsonLd,
  localePath,
  pageMetadata,
  SITE_URL,
} from "@/server/seo";

// the game facts are cached for as long (src/server/game-facts.ts)
export const revalidate = 600;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/impostor">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta.impostor" });
  return pageMetadata({
    lang: locale,
    path: IMPOSTOR,
    title: t("title"),
    description: t("description"),
  });
}

export default async function Impostor({
  params,
}: PageProps<"/[locale]/impostor">) {
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const [meta, home, facts] = await Promise.all([
    getTranslations({ locale, namespace: "meta.impostor" }),
    getTranslations({ locale, namespace: "home.games.impostor" }),
    gameFacts("impostor", locale),
  ]);
  const game = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: home("name"),
    description: meta("description"),
    url: `${SITE_URL}${localePath(locale, IMPOSTOR)}`,
    inLanguage: HREFLANG[locale],
    genre: ["Party game", "Social deduction game"],
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    operatingSystem: "Any",
    playMode: "MultiPlayer",
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: 3,
      maxValue: 10,
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
      <ImpostorHub facts={facts} />
    </>
  );
}
