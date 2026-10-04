"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  type CardContent,
  PickCard,
  type PickCardState,
} from "@/features/pick/pick-card";
import { useCharacterIndex } from "@/features/pick/use-character-index";
import { type SearchItem, toCardView } from "@/game/character-search";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";

const PRESETS = [
  "empty",
  "typing",
  "picked",
  "restore",
  "new",
  "newPicture",
  "uploading",
] as const;
const STATES: PickCardState[] = ["editing", "confirmed", "timeUp"];

/** A 16-character Portuguese guest name, the longest a name gets. */
const LONG_NAME = "Convidada 123456";

function presetContent(preset: string, items: SearchItem[]): CardContent {
  const first = items[0];
  const second = items[1] ?? first;
  switch (preset) {
    case "typing":
      return first
        ? { kind: "typing", text: first[1].slice(0, 4), preview: first }
        : { kind: "empty" };
    case "picked":
      return second
        ? { kind: "picked", card: toCardView(second), via: "list" }
        : { kind: "empty" };
    case "restore":
      return first
        ? { kind: "picked", card: toCardView(first), via: "restore" }
        : { kind: "empty" };
    case "new":
      return {
        kind: "new",
        name: "Chapolin Colorado",
        imageUrl: null,
        uploading: false,
      };
    case "newPicture":
    case "uploading":
      return {
        kind: "new",
        name: "Chapolin Colorado",
        imageUrl: items.find((i) => i[3])?.[3] ?? null,
        uploading: preset === "uploading",
      };
    default:
      return { kind: "empty" };
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Dev page body: the card in the middle, buttons for every state above it. */
export function PickCardLab({
  lang,
  preset: initialPreset,
  state: initialState,
  stamp: initialStamp,
  longNames,
  failUploads,
}: {
  lang: Lang;
  preset: string;
  state: string;
  stamp: boolean;
  longNames: boolean;
  failUploads: boolean;
}) {
  const t = useTranslations("pickCard");
  const index = useCharacterIndex(lang);
  const items = index.data ?? [];
  const [value, setValue] = useState<CardContent>({ kind: "empty" });
  const [state, setState] = useState<PickCardState>(
    STATES.includes(initialState as PickCardState)
      ? (initialState as PickCardState)
      : "editing",
  );
  const [stamp, setStamp] = useState(initialStamp);
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const note = (line: string) => setLog((l) => [line, ...l].slice(0, 4));
  const target = longNames ? LONG_NAME : "Leo";

  // Presets need the library: apply the one in the address once it loads.
  useEffect(() => {
    if (ready || !index.data) return;
    setValue(presetContent(initialPreset, index.data));
    setReady(true);
  }, [ready, index.data, initialPreset]);

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-canvas px-4 py-6">
      <div className="flex max-w-3xl flex-wrap justify-center gap-1.5 text-[12px]">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setValue(presetContent(p, items))}
            className="rounded-pill border border-line-strong bg-surface px-2.5 py-1 font-semibold"
          >
            {p}
          </button>
        ))}
        <span className="w-2" />
        {STATES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setState(s)}
            className={cn(
              "rounded-pill border px-2.5 py-1 font-semibold",
              s === state
                ? "border-sky bg-sky-soft"
                : "border-line-strong bg-surface",
            )}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStamp((v) => !v)}
          className={cn(
            "rounded-pill border px-2.5 py-1 font-semibold",
            stamp ? "border-sky bg-sky-soft" : "border-line-strong bg-surface",
          )}
        >
          stamp
        </button>
      </div>

      <h1 className="max-w-full text-balance text-center font-bold font-display text-[21px] tracking-[-0.015em] sm:text-[28px]">
        {t("cardTitle", { name: target })}
      </h1>

      <PickCard
        value={value}
        onChange={(next) => {
          setValue(next);
          note(`onChange ${next.kind}`);
        }}
        lang={lang}
        targetName={target}
        state={state}
        stamp={stamp}
        onNewImage={async (file) => {
          note(`onNewImage ${Math.round(file.size / 1024)} KB`);
          await wait(900);
          return failUploads ? null : URL.createObjectURL(file);
        }}
        onLibraryImage={async (id, file) => {
          note(`onLibraryImage ${id} ${Math.round(file.size / 1024)} KB`);
          await wait(900);
          if (failUploads) throw new Error("upload failed");
        }}
      />

      <pre
        data-testid="card-value"
        className="mt-28 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-sunken p-3 font-mono text-[11px] text-ink-muted"
      >
        {JSON.stringify(
          value.kind === "typing"
            ? { ...value, preview: value.preview?.[1] ?? null }
            : value,
        )}
        {"\n"}
        {log.join("\n")}
      </pre>
    </main>
  );
}
