import { describe, expect, it } from "vitest";
import {
  endsWithQuestionMark,
  questionMark,
  withoutQuestionMark,
  withQuestionMark,
} from "./question";

describe("question marks", () => {
  it("uses the full-width mark in Japanese", () => {
    expect(questionMark("ja")).toBe("？");
    expect(questionMark("en")).toBe("?");
    expect(questionMark("pt")).toBe("?");
  });

  it("drops only the marks at the end", () => {
    expect(withoutQuestionMark("Is it red? Or blue??")).toBe(
      "Is it red? Or blue",
    );
    expect(withoutQuestionMark("赤いですか？")).toBe("赤いですか");
    expect(withoutQuestionMark("Am I ")).toBe("Am I ");
  });

  it("ends the sent question with exactly one mark", () => {
    expect(withQuestionMark("  Am I real ?? ", "?")).toBe("Am I real?");
    expect(withQuestionMark("人間ですか", "？")).toBe("人間ですか？");
    expect(endsWithQuestionMark("Am I real?")).toBe(true);
    expect(endsWithQuestionMark("Am I real")).toBe(false);
  });
});
