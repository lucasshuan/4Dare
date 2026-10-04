import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

/** The room shows every namespace; the hub pages above get only theirs. */
export default async function RoomLayout({
  children,
  params,
}: LayoutProps<"/[locale]/r">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <NextIntlClientProvider messages={await getMessages({ locale })}>
      {children}
    </NextIntlClientProvider>
  );
}
