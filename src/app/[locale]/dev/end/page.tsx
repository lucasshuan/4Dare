import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EndLab } from "@/features/ending/lab/end-lab";
import type { Lang } from "@/game/types";

export const metadata: Metadata = {
  title: "End lab",
  robots: { index: false, follow: false },
};

/** The end scenes' lab (dev only): any game's end at any moment. */
export default async function EndLabPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dev/end">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <EndLab lang={locale as Lang} query={await searchParams} />;
}
