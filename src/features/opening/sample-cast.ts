// A made-up cast for the title scenes outside a match (the dev lab, the
// panel's scenes): the same faces every time.
import type { Avatar } from "@/game/types";
import { avatarColor, randomDna } from "@/lib/avatar";
import type { TitlePlayer } from "./title-kit";

const NAMES = [
  "Nobel",
  "AranhaSombria",
  "Bia",
  "CiclopeCalmo",
  "Rafa",
  "CaracolLento",
  "GatoDescolado",
  "Lu",
  "PandaSonolento",
  "SapoFeliz",
];

/** A made-up picture, like an account's from Discord or Google. */
function photo(i: number): Avatar {
  const hue = (i * 67) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${hue} 45% 70%)"/><circle cx="50" cy="40" r="20" fill="hsl(${hue} 30% 35%)"/><path d="M14 100c4-24 18-34 36-34s32 10 36 34z" fill="hsl(${hue} 30% 35%)"/></svg>`;
  return {
    kind: "image",
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    color: "#D7DDE8",
  };
}

/** A made-up cast for a title scene: names short and long, creatures and pictures, one crowned. */
export function sampleCast(
  count: number,
  photos: boolean,
  crowned: number,
): TitlePlayer[] {
  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, (_, i) => {
    const dna = randomDna(random);
    const avatar: Avatar =
      photos && i % 2 === 1
        ? photo(i)
        : { kind: "creature", dna, color: avatarColor(dna) };
    return {
      id: `p${i + 1}`,
      name: NAMES[i % NAMES.length],
      avatar,
      slot: i,
      crowned: i === crowned,
    };
  });
}
