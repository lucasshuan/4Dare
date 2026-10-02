import { setRequestLocale } from "next-intl/server";
import { ProfileScreen } from "@/features/profile/profile-screen";

export default async function Profile({
  params,
}: PageProps<"/[locale]/profile">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileScreen />;
}
