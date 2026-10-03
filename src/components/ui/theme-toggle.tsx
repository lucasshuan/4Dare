"use client";

import { Moon, Sun } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { cn } from "@/lib/cn";

const spring = { type: "spring", stiffness: 480, damping: 34 } as const;

/**
 * Light / dark. Only on home and lobby, next to the language switch. The chosen
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
          <motion.span
            layoutId={`${id}-pill`}
            transition={spring}
            className="absolute inset-0 rounded-pill bg-ink shadow-card"
          />
        ) : null}
        <motion.span
          // a new key each time it is chosen replays the turn
          key={on ? "on" : "off"}
          className="relative flex"
          initial={false}
          animate={on && !still ? { ...turn, scale: [0.7, 1] } : undefined}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </motion.span>
      </button>
    );
  };
  return (
    <ChoiceGroup label={t("label")} className="bg-surface dark:bg-sunken">
      {item("light", Sun)}
      {item("dark", Moon)}
    </ChoiceGroup>
  );
}
