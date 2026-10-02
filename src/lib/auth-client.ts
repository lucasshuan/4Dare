"use client";

import { BACKEND } from "@/config";
import { browserClient } from "./supabase-browser";

export type Provider = "discord" | "google";

export class SignInUnavailable extends Error {
  constructor() {
    super("sign-in needs the online setup (Supabase)");
    this.name = "SignInUnavailable";
  }
}

export const authMode = (): "local" | "supabase" => BACKEND;

/**
 * Starts the Discord/Google sign-in. A guest's anonymous user is linked to the account,
 * so they keep their seat; if that identity already belongs to someone, it signs in instead.
 */
export async function signInWith(
  provider: Provider,
  nextPath: string,
): Promise<void> {
  if (BACKEND !== "supabase") throw new SignInUnavailable();
  const supabase = browserClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { data } = await supabase.auth.getUser();
  if (data.user?.is_anonymous) {
    const linked = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo },
    });
    if (!linked.error) return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw error;
}
