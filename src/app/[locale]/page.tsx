import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { APP_NAME, appName, CONTACT_EMAIL } from "@/config";
import { HomeScreen } from "@/features/home/home-screen";
import { GAME_SEATS, OPEN_GAMES } from "@/game/games";
import type { Lang } from "@/game/types";
import { localePath } from "@/i18n/paths";
import { CHARACTERS, GAME_PATHS } from "@/lib/routes";
import { type HomeData, homeData } from "@/server/home";
import { HREFLANG, jsonLd, pageMetadata, SITE_URL } from "@/server/seo";

// the community's numbers are cached for as long (src/server/home.ts)
export const revalidate = 300;

const NS = {
  "who-am-i": "whoAmI",
  impostor: "impostor",
  lineup: "whatFor",
} as const;

const EMPTY: HomeData = {
  ranks: { all: [], games: { "who-am-i": [], impostor: [], lineup: [] } },
  helpers: [],
  moments: [],
  library: { characters: 0, pictures: 0, cards: [] },
};

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
  const [meta, games, data] = await Promise.all([
    getTranslations({ locale, namespace: "meta" }),
    getTranslations({ locale, namespace: "home.games" }),
    homeData(locale).catch(() => EMPTY),
  ]);
  const home = `${SITE_URL}${localePath(locale, "/")}`;
  const org = `${SITE_URL}/#organization`;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: APP_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/brand/icon-512.png`,
        email: CONTACT_EMAIL,
      },
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: appName(locale),
        url: home,
        description: meta("description"),
        inLanguage: HREFLANG[locale],
        publisher: { "@id": org },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}${localePath(locale, CHARACTERS)}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "ItemList",
        "@id": `${home}#games`,
        name: meta("tagline"),
        itemListElement: OPEN_GAMES.map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "VideoGame",
            name: games(`${NS[g]}.name`),
            description: meta(`${NS[g]}.description`),
            url: `${SITE_URL}${localePath(locale, GAME_PATHS[g])}`,
            inLanguage: HREFLANG[locale],
            genre: ["Party game", "Guessing game"],
            gamePlatform: "Web browser",
            applicationCategory: "Game",
            operatingSystem: "Any",
            playMode: "MultiPlayer",
            numberOfPlayers: {
              "@type": "QuantitativeValue",
              minValue: GAME_SEATS[g].min,
              maxValue: GAME_SEATS[g].max,
            },
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
            publisher: { "@id": org },
          },
        })),
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON-LD
        dangerouslySetInnerHTML={{ __html: jsonLd(graph) }}
      />
      <HomeScreen data={data} />
    </>
  );
}
