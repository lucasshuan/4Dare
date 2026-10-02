import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoomScreen } from "@/features/room/room-screen";
import type { Lang } from "@/game/types";
import { pageMetadata } from "@/server/seo";

const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

/** A room link pasted in a chat shows up as an invite; rooms stay out of search. */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/r/[code]">): Promise<Metadata> {
  const { locale, code } = await params;
  const upper = code.toUpperCase();
  const t = await getTranslations({
    locale: locale as Lang,
    namespace: "meta.room",
  });
  return pageMetadata({
    lang: locale as Lang,
    path: `/r/${upper}`,
    title: t("title", { code: upper }),
    description: t("inviteDescription", { code: upper }),
    shareTitle: t("inviteTitle"),
    index: false,
  });
}

export default async function RoomPage({
  params,
}: PageProps<"/[locale]/r/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const upper = code.toUpperCase();
  if (!CODE.test(upper)) notFound();
  return <RoomScreen code={upper} />;
}
