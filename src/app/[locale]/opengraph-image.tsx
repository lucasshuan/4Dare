import type { Lang } from "@/game/types";
import { HomeArt } from "@/server/og/art";
import { ogImageMetadata, renderOg } from "@/server/og/render";
import { ogText } from "@/server/seo";

export function generateImageMetadata({
  params,
}: {
  params?: { locale?: string };
}) {
  return ogImageMetadata(params, "imageAlt");
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Lang }>;
}) {
  const { locale } = await params;
  return renderOg(locale, <HomeArt text={await ogText(locale)} />);
}
