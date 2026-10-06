// Lab fixtures for the theme show's first part: the hero and the rule (cards or sentence).
// The rule cards are drawn portraits (no art); the ✗ card has no Japanese name, as a
// library card may not, so the lab shows the English fallback in /ja.

import { THEME_OPTIONS } from "@/game/types";
import { exampleCard, type SceneFixtures } from "../fixtures";
import type { LabParams } from "../params";

const misfit = exampleCard("lab-e3", "Shrek", 2);

export function scenario(params: LabParams): SceneFixtures {
  if (params.match !== "first" || params.typed || params.rule !== "cards")
    return {};
  const rule = {
    fits: [
      {
        ...exampleCard("lab-e1", "Spider-Man", 0),
        names: { en: "Spider-Man", pt: "Homem-Aranha", ja: "スパイダーマン" },
      },
      {
        ...exampleCard("lab-e2", "Storm", 1),
        names: { en: "Storm", pt: "Tempestade", ja: "ストーム" },
      },
    ] as const,
    misfit: { ...misfit, names: { en: "Shrek", pt: "Shrek" } },
  };
  const examples = [
    {
      fits: [...rule.fits] as [(typeof rule.fits)[0], (typeof rule.fits)[1]],
      misfit: rule.misfit,
    },
  ];
  return { examples: Array.from({ length: THEME_OPTIONS }, () => examples[0]) };
}
