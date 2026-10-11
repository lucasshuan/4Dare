import { describe, expect, it } from "vitest";
import { characterPath, nameSlug } from "./routes";

describe("nameSlug", () => {
  it("folds Latin names into lowercase words joined by dashes", () => {
    expect(nameSlug("Jesus Cristo")).toBe("jesus-cristo");
    expect(nameSlug("Pokémon Trainer Ash")).toBe("pokemon-trainer-ash");
    expect(nameSlug("  Dr. Who?! ")).toBe("dr-who");
  });

  it("keeps other scripts, voicing marks included", () => {
    expect(nameSlug("イエス・キリスト")).toBe("イエス-キリスト");
    expect(nameSlug("ギル")).toBe("ギル");
  });

  it("is empty for a name with no letters or digits", () => {
    expect(nameSlug("?!")).toBe("");
  });
});

describe("characterPath", () => {
  it("puts the name after the id", () => {
    expect(characterPath("wd-Q302", "Jesus Christ")).toBe(
      "/characters/wd-Q302/jesus-christ",
    );
  });

  it("is the bare id without a usable name", () => {
    expect(characterPath("wd-Q302")).toBe("/characters/wd-Q302");
    expect(characterPath("wd-Q302", "!!")).toBe("/characters/wd-Q302");
  });
});
