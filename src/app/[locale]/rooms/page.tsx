import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoomsScreen } from "@/features/rooms/rooms-screen";
import type { Lang } from "@/game/types";
import { ROOMS } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/rooms">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: ROOMS,
    title: t("rooms.title"),
    description: t("rooms.description"),
  });
}

/** /rooms?game=who-am-i&q=crew&access=private&lang=pt,ja: every listed room. Static: the screen reads the filters. */
export default async function Rooms({ params }: PageProps<"/[locale]/rooms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RoomsScreen />;
}
