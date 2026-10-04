import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreateScreen } from "@/features/create/create-screen";
import type { Lang } from "@/game/types";
import { NEW_ROOM } from "@/lib/routes";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/new">): Promise<Metadata> {
  const locale = (await params).locale as Lang;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    lang: locale,
    path: NEW_ROOM,
    title: t("newRoom.title"),
    description: t("whoAmI.description"),
    index: false,
  });
}

/** /new?game=who-am-i: a new room for that game. Static: the screen reads the game. */
export default async function NewRoom({ params }: PageProps<"/[locale]/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CreateScreen />;
}
