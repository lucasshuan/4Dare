import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { APP_NAME } from "@/config";
import { WhoAmIHub } from "@/features/who-am-i/who-am-i-hub";
import type { Lang } from "@/game/types";
import { WHO_AM_I } from "@/lib/routes";
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
}: PageProps<"/[locale]/who-am-i">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta.whoAmI" });
  return pageMetadata({
    lang: locale,
    path: WHO_AM_I,
    title: t("title"),
    description: t("description"),
  });
}

export default async function WhoAmI({
  params,
}: PageProps<"/[locale]/who-am-i">) {
  const locale = (await params).locale as Lang;
  setRequestLocale(locale);
  const [meta, home, facts] = await Promise.all([
    getTranslations({ locale, namespace: "meta.whoAmI" }),
    getTranslations({ locale, namespace: "home.games.whoAmI" }),
    gameFacts("who-am-i", locale),
  ]);
  const game = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: home("name"),
    description: meta("description"),
    url: `${SITE_URL}${localePath(locale, WHO_AM_I)}`,
    image: `${SITE_URL}${localePath(locale, WHO_AM_I)}/opengraph-image/card`,
    inLanguage: HREFLANG[locale],
    genre: ["Party game", "Guessing game"],
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    operatingSystem: "Any",
    playMode: "MultiPlayer",
    numberOfPlayers: { "@type": "QuantitativeValue", minValue: 2, maxValue: 4 },
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
      <WhoAmIHub facts={facts} />
    </>
  );
}
