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

/** Starts the Discord/Google sign-in. Local mode has no real accounts. */
export async function signInWith(
  _provider: Provider,
  _nextPath: string,
): Promise<void> {
  throw new SignInUnavailable();
}
