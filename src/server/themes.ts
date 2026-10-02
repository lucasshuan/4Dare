import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Localized } from "@/game/types";
import type { ThemeSource } from "./backend/types";

const FALLBACK: Localized[] = [
  { en: "Villains", pt: "Vilões", ja: "悪役" },
  { en: "Robots", pt: "Robôs", ja: "ロボット" },
  {
    en: "Rich characters",
    pt: "Personagens ricos",
    ja: "お金持ちのキャラクター",
  },
];

let bank: Localized[] | null = null;

/** data/themes.json, the built-in theme list. */
export function themeBank(): Localized[] {
  if (bank) return bank;
  try {
    const file = join(process.cwd(), "data", "themes.json");
    const list = JSON.parse(readFileSync(file, "utf8")) as Localized[];
    bank = list.length >= 3 ? list : FALLBACK;
  } catch {
    bank = FALLBACK;
  }
  return bank;
}

function pickFromBank(avoid: Localized[]): Localized {
  const seen = new Set(avoid.map((t) => t.en.toLowerCase()));
  const all = themeBank();
  const fresh = all.filter((t) => !seen.has(t.en.toLowerCase()));
  const pool = fresh.length ? fresh : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function themes(): ThemeSource {
  return {
    drawFromBank: () => pickFromBank([]),
    // The AI draw comes later; the bank is always the fallback anyway.
    async draw(avoid) {
      return pickFromBank(avoid);
    },
  };
}
