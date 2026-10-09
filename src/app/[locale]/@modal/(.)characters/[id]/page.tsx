import { setRequestLocale } from "next-intl/server";
import { SheetPanel } from "@/features/library/sheet-panel";
import { PageMessages } from "@/i18n/page-messages";

/** A sheet opened from inside the app: over the list it came from. */
export default async function SheetOverPage({
  params,
}: PageProps<"/[locale]/characters/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <PageMessages only={["library"]}>
      <SheetPanel id={decodeURIComponent(id)} />
    </PageMessages>
  );
}
