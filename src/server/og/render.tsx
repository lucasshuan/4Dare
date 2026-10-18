import "server-only";
import { ImageResponse } from "next/og";
import {
  hasLocale,
  type MessageKeys,
  type Messages,
  type NestedKeyOf,
} from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import type { Lang } from "@/game/types";
import { routing } from "@/i18n/routing";
import { OG_SIZE } from "./art";
import { ogFonts } from "./fonts";

/**
 * One share image per route, with its alt text from messages/<lang>/meta.json.
 * At build time Next may call this without the route's params, so it falls back to English.
 */
export async function ogImageMetadata(
  params: { locale?: string } | undefined,
  altKey: MessageKeys<Messages["meta"], NestedKeyOf<Messages["meta"]>>,
  values?: Record<string, string>,
) {
  const locale = hasLocale(routing.locales, params?.locale)
    ? params.locale
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  return [
    {
      id: "card",
      alt: t(altKey, values),
      size: OG_SIZE,
      contentType: "image/png",
    },
  ];
}

/**
 * Draws one of the share images as a PNG. An image depends only on its address
 * (the language, a room's code) and the build, so the CDN keeps it: chat apps
 * and crawlers ask for the same picture again and again, and each drawing
 * costs the function a good share of a second.
 */
export async function renderOg(lang: Lang, art: ReactElement) {
  return new ImageResponse(art, {
    ...OG_SIZE,
    fonts: await ogFonts(lang),
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
