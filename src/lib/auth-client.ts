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
 * so they keep their seat. If that account already belongs to someone, Supabase says so
 * on the way back and /auth/callback signs in to it instead (hence `provider` in the URL).
 */
export async function signInWith(
  provider: Provider,
  nextPath: string,
): Promise<void> {
  if (BACKEND !== "supabase") throw new SignInUnavailable();
  const supabase = browserClient();
  const params = new URLSearchParams({ next: nextPath, provider });
  const redirectTo = `${window.location.origin}/auth/callback?${params}`;
  const { data } = await supabase.auth.getUser();
  if (data.user?.is_anonymous) {
    const linked = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo },
    });
    // Fails right away only when manual linking is off: then a plain sign-in.
    if (!linked.error) return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw error;
}
