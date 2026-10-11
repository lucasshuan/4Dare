"use client";

import { Popover } from "@base-ui/react/popover";
import { Volume1, Volume2, VolumeX } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  DEFAULT_SETTINGS,
  type Settings,
  updateSettings,
  useSettings,
} from "@/lib/settings";
import { Slider } from "./slider";

/** A click on the key: silent goes back to the level it had (half, if it had none); sound goes silent. */
const flip = (s: Settings): Settings =>
  s.muted || s.volume === 0
    ? { ...s, muted: false, volume: s.volume || DEFAULT_SETTINGS.volume }
    : { ...s, muted: true };

/**
 * The site's volume, made easy: a round key like the theme key beside it.
 * A click mutes, or brings the sound back to where it was; resting the
 * pointer on it drops a slider below for the overall volume (half to start).
 * Sliding to 0 mutes and keeps the level the key brings back. The speaker
 * wiggles as the sound comes back.
 */
export function SoundToggle() {
  const t = useTranslations("home.user");
  const tSound = useTranslations("settings.sound");
  const { muted, volume } = useSettings();
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const silent = muted || volume === 0;
  const level = silent ? 0 : Math.round(volume * 100);
  const label = silent ? t("soundOff") : t("soundOn");
  const Icon = silent ? VolumeX : level < 50 ? Volume1 : Volume2;
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next, details) => {
        // a press mutes (onClick); only the pointer opens and closes the slider
        if (details.reason !== "trigger-press") setOpen(next);
      }}
    >
      <Popover.Trigger
        openOnHover
        delay={120}
        closeDelay={200}
        aria-pressed={!silent}
        aria-label={label}
        onClick={() => updateSettings(flip)}
        className="inline-flex size-10 items-center justify-center rounded-pill bg-surface text-ink transition-colors duration-200 ease-soft hover:text-ink aria-[pressed=false]:text-ink-muted dark:bg-sunken"
      >
        <m.span
          // a new key on each change replays the wiggle
          key={silent ? "off" : "on"}
          className="flex"
          initial={false}
          animate={
            !silent && !still
              ? { rotate: [0, -14, 10, 0], scale: [0.8, 1] }
              : undefined
          }
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </m.span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" sideOffset={8} className="z-50">
          <Popover.Popup
            initialFocus={false}
            className="flex w-52 origin-[var(--transform-origin)] items-center gap-3 rounded-pill bg-surface py-0.5 pr-3.5 pl-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0"
          >
            <Slider
              label={tSound("master")}
              value={level}
              onValueChange={(v) =>
                updateSettings((s) =>
                  v === 0
                    ? { ...s, muted: true }
                    : { ...s, muted: false, volume: v / 100 },
                )
              }
              className="flex-1"
            />
            <span className="w-9 text-right font-medium font-mono text-[12px] text-ink-muted tabular-nums">
              {level}%
            </span>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
