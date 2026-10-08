"use client";

import { Moon, Sun } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { cn } from "@/lib/cn";

const spring = { type: "spring", stiffness: 480, damping: 34 } as const;

/**
 * Light / dark: on home next to the language switch, and in every room with
 * the sound and the way out (RoomControls). The chosen
 * option is an ink pill on the track (dark in the light theme, light in the
 * dark one), so it stands out on tinted pages too. The pill slides across, and
 * the icon it lands on turns in: the sun spins, the moon rocks.
 */
export function ThemeToggle() {
  const t = useTranslations("common.theme");
  const { resolvedTheme, setTheme } = useTheme();
  const still = useReducedMotion() ?? false;
  const id = useId();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? resolvedTheme : undefined;
  const item = (value: "light" | "dark", Icon: typeof Sun) => {
    const on = current === value;
    const turn =
      value === "light" ? { rotate: [-90, 0] } : { rotate: [0, -24, 10, 0] };
    return (
      <button
        type="button"
        aria-label={t(value)}
        aria-pressed={on}
        onClick={() => setTheme(value)}
        className={cn(
          "relative inline-flex size-8 items-center justify-center rounded-pill transition-colors duration-200 ease-soft",
          on ? "text-on-ink" : "text-ink-muted hover:text-ink",
        )}
      >
        {on ? (
          <m.span
            layoutId={`${id}-pill`}
            transition={spring}
            className="absolute inset-0 rounded-pill bg-ink shadow-card"
          />
        ) : null}
        <m.span
          // a new key each time it is chosen replays the turn
          key={on ? "on" : "off"}
          className="relative flex"
          initial={false}
          animate={on && !still ? { ...turn, scale: [0.7, 1] } : undefined}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </m.span>
      </button>
    );
  };
  return (
    <ChoiceGroup label={t("label")} className="bg-surface dark:bg-sunken">
      {/* the pill's layoutId needs the layout features */}
      <LayoutMotion>
        {item("light", Sun)}
        {item("dark", Moon)}
      </LayoutMotion>
    </ChoiceGroup>
  );
}

/**
 * Light / dark as one round key, for rows short on room (a room's controls on
 * a phone, beside the clock): it shows the theme on now and flips it, the
 * icon turning in as the theme toggle's does.
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
    <button
      type="button"
      aria-label={t(next)}
      title={t(next)}
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-pill bg-surface text-ink transition-colors duration-200 ease-soft dark:bg-sunken",
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
  );
}
