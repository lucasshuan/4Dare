import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LabScreen } from "@/features/stage/lab/lab-screen";
import type { Lang } from "@/game/types";

export const metadata: Metadata = {
  title: "Stage lab",
  robots: { index: false, follow: false },
};

/** The stage lab (dev only): any show of a made-up match at any moment. */
export default async function StageLabPage({
  params,
  searchParams,
}: PageProps<"/[locale]/dev/stage">) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <LabScreen lang={locale as Lang} query={await searchParams} />;
}
