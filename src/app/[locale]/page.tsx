import { setRequestLocale } from "next-intl/server";
import { HomeScreen } from "@/features/home/home-screen";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeScreen />;
}
