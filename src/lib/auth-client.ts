"use client";

import { BACKEND } from "@/config";

export type Provider = "discord" | "google";

export class SignInUnavailable extends Error {
  constructor() {
    super("sign-in needs the online setup (Supabase)");
    this.name = "SignInUnavailable";
  }
}

export const authMode = (): "local" | "supabase" => BACKEND;

/**
 * Starts the Discord/Google sign-in: /auth/sign-in sends the browser to the
 * provider. On the way back, /auth/callback hands the guest's matches (and
 * their seat, when signing in from a room) to the account.
 */
export function signInWith(provider: Provider, nextPath: string) {
  if (BACKEND !== "supabase") throw new SignInUnavailable();
  const params = new URLSearchParams({ provider, next: nextPath });
  window.location.assign(`/auth/sign-in?${params}`);
}
