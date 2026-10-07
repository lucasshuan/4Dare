"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useMe } from "@/features/data/use-me";
import { THEMES, type ThemeChoice } from "@/game/options";
import { updateSettings, useSettings } from "@/lib/settings";
import { saveAccountSettings } from "@/server/actions";

/**
 * An account's theme, chat bubbles and game options follow it to every
 * device: what the account kept is applied once it loads (an account that
 * kept nothing yet takes this device's), and later changes go back up a
 * moment after they settle. Sound stays per device.
 */
export function SettingsSync() {
  const { me } = useMe();
  const { theme, setTheme } = useTheme();
  const local = useSettings();
  /** The account whose settings this device took. */
  const applied = useRef<string | null>(null);
  /** What the account has now, as last sent or received. */
  const kept = useRef<string | null>(null);
  const account = me && !me.isGuest ? me : null;

  useEffect(() => {
    if (!account || applied.current === account.id) return;
    applied.current = account.id;
    const s = account.settings;
    if (!s) return;
    updateSettings((x) => ({
      ...x,
      chatBubbles: s.chatBubbles,
      games: s.games,
    }));
    if (s.theme) setTheme(s.theme);
    kept.current = JSON.stringify({
      theme: s.theme,
      chatBubbles: s.chatBubbles,
      games: s.games,
    });
  }, [account, setTheme]);

  const shownTheme = (THEMES as readonly string[]).includes(theme ?? "")
    ? (theme as ThemeChoice)
    : null;
  const now = JSON.stringify({
    theme: shownTheme,
    chatBubbles: local.chatBubbles,
    games: local.games,
  });
  useEffect(() => {
    if (!account || applied.current !== account.id || !shownTheme) return;
    if (now === kept.current) return;
    const wait = window.setTimeout(() => {
      kept.current = now;
      void saveAccountSettings(JSON.parse(now));
    }, 1000);
    return () => window.clearTimeout(wait);
  }, [account, now, shownTheme]);

  return null;
}
