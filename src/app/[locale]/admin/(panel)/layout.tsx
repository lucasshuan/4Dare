import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { routing } from "@/i18n/routing";
import { isAdminHost, siteHome } from "@/lib/hosts";
import { adminCounts } from "@/server/admin/overview";
import { adminPage } from "@/server/auth/roles";
import { loadConfig } from "@/server/config";
import { showMe } from "@/server/shown";

/** The panel's frame around its pages: the rail, the strip on top and the tray. */
export default async function PanelLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await adminPage();
  const host = (await headers()).get("host");
  const base = isAdminHost(host)
    ? ""
    : locale === routing.defaultLocale
      ? "/admin"
      : `/${locale}/admin`;
  const [counts, config] = await Promise.all([adminCounts(), loadConfig()]);
  return (
    <AdminShell
      me={showMe(me, "pt")}
      base={base}
      site={siteHome(host)}
      initialCounts={counts}
      config={{ v: config.v, tunes: config.values.tunes }}
    >
      {children}
    </AdminShell>
  );
}
