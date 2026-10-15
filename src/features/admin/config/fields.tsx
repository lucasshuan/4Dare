"use client";

import { Lock, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { defaultAt, entryOf } from "@/game/tunables";
import { AdminSelect, type SelectOption } from "../ui/select";
import { choiceLabel, showValue, useDraft } from "./draft";

/** Seconds as the panel types them: "4,3". */
const toSeconds = (ms: number) =>
  (ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** A number field for a tunable leaf: ms are typed in seconds, the rest as is. */
export function TuneNumber({ k, label }: { k: string; label: string }) {
  const d = useDraft();
  const e = entryOf(k);
  const ms = e?.unit === "ms";
  const v = d.value(k);
  const shown =
    typeof v === "number"
      ? ms
        ? toSeconds(v)
        : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
      : "";
  const [text, setText] = useState(shown);
  // follows the value when it changes elsewhere (discard, reset, a save)
  useEffect(() => setText(shown), [shown]);
  if (typeof v !== "number") return <span className="muted">—</span>;
  if (e?.locked) return <span className="mono">{showValue(k, v)}</span>;
  const dirty = k in d.edits;
  const commit = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n)) return setText(shown);
    const frac = e?.unit === "gain" || e?.unit === "db";
    let out = frac ? Math.round(n * 100) / 100 : Math.round(ms ? n * 1000 : n);
    if (e?.min !== undefined) out = Math.max(e.min, out);
    if (e?.max !== undefined) out = Math.min(e.max, out);
    d.set(k, out);
    setText(ms ? toSeconds(out) : String(out));
  };
  return (
    <span
      className="row"
      style={{ gap: 6, flexWrap: "nowrap", justifyContent: "flex-end" }}
    >
      <input
        className={dirty ? "num dirty" : "num"}
        inputMode="decimal"
        value={text}
        aria-label={label}
        onChange={(ev) => setText(ev.target.value)}
        onBlur={(ev) => commit(ev.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") commit((ev.target as HTMLInputElement).value);
          if (ev.key === "Escape") setText(shown);
        }}
      />
      <span className="muted" style={{ minWidth: "2ch" }}>
        {UNIT[e?.unit ?? "n"]}
      </span>
    </span>
  );
}

const UNIT: Record<string, string> = {
  ms: "s",
  s: "s",
  n: "",
  xp: "XP",
  coins: "🪙",
  db: "dB",
  bar: "c.",
  bool: "",
  choice: "",
  gain: "×",
};

/** An on/off tunable. */
export function TuneSwitch({ k, label }: { k: string; label: string }) {
  const d = useDraft();
  const v = d.value(k);
  return (
    <Switch
      checked={v === true}
      onCheckedChange={(c) => d.set(k, c)}
      aria-label={label}
    />
  );
}

/** A tunable with a few values, as the site's select. */
export function TuneChoice({
  k,
  label,
  icons,
  size = "md",
}: {
  k: string;
  label: string;
  icons?: Record<string, SelectOption["icon"]>;
  size?: "sm" | "md";
}) {
  const d = useDraft();
  const e = entryOf(k);
  const v = d.value(k);
  return (
    <AdminSelect
      label={label}
      size={size}
      value={typeof v === "string" ? v : ""}
      onChange={(x) => d.set(k, x)}
      options={(e?.options ?? []).map((o) => ({
        value: o,
        label: choiceLabel(k, o),
        icon: icons?.[o],
      }))}
      className={k in d.edits ? "border-butter bg-butter-soft" : undefined}
    />
  );
}

/** Undoes the unsaved change of these keys, shown only when there is one. */
export function ResetEdits({ keys }: { keys: string[] }) {
  const d = useDraft();
  if (!keys.some((k) => k in d.edits)) return null;
  return (
    <button
      type="button"
      className="btn sm ghost icon"
      title="Desfazer"
      aria-label="Desfazer"
      onClick={() => {
        for (const k of keys) d.reset(k);
      }}
    >
      <RotateCcw className="i" />
    </button>
  );
}

/** "Sincronizado com …": a value the panel shows but can't move. */
export function Locked({ why }: { why: string }) {
  return (
    <div className="lock">
      <Lock className="i" />
      {why}
    </div>
  );
}

/** The code's value, as the panel writes it (the "Padrão" column). */
export function DefaultValue({ k }: { k: string }) {
  return <>{showValue(k, defaultAt(k) as never)}</>;
}
