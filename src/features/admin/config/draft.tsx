"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SOUND_LIBRARY } from "@/game/sounds";
import { defaultAt, entryOf } from "@/game/tunables";
import { setRoomTunes, type TuneValue } from "@/game/tune";
import { saveConfigAction } from "@/server/admin/actions";

interface Draft {
  /** The version in force. */
  version: number;
  /** What the version in force holds (only what differs from the code). */
  saved: Record<string, TuneValue>;
  /** What the admin changed and hasn't saved yet. */
  edits: Record<string, TuneValue>;
  /** The value a field shows: the edit, else the saved value, else the code's. */
  value: (key: string) => TuneValue | undefined;
  /** The value in force now (saved, else the code's). */
  live: (key: string) => TuneValue | undefined;
  set: (key: string, value: TuneValue) => void;
  reset: (key: string) => void;
  discard: () => void;
  save: (note: string) => Promise<boolean>;
  saving: boolean;
  error: string | null;
}

const DraftContext = createContext<Draft | null>(null);

const asLeaf = (v: unknown): TuneValue | undefined =>
  typeof v === "number" || typeof v === "boolean" || typeof v === "string"
    ? v
    : undefined;

/**
 * The panel's unsaved changes, shared by every page: a field writes here, the
 * tray at the bottom lists them and saves them all as one new version.
 */
export function DraftProvider({
  version,
  saved,
  children,
}: {
  version: number;
  saved: Record<string, TuneValue>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, TuneValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = useCallback(
    (key: string) => saved[key] ?? asLeaf(defaultAt(key)),
    [saved],
  );
  const set = useCallback(
    (key: string, value: TuneValue) =>
      setEdits((e) => {
        const next = { ...e };
        if (value === (saved[key] ?? asLeaf(defaultAt(key)))) delete next[key];
        else next[key] = value;
        return next;
      }),
    [saved],
  );
  const reset = useCallback(
    (key: string) =>
      setEdits((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      }),
    [],
  );
  const save = useCallback(
    async (note: string) => {
      setSaving(true);
      setError(null);
      const all: Record<string, TuneValue> = { ...saved, ...edits };
      const r = await saveConfigAction(all, note);
      setSaving(false);
      if (!r.ok) {
        setError(
          r.error === "already_done" ? "Nada mudou." : "Não deu para salvar.",
        );
        return false;
      }
      setEdits({});
      router.refresh();
      return true;
    },
    [saved, edits, router],
  );

  const value = useMemo<Draft>(
    () => ({
      version,
      saved,
      edits,
      value: (key) => edits[key] ?? live(key),
      live,
      set,
      reset,
      discard: () => setEdits({}),
      save,
      saving,
      error,
    }),
    [version, saved, edits, live, set, reset, save, saving, error],
  );
  return <DraftContext value={value}>{children}</DraftContext>;
}

export function useDraft(): Draft {
  const d = useContext(DraftContext);
  if (!d) throw new Error("useDraft outside DraftProvider");
  return d;
}

/**
 * While mounted, what plays (the sound desk, a scene) reads the values on
 * screen, the unsaved ones included, instead of the site's.
 */
export function useDraftInForce() {
  const { saved, edits } = useDraft();
  useEffect(() => {
    setRoomTunes({ ...saved, ...edits });
  }, [saved, edits]);
  useEffect(() => () => setRoomTunes(null), []);
}

/** A value as the panel writes it: ms as seconds, a switch as sim/não, a choice by its label. */
export function showValue(key: string, v: TuneValue | undefined): string {
  if (v === undefined) return "—";
  const e = entryOf(key);
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "string") return choiceLabel(key, v) || "nenhuma";
  if (e?.unit === "ms")
    return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} s`;
  if (e?.unit === "s") return `${v} s`;
  if (e?.unit === "db")
    return `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR")} dB`;
  if (e?.unit === "gain") return `×${v.toLocaleString("pt-BR")}`;
  return String(v);
}

const CHOICES: Record<string, Record<string, string>> = {
  games: {
    open: "Aberto a todos",
    test: "Em teste (só você)",
    closed: "Fechado",
  },
  "room.mode": { host: "Com apresentador", classic: "Sem apresentador" },
  "room.themeMode": { vote: "Por voto", host: "Anfitrião digita" },
};

/** A choice's name in the panel; a track's id is its name, capitalised; "" is silence. */
export function choiceLabel(key: string, v: string): string {
  const own = CHOICES[key] ?? CHOICES[key.split(".")[0]];
  if (own?.[v]) return own[v];
  if (key.startsWith("moments."))
    return v ? v[0].toUpperCase() + v.slice(1) : "Sem música";
  if (key.startsWith("roomSounds."))
    return SOUND_LIBRARY.find((x) => x.id === v)?.name ?? v;
  return v;
}
