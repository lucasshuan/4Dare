import { setRequestLocale } from "next-intl/server";
import { CreateScreen } from "@/features/create/create-screen";

export default async function NewRoom({
  params,
}: PageProps<"/[locale]/who-am-i/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CreateScreen />;
}
