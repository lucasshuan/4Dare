"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * /auth/callback adds ?auth_error=1 when Discord/Google sign-in didn't
 * finish, /auth/link ?link_error=1 when linking one was refused: say so once,
 * then clean the URL.
 */
export function useAuthErrorToast() {
  const t = useTranslations("common");
  const toast = useToast();
  useEffect(() => {
    const url = new URL(window.location.href);
    const failed = url.searchParams.has("auth_error")
      ? "signInFailed"
      : url.searchParams.has("link_error")
        ? "linkFailed"
        : null;
    if (!failed) return;
    toast(t(failed));
    url.searchParams.delete("auth_error");
    url.searchParams.delete("link_error");
    window.history.replaceState(null, "", url);
  }, [t, toast]);
}
