import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoomScreen } from "@/features/room/room-screen";
import { displayName } from "@/game/guest-names";
import type { Lang } from "@/game/types";
import { loadRoom } from "@/server/rooms";
import { pageMetadata } from "@/server/seo";

const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

/** The tab title: the room's name, "<host>'s room" when unnamed, or just "Room". */
async function roomTitle(code: string, lang: Lang, fallback: string) {
  const state = CODE.test(code) ? (await loadRoom(code))?.state : null;
  if (!state || state.phase === "closed") return fallback;
  if (state.settings.name) return state.settings.name;
  const host = state.players.find((p) => p.id === state.hostId);
  if (!host) return fallback;
  const t = await getTranslations({ locale: lang, namespace: "home.rooms" });
  return t("roomOf", { name: displayName(host, lang) });
}

/** A room link pasted in a chat shows up as an invite; rooms stay out of search. */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/r/[code]">): Promise<Metadata> {
  const { locale, code } = await params;
  const lang = locale as Lang;
  const upper = code.toUpperCase();
  const t = await getTranslations({ locale: lang, namespace: "meta.room" });
  return pageMetadata({
    lang,
    path: `/r/${upper}`,
    title: await roomTitle(upper, lang, t("title")),
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
