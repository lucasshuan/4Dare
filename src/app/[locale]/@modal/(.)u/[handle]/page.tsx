import { setRequestLocale } from "next-intl/server";
import { ProfileModal } from "@/features/profile/profile-modal";

/** A profile opened from inside the app: over the page it came from. */
export default async function ProfileOverPage({
  params,
}: PageProps<"/[locale]/u/[handle]">) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  return <ProfileModal handle={decodeURIComponent(handle).toLowerCase()} />;
}
