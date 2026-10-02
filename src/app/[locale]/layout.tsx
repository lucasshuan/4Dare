import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  DM_Mono,
  Figtree,
  Zen_Maru_Gothic,
} from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { APP_NAME } from "@/config";
import { routing } from "@/i18n/routing";
import { pageMetadata, SITE_URL } from "@/server/seo";
import "../globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});
const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["500", "700"],
  preload: false,
});

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: APP_NAME,
    keywords: t("keywords").split(", "),
    creator: APP_NAME,
    publisher: APP_NAME,
    category: "games",
    formatDetection: { telephone: false, email: false, address: false },
    appleWebApp: { title: APP_NAME, capable: true },
    ...pageMetadata({
      lang: locale,
      path: "/",
      title: { default: t("title"), template: `%s · ${APP_NAME}` },
      description: t("description"),
      shareTitle: t("title"),
    }),
  };
}

// Brand blue: the browser bar on phones and the stripe on Discord embeds.
export const viewport: Viewport = { themeColor: "#2B69C8" };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale === "pt" ? "pt-BR" : locale}
      className={`${bricolage.variable} ${figtree.variable} ${dmMono.variable} ${zenMaru.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        {/* Vercel Web Analytics and Speed Insights; they only send data on Vercel. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
