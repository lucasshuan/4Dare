import "server-only";
import type { Localized } from "@/game/types";
import bankFile from "../../data/themes.json";
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

/** data/themes.json, the built-in theme list (bundled, so it ships with the server). */
export function themeBank(): Localized[] {
  const list = bankFile as Localized[];
  return list.length >= 3 ? list : FALLBACK;
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
