"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/features/data/use-me";
import { useRouter } from "@/i18n/navigation";
import { type Provider, signInWith } from "@/lib/auth-client";
import { useAction } from "@/lib/hooks/use-action";
import { enterTestAccount } from "@/server/actions";

/** Sign in with Discord/Google, then land on the profile to pick a name and avatar. In local mode it enters a test account. */
export function useSignIn() {
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
        router.push("/profile");
      }
      return;
    }
    setLeaving(true);
    try {
      await signInWith(provider, `/${locale}/profile`);
    } catch {
      setLeaving(false);
      toast(t("unknown"));
    }
  };
  return { signIn, pending: pending || leaving };
}
