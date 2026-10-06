import { describe, expect, it } from "vitest";
import { stepCall } from "./step-call";

describe("stepCall", () => {
  it("calls only on a turn step that waits on the player", () => {
    for (const status of [
      "asking",
      "answering",
      "guessing",
      "validating",
    ] as const)
      expect(stepCall(status, 1000, true)).not.toBeNull();
    // a guess sent: only its picker checks it, everyone else just watches
    for (const status of [
      "will_answer",
      "answered",
      "waiting",
      "discovered",
      "gave_up",
    ] as const)
      expect(stepCall(status, 1000, true)).toBeNull();
    // lobby, vote and pick have their own cues
    for (const status of ["ready", "voting", "picking"] as const)
      expect(stepCall(status, 1000, true)).toBeNull();
  });

  it("waits for the step to start, then changes with each step", () => {
    expect(stepCall("asking", 1000, false)).toBeNull();
    expect(stepCall("answering", 1000, true)).not.toBe(
      stepCall("answering", 9000, true),
    );
    expect(stepCall("asking", 1000, true)).not.toBe(
      stepCall("guessing", 1000, true),
    );
  });
});
