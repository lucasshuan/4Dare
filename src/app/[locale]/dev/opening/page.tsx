import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { OpeningLab } from "@/features/opening/lab/opening-lab";
import type { Lang } from "@/game/types";

export const metadata: Metadata = {
  title: "Opening lab",
  robots: { index: false, follow: false },
};

/** The title scenes' lab (dev only): any game's scene at any moment. */
export default async function OpeningLabPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dev/opening">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <OpeningLab lang={locale as Lang} query={await searchParams} />;
}
