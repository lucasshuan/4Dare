import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ProfilePage as Page } from "@/features/profile/profile-screen-view";
import { displayName } from "@/game/guest-names";
import { normalizeHandle } from "@/game/profile/handle";
import type { Lang } from "@/game/types";
import { getBackend } from "@/server/backend";
import { pageMetadata } from "@/server/seo";

const HANDLE = /^[a-z0-9_]{3,20}$/;

async function profileOf(raw: string) {
  const handle = normalizeHandle(decodeURIComponent(raw));
  if (!HANDLE.test(handle)) return null;
  return getBackend().profiles.byHandle(handle);
}

/** A profile's link shows its name, @handle and quote when pasted in a chat. */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/u/[handle]">): Promise<Metadata> {
  const { locale, handle } = await params;
  const lang = locale as Lang;
  const profile = await profileOf(handle).catch(() => null);
  const title = profile
    ? `${displayName({ isGuest: false, ...profile }, lang)} (@${profile.handle})`
    : `@${handle}`;
  return pageMetadata({
    lang,
    path: `/u/${profile?.handle ?? handle}`,
    title,
    description: profile?.quote ?? title,
    index: false,
  });
}

/** An account's profile as its own page: a link opened anew, or the page reloaded. */
export default async function ProfilePage({
  params,
}: PageProps<"/[locale]/u/[handle]">) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  return <Page handle={normalizeHandle(decodeURIComponent(handle))} />;
}
