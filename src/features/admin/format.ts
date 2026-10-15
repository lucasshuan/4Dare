import type { GameKey } from "@/game/games";

/** 17322 → "17.322". */
export const fmt = (n: number) => n.toLocaleString("pt-BR");

/** 771 → "12min 51s"; nothing → "—". */
export const dur = (s: number | null | undefined) =>
  s ? `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s` : "—";

/** How long ago, short: "há 5 min", "há 3 h", "há 9 d". @public */
export function ago(ts: number, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ts) / 60_000));
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

const GAME_COLOR: Partial<Record<GameKey, string>> = {
  "who-am-i": "#2b69c8",
  impostor: "#8a4fc4",
  lineup: "#cf7024",
};
const PALETTE = [
  "#2b69c8",
  "#8a4fc4",
  "#cf7024",
  "#0b7a75",
  "#c03d8a",
  "#3d8b47",
  "#b38600",
  "#1590a8",
  "#9b5a1f",
  "#6b4fd6",
];

/** A game's colour in the charts; a game without one gets a steady pick from the palette. */
export const gameColor = (k: string) =>
  GAME_COLOR[k as GameKey] ??
  PALETTE[[...k].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
