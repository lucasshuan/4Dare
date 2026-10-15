import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { routing } from "@/i18n/routing";
import { isAdminHost, siteHome } from "@/lib/hosts";
import { adminCounts } from "@/server/admin/overview";
import { allowed } from "@/server/auth/roles";
import { loadConfig } from "@/server/config";
import { showMe } from "@/server/shown";
import "@/features/admin/admin.css";

export const metadata: Metadata = {
  title: { default: "Painel de controle", template: "%s · Painel 4Dare" },
  robots: { index: false, follow: false },
};

/**
 * The control panel. It lives at admin.4dare.com (src/proxy.ts maps that
 * host's root here); on www it does not exist. Anyone but the admin gets a
 * 404, as if there were no such page. Each page and action checks again.
 */
export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const host = (await headers()).get("host");
  const own = isAdminHost(host);
  if (!own && process.env.VERCEL_ENV === "production") notFound();
  const me = await allowed("admin");
  if (!me) notFound();
  const base = own
    ? ""
    : locale === routing.defaultLocale
      ? "/admin"
      : `/${locale}/admin`;
  const [counts, config] = await Promise.all([adminCounts(), loadConfig()]);
  return (
    <NextIntlClientProvider messages={await getMessages({ locale })}>
      <AdminShell
        me={showMe(me, "pt")}
        base={base}
        site={siteHome(host)}
        initialCounts={counts}
        config={{ v: config.v, tunes: config.values.tunes }}
      >
        {children}
      </AdminShell>
    </NextIntlClientProvider>
  );
}
