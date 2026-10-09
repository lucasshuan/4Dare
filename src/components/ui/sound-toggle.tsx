"use client";

import { Volume2, VolumeX } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { updateSettings, useSettings } from "@/lib/settings";

/**
 * Sound on or off, music included, in one tap: a round key the size of the
 * theme toggle's track, beside it. The speaker wiggles as the sound comes back.
 */
export function SoundToggle() {
  const t = useTranslations("home.user");
  const { muted } = useSettings();
  const still = useReducedMotion() ?? false;
  const label = muted ? t("soundOff") : t("soundOn");
  return (
    <button
      type="button"
      aria-pressed={!muted}
      aria-label={label}
      title={label}
      onClick={() => updateSettings((s) => ({ ...s, muted: !s.muted }))}
      className="inline-flex size-10 items-center justify-center rounded-pill bg-surface text-ink transition-colors duration-200 ease-soft hover:text-ink aria-[pressed=false]:text-ink-muted dark:bg-sunken"
    >
      <m.span
        // a new key on each change replays the wiggle
        key={muted ? "off" : "on"}
        className="flex"
        initial={false}
        animate={
          !muted && !still
            ? { rotate: [0, -14, 10, 0], scale: [0.8, 1] }
            : undefined
        }
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {muted ? (
          <VolumeX className="size-5" strokeWidth={1.75} />
        ) : (
          <Volume2 className="size-5" strokeWidth={1.75} />
        )}
      </m.span>
    </button>
  );
}
