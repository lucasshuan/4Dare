import { getTranslations } from "next-intl/server";
import type { Lang } from "@/game/types";
import { InviteArt } from "@/server/og/art";
import { ogImageMetadata, renderOg } from "@/server/og/render";
import { ogText } from "@/server/seo";

export function generateImageMetadata({
  params,
}: {
  params?: { locale?: string; code?: string };
}) {
  return ogImageMetadata(params, "room.imageAlt", {
    code: params?.code?.toUpperCase() ?? "",
  });
}

/** The invite people see when a room link is pasted in a chat. */
export default async function Image({
  params,
}: {
  params: Promise<{ locale: Lang; code: string }>;
}) {
  const { locale, code } = await params;
  const t = await getTranslations({ locale, namespace: "meta.room" });
  return renderOg(
    locale,
    <InviteArt
      text={await ogText(locale)}
      invited={t("invited")}
      join={t("join")}
      codeLabel={t("code")}
      code={code
        .toUpperCase()
        .replace(/[^2-9A-Z]/g, "")
        .slice(0, 5)}
    />,
  );
}
