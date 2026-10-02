"use client";

import { useEffect } from "react";
import { APP_NAME } from "@/config";

/** The app icon in apricot with a "!" in the bubble: shown in turns with the usual icon. */
const ALERT_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" rx="200" fill="#CF7024"/><g transform="translate(217.6 100) scale(1.0152)"><path fill="#F6E3A1" d="M70 0H250A330 330 0 0 1 250 660H215L66 774Q12 812 4 750L0 700V70Q0 0 70 0Z"/><g fill="#CF7024" transform="rotate(-8 280 330)"><rect x="228" y="118" width="108" height="292" rx="54"/><circle cx="282" cy="492" r="60"/></g></g></svg>',
)}`;

/** How long each frame of the blink lasts (background tabs tick at most once a second anyway). */
const BLINK_MS = 1000;

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

/**
 * Keeps the tab title at "<title> · Ludodare". With an `alert` and the tab in the
 * background (or the window out of focus), the title and the icon blink between the
 * alert and the usual ones until the player comes back.
 */
export function useTabTitle(title: string, alert: string | null) {
  const full = `${title} · ${APP_NAME}`;

  useEffect(() => {
    document.title = full;
    if (!alert) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let undoIcon: (() => void) | null = null;
    let on = false;

    const frame = (show: boolean) => {
      if (show || on) document.title = show ? `❗ ${alert}` : full;
      on = show;
      if (show && !undoIcon) undoIcon = swapIcons(ALERT_ICON);
      if (!show && undoIcon) {
        undoIcon();
        undoIcon = null;
      }
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      frame(false);
    };
    const sync = () => {
      if (!isAway()) return stop();
      if (timer) return;
      frame(true);
      timer = setInterval(() => frame(!on), BLINK_MS);
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      stop();
    };
  }, [full, alert]);
}
