"use client";

import { useEffect } from "react";
import { FOUR } from "@/components/ui/logo";
import { APP_NAME } from "@/config";
import { formatClock, isLowClock } from "@/lib/names";

/** The app icon with a "!" in the 4 bubble, on a `fill` background. */
const alertIcon = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" rx="200" fill="${fill}"/><g transform="translate(174.0 170.0) scale(0.7952)"><path fill="#F6E3A1" d="${FOUR}"/><g fill="${fill}" transform="rotate(-10 515 395)"><rect x="461" y="195" width="108" height="272" rx="54"/><circle cx="515" cy="545" r="58"/></g></g></svg>`,
  )}`;

/** Apricot while it's the player's move; red in the clock's final stretch. */
const ALERT_ICON = alertIcon("#CF7024");
const LOW_ICON = alertIcon("#C2412F");

/** How often the title clock is redrawn (background tabs tick at most once a second anyway). */
const TICK_MS = 250;

const isAway = () => document.hidden || !document.hasFocus();

/** Swaps every favicon link to `href`, remembering the originals; returns the undo. */
function swapIcons(href: string): () => void {
  const links = [
    ...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'),
  ];
  const before = links.map((l) => [l.getAttribute("href"), l.type] as const);
  for (const link of links) {
    link.type = "image/svg+xml";
    link.href = href;
  }
  return () =>
    links.forEach((link, i) => {
      const [oldHref, oldType] = before[i];
      if (oldHref) link.setAttribute("href", oldHref);
      link.type = oldType;
    });
}

export type TabClock = {
  deadline: number | null;
  stepStartsAt: number | null;
  /** The step's full length; answers can bring the deadline sooner. */
  stepMs?: number | null;
  offset: number;
};

/**
 * Keeps the tab title at "<clock> · <title> · 4Dare", the clock counting down
 * while a step runs. With an `alert` (the player's move) the alert takes the title's
 * place, and while the tab is in the background (or the window out of focus) the
 * icon turns into the alert icon, red in the clock's final stretch.
 */
export function useTabTitle(
  title: string,
  alert: string | null,
  { deadline, stepStartsAt, stepMs, offset }: TabClock,
) {
  useEffect(() => {
    let icon: string | null = null;
    let undoIcon: (() => void) | null = null;

    const setIcon = (href: string | null) => {
      if (href === icon) return;
      undoIcon?.();
      undoIcon = href ? swapIcons(href) : null;
      icon = href;
    };
    const tick = () => {
      const now = Date.now() + offset;
      // No clock while a reveal is on screen: the step hasn't started yet.
      const running =
        deadline !== null && stepStartsAt !== null && now >= stepStartsAt;
      const left = running ? Math.max(0, deadline - now) / 1000 : null;
      const low =
        running && isLowClock(left ?? 0, stepMs ?? deadline - stepStartsAt);
      const clock = left === null ? null : formatClock(left);
      const next = [clock, alert ?? title, APP_NAME]
        .filter(Boolean)
        .join(" · ");
      if (document.title !== next) document.title = next;
      setIcon(alert && isAway() ? (low ? LOW_ICON : ALERT_ICON) : null);
    };

    tick();
    const timer = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("blur", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("blur", tick);
      setIcon(null);
    };
  }, [title, alert, deadline, stepStartsAt, stepMs, offset]);
}
