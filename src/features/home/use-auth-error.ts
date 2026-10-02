"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

/** /auth/callback adds ?auth_error=1 when Discord/Google sign-in didn't finish: say so once, then clean the URL. */
export function useAuthErrorToast() {
  const t = useTranslations("common");
  const toast = useToast();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("auth_error")) return;
    toast(t("signInFailed"));
    url.searchParams.delete("auth_error");
    window.history.replaceState(null, "", url);
  }, [t, toast]);
}
