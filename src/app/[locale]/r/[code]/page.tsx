import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { RoomScreen } from "@/features/room/room-screen";

const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

export default async function RoomPage({
  params,
}: PageProps<"/[locale]/r/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const upper = code.toUpperCase();
  if (!CODE.test(upper)) notFound();
  return <RoomScreen code={upper} />;
}
