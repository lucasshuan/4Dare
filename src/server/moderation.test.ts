import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { judge, moderateImage, readScores, type Scores } from "./moderation";

const clean: Scores = {
  sexual: 0.01,
  erotica: 0.01,
  gore: 0.01,
  animated: 0.1,
};

/** A Sightengine answer for nudity-2.1 + gore-2.0. */
const answer = (o: {
  activity?: number;
  display?: number;
  erotica?: number;
  organ?: number;
  injury?: number;
  corpse?: number;
  animated?: number;
}) => ({
  status: "success",
  nudity: {
    sexual_activity: o.activity ?? 0.01,
    sexual_display: o.display ?? 0.01,
    erotica: o.erotica ?? 0.01,
    very_suggestive: 0.01,
    none: 0.9,
  },
  gore: {
    prob: 0.01,
    classes: {
      very_bloody: 0.9,
      slightly_bloody: 0.1,
      body_organ: o.organ ?? 0.01,
      serious_injury: o.injury ?? 0.01,
      corpse: o.corpse ?? 0.01,
    },
    type: { animated: o.animated ?? 0.1, fake: 0.5, real: 0.4 },
  },
});

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("judge", () => {
  it("lets a clean picture through", () => {
    expect(judge(clean).verdict).toBe("ok");
  });

  it("blocks sexual content in any style", () => {
    expect(judge({ ...clean, sexual: 0.8 })).toMatchObject({
      verdict: "rejected",
      reason: "sexual",
    });
  });

  it("blocks breasts or buttocks only in a photo", () => {
    expect(judge({ ...clean, erotica: 0.9, photo: 0.95 })).toMatchObject({
      verdict: "rejected",
      reason: "nudity",
    });
    // a painting of a nude
    expect(judge({ ...clean, erotica: 0.9, photo: 0.05 }).verdict).toBe("ok");
    // the photo score was not asked: no verdict yet
    expect(judge({ ...clean, erotica: 0.9 }).verdict).toBe("unknown");
  });

  it("blocks gore unless it is drawn, and never blood alone", () => {
    expect(judge({ ...clean, gore: 0.9, animated: 0.1 })).toMatchObject({
      verdict: "rejected",
      reason: "gore",
    });
    expect(judge({ ...clean, gore: 0.9, animated: 0.9 }).verdict).toBe("ok");
  });
});

describe("readScores", () => {
  it("takes the highest of each group", () => {
    expect(readScores(answer({ display: 0.7, corpse: 0.6 }))).toEqual({
      sexual: 0.7,
      erotica: 0.01,
      gore: 0.6,
      animated: 0.1,
    });
  });

  it("is null for an answer missing a score", () => {
    expect(readScores({ status: "success", nudity: {} })).toBeNull();
    expect(readScores(null)).toBeNull();
  });
});

describe("moderateImage", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  beforeEach(() => {
    vi.stubEnv("SIGHTENGINE_API_USER", "user");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "secret");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("asks for nudity and gore in one call", async () => {
    const fetcher = vi.fn(async () => reply(answer({})));
    expect((await moderateImage(bytes, "image/webp", fetcher)).verdict).toBe(
      "ok",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    const form = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as FormData;
    expect(form.get("models")).toBe("nudity-2.1,gore-2.0");
  });

  it("asks whether it is a photo only for erotica", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply(answer({ erotica: 0.9 })))
      .mockResolvedValueOnce(
        reply({ status: "success", type: { photo: 0.1, illustration: 0.9 } }),
      );
    expect((await moderateImage(bytes, "image/webp", fetcher)).verdict).toBe(
      "ok",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("is unknown when Sightengine fails or the quota is gone", async () => {
    const failing = vi.fn(async () =>
      reply({ status: "failure", error: { message: "quota" } }, 429),
    );
    expect(await moderateImage(bytes, "image/webp", failing)).toMatchObject({
      verdict: "unknown",
    });
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await moderateImage(bytes, "image/webp", down)).toMatchObject({
      verdict: "unknown",
    });
  });

  it("lets everything through in local mode without keys", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("SIGHTENGINE_API_USER", "");
    const fetcher = vi.fn();
    expect(await moderateImage(bytes, "image/webp", fetcher)).toEqual({
      verdict: "ok",
      scores: null,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
