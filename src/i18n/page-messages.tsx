import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { hubMessages, type PageNamespace } from "./scopes";

/** The hub's messages plus a page's own namespaces, for that page only. */
export async function PageMessages({
  only,
  children,
}: {
  only: PageNamespace[];
  children: ReactNode;
}) {
  const all = await getMessages();
  const own = Object.fromEntries(only.map((ns) => [ns, all[ns]]));
  return (
    <NextIntlClientProvider messages={{ ...hubMessages(all), ...own }}>
      {children}
    </NextIntlClientProvider>
  );
}
