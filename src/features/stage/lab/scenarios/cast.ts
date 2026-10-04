// Lab fixtures for the cast: "Rafa picked yours" and the turn order.
// Owned by WP10. With long names, the cards get long character names too, so
// the table shows every line cut to its column (names=long).
import { labCharacter, type SceneFixtures } from "../fixtures";
import type { LabParams } from "../params";

const LONG_CHARACTERS = [
  labCharacter("lab-c1", "Miles Morales (Spider-Man)", "Marvel", 0),
  labCharacter("lab-c2", "Diana Prince (Wonder Woman)", "DC", 1),
  labCharacter("lab-c3", "T'Challa, the Black Panther", "Marvel", 2),
  labCharacter("lab-c4", "Barbara Gordon (Batgirl)", "DC", 3),
];

export function scenario(params: LabParams): SceneFixtures {
  // short names keep whatever the earlier scenes (or the lab's defaults) give
  return params.names === "long" ? { characters: LONG_CHARACTERS } : {};
}
