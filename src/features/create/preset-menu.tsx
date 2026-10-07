"use client";

import { Popover } from "@base-ui/react/popover";
import { Bookmark, ChevronDown, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { GOSTO_KEYS, GOSTOS, type Gosto } from "@/game/gostos";
import {
  applyPreset,
  matchesPreset,
  PRESET_NAME_MAX,
  PRESETS_MAX,
  presetSetup,
  READY_PRESETS,
  type ReadyPreset,
  type RoomPreset,
  readyOff,
} from "@/game/presets";
import { cn } from "@/lib/cn";
import { updateSettings, useSettings } from "@/lib/settings";
import type { CreateRoomInput } from "@/server/contract";
import { useGameName } from "./game-field";

/** A ready preset as a preset of the room's own game: its gostos, every theme on. */
const asPreset = (p: ReadyPreset, value: CreateRoomInput) => ({
  game: value.game,
  setup: { ...presetSetup(value), offGostos: readyOff(p), offThemes: [] },
});

const newId = () =>
  `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The gostos a preset keeps on, as emojis. */
function Emojis({ off }: { off: readonly Gosto[] }) {
  return (
    <span aria-hidden className="flex shrink-0 gap-px text-[13px] leading-none">
      {GOSTOS.filter((g) => !off.includes(g.key)).map((g) => (
        <span key={g.key}>{g.emoji}</span>
      ))}
    </span>
  );
}

const itemClass =
  "flex w-full min-w-0 items-center gap-2.5 rounded-sm px-2 py-1.5 text-left outline-none transition-colors duration-150 ease-soft hover:bg-sunken focus-visible:ring-2 focus-visible:ring-sky";

/**
 * Presets over the advanced setup: the one the room matches (or "changed"
 * once it drifts), the ready ones, the person's own with a star for the one
 * new rooms start from, and a field to save the setup under a name.
 */
export function PresetMenu({
  value,
  onChange,
}: {
  value: CreateRoomInput;
  onChange: (v: CreateRoomInput) => void;
}) {
  const t = useTranslations("home.presets");
  const gameName = useGameName();
  const { presets } = useSettings();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  /** The preset picked last here, to say when the setup drifts from it. */
  const [picked, setPicked] = useState<string | null>(null);

  const readyName = (p: ReadyPreset) => t(`readyNames.${p.key}`);
  const all = [
    ...READY_PRESETS.map((p) => ({
      id: `ready-${p.key}`,
      name: readyName(p),
      preset: asPreset(p, value),
    })),
    ...presets.map((p) => ({ id: p.id, name: p.name, preset: p })),
  ];
  const pickedOne = all.find((p) => p.id === picked);
  const current = pickedOne ?? all.find((p) => matchesPreset(value, p.preset));
  const changed = !!current && !matchesPreset(value, current.preset);

  const savePresets = (next: RoomPreset[]) =>
    updateSettings((s) => ({ ...s, presets: next }));
  const trimmed = name.trim();
  const same = presets.find((p) => p.game === value.game && p.name === trimmed);
  const full = !same && presets.length >= PRESETS_MAX;
  const save = (e: FormEvent) => {
    e.preventDefault();
    // the menu sits inside the setup's form, and React events cross portals
    e.stopPropagation();
    if (!trimmed || full) return;
    const setup = presetSetup(value);
    const id = same?.id ?? newId();
    savePresets(
      same
        ? presets.map((p) => (p.id === id ? { ...p, setup } : p))
        : [
            ...presets,
            { id, name: trimmed, game: value.game, setup, isDefault: false },
          ],
    );
    setPicked(id);
    setName("");
    setOpen(false);
  };
  const pick = (id: string, preset: Pick<RoomPreset, "game" | "setup">) => {
    onChange(applyPreset(value, preset));
    setPicked(id);
    setOpen(false);
  };
  const star = (p: RoomPreset) =>
    savePresets(
      presets.map((x) =>
        x.game !== p.game
          ? x
          : { ...x, isDefault: x.id === p.id ? !p.isDefault : false },
      ),
    );
  const remove = (p: RoomPreset) => {
    savePresets(presets.filter((x) => x.id !== p.id));
    if (picked === p.id) setPicked(null);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "inline-flex h-10 max-w-full items-center gap-2 self-start rounded-pill border-[1.5px] border-line bg-surface pr-3 pl-3.5 text-sm transition-colors duration-200 ease-soft hover:border-line-strong",
          open && "border-line-strong",
        )}
      >
        <Bookmark className="size-4 shrink-0 text-ink-muted" strokeWidth={2} />
        <span className="text-ink-muted">{t("label")}</span>
        <span className="min-w-0 truncate font-semibold">
          {current ? current.name : t("none")}
        </span>
        {changed ? (
          <span className="shrink-0 text-ink-muted">· {t("changed")}</span>
        ) : null}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-soft",
            open && "rotate-180",
          )}
          strokeWidth={2.25}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50"
        >
          <Popover.Popup className="flex max-h-[min(560px,var(--available-height))] w-[min(360px,calc(100vw-2rem))] origin-(--transform-origin) flex-col gap-3 overflow-y-auto rounded-md bg-surface p-3 shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <section className="flex flex-col gap-0.5">
              <h3 className="px-2 pb-1 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.08em]">
                {t("ready")}
              </h3>
              {READY_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={itemClass}
                  onClick={() => pick(`ready-${p.key}`, asPreset(p, value))}
                >
                  <span className="min-w-0 flex-1 truncate font-semibold text-sm">
                    {readyName(p)}
                  </span>
                  <Emojis off={readyOff(p)} />
                </button>
              ))}
            </section>
            <section className="flex flex-col gap-0.5">
              <h3 className="px-2 pb-1 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.08em]">
                {t("mine")}
              </h3>
              {presets.length ? (
                presets.map((p) => (
                  <div key={p.id} className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className={itemClass}
                      onClick={() => pick(p.id, p)}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold text-sm">
                          {p.name}
                        </span>
                        <span className="truncate text-[12px] text-ink-muted">
                          {[
                            p.game === value.game ? null : gameName(p.game),
                            t("gostosOn", {
                              on: GOSTO_KEYS.length - p.setup.offGostos.length,
                              total: GOSTO_KEYS.length,
                            }),
                            p.setup.offThemes.length
                              ? t("themesOff", {
                                  count: p.setup.offThemes.length,
                                })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <Emojis off={p.setup.offGostos} />
                    </button>
                    <button
                      type="button"
                      aria-pressed={p.isDefault}
                      aria-label={t("startsNew", {
                        name: p.name,
                        game: gameName(p.game),
                      })}
                      title={t("startsNew", {
                        name: p.name,
                        game: gameName(p.game),
                      })}
                      onClick={() => star(p)}
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-pill transition-colors duration-150 ease-soft hover:bg-sunken",
                        p.isDefault ? "text-apricot" : "text-ink-muted",
                      )}
                    >
                      <Star
                        className="size-4"
                        strokeWidth={2}
                        fill={p.isDefault ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label={t("remove", { name: p.name })}
                      onClick={() => remove(p)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-150 ease-soft hover:bg-sunken hover:text-no"
                    >
                      <Trash2 className="size-4" strokeWidth={2} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-2 text-[13px] text-ink-muted">{t("empty")}</p>
              )}
            </section>
            <form
              onSubmit={save}
              className="flex flex-col gap-1.5 border-line border-t pt-3"
            >
              <div className="flex gap-2">
                <input
                  value={name}
                  maxLength={PRESET_NAME_MAX}
                  placeholder={t("namePlaceholder")}
                  aria-label={t("namePlaceholder")}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-sm border-[1.5px] border-line-strong bg-canvas px-3 text-sm outline-none transition-colors placeholder:text-ink-muted focus:border-sky"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!trimmed || full}
                >
                  {same ? t("replace") : t("save")}
                </Button>
              </div>
              {full ? (
                <p className="text-[12px] text-no">
                  {t("full", { max: PRESETS_MAX })}
                </p>
              ) : null}
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
