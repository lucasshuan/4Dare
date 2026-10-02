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
 * Starts the Discord/Google sign-in. On the way back, /auth/callback hands the
 * guest's matches (and their seat, when signing in from a room) to the account.
 */
export async function signInWith(
  provider: Provider,
  nextPath: string,
): Promise<void> {
  if (BACKEND !== "supabase") throw new SignInUnavailable();
  const supabase = browserClient();
  const params = new URLSearchParams({ next: nextPath });
  const redirectTo = `${window.location.origin}/auth/callback?${params}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) throw error;
}
