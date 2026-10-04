import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETUP, loadSetup, saveSetup } from "./last-setup";

const KEY = "4dare:who-am-i:setup";

describe("last setup", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts every room public: a private one would have no password", () => {
    saveSetup({
      ...DEFAULT_SETUP,
      visibility: "private",
      password: "pizza",
      voteSeconds: 60,
    });
    const saved = JSON.parse(store.get(KEY) ?? "{}");
    expect(saved).not.toHaveProperty("visibility");
    expect(saved).not.toHaveProperty("password");
    const loaded = loadSetup();
    expect(loaded.visibility).toBe("public");
    expect(loaded.password).toBe("");
    expect(loaded.voteSeconds).toBe(60);
  });

  it("ignores a private room saved before this rule", () => {
    store.set(KEY, JSON.stringify({ visibility: "private", setsOff: [] }));
    expect(loadSetup().visibility).toBe("public");
  });
});
