import { setRequestLocale } from "next-intl/server";
import { WhoAmIScreen } from "@/features/who-am-i/who-am-i-screen";

export default async function WhoAmI({
  params,
}: PageProps<"/[locale]/who-am-i">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WhoAmIScreen />;
}
