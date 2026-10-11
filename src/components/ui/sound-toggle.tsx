"use client";

import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
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
import { Tip } from "./tip";

/** A click on the key: silent goes back to the level it had (half, if it had none); sound goes silent. */
const flip = (s: Settings): Settings =>
  s.muted || s.volume === 0
    ? { ...s, muted: false, volume: s.volume || DEFAULT_SETTINGS.volume }
    : { ...s, muted: true };

/**
 * The site's volume, made easy: a round key like the theme key beside it.
 * A click mutes, or brings the sound back to where it was; resting the
 * pointer on it drops a bare upright slider below for the overall volume
 * (half to start), with its tip at the side, out of the slider's way.
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
      <Tip label={tSound("master")} side="left" open={open}>
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
      </Tip>
      <Popover.Portal>
        <Popover.Positioner side="bottom" sideOffset={8} className="z-50">
          <Popover.Popup
            initialFocus={false}
            aria-label={tSound("master")}
            className="origin-top px-2 py-1 outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-y-90 data-starting-style:scale-y-90 data-ending-style:opacity-0 data-starting-style:opacity-0"
          >
            <Slider.Root
              orientation="vertical"
              value={level}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v;
                updateSettings((s) =>
                  next === 0
                    ? { ...s, muted: true }
                    : { ...s, muted: false, volume: next / 100 },
                );
              }}
              className="cursor-pointer"
            >
              <Slider.Control className="flex h-28 touch-none select-none justify-center px-2.5">
                {/* a see-through ink track and a solid ink fill: they read on any room colour behind them */}
                <Slider.Track className="h-full w-1.5 select-none rounded-pill bg-ink/20">
                  <Slider.Indicator className="select-none rounded-pill bg-ink" />
                  <Slider.Thumb
                    aria-label={tSound("master")}
                    className="size-4 select-none rounded-pill border-2 border-ink bg-surface shadow-card has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-sky has-[:focus-visible]:outline-offset-2"
                  />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
