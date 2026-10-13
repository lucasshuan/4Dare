"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/features/data/use-me";
import type { Lang } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { localePath } from "@/i18n/paths";
import { type Provider, signInWith } from "@/lib/auth-client";
import { useAction } from "@/lib/hooks/use-action";
import { enterTestAccount } from "@/server/actions";

/**
 * Sign in with Discord/Google, then land on the profile to pick a name and
 * avatar, or back on this page with `stay` (a room: the account takes the
 * guest's seat). In local mode it enters a test account.
 */
export function useSignIn({ stay = false }: { stay?: boolean } = {}) {
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations("common.errors");
  const { me, setMe } = useMe();
  const { run, pending } = useAction();
  const [leaving, setLeaving] = useState(false);

  const signIn = async (provider: Provider) => {
    if (me?.authMode === "local") {
      const r = await run(() => enterTestAccount(provider));
      if (r.ok) {
        setMe(r.data);
        if (stay) router.refresh();
        else router.push("/profile");
      }
      return;
    }
    setLeaving(true);
    try {
      signInWith(
        provider,
        stay
          ? window.location.pathname
          : localePath(locale as Lang, "/profile"),
      );
    } catch {
      setLeaving(false);
      toast(t("unknown"));
    }
  };
  return { signIn, pending: pending || leaving };
}
