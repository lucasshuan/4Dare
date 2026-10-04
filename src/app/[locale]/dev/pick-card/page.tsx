import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Lang } from "@/game/types";
import { PickCardLab } from "./pick-card-lab";

export const metadata: Metadata = {
  title: "Pick card lab",
  robots: { index: false, follow: false },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The pick card alone (dev only), to build and check every state:
 * `?preset=empty|typing|picked|restore|new|newPicture|uploading`,
 * `&state=editing|confirmed|timeUp`, `&stamp=1`, `&names=long`, `&fail=1`
 * (uploads fail). Works in local mode (fixtures library).
 */
export default async function PickCardLabPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dev/pick-card">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  return (
    <PickCardLab
      lang={locale as Lang}
      preset={one(query.preset) ?? "empty"}
      state={one(query.state) ?? "editing"}
      stamp={one(query.stamp) === "1"}
      longNames={one(query.names) === "long"}
      failUploads={one(query.fail) === "1"}
    />
  );
}
