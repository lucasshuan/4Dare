// The profile page and the quick card, put together from fake stores.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayedMatch } from "@/game/profile/history";
import { DEFAULT_PRIVACY, type Privacy } from "@/game/profile/profile";
import type { StoredProfile } from "./backend/types";
import { playerCard, profileView } from "./profiles";

const MEI = "11111111-1111-4111-8111-111111111111";
const BIA = "22222222-2222-4222-8222-222222222222";
const avatar = { kind: "critter", seed: "x", color: "#D9C7F4" } as const;
const profile = (
  id: string,
  handle: string,
  name: string | null,
  privacy: Partial<Privacy> = {},
): StoredProfile => ({
  id,
  handle,
  name,
  guestNumber: 3,
  avatar,
  createdAt: 1000,
  quote: "Se for o Shrek, eu descubro",
  accent: null,
  banner: null,
  showcase: [{ characterId: "wd-Q9", caption: "Amor da minha vida <3" }],
  about: { time: "night", langs: ["pt"] },
  privacy: { ...DEFAULT_PRIVACY, ...privacy },
  handleChangedAt: null,
});

const now = Date.now();
const DAY = 86_400_000;
const played = (
  daysAgo: number,
  fields: Partial<PlayedMatch> = {},
): PlayedMatch => ({
  matchId: `m${daysAgo}`,
  game: "who-am-i",
  finishedAt: now - daysAgo * DAY,
  place: null,
  timeMs: 60_000,
  xp: 10,
  others: [{ id: BIA, place: 1, guest: false }],
  details: null,
  ...fields,
});

const store = vi.hoisted(() => ({
  profiles: [] as StoredProfile[],
  history: [] as PlayedMatch[],
  pictures: [] as unknown[],
}));

vi.mock("./backend", () => ({
  getBackend: () => ({
    profiles: {
      byHandle: async (h: string) =>
        store.profiles.find((p) => p.handle === h) ?? null,
      byIds: async (ids: string[]) =>
        store.profiles.filter((p) => ids.includes(p.id)),
    },
    matches: {
      history: async () => store.history,
      totals: async () => ({ matches: 7, wins: 2, timeMs: 1, xp: 99 }),
      playedTogether: async (a: string, b: string) =>
        store.history.some((m) =>
          [a, b].every((id) => m.others.some((o) => o.id === id)),
        ),
    },
    images: {
      byAuthor: async (_id: string, withPending: boolean) =>
        store.pictures.filter(
          (p) => withPending || (p as { status: string }).status === "active",
        ),
    },
    characters: {
      createdBy: async () => [],
      get: async () => null,
      getMany: async (ids: string[], lang: string) =>
        ids.map((id) => ({
          id,
          lang,
          name: `Name of ${id}`,
          origin: null,
          imageUrl: "https://x/cover.png",
          aliases: [],
        })),
    },
  }),
}));
vi.mock("./rooms", () => ({ currentMatch: async () => null }));

beforeEach(() => {
  store.profiles = [profile(MEI, "mei", "Mei"), profile(BIA, "bia", "Bia")];
  store.history = [played(1, { place: 1 }), played(2), played(400)];
  store.pictures = [
    {
      id: "p1",
      characterId: "wd-Q1",
      url: "https://x/cover.png",
      status: "active",
    },
    {
      id: "p2",
      characterId: "wd-Q2",
      url: "https://x/new.png",
      status: "pending",
    },
  ];
});

describe("profiles", () => {
  it("adds up every match, keeps the last year for the garden and names the partner", async () => {
    const view = await profileView("mei", BIA, "pt");
    expect(view).toMatchObject({
      id: MEI,
      handle: "mei",
      name: "Mei",
      isMe: false,
      matches: 3,
      wins: 1,
      timeMs: 180_000,
      xp: 30,
      playing: null,
      hidden: {
        profile: false,
        mural: false,
        activity: false,
        showcase: false,
        contributions: false,
      },
      own: null,
      quote: "Se for o Shrek, eu descubro",
      about: { time: "night", langs: ["pt"] },
      showcase: [
        {
          characterId: "wd-Q9",
          caption: "Amor da minha vida <3",
          character: { id: "pt-wd-Q9", name: "Name of pt-wd-Q9" },
        },
      ],
    });
    expect(view?.plays).toHaveLength(2);
    expect(view?.games).toMatchObject([
      { game: "who-am-i", matches: 3, wins: 1, recent: 2 },
    ]);
    expect(view?.facts).toEqual([
      {
        kind: "partner",
        game: null,
        person: { id: BIA, handle: "bia", name: "Bia", avatar },
        together: 3,
        ahead: 0,
      },
    ]);
  });

  it("shows a picture waiting on the detector to its author only", async () => {
    const theirs = await profileView("mei", BIA, "pt");
    expect(theirs?.pictures.map((p) => p.id)).toEqual(["p1"]);
    expect(theirs?.pictures[0]).toMatchObject({
      cover: true,
      character: { id: "pt-wd-Q1", name: "Name of pt-wd-Q1" },
    });
    const mine = await profileView("mei", MEI, "pt");
    expect(mine?.isMe).toBe(true);
    expect(mine?.pictures.map((p) => [p.id, p.status, p.cover])).toEqual([
      ["p1", "active", true],
      ["p2", "pending", false],
    ]);
  });

  it("has no page for an unknown handle, and no card for a guest", async () => {
    expect(await profileView("nobody", BIA, "pt")).toBeNull();
    expect(await playerCard("guest-id", MEI, "pt")).toBeNull();
    expect(await playerCard(BIA, MEI, "pt")).toMatchObject({
      handle: "bia",
      numbers: { matches: 7, xp: 99 },
    });
  });

  it("keeps each part to its audience, and shows the owner everything", async () => {
    const STRANGER = "33333333-3333-4333-8333-333333333333";
    store.profiles[0] = profile(MEI, "mei", "Mei", {
      activity: "played",
      showcase: "me",
    });
    // Bia played with Mei: she sees the activity, not the showcase
    const mate = await profileView("mei", BIA, "pt");
    expect(mate?.hidden).toMatchObject({ activity: false, showcase: true });
    expect(mate?.matches).toBe(3);
    expect(mate?.showcase).toEqual([]);
    // a stranger sees neither
    const stranger = await profileView("mei", STRANGER, "pt");
    expect(stranger?.hidden).toMatchObject({ activity: true, showcase: true });
    expect(stranger).toMatchObject({ matches: 0, plays: [], facts: [] });
    const card = await playerCard(MEI, STRANGER, "pt");
    expect(card?.numbers).toBeNull();
    // the owner sees it all, with what the editor needs
    const own = await profileView("mei", MEI, "pt");
    expect(own?.hidden).toMatchObject({ activity: false, showcase: false });
    expect(own?.own?.privacy.showcase).toBe("me");
  });

  it("shows only face, name and handle of a closed profile", async () => {
    store.profiles[0] = profile(MEI, "mei", "Mei", { profile: "me" });
    const view = await profileView("mei", BIA, "pt");
    expect(view).toMatchObject({
      handle: "mei",
      name: "Mei",
      hidden: { profile: true },
      quote: null,
      showcase: [],
      matches: 0,
    });
    expect((await playerCard(MEI, BIA, "pt"))?.quote).toBeNull();
  });
});
