"use client";

import { ChevronLeft } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { AuthButton } from "@/components/ui/auth-button";
import { PageLoader } from "@/components/ui/loader";
import { Screen } from "@/components/ui/screen";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import { useSignIn } from "@/features/home/use-sign-in";
import { Link, useRouter } from "@/i18n/navigation";
import { riseIn } from "@/lib/motion";
import { GAMES } from "@/lib/routes";
import { profilePath } from "./profile-link";

/**
 * /profile: an account goes on to its own profile's editor (/u/<handle>?edit=1);
 * a guest is offered to sign in.
 */
export function ProfileScreen() {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const { me } = useMe();
  const router = useRouter();
  useAuthErrorToast();
  const handle = me && !me.isGuest ? me.handle : null;
  useEffect(() => {
    if (handle) router.replace(`${profilePath(handle)}?edit=1`);
  }, [handle, router]);
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <div className="flex flex-col gap-4">
        <Link
          href={GAMES}
          className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
          {t("back")}
        </Link>
        {me?.isGuest ? <GuestProfile /> : <PageLoader label={tc("loading")} />}
      </div>
    </Screen>
  );
}

function GuestProfile() {
  const t = useTranslations("profile");
  const { signIn, pending } = useSignIn();
  return (
    <m.section {...riseIn} className="flex max-w-[560px] flex-col gap-5">
      <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
        {t("guestTitle")}
      </h1>
      <p className="text-ink-muted text-lg">{t("guestText")}</p>
      <div className="grid grid-cols-2 gap-2">
        <AuthButton
          provider="discord"
          disabled={pending}
          onClick={() => signIn("discord")}
        />
        <AuthButton
          provider="google"
          disabled={pending}
          onClick={() => signIn("google")}
        />
      </div>
    </m.section>
  );
}
