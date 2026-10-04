import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

/** The labs draw the room, so they get every namespace like it. */
export default async function DevLayout({
  children,
  params,
}: LayoutProps<"/[locale]/dev">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <NextIntlClientProvider messages={await getMessages({ locale })}>
      {children}
    </NextIntlClientProvider>
  );
}
