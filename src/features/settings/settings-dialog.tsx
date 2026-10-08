"use client";

import { Tabs } from "@base-ui/react/tabs";
import {
  Check,
  Gamepad2,
  Languages,
  Palette,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";
import { Modal } from "@/components/ui/dialog";
import { Flag } from "@/components/ui/language-switch";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { Segmented } from "@/features/create/settings-fields";
import { type GameKey, OPEN_GAMES } from "@/game/games";
import { GAME_OPTIONS, type GameOption, THEMES } from "@/game/options";
import { LANGS, type Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import { useSwitchLanguage } from "@/lib/hooks/use-switch-language";
import {
  type Settings,
  SOUND_GROUPS,
  updateSettings,
  useSettings,
} from "@/lib/settings";
import { playSound } from "@/lib/sound";

const TABS = [
  { value: "sound", Icon: Volume2 },
  { value: "look", Icon: Palette },
  { value: "game", Icon: Gamepad2 },
  { value: "language", Icon: Languages },
] as const;

/**
 * Sound, look, each game's options and language, in a box that keeps its size
 * from tab to tab (only the content scrolls). Kept on this device.
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("settings");
  const wide = useMedia("(min-width: 640px)");
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      icon={<SettingsIcon strokeWidth={1.75} />}
    >
      <Tabs.Root
        defaultValue="sound"
        orientation={wide ? "vertical" : "horizontal"}
        className="flex min-h-0 flex-1 flex-col sm:grid sm:grid-cols-[200px_minmax(0,1fr)]"
      >
        <Tabs.List className="flex shrink-0 gap-1 overflow-x-auto border-line bg-canvas p-3 max-sm:border-b sm:flex-col sm:border-r">
          {TABS.map(({ value, Icon }) => (
            <Tabs.Tab
              key={value}
              value={value}
              className="flex h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 font-semibold text-[15px] text-ink-muted outline-none transition-colors duration-200 ease-soft hover:text-ink focus-visible:outline-3 focus-visible:outline-sky data-active:bg-surface data-active:text-ink data-active:shadow-card"
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
              {t(`tabs.${value}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Pane value="sound">
          <SoundPane />
        </Pane>
        <Pane value="look">
          <LookPane />
        </Pane>
        <Pane value="game">
          <GamePane />
        </Pane>
        <Pane value="language">
          <LanguagePane />
        </Pane>
      </Tabs.Root>
    </Modal>
  );
}

function Pane({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Tabs.Panel
      value={value}
      className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 outline-none sm:p-6"
    >
      {children}
    </Tabs.Panel>
  );
}

/** A setting's name and what it does, then its control on the right. */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-line border-t py-3 first:border-t-0 first:pt-0">
      <div className="flex min-w-48 flex-1 flex-col">
        <span className="font-semibold text-[15px]">{label}</span>
        {hint ? (
          <span className="text-[13px] text-ink-muted">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const percent = (v: number) => Math.round(v * 100);

function SoundPane() {
  const t = useTranslations("settings.sound");
  const s = useSettings();
  const set = (change: (s: Settings) => Settings) => updateSettings(change);
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-canvas p-4">
        <button
          type="button"
          aria-pressed={s.muted}
          aria-label={s.muted ? t("unmute") : t("mute")}
          onClick={() => set((x) => ({ ...x, muted: !x.muted }))}
          className="flex size-10 items-center justify-center rounded-pill bg-surface text-ink shadow-card transition-colors duration-200 ease-soft"
        >
          {s.muted ? (
            <VolumeX className="size-5" strokeWidth={1.75} />
          ) : (
            <Volume2 className="size-5" strokeWidth={1.75} />
          )}
        </button>
        <span className="font-semibold">{t("master")}</span>
        <Slider
          label={t("master")}
          value={percent(s.volume)}
          disabled={s.muted}
          onValueChange={(v) => set((x) => ({ ...x, volume: v / 100 }))}
          className="min-w-32 flex-1"
        />
        <span className="w-12 text-right font-medium font-mono tabular-nums">
          {percent(s.volume)}%
        </span>
      </div>
      <div className="flex flex-col">
        {SOUND_GROUPS.map((g) => {
          const group = s.sounds[g];
          const setGroup = (change: Partial<typeof group>) =>
            set((x) => ({
              ...x,
              sounds: { ...x.sounds, [g]: { ...x.sounds[g], ...change } },
            }));
          return (
            <Row
              key={g}
              label={t(`groups.${g}.label`)}
              hint={t(`groups.${g}.hint`)}
            >
              <div className="flex items-center gap-3">
                <Slider
                  label={t(`groups.${g}.label`)}
                  value={percent(group.volume)}
                  disabled={s.muted || !group.on}
                  onValueChange={(v) => setGroup({ volume: v / 100 })}
                  className="w-32 max-sm:hidden"
                />
                <span
                  className={cn(
                    "w-11 text-right font-medium font-mono text-sm tabular-nums max-sm:hidden",
                    (s.muted || !group.on) && "opacity-40",
                  )}
                >
                  {percent(group.volume)}%
                </span>
                <Switch
                  aria-label={t(`groups.${g}.label`)}
                  checked={group.on}
                  onCheckedChange={(on) => setGroup({ on })}
                />
              </div>
            </Row>
          );
        })}
      </div>
      <div className="mt-auto flex">
        <button
          type="button"
          onClick={() => playSound("step")}
          className="inline-flex h-9 items-center gap-2 rounded-pill border-[1.5px] border-line-strong px-4 font-semibold text-sm transition-transform duration-150 active:scale-[0.98]"
        >
          <Volume2 className="size-4" strokeWidth={2} />
          {t("try")}
        </button>
      </div>
    </>
  );
}

function LookPane() {
  const t = useTranslations("settings.look");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const s = useSettings();
  const current = (THEMES as readonly string[]).includes(theme ?? "")
    ? (theme as (typeof THEMES)[number])
    : "light";
  return (
    <div className="flex flex-col">
      <Row label={t("theme")} hint={t("themeHint")}>
        <Segmented
          label={t("theme")}
          options={THEMES}
          value={mounted ? current : "light"}
          onChange={setTheme}
          render={(v) => t(`themes.${v}`)}
        />
      </Row>
      <Row label={t("bubbles")} hint={t("bubblesHint")}>
        <Switch
          aria-label={t("bubbles")}
          checked={s.chatBubbles}
          onCheckedChange={(chatBubbles) =>
            updateSettings((x) => ({ ...x, chatBubbles }))
          }
        />
      </Row>
    </div>
  );
}

/** An option's key under `settings.game.options`, for every option GAME_OPTIONS lists. */
type OptionKey = {
  [G in GameKey]: `options.${G}.${GameOption<G> & string}`;
}[GameKey];

/** The game first, then that game's own options: each game brings its own. */
function GamePane() {
  const t = useTranslations("settings.game");
  const gameName = useGameName();
  const [game, setGame] = useState<GameKey>(OPEN_GAMES[0]);
  const s = useSettings();
  // each game's own keys: read loosely, the messages name them
  const options = Object.keys(GAME_OPTIONS[game]);
  const values = s.games[game] as Record<string, boolean>;
  return (
    <>
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 border-line border-b p-0 pb-4">
        <legend className="sr-only">{t("pick")}</legend>
        {OPEN_GAMES.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={g === game}
            onClick={() => setGame(g)}
            className={cn(
              "flex h-[52px] items-center gap-3 rounded-lg border-[1.5px] bg-surface py-1.5 pr-4 pl-1.5 font-semibold text-sm transition-colors duration-200 ease-soft",
              g === game
                ? "border-ink"
                : "border-line hover:border-line-strong",
            )}
          >
            <GameThumb game={g} size="sm" />
            {gameName(g)}
          </button>
        ))}
      </fieldset>
      <div className="flex flex-col">
        {options.map((o) => {
          const key = `options.${game}.${o}` as OptionKey;
          return (
            <Row key={o} label={t(`${key}.label`)} hint={t(`${key}.hint`)}>
              <Switch
                aria-label={t(`${key}.label`)}
                checked={values[o]}
                onCheckedChange={(on) =>
                  updateSettings((x) => ({
                    ...x,
                    games: {
                      ...x.games,
                      [game]: { ...x.games[game], [o]: on },
                    },
                  }))
                }
              />
            </Row>
          );
        })}
      </div>
    </>
  );
}

function LanguagePane() {
  const t = useTranslations("common");
  const locale = useLocale() as Lang;
  const switchLanguage = useSwitchLanguage();
  // Alphabetical by each language's own name, as in the language select.
  const langs = [...LANGS].sort((a, b) =>
    t(`languages.${a}`).localeCompare(t(`languages.${b}`), "en"),
  );
  return (
    <fieldset className="m-0 grid min-w-0 grid-cols-1 gap-2 border-0 p-0 sm:grid-cols-2">
      <legend className="sr-only">{t("language")}</legend>
      {langs.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => l !== locale && switchLanguage(l)}
          className={cn(
            "flex h-14 items-center gap-3 rounded-lg border-[1.5px] bg-surface px-4 font-semibold transition-colors duration-200 ease-soft",
            l === locale
              ? "border-ink"
              : "border-line hover:border-line-strong",
          )}
        >
          <Flag lang={l} />
          {t(`languages.${l}`)}
          {l === locale ? (
            <Check
              className="ml-auto size-[18px] text-sky"
              strokeWidth={2.25}
            />
          ) : null}
        </button>
      ))}
    </fieldset>
  );
}
