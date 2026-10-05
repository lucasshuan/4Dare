import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono, Figtree } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { JaFontLoader } from "@/components/ja-font-loader";
import { Providers } from "@/components/providers";
import { appName } from "@/config";
import { routing } from "@/i18n/routing";
import { hubMessages } from "@/i18n/scopes";
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
export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = appName(locale);
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: name,
    keywords: t("keywords").split(", "),
    creator: name,
    publisher: name,
    category: "games",
    formatDetection: { telephone: false, email: false, address: false },
    appleWebApp: { title: name, capable: true },
    ...pageMetadata({
      lang: locale,
      path: "/",
      title: { default: t("title"), template: `%s · ${name}` },
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
      className={`${bricolage.variable} ${figtree.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {locale === "ja" ? <JaFontLoader /> : null}
        {/* the hub's namespaces; r/ and dev/ layouts hand theirs every one */}
        <NextIntlClientProvider messages={hubMessages(await getMessages())}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        {/* Vercel Web Analytics and Speed Insights (half the visits: enough data, half the cost); they only send data on Vercel. */}
        <Analytics />
        <SpeedInsights sampleRate={0.5} />
      </body>
    </html>
  );
}
