"use client";

import { Moon, Sun } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Tip } from "./tip";

/**
 * Light / dark as one round key, on home next to the language and in every
 * room with the sound and the way out (RoomControls). It shows the theme on
 * now and flips it; the icon turns in: the sun spins, the moon rocks.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations("common.theme");
  const { resolvedTheme, setTheme } = useTheme();
  const still = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const next = dark ? "light" : "dark";
  return (
    <Tip label={t(next)}>
      <button
        type="button"
        aria-label={t(next)}
        onClick={() => setTheme(next)}
        className={cn(
          "tb-key tb-theme inline-flex size-10 items-center justify-center rounded-pill bg-surface text-ink transition-colors duration-200 ease-soft dark:bg-sunken",
          className,
        )}
      >
        <m.span
          key={dark ? "dark" : "light"}
          className="flex"
          initial={false}
          animate={
            mounted && !still
              ? {
                  rotate: dark ? [0, -24, 10, 0] : [-90, 0],
                  scale: [0.7, 1],
                }
              : undefined
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {dark ? (
            <Moon className="size-5" strokeWidth={1.75} />
          ) : (
            <Sun className="size-5" strokeWidth={1.75} />
          )}
        </m.span>
      </button>
    </Tip>
  );
}
