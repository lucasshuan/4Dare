import type { Lang } from "@/game/types";
import { GameArt } from "@/server/og/art";
import { ogImageMetadata, renderOg } from "@/server/og/render";
import { ogText } from "@/server/seo";

export function generateImageMetadata({
  params,
}: {
  params?: { locale?: string };
}) {
  return ogImageMetadata(params, "whoAmI.imageAlt");
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Lang }>;
}) {
  const { locale } = await params;
  return renderOg(locale, <GameArt text={await ogText(locale)} />);
}
