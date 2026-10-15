import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { isAdminHost } from "@/lib/hosts";
import { allowed, leavePanel } from "@/server/auth/roles";
import "@/features/admin/admin.css";

export const metadata: Metadata = {
  title: { default: "Painel de controle", template: "%s · Painel 4Dare" },
  robots: { index: false, follow: false },
};

/**
 * The control panel. It lives at admin.4dare.com (src/proxy.ts maps that
 * host's root here); on www it does not exist. Anyone but the admin goes to
 * the site from admin.4dare.com, and gets a 404 on /admin elsewhere. Each page and action checks again.
 * The panel's pages have its frame ((panel)/layout.tsx); the lab's screens
 * (frame/) are bare, for an iframe.
 */
export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const host = (await headers()).get("host");
  if (!isAdminHost(host) && process.env.VERCEL_ENV === "production") notFound();
  if (!(await allowed("admin"))) await leavePanel();
  // the lab and the scenes draw the room: every namespace, like the room's layout
  return (
    <NextIntlClientProvider messages={await getMessages({ locale })}>
      {children}
    </NextIntlClientProvider>
  );
}
