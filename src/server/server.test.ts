// The server end to end, in local mode: actions + route handlers + engine, with fake cookies per player.
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/game/chat";
import { GOSTO_KEYS } from "@/game/gostos";
import { themeId } from "@/game/theme-id";
import {
  DEFAULT_SETTINGS,
  type Lang,
  type RoomView,
  type Theme,
} from "@/game/types";

process.env.DARE_DATA_DIR = mkdtempSync(join(tmpdir(), "dare-test-"));

// Each "browser" is a cookie jar; `as(name)` switches who is calling.
const jars = new Map<string, Map<string, string>>();
let caller = "p1";
const jarFor = (name: string) => {
  if (!jars.has(name)) jars.set(name, new Map());
  return jars.get(name) as Map<string, string>;
};
vi.mock("next/headers", () => ({
  cookies: async () => {
    const jar = jarFor(caller);
    return {
      get: (k: string) =>
        jar.has(k) ? { name: k, value: jar.get(k) } : undefined,
      set: (k: string, v: string) => void jar.set(k, v),
      delete: (k: string) => void jar.delete(k),
    };
  },
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "pt" }));

/** Game and theme settings for createRoom: who-am-i, everyone votes, every theme on. */
const TIMES = {
  voteSeconds: 40,
  askSeconds: 60,
  guessSeconds: 60,
  answerSeconds: 60,
  validateSeconds: 60,
  replySeconds: 45,
  talkSeconds: 120,
  lastSeconds: 45,
};
const PRESET = {
  id: "friday",
  name: "Friday",
  game: "who-am-i",
  setup: {
    ...TIMES,
    themeMode: "vote",
    impostors: null,
    offGostos: ["real"],
    offThemes: [],
  },
  isDefault: true,
};
const ROOM = {
  game: DEFAULT_SETTINGS.game,
  name: "Test room",
  password: "",
  themeMode: DEFAULT_SETTINGS.themeMode,
  offGostos: DEFAULT_SETTINGS.offGostos,
  offThemes: DEFAULT_SETTINGS.offThemes,
  impostors: null,
};

/** The guest id inside a jar's signed guest cookie. */
const uidOf = (jar: Map<string, string>) =>
  JSON.parse(
    Buffer.from(
      (jar.get("dare_guest") ?? "").split(".")[0],
      "base64url",
    ).toString("utf8"),
  ).id as string;

const as = (name: string) => {
  caller = name;
};

type Actions = typeof import("./actions");
let A: Actions;
let roomRoute: typeof import("@/app/api/rooms/[code]/route");

/** Moves the clock to where the step's clock starts: past the show on screen. */
const skipTo = (v: RoomView) =>
  vi.setSystemTime(Math.max(Date.now(), v.stepStartsAt ?? 0));

/** Everyone votes for the first theme, then the theme show plays out. Returns the view while it runs. */
async function voteAll(code: string, players: string[]) {
  for (const p of players) {
    as(p);
    expect((await view(code)).body.phase).toBe("voting");
    must(await A.voteTheme(code, 0));
  }
  as(players[0]);
  const v = (await view(code)).body;
  expect(v.phase).toBe("picking");
  expect(v.reveal?.kind).toBe("theme");
  expect(v.vote?.chosen).toBe(0);
  expect(v.theme).toEqual(v.vote?.options[0]);
  skipTo(v);
  return v;
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
  A = await import("./actions");
  roomRoute = await import("@/app/api/rooms/[code]/route");
});

/** The room as the caller sees it, in Portuguese like the actions (getLocale is mocked to "pt"). */
async function view(code: string): Promise<{ status: number; body: RoomView }> {
  const res = await roomRoute.GET(
    new Request(`http://x/api/rooms/${code}?lang=pt`),
    { params: Promise.resolve({ code }) },
  );
  return { status: res.status, body: (await res.json()) as RoomView };
}

function must<T>(r: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(`action failed: ${r.error}`);
  return r.data;
}

describe("server, local mode", () => {
  it("plays a 3-player match through the actions", async () => {
    as("p1");
    const { code } = must(
      await A.createRoom({
        ...ROOM,
        visibility: "private",
        password: " secret ",
        seats: 3,
        ...TIMES,
      }),
    );
    expect(code).toMatch(/^[2-9A-Z]{5}$/);
    // only the host sees the password
    expect((await view(code)).body.settings.password).toBe("secret");

    as("p2");
    expect((await view(code)).status).toBe(403);
    expect(await A.joinRoom(code)).toEqual({
      ok: false,
      error: "password_required",
    });
    expect(await A.joinRoom(code, "nope")).toEqual({
      ok: false,
      error: "wrong_password",
    });
    must(await A.joinRoom(code.toLowerCase(), "secret"));
    // back in without the password: the seat is theirs
    must(await A.joinRoom(code));
    expect((await view(code)).body.settings.password).toBe("");
    as("p3");
    must(await A.joinRoom(code, "secret"));
    as("p4");
    expect(await A.joinRoom(code, "secret")).toEqual({
      ok: false,
      error: "room_full",
    });

    as("p2");
    expect(await A.startGame(code)).toEqual({ ok: false, error: "not_host" });
    as("p1");
    must(await A.startGame(code));
    expect(await A.voteTheme(code, 4)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    // a vote taken back gives back the time it cut
    const before = (await view(code)).body.deadline ?? 0;
    must(await A.voteTheme(code, 1));
    expect((await view(code)).body.deadline).toBeLessThan(before);
    must(await A.voteTheme(code, null));
    const back = (await view(code)).body;
    expect(back.deadline).toBe(before);
    expect(back.vote?.yourVote).toBeNull();
    await voteAll(code, ["p1", "p2", "p3"]);

    // everyone creates a character for their target and picks it
    for (const p of ["p1", "p2", "p3"]) {
      as(p);
      const v = (await view(code)).body;
      expect(v.phase).toBe("picking");
      const form = new FormData();
      form.set("name", `Hero of ${v.pick?.targetId}`);
      form.set("lang", "pt");
      const c = must(await A.createCharacter(form));
      must(await A.confirmPick(code, c.id));
    }

    as("p1");
    let v = (await view(code)).body;
    expect(v.phase).toBe("asking");
    // the cast show plays first: no question before its end
    expect(v.reveal?.kind).toBe("cast");
    expect(v.stepStartsAt).toBe(v.reveal?.until);
    const turnId = v.turn?.playerId as string;
    const nameOf = (id: string) =>
      [...jars.entries()].find(([, j]) => uidOf(j) === id)?.[0] as string;
    const turnName = nameOf(turnId);

    as(turnName);
    expect(await A.askQuestion(code, "Sou humano?")).toEqual({
      ok: false,
      error: "too_early",
    });
    skipTo(v);
    must(await A.askQuestion(code, "Sou humano?"));
    const others = ["p1", "p2", "p3"].filter((p) => p !== turnName);
    for (const p of others) {
      as(p);
      must(
        await A.answerQuestion(
          code,
          "yes",
          p === others[0] ? "com certeza" : null,
        ),
      );
    }

    as(turnName);
    v = (await view(code)).body;
    expect(v.phase).toBe("guessing");
    expect(v.reveal?.kind).toBe("answers");

    // nobody's own character name ever reaches their browser
    for (const p of ["p1", "p2", "p3"]) {
      as(p);
      const mine = (await view(code)).body;
      const uid = uidOf(jarFor(p));
      expect(JSON.stringify(mine)).not.toContain(`Hero of ${uid}`);
    }

    // only who discovered their character may say whether they liked it
    as(others[0]);
    expect(await A.rateFoundCharacter(code, true)).toEqual({
      ok: false,
      error: "wrong_phase",
    });
    as(turnName);
    skipTo(v);
    must(await A.submitGuess(code, `Hero of ${turnId}`));
    expect(await A.rateFoundCharacter(code, "yes" as never)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    must(await A.rateFoundCharacter(code, true));
  });

  it("saves a finished match for every player, once", async () => {
    as("m1");
    const { code } = must(
      await A.createRoom({
        ...ROOM,
        visibility: "private",
        password: "pw",
        seats: 2,
        ...TIMES,
      }),
    );
    as("m2");
    must(await A.joinRoom(code, "pw"));
    as("m1");
    must(await A.startGame(code));
    await voteAll(code, ["m1", "m2"]);
    for (const p of ["m1", "m2"]) {
      as(p);
      const v = (await view(code)).body;
      const form = new FormData();
      form.set("name", `Saved ${v.pick?.targetId}`);
      form.set("lang", "pt");
      must(await A.confirmPick(code, must(await A.createCharacter(form)).id));
    }
    // both give up while the cast show still plays: the match is still saved
    expect((await view(code)).body.reveal?.kind).toBe("cast");
    for (const p of ["m1", "m2"]) {
      as(p);
      must(await A.giveUp(code));
    }
    as("m1");
    expect((await view(code)).body.phase).toBe("finished");

    await new Promise((resolve) => setTimeout(resolve, 20));
    const lines = readFileSync(
      join(process.env.DARE_DATA_DIR as string, "matches.jsonl"),
      "utf8",
    )
      .split("\n")
      .filter((line) => line.includes(code));
    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]);
    expect(record.players).toHaveLength(2);
    for (const p of record.players) {
      expect(p).toMatchObject({ result: "gave_up", wasGuest: true });
      expect(p.characterName).toMatch(/^Saved /);
      expect(p.timeMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("rejects bad input and bad pictures", async () => {
    as("q1");
    expect(
      await A.createRoom({
        ...ROOM,
        visibility: "public",
        seats: 9 as 4,
        ...TIMES,
      }),
    ).toEqual({
      ok: false,
      error: "invalid_input",
    });
    for (const off of [
      { offGostos: [...GOSTO_KEYS] },
      { offGostos: ["nope" as "anime"] },
      { offThemes: ["Not an id"] },
    ])
      expect(
        await A.createRoom({
          ...ROOM,
          visibility: "public",
          seats: 4,
          ...TIMES,
          ...off,
        }),
      ).toEqual({ ok: false, error: "invalid_input" });
    expect(await A.joinRoom("../../etc")).toEqual({
      ok: false,
      error: "invalid_input",
    });
    const form = new FormData();
    form.set("name", "Fake");
    form.set(
      "image",
      new File([new TextEncoder().encode("<svg></svg>")], "x.svg", {
        type: "image/svg+xml",
      }),
    );
    expect(await A.createCharacter(form)).toEqual({
      ok: false,
      error: "upload_failed",
    });
    const png = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
    ]);
    form.set("image", new File([png], "x.png", { type: "image/png" }));
    const c = must(await A.createCharacter(form));
    expect(c.imageUrl).toMatch(
      /^\/api\/files\/characters\/[0-9a-f-]{36}\.png$/,
    );
    // the same name again reuses the character instead of duplicating it
    const again = new FormData();
    again.set("name", "fake");
    expect(must(await A.createCharacter(again)).id).toBe(c.id);
  });

  it("guests cannot edit a profile; the test account can", async () => {
    as("r1");
    const fields = {
      name: "Jean",
      color: "#DCE8FA",
      avatar: "creature",
      dna: "Cat..Happy..0",
    };
    expect(await A.saveProfile(profileForm(null, fields))).toEqual({
      ok: false,
      error: "unauthorized",
    });
    const account = must(await A.enterTestAccount());
    const me = must(await A.saveProfile(profileForm(account, fields)));
    expect(me).toMatchObject({
      isGuest: false,
      name: "Jean",
      handle: account.handle,
      avatar: { kind: "creature", dna: "Cat..Happy..0", color: "#DCE8FA" },
    });
  });

  it("guests start with a creature; accounts can pick another one", async () => {
    as("r2");
    const guest = must(await A.enterTestAccount());
    expect(guest.avatar).toMatchObject({ kind: "creature" });
    const fields = {
      name: "Bia",
      color: "#F4C7D9",
      avatar: "creature",
      dna: "<svg>",
    };
    const save = () => A.saveProfile(profileForm(guest, fields));
    expect(await save()).toEqual({ ok: false, error: "invalid_input" });
    // a word no kit knows
    fields.dna = "Dragonfruit..Happy..0";
    expect(await save()).toEqual({ ok: false, error: "invalid_input" });
    fields.dna = "Potato.Ninja...k3x9q";
    fields.color = "#123456";
    expect(await save()).toEqual({ ok: false, error: "invalid_input" });
    // the random pastel the guest started with is kept if they don't pick one
    fields.color = guest.avatar.color;
    expect(must(await save()).avatar.color).toBe(guest.avatar.color);
    fields.color = "#F4C7D9";
    expect(must(await save()).avatar).toEqual({
      kind: "creature",
      dna: "Potato.Ninja...k3x9q",
      color: "#F4C7D9",
    });
  });

  it("an account takes a free @handle, once a month", async () => {
    as("h1");
    const first = must(await A.enterTestAccount());
    as("h2");
    const second = must(await A.enterTestAccount());
    const keep = { color: second.avatar.color, avatar: "keep" };
    expect(must(await A.checkHandle(first.handle as string))).toEqual({
      ok: false,
      problem: "taken",
    });
    expect(must(await A.checkHandle("No"))).toEqual({
      ok: false,
      problem: "short",
    });
    expect(must(await A.checkHandle("@Mei_Chan"))).toEqual({ ok: true });
    const taken = profileForm(second, { name: "Bia", ...keep });
    taken.set("handle", first.handle as string);
    expect(await A.saveProfile(taken)).toEqual({
      ok: false,
      error: "handle_taken",
    });
    const mine = profileForm(second, { name: "Bia", ...keep });
    mine.set("handle", "Mei_Chan");
    expect(must(await A.saveProfile(mine)).handle).toBe("mei_chan");
    // a second change waits 30 days; the same handle is no change
    mine.set("handle", "mei_2");
    expect(await A.saveProfile(mine)).toEqual({
      ok: false,
      error: "handle_wait",
    });
    expect(must(await A.checkHandle("mei_2"))).toMatchObject({
      ok: false,
      problem: "wait",
    });
    mine.set("handle", "mei_chan");
    must(await A.saveProfile(mine));
  });

  it("keeps the quote, showcase, about and privacy the editor sends", async () => {
    as("h3");
    const me = must(await A.enterTestAccount());
    const form = profileForm(me, {
      name: "Mei",
      color: me.avatar.color,
      avatar: "keep",
      quote: "  Se for o Shrek,   eu descubro  ",
      accent: "#0B7A75",
      banner: "preset:sea",
      about: JSON.stringify({ time: "night", langs: ["pt", "ja"] }),
      showcase: JSON.stringify([
        { characterId: "wd-Q11934", caption: "Amor da minha vida <3" },
        { characterId: "nope-404", caption: "unknown" },
      ]),
      privacy: JSON.stringify({ activity: "played", playing: false }),
    });
    must(await A.saveProfile(form));
    const { profileView } = await import("./profiles");
    const view = await profileView(me.handle as string, me.id, "pt");
    expect(view).toMatchObject({
      quote: "Se for o Shrek, eu descubro",
      accent: "#0B7A75",
      banner: { kind: "preset", id: "sea" },
      about: { time: "night", langs: ["ja", "pt"] },
      showcase: [
        { characterId: "wd-Q11934", caption: "Amor da minha vida <3" },
      ],
      own: { privacy: { activity: "played", playing: false } },
    });
  });

  it("a guest draws a new name and creature, shown at once in their rooms", async () => {
    const settings = {
      ...ROOM,
      name: "Sala de Fulano",
      visibility: "public",
      seats: 2,
      ...TIMES,
    } as const;
    as("n1");
    const { code } = must(await A.createRoom(settings));
    const before = (await view(code)).body.players[0];
    as("n2");
    must(await A.joinRoom(code));

    as("n1");
    const me = must(await A.rerollGuest());
    expect(me.id).toBe(before.id);
    expect(me.isGuest).toBe(true);
    expect(me.avatar).toMatchObject({ kind: "creature" });
    expect(me.avatar).not.toEqual(before.avatar);

    // the other player sees it on their next look; the room keeps its name
    as("n2");
    const seen = (await view(code)).body;
    expect(seen.players.find((p) => p.id === me.id)).toMatchObject({
      name: me.guestName,
      avatar: me.avatar,
    });
    expect(seen.settings.name).toBe("Sala de Fulano");
    // and the cookie keeps the new one
    as("n1");
    expect((await view(code)).body.players[0].avatar).toEqual(me.avatar);

    // an account changes its name on its profile instead
    must(await A.enterTestAccount());
    expect(await A.rerollGuest()).toEqual({ ok: false, error: "unauthorized" });
  });

  it("a mural: accounts write and reply one level, the owner takes lines down", async () => {
    const { muralView } = await import("./mural");
    as("w1");
    const owner = must(await A.enterTestAccount());
    const handle = owner.handle as string;
    as("w2");
    expect(await A.postMuralLine(handle, "oi", null)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    const bia = must(await A.enterTestAccount());
    expect(await A.postMuralLine(handle, "   ", null)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(await A.postMuralLine(handle, "x".repeat(201), null)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    const line = must(
      await A.postMuralLine(handle, "  Revanche   hoje às 22h?  ", null),
    );
    as("w1");
    const reply = must(await A.postMuralLine(handle, "Bora!", line));
    // a reply to a reply: one level only
    expect(await A.postMuralLine(handle, "nope", reply)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    const read = async (id: string, isGuest = false) =>
      muralView(
        handle,
        {
          id,
          isGuest,
          name: null,
          guestNumber: 1,
          avatar: owner.avatar,
          lang: "pt",
        },
        "pt",
        null,
      );
    const seen = await read("someone-else", true);
    expect(seen).toMatchObject({
      canWrite: false,
      canReply: false,
      more: false,
      lines: [
        {
          id: line,
          body: "Revanche hoje às 22h?",
          author: { id: bia.id, handle: bia.handle },
          canDelete: false,
          replies: [{ id: reply, body: "Bora!", replies: [] }],
        },
      ],
    });
    // Bia may delete her own line, not the owner's reply
    as("w2");
    expect(await A.deleteMuralLine(reply)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    // the owner takes Bia's line down, its reply with it
    as("w1");
    must(await A.deleteMuralLine(line));
    expect((await read(owner.id))?.lines).toEqual([]);
  });

  it("the mural follows its owner's privacy, and three reports hide a line", async () => {
    const { muralView } = await import("./mural");
    as("v1");
    const owner = must(await A.enterTestAccount());
    const handle = owner.handle as string;
    must(
      await A.saveProfile(
        profileForm(owner, {
          name: "Owner",
          color: owner.avatar.color,
          avatar: "keep",
          privacy: JSON.stringify({ muralWrite: "me", muralReply: "all" }),
        }),
      ),
    );
    as("v2");
    must(await A.enterTestAccount());
    expect(await A.postMuralLine(handle, "oi", null)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    as("v1");
    const line = must(
      await A.postMuralLine(handle, "Aviso: sala às 22h", null),
    );
    as("v2");
    must(await A.postMuralLine(handle, "Tô dentro", line));
    const reporters = ["v3", "v4", "v5"];
    let hidden = false;
    for (const r of reporters) {
      as(r);
      must(await A.enterTestAccount());
      hidden = must(await A.reportMuralLine(line));
    }
    expect(hidden).toBe(true);
    const reader = {
      id: "reader",
      isGuest: true,
      name: null,
      guestNumber: 1,
      avatar: owner.avatar,
      lang: "pt" as const,
    };
    expect((await muralView(handle, reader, "pt", null))?.lines).toEqual([]);
    // its author still sees it, marked
    const own = await muralView(
      handle,
      { ...reader, id: owner.id, isGuest: false },
      "pt",
      null,
    );
    expect(own?.lines[0]).toMatchObject({ id: line, hidden: true });
  });

  it("an account keeps its settings, hands its data over and can go", async () => {
    as("x1");
    const me = must(await A.enterTestAccount());
    expect(me.settings).toBeNull();
    must(
      await A.saveAccountSettings({
        theme: "dark",
        chatBubbles: false,
        games: { "who-am-i": { confirmPass: true, unknown: 1 } },
        volume: 0.1,
        presets: [PRESET, { id: "odd", name: "Odd" }],
      }),
    );
    const meRoute = await import("@/app/api/me/route");
    const read = async () =>
      (await (
        await meRoute.GET(new Request("http://x/api/me?lang=pt"))
      ).json()) as { settings: unknown; isGuest: boolean };
    expect((await read()).settings).toEqual({
      theme: "dark",
      chatBubbles: false,
      games: {
        "who-am-i": { confirmPass: true, popularHand: true },
        impostor: { hiddenCard: false },
      },
      presets: [PRESET],
    });

    const exported = await import("@/app/api/me/export/route");
    const file = await exported.GET();
    expect(file.headers.get("content-disposition")).toContain(
      `4dare-${me.handle}.json`,
    );
    expect(await file.json()).toMatchObject({
      account: { id: me.id, providers: ["discord"] },
      profile: { handle: me.handle },
      matches: [],
    });

    expect(await A.deleteAccount("someone_else")).toEqual({
      ok: false,
      error: "invalid_input",
    });
    must(await A.deleteAccount(me.handle as string));
    expect((await read()).isGuest).toBe(true);
    const { getBackend } = await import("./backend");
    expect(
      await getBackend().profiles.byHandle(me.handle as string),
    ).toBeNull();
  });

  it("a profile change shows at once in the account's rooms", async () => {
    as("n3");
    const account = must(await A.enterTestAccount());
    const { code } = must(
      await A.createRoom({ ...ROOM, visibility: "public", seats: 2, ...TIMES }),
    );
    as("n4");
    must(await A.joinRoom(code));
    as("n3");
    must(
      await A.saveProfile(
        profileForm(account, {
          name: "Renamed",
          color: "#DCE8FA",
          avatar: "creature",
          dna: "Cat..Happy..0",
        }),
      ),
    );
    as("n4");
    expect((await view(code)).body.players[0]).toMatchObject({
      name: "Renamed",
      avatar: { kind: "creature", dna: "Cat..Happy..0", color: "#DCE8FA" },
    });
  });

  it("a match still going blocks other rooms until the player leaves it", async () => {
    const meta = await import("@/app/api/me/match/route");
    const current = async () =>
      (
        (await (
          await meta.GET(new Request("http://x/api/me/match"))
        ).json()) as {
          match: { code: string } | null;
        }
      ).match;
    const settings = {
      ...ROOM,
      visibility: "public",
      seats: 2,
      ...TIMES,
    } as const;
    as("b2");
    const other = must(await A.createRoom(settings)).code;
    as("b1");
    const { code } = must(await A.createRoom(settings));
    // a lobby holds nobody
    expect(await current()).toBeNull();
    as("b3");
    must(await A.joinRoom(code));
    as("b1");
    must(await A.startGame(code));
    expect(await current()).toEqual({ code, game: ROOM.game, phase: "voting" });
    expect(await A.createRoom(settings)).toEqual({
      ok: false,
      error: "in_match",
    });
    expect(await A.joinRoom(other)).toEqual({ ok: false, error: "in_match" });
    // back into the match itself is fine
    must(await A.joinRoom(code));
    must(await A.leaveRoom(code));
    expect(await current()).toBeNull();
    must(await A.joinRoom(other));
  });

  it("one room at a time: another lobby gives up the old seat and says where it went", async () => {
    const settings = {
      ...ROOM,
      visibility: "public",
      seats: 3,
      ...TIMES,
    } as const;
    as("o1");
    const first = must(await A.createRoom(settings)).code;
    as("o2");
    const second = must(await A.createRoom(settings)).code;
    as("o3");
    must(await A.joinRoom(first));
    must(await A.joinRoom(second));
    expect((await view(second)).body.players).toHaveLength(2);
    const old = await view(first);
    expect(old.status).toBe(403);
    expect(old.body).toMatchObject({
      error: "not_member",
      elsewhere: { code: second, name: ROOM.name, host: { isGuest: true } },
    });
    as("o1");
    expect((await view(first)).body.players).toHaveLength(1);

    // a new room leaves the old one too; a room left empty closes
    as("o3");
    const own = must(await A.createRoom(settings)).code;
    expect((await view(second)).body).toMatchObject({ error: "not_member" });
    as("o2");
    expect((await view(second)).body.players).toHaveLength(1);
    must(await A.joinRoom(first));
    expect((await view(second)).status).toBe(404);

    // a match going on is never left for a lobby: joining waits until it ends
    as("o1");
    must(await A.startGame(first));
    expect(await A.joinRoom(own)).toEqual({ ok: false, error: "in_match" });
    expect((await view(first)).body.phase).toBe("voting");
  });

  it("signing in anywhere hands every guest seat to the account; its match wins", async () => {
    const { handOverSeats } = await import("./rooms");
    const settings = {
      ...ROOM,
      visibility: "public",
      seats: 2,
      ...TIMES,
    } as const;
    as("s3");
    must(await A.enterTestAccount());
    const { getBackend } = await import("./backend");
    const account = await getBackend().auth.identity("pt");
    const lobby = must(await A.createRoom(settings)).code;
    as("s1");
    const match = must(await A.createRoom(settings)).code;
    as("s2");
    must(await A.joinRoom(match));
    as("s1");
    must(await A.startGame(match));

    await handOverSeats(uidOf(jarFor("s1")), account, null);
    as("s3");
    const seen = (await view(match)).body;
    expect(seen.phase).toBe("voting");
    expect(seen.players.map((p) => p.id)).toContain(account.id);
    expect(seen.players.map((p) => p.id)).not.toContain(uidOf(jarFor("s1")));
    // the account's own lobby was empty without it: closed
    expect((await view(lobby)).status).toBe(404);
  });
});

/** The profile editor's form: what the test sets, the rest as it was. */
function profileForm(
  me: { handle: string | null } | null,
  fields: Record<string, string>,
) {
  const form = new FormData();
  form.set("handle", me?.handle ?? "nobody");
  form.set("quote", "");
  form.set("accent", "");
  form.set("banner", "keep");
  form.set("about", "{}");
  form.set("showcase", "[]");
  form.set("privacy", "{}");
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

/** Saves a finished match on `theme` where people picked these characters (app ids), once each. */
async function recordPicks(
  theme: Theme,
  characterIds: string[],
  room = "SEEDS",
  lang: Lang = "pt",
) {
  const { getBackend } = await import("./backend");
  await getBackend().matches.record({
    id: `seed-${room}-${Math.random()}`,
    game: "who-am-i",
    roomCode: room,
    round: 1,
    theme,
    themeId: themeId(theme),
    startedAt: 0,
    finishedAt: 1,
    dayBonus: 0,
    players: characterIds.map((characterId, i) => ({
      userId: `seed-${i}`,
      wasGuest: true,
      lang,
      pickedById: `seed-picker-${i}`,
      pickerLang: lang,
      characterId,
      characterName: characterId,
      characterOrigin: null,
      autoPicked: false,
      suggested: false,
      result: "discovered",
      place: 1,
      discoveredAt: 1,
      questions: 1,
      guesses: 0,
      timeMs: 1,
      xp: 0,
    })),
  });
}

/**
 * Characters made through the create action for these tests (in Portuguese,
 * the test locale): the library files are never read by a test.
 */
async function makeCharacters(prefix: string, count: number, picture = false) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const form = new FormData();
    form.set("name", `${prefix} ${i}`);
    form.set("lang", "pt");
    if (picture) form.set("image", pngFile());
    out.push(must(await A.createCharacter(form)));
  }
  return out;
}

/** The smallest file the picture check takes for a PNG. */
const pngFile = () =>
  new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])],
    "card.png",
    { type: "image/png" },
  );

/** A 2-player room in its pick step, past the theme show; `voted`: the first player's view while the show ran. */
async function pickingRoom(a: string, b: string) {
  as(a);
  const { code } = must(
    await A.createRoom({
      ...ROOM,
      visibility: "private",
      password: "pw",
      seats: 2,
      ...TIMES,
    }),
  );
  as(b);
  must(await A.joinRoom(code, "pw"));
  as(a);
  must(await A.startGame(code));
  const voted = await voteAll(code, [a, b]);
  return { code, voted };
}

describe("random pick by theme", () => {
  /**
   * A picking room on a theme no test has played: the backend lives as long
   * as the file, so a theme drawn for an earlier match would bring its picks
   * into the draw.
   */
  let unplayed = 0;
  async function unplayedRoom(a: string, b: string) {
    const { getBackend } = await import("./backend");
    const n = ++unplayed;
    const draw = vi.spyOn(getBackend().themes, "draw").mockResolvedValue(
      [1, 2, 3, 4].map((i) => ({
        en: `Unplayed ${n}.${i}`,
        es: `Inédito ${n}.${i}`,
        pt: `Inédito ${n}.${i}`,
        ja: `未プレイ ${n}.${i}`,
        set: "heroes",
      })),
    );
    try {
      return await pickingRoom(a, b);
    } finally {
      draw.mockRestore();
    }
  }

  it("draws among the characters picked most for the theme, once there are enough", async () => {
    const { code } = await unplayedRoom("r1", "r2");
    as("r1");
    const theme = (await view(code)).body.theme;
    if (!theme) throw new Error("no theme");

    // a theme nobody played yet
    expect(await A.randomPick(code)).toEqual({
      ok: false,
      error: "not_enough_picks",
    });

    // six characters picked in past matches with this theme
    const ids = (await makeCharacters(`Popular ${code}`, 6)).map((c) => c.id);
    await recordPicks(theme, ids);

    const drawn = must(await A.randomPick(code));
    expect(drawn.lang).toBe("pt");
    expect(ids).toContain(drawn.id);
    // the draw is on the card now: if the clock runs out, it is the pick
    // the dice offered it: its pick will count less for the theme
    expect((await view(code)).body.pick?.draft).toEqual({
      characterId: drawn.id,
      name: drawn.name,
      imageUrl: null,
      suggested: true,
    });
    // another press shows someone else
    const again = must(await A.randomPick(code, drawn.id));
    expect(again.id).not.toBe(drawn.id);

    // a "no, it doesn't fit" is saved for this theme, in the voter's language
    expect(await A.rateRandomPick(code, "pt-wd-Q999999999", false)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    must(await A.rateRandomPick(code, drawn.id, false));
    must(await A.rateRandomPick(code, again.id, true));
    const { getBackend } = await import("./backend");
    const votes = async (id: string) =>
      (await getBackend().matches.themeStats(themeId(theme), 100)).find(
        (s) => s.id === id && s.lang === "pt",
      );
    expect(await votes(drawn.id)).toMatchObject({ misfits: 1, fits: 0 });
    expect(await votes(again.id)).toMatchObject({ fits: 1 });
    // answering again replaces the earlier answer
    must(await A.rateRandomPick(code, drawn.id, true));
    expect(await votes(drawn.id)).toMatchObject({ misfits: 0, fits: 1 });
    must(await A.confirmPick(code, again.id));
    expect(await A.randomPick(code)).toEqual({
      ok: false,
      error: "already_done",
    });
  });

  it("never draws a character already picked in the match, the caller's own secret included", async () => {
    const { code } = await unplayedRoom("x1", "x2");
    as("x1");
    const theme = (await view(code)).body.theme;
    if (!theme) throw new Error("no theme");
    const [mine, other] = await makeCharacters(`Secret ${code}`, 2);
    await recordPicks(theme, [mine.id, mine.id, other.id]);
    // x2 picks for x1: that one is x1's secret
    as("x2");
    must(await A.confirmPick(code, mine.id));
    as("x1");
    for (let i = 0; i < 5; i++)
      expect(must(await A.randomPick(code)).id).toBe(other.id);
    // "draw another" with nothing else free: the same one again, never the secret
    expect(must(await A.randomPick(code, other.id)).id).toBe(other.id);
  });
});

describe("pick drafts", () => {
  const draftRoute = () => import("@/app/api/rooms/[code]/draft/route");
  const imageRoute = () => import("@/app/api/rooms/[code]/draft/image/route");
  const put = async (code: string, body: unknown, origin = "http://x") =>
    (await draftRoute()).PUT(
      new Request(`http://x/api/rooms/${code}/draft`, {
        method: "PUT",
        headers: { origin, "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      { params: Promise.resolve({ code }) },
    );
  const upload = async (code: string, file: File | null = pngFile()) => {
    const form = new FormData();
    if (file) form.set("image", file);
    return (await imageRoute()).POST(
      new Request(`http://x/api/rooms/${code}/draft/image`, {
        method: "POST",
        headers: { origin: "http://x" },
        body: form,
      }),
      { params: Promise.resolve({ code }) },
    );
  };

  it("saves the card quietly, only for its picker, and the clock plays it", async () => {
    const { getBackend } = await import("./backend");
    const { notify } = getBackend();
    const { code } = await pickingRoom("d1", "d2");
    const name = `Zqxj ${code}`;

    // only our pages, only the room's pickers, only cards that fit
    as("d1");
    expect((await put(code, null, "http://evil.test")).status).toBe(403);
    as("d3");
    expect((await put(code, null)).status).toBe(403);
    as("d1");
    for (const bad of [
      "{nope",
      [],
      { characterId: null, name: "x".repeat(61), imageUrl: null },
      { characterId: null, name: "Fine" },
      { characterId: null, name: "Fine", imageUrl: "https://evil.test/a.png" },
      {
        characterId: null,
        name: "Fine",
        imageUrl: "/api/files/avatars/00000000-0000-0000-0000-000000000000.png",
      },
    ])
      expect((await put(code, bad)).status).toBe(400);

    const pings = vi.spyOn(notify, "roomChanged");
    const listed = vi.spyOn(notify, "lobbyChanged");
    const before = (await view(code)).body.version;
    const saved = await put(code, {
      characterId: null,
      name,
      imageUrl: null,
    });
    expect(saved.status).toBe(204);
    // quiet: saved (a new version) but nobody is pinged
    expect(pings).not.toHaveBeenCalled();
    expect(listed).not.toHaveBeenCalled();
    pings.mockRestore();
    listed.mockRestore();
    let mine = (await view(code)).body;
    expect(mine.version).toBe(before + 1);
    expect(mine.pick?.draft).toEqual({
      characterId: null,
      name,
      imageUrl: null,
    });

    // a picture for the new character: stored, put on the card, name kept
    expect((await upload(code, null)).status).toBe(400);
    const sent = await upload(code);
    expect(sent.status).toBe(200);
    const { imageUrl } = (await sent.json()) as { imageUrl: string };
    expect(imageUrl).toMatch(/^\/api\/files\/characters\/[0-9a-f-]{36}\.png$/);
    mine = (await view(code)).body;
    expect(mine.pick?.draft).toEqual({ characterId: null, name, imageUrl });
    // and the card can be saved with it
    expect(
      (await put(code, { characterId: null, name, imageUrl })).status,
    ).toBe(204);
    // the target never sees what is being made for them
    as("d2");
    expect(JSON.stringify((await view(code)).body)).not.toContain("Zqxj");

    // past the deadline the card is the clock's
    as("d1");
    vi.setSystemTime((mine.deadline ?? 0) + 1);
    expect(
      (await put(code, { characterId: null, name: "Late", imageUrl: null }))
        .status,
    ).toBe(409);

    // several readers fire the timeout at once: one new character, d1's card
    const seen = await Promise.all([view(code), view(code), view(code)]);
    for (const s of seen) expect(s.status).toBe(200);
    const after = (await view(code)).body;
    expect(after.phase).toBe("asking");
    expect(after.reveal?.kind).toBe("cast");
    const d2 = after.players.find((p) => !p.isYou);
    expect(d2?.card).toMatchObject({ name, imageUrl });
    const same = (await getBackend().characters.search(name, "pt", 10)).filter(
      (c) => c.name === name,
    );
    expect(same).toHaveLength(1);
    expect(same[0]).toMatchObject({ id: d2?.card?.characterId, imageUrl });
    // the empty card got a stand-in from the clock
    as("d2");
    const theirs = (await view(code)).body.players.find((p) => !p.isYou);
    expect(theirs?.card?.name).toBeTruthy();

    // saving too often is refused
    let status = 0;
    for (let i = 0; i < 130 && status !== 429; i++)
      status = (await put(code, null)).status;
    expect(status).toBe(429);
  });

  it("makes a draft's new character once, however many make it at once", async () => {
    const { getOrCreateCharacter } = await import("./characters");
    const { getBackend } = await import("./backend");
    const name = `Once ${Math.random().toString(36).slice(2, 8)}`;
    const id = "u-00000000-0000-4000-8000-000000000001";
    const made = await Promise.all(
      Array.from({ length: 5 }, () =>
        getOrCreateCharacter({
          id,
          lang: "pt",
          name,
          origin: null,
          imageUrl: null,
          createdBy: "someone",
        }),
      ),
    );
    expect(new Set(made.map((c) => c.id))).toEqual(new Set([id]));
    expect(
      (await getBackend().characters.search(name, "pt", 10)).filter(
        (c) => c.name === name,
      ),
    ).toHaveLength(1);
    // asking again for the same id gives it back as it is, whatever the name
    expect(
      (
        await getOrCreateCharacter({
          id,
          lang: "pt",
          name: `${name} again`,
          origin: null,
          imageUrl: null,
          createdBy: "someone",
        })
      ).name,
    ).toBe(name);
  });

  it("gives an empty card one the theme's players picked, when it has history", async () => {
    const { code } = await pickingRoom("f1", "f2");
    as("f1");
    const v = (await view(code)).body;
    if (!v.theme) throw new Error("no theme");
    const [favourite] = await makeCharacters(`Favourite ${code}`, 1);
    await recordPicks(v.theme, [favourite.id]);
    vi.setSystemTime((v.deadline ?? 0) + 1);
    const seenByF1 = (await view(code)).body.players.find((p) => !p.isYou);
    as("f2");
    const seenByF2 = (await view(code)).body.players.find((p) => !p.isYou);
    const cards = [seenByF1?.card?.characterId, seenByF2?.card?.characterId];
    // the first empty card gets the theme's pick; the other one someone else
    expect(cards.filter((id) => id === favourite.id)).toHaveLength(1);
    expect(cards.every(Boolean)).toBe(true);
  });

  it("confirms a card in one call: a library character, or a name made or reused", async () => {
    const { code } = await pickingRoom("c1", "c2");
    const name = `Qwvx ${code}`;
    // c1 types a new name and gives it a picture, then confirms the card
    as("c1");
    expect(
      (await put(code, { characterId: null, name, imageUrl: null })).status,
    ).toBe(204);
    const { imageUrl } = (await (await upload(code)).json()) as {
      imageUrl: string;
    };
    expect(await A.confirmCard(code, { name: " " })).toEqual({
      ok: false,
      error: "invalid_input",
    });
    const view1 = must(await A.confirmCard(code, { name: `  ${name} ` }));
    expect(view1.pick?.confirmed).toBe(true);
    expect(view1.pick?.draft).toBeNull();
    expect(await A.confirmCard(code, { name })).toEqual({
      ok: false,
      error: "already_done",
    });
    // c2 types the same name: the character c1 made is reused, not duplicated
    as("c2");
    const [other] = await makeCharacters(`Other ${code}`, 1);
    expect(
      await A.confirmCard(code, { characterId: "pt-wd-Q999999999" }),
    ).toEqual({
      ok: false,
      error: "invalid_input",
    });
    must(await A.confirmCard(code, { name: name.toLowerCase() }));
    as("c1");
    const c1 = (await view(code)).body;
    as("c2");
    const c2 = (await view(code)).body;
    const madeByC1 = c1.players.find((p) => !p.isYou)?.card;
    const madeByC2 = c2.players.find((p) => !p.isYou)?.card;
    expect(madeByC1).toMatchObject({ name, imageUrl });
    expect(madeByC2?.characterId).toBe(madeByC1?.characterId);
    // a library character by id, in a new room
    const { code: next } = await pickingRoom("c3", "c4");
    as("c3");
    must(await A.confirmCard(next, { characterId: other.id }));
    expect((await view(next)).body.pick?.confirmed).toBe(true);
  });

  it("confirms a library character under the alias its card shows", async () => {
    const { code } = await pickingRoom("c5", "c6");
    as("c5");
    must(
      await A.confirmCard(code, {
        characterId: "pt-wd-Q12379",
        name: "jumpman",
      }),
    );
    // a name that is none of its names keeps its own
    as("c6");
    must(
      await A.confirmCard(code, {
        characterId: "pt-wd-Q12379",
        name: "Bowser",
      }),
    );
    const { getBackend } = await import("./backend");
    const state = (await getBackend().rooms.get(code))?.state;
    const pickOf = (id: string) =>
      Object.values(state?.assignments ?? {}).find(
        (a) => a.pickerId === uidOf(jarFor(id)),
      )?.character;
    expect(pickOf("c5")).toMatchObject({
      id: "pt-wd-Q12379",
      name: "Jumpman",
      aliases: expect.arrayContaining(["Mario"]),
    });
    expect(pickOf("c6")).toMatchObject({ name: "Mario" });
  });
});

describe("rule examples and the hand", () => {
  /** Made-up library characters for the starters below: a picture and three names each. */
  const fixture = (id: string, lang: Lang) => ({
    id,
    lang,
    name: `${id.slice(3)} ${lang}`,
    origin: null,
    imageUrl: `https://img.test/${id.slice(3)}.png`,
    aliases: [],
  });
  const THEMES: Theme[] = [
    {
      en: "Fixture heroes",
      es: "Héroes",
      ja: "ヒーロー",
      pt: "Heróis",
      set: "heroes",
    },
    {
      en: "Fixture singers",
      es: "Cantantes",
      ja: "歌手",
      pt: "Cantoras",
      set: "music",
    },
    {
      en: "Fixture glasses",
      es: "Gafas",
      ja: "眼鏡",
      pt: "Óculos",
      set: "looks",
    },
    {
      en: "Fixture pirates",
      es: "Piratas",
      ja: "海賊",
      pt: "Piratas",
      set: "warriors",
    },
  ];
  const row = (
    theme: Theme,
    characterId: string,
    position: number,
    kind: "fictional" | "human",
  ) => ({
    themeId: themeId(theme),
    set: theme.set,
    characterId,
    lang: "all" as const,
    position,
    kind,
  });
  const STARTERS = [
    row(THEMES[0], "wd-Q9000001", 1, "fictional"),
    row(THEMES[0], "wd-Q9000002", 2, "fictional"),
    row(THEMES[1], "wd-Q9000011", 1, "human"),
    row(THEMES[1], "wd-Q9000012", 2, "human"),
    row(THEMES[2], "wd-Q9000021", 1, "fictional"),
    row(THEMES[2], "wd-Q9000022", 2, "fictional"),
    row(THEMES[3], "wd-Q9000031", 1, "fictional"),
    row(THEMES[3], "wd-Q9000032", 2, "fictional"),
  ];

  /** Serves the fixture starters and characters (the rest of the library as it is). */
  async function withFixtures<T>(work: () => Promise<T>): Promise<T> {
    const { getBackend } = await import("./backend");
    const { characters, themes } = getBackend();
    const getMany = characters.getMany.bind(characters);
    const spies = [
      vi.spyOn(characters, "starters").mockResolvedValue(STARTERS),
      vi.spyOn(characters, "getMany").mockImplementation(async (ids, lang) => [
        ...ids
          .filter((id) => id.includes("-wd-Q90000"))
          .map((id) => fixture(id, lang)),
        ...(await getMany(
          ids.filter((id) => !id.includes("-wd-Q90000")),
          lang,
        )),
      ]),
      vi.spyOn(themes, "draw").mockResolvedValue(THEMES),
      vi.spyOn(themes, "drawFromBank").mockReturnValue(THEMES),
    ];
    try {
      return await work();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  }

  it("sends the rule cards with a room's first vote, the same for everyone", async () => {
    await withFixtures(async () => {
      const { code, voted } = await pickingRoom("e1", "e2");
      const show = voted.reveal;
      expect(show?.kind).toBe("theme");
      if (show?.kind !== "theme") return;
      expect(show.first).toBe(true);
      expect(show.rule?.fits.map((c) => c.id)).toEqual([
        "wd-Q9000001",
        "wd-Q9000002",
      ]);
      expect(show.rule?.fits[0]).toEqual({
        id: "wd-Q9000001",
        imageUrl: "https://img.test/wd-Q9000001.png",
        names: {
          en: "wd-Q9000001 en",
          es: "wd-Q9000001 es",
          pt: "wd-Q9000001 pt",
          ja: "wd-Q9000001 ja",
        },
      });
      // a fiction theme's ✗ is a real singer
      expect(["wd-Q9000011", "wd-Q9000012"]).toContain(show.rule?.misfit?.id);
      // the other player, at the same moment of the show, sees the same cards
      vi.setSystemTime(voted.serverNow);
      as("e2");
      const theirs = (await view(code)).body.reveal;
      expect(theirs?.kind === "theme" && theirs.rule).toEqual(show.rule);
      skipTo(voted);
    });
  });

  it("sends them too when a host's first theme falls back to a vote", async () => {
    await withFixtures(async () => {
      as("h1");
      const { code } = must(
        await A.createRoom({
          ...ROOM,
          themeMode: "host",
          visibility: "private",
          password: "pw",
          seats: 2,
          ...TIMES,
        }),
      );
      as("h2");
      must(await A.joinRoom(code, "pw"));
      as("h1");
      const theming = must(await A.startGame(code));
      expect(theming.phase).toBe("theming");
      vi.setSystemTime((theming.deadline ?? 0) + 1);
      const v = (await view(code)).body;
      expect(v.phase).toBe("voting");
      skipTo(v);
      const show = (await voteAll(code, ["h1", "h2"])).reveal;
      expect(show?.kind === "theme" && show.rule?.fits[1].id).toBe(
        "wd-Q9000002",
      );
    });
  });

  it("hands out the theme's most picked and liked, then its starters", async () => {
    const route = await import("@/app/api/themes/[id]/picks/route");
    const theme: Theme = {
      en: `Hand ${Math.random().toString(36).slice(2, 8)}`,
      es: "Mano",
      pt: "Mão",
      ja: "手",
      set: "heroes",
    };
    const id = themeId(theme);
    const hand = async (themeKey: string, lang = "pt") => {
      const res = await route.GET(
        new Request(`http://x/api/themes/${themeKey}/picks?lang=${lang}`),
        { params: Promise.resolve({ id: themeKey }) },
      );
      return {
        res,
        body: (await res.json()) as {
          hand: { id: string; picks: number; fits: number }[];
        },
      };
    };
    expect((await hand("Bad_Id")).res.status).toBe(400);
    expect((await hand(id, "fr")).res.status).toBe(400);
    expect((await hand(id)).body.hand).toEqual([]);

    as("k1");
    const [often, once, liked] = await makeCharacters(`Hand ${id}`, 3, true);
    await recordPicks(theme, [often.id, often.id, often.id, once.id, liked.id]);
    const { getBackend } = await import("./backend");
    await getBackend().matches.voteFit({
      themeId: id,
      characterId: liked.id,
      voterId: "k1",
      lang: "pt",
      fits: true,
    });
    const starters = [
      {
        themeId: id,
        set: theme.set,
        characterId: "wd-Q9000031",
        lang: "all" as const,
        position: 1,
        kind: "fictional" as const,
      },
    ];
    const { res, body } = await withFixtures(async () => {
      vi.spyOn(getBackend().characters, "starters").mockResolvedValue(starters);
      return hand(id);
    });
    expect(res.headers.get("cache-control")).toContain("s-maxage=60");
    // a young theme: the starter leads, then picks and votes
    expect(body.hand.map((c) => c.id)).toEqual([
      "pt-wd-Q9000031",
      often.id,
      liked.id,
      once.id,
    ]);
    expect(body.hand[2]).toMatchObject({ picks: 1, fits: 1 });
  });
});

describe("dispatch", () => {
  it("tries again after a lost race, waiting a little longer each time", async () => {
    const { getBackend } = await import("./backend");
    const { dispatch } = await import("./rooms");
    as("w1");
    const { code } = must(
      await A.createRoom({ ...ROOM, visibility: "public", seats: 2, ...TIMES }),
    );
    const id = uidOf(jarFor("w1"));
    const { rooms } = getBackend();
    const cas = vi
      .spyOn(rooms, "compareAndSwap")
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    const started = performance.now();
    const done = await dispatch(code, () => ({
      type: "UPDATE_SETTINGS",
      playerId: id,
      settings: { name: "Raced" },
    }));
    // two waits: 15-60 ms, then 30-120 ms
    expect(performance.now() - started).toBeGreaterThanOrEqual(44);
    expect(cas).toHaveBeenCalledTimes(3);
    expect(done.state.settings.name).toBe("Raced");
    cas.mockResolvedValue(false);
    await expect(
      dispatch(code, () => ({
        type: "UPDATE_SETTINGS",
        playerId: id,
        settings: { name: "Lost" },
      })),
    ).rejects.toMatchObject({ code: "conflict" });
    cas.mockRestore();
  });
});

describe("room chat", () => {
  const messagesRoute = () => import("@/app/api/rooms/[code]/messages/route");
  const post = async (code: string, body: unknown, origin = "http://x") =>
    (await messagesRoute()).POST(
      new Request(`http://x/api/rooms/${code}/messages`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ code }) },
    );
  const read = async (code: string, since?: number) => {
    const res = await (await messagesRoute()).GET(
      new Request(
        `http://x/api/rooms/${code}/messages${since === undefined ? "" : `?since=${since}`}`,
      ),
      { params: Promise.resolve({ code }) },
    );
    return {
      status: res.status,
      messages: ((await res.json()) as { messages?: ChatMessage[] }).messages,
    };
  };
  /** A public lobby with these players seated, the first one hosting. */
  async function lobby(players: string[], seats: 2 | 3 = 3) {
    as(players[0]);
    const { code } = must(
      await A.createRoom({ ...ROOM, visibility: "public", seats, ...TIMES }),
    );
    for (const p of players.slice(1)) {
      as(p);
      must(await A.joinRoom(code));
    }
    return code;
  }
  const backend = async () => (await import("./backend")).getBackend();

  it("sends and lists a room's lines, for its players only, with an id-only ping", async () => {
    const code = await lobby(["m1", "m2"]);
    const { notify } = await backend();
    const ping = vi.spyOn(notify, "chatChanged");
    as("m1");
    const res = await post(code, { text: "  hello\n\n\n\nworld\u0007  " });
    expect(res.status).toBe(200);
    const sent = (await res.json()) as ChatMessage;
    expect(sent).toMatchObject({
      by: uidOf(jarFor("m1")),
      author: { id: uidOf(jarFor("m1")), isGuest: true },
      text: "hello\n\nworld",
      system: null,
    });
    expect(sent.showAt).toBe(sent.at);
    expect(ping).toHaveBeenCalledWith(code, sent.id);
    ping.mockRestore();

    as("m2");
    expect((await read(code)).messages).toEqual([sent]);
    expect((await read(code, sent.at - 3000)).messages).toEqual([sent]);
    expect((await read(code, sent.at + 1)).messages).toEqual([]);
    expect((await read(code, Number.NaN)).status).toBe(400);
    // 280 code points fit, 281 don't; nothing left after cleaning is refused
    const long = await post(code, { text: "🦸".repeat(280) });
    expect(long.status).toBe(200);
    expect(((await long.json()) as ChatMessage).text).toBe("🦸".repeat(280));
    expect((await post(code, { text: "🦸".repeat(281) })).status).toBe(400);
    expect((await post(code, { text: " \n " })).status).toBe(400);
    expect((await post(code, "hi")).status).toBe(400);
    // only our pages
    expect((await post(code, { text: "x" }, "http://evil")).status).toBe(403);

    // not seated: neither reads nor writes; a missing room is 404
    as("m3");
    expect((await read(code)).status).toBe(403);
    expect((await post(code, { text: "let me in" })).status).toBe(403);
    expect((await read("ZZZZZ")).status).toBe(404);
  });

  it("refuses the 6th line in 10 s, in the store too, per author", async () => {
    const code = await lobby(["l1", "l2"]);
    as("l1");
    for (let i = 0; i < 5; i++)
      expect((await post(code, { text: `line ${i}` })).status).toBe(200);
    const sixth = await post(code, { text: "one more" });
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toEqual({ error: "rate_limited" });
    // someone else in the room still can
    as("l2");
    expect((await post(code, { text: "me too" })).status).toBe(200);

    // the store holds the limit by itself (on Supabase: across instances)
    const { chat } = await backend();
    const author = {
      id: "store-author",
      isGuest: true,
      name: null,
      guestNumber: 1,
      avatar: { kind: "creature", dna: "Cat..Happy..0", color: "#fff" },
    } as const;
    const line = { by: author.id, author, text: "hi" };
    for (let i = 0; i < 5; i++) await chat.add("LIMIT", [line]);
    await expect(chat.add("LIMIT", [line])).rejects.toMatchObject({
      code: "rate_limited",
    });
    // system lines never count
    await chat.add("LIMIT", [{ system: { type: "started" } }]);
    // another room is another count
    await chat.add("LIMT2", [line]);
  });

  it("posts the match's lines once, each waiting for its scene", async () => {
    const code = await lobby(["v1", "v2"], 2);
    as("v1");
    must(await A.startGame(code));
    skipTo((await view(code)).body);
    as("v2");
    expect((await read(code)).messages?.map((m) => m.system?.type)).toEqual([
      "started",
    ]);
    for (const p of ["v1", "v2"]) {
      as(p);
      must(await A.voteTheme(code, 0));
    }
    const voted = (await view(code)).body;
    const lines = (await read(code)).messages ?? [];
    expect(lines.map((m) => m.system?.type)).toEqual(["started", "theme"]);
    const theme = lines[1];
    expect(theme.system).toEqual({ type: "theme", theme: voted.theme });
    expect(theme.by).toBeNull();
    expect(theme.showAt).toBeGreaterThan(Date.now());
    expect(theme.showAt).toBeLessThan(voted.reveal?.until ?? 0);

    skipTo(voted);
    for (const p of ["v1", "v2"]) {
      as(p);
      must(await A.confirmCard(code, { name: `Chat pick ${p} ${code}` }));
    }
    const cast = (await view(code)).body;
    const all = (await read(code)).messages ?? [];
    expect(all.map((m) => m.system?.type)).toEqual([
      "started",
      "theme",
      "order",
      "firstTurn",
    ]);
    const [order, turn] = all.slice(2);
    expect(order.showAt).toBeGreaterThan(Date.now());
    expect(turn.showAt).toBeGreaterThan(cast.stepStartsAt ?? 0);
    expect(turn.system).toMatchObject({ type: "firstTurn", n: 1 });
  });

  it("clears a room's chat when it closes", async () => {
    const code = await lobby(["k1", "k2"]);
    as("k1");
    expect((await post(code, { text: "bye" })).status).toBe(200);
    const { chat } = await backend();
    expect(await chat.list(code, 0, 50)).toHaveLength(1);
    must(await A.leaveRoom(code));
    as("k2");
    must(await A.leaveRoom(code));
    expect(await chat.list(code, 0, 50)).toEqual([]);
  });

  it("moves a guest's lines to the account they sign in to", async () => {
    const { handOverSeats } = await import("./rooms");
    as("q3");
    must(await A.enterTestAccount());
    const { getBackend } = await import("./backend");
    const account = await getBackend().auth.identity("pt");
    const code = await lobby(["q1", "q2"]);
    const guest = uidOf(jarFor("q1"));
    as("q1");
    expect((await post(code, { text: "before signing in" })).status).toBe(200);
    const { chat } = await backend();
    const [named] = await chat.add(code, [
      {
        system: {
          type: "firstTurn",
          n: 1,
          player: {
            id: guest,
            isGuest: true,
            name: null,
            guestNumber: 3,
            avatar: { kind: "creature", dna: "Cat..Happy..0", color: "#fff" },
          },
        },
      },
    ]);
    await handOverSeats(guest, account, code);
    as("q3");
    const lines = (await read(code)).messages ?? [];
    expect(lines[0]).toMatchObject({
      by: account.id,
      author: { id: account.id },
      text: "before signing in",
    });
    expect(lines.find((m) => m.id === named.id)?.system).toMatchObject({
      player: { id: account.id, isGuest: true },
    });
  });

  it("prunes the chats of rooms that died without closing, from openRoom", async () => {
    const { chat } = await backend();
    const prune = vi.spyOn(chat, "prune");
    as("u1");
    must(
      await A.createRoom({ ...ROOM, visibility: "public", seats: 2, ...TIMES }),
    );
    expect(prune).toHaveBeenCalledTimes(1);
    const before = prune.mock.calls[0][0];
    expect(Math.abs(Date.now() - 24 * 3600_000 - before)).toBeLessThan(5000);
    prune.mockRestore();

    await chat.add("OLDRM", [{ system: { type: "started" } }]);
    vi.setSystemTime(Date.now() + 2000);
    const cut = Date.now() - 1000;
    await chat.add("NEWRM", [{ system: { type: "started" } }]);
    await chat.prune(cut);
    expect(await chat.list("OLDRM", 0, 50)).toEqual([]);
    expect(await chat.list("NEWRM", 0, 50)).toHaveLength(1);
  });
});

describe("character pictures", () => {
  const backend = async () => (await import("./backend")).getBackend();
  type Tray = { pictures: import("./pictures").TrayPicture[] };
  const upload = async (code: string, characterId?: string) => {
    const form = new FormData();
    form.set("image", pngFile());
    if (characterId) form.set("characterId", characterId);
    const route = await import("@/app/api/rooms/[code]/draft/image/route");
    return route.POST(
      new Request(`http://x/api/rooms/${code}/draft/image`, {
        method: "POST",
        headers: { origin: "http://x" },
        body: form,
      }),
      { params: Promise.resolve({ code }) },
    );
  };
  const tray = async (id: string) => {
    const route = await import("@/app/api/characters/[id]/pictures/route");
    const res = await route.GET(
      new Request(`http://x/api/characters/${id}/pictures`),
      { params: Promise.resolve({ id }) },
    );
    return (await res.json()) as Tray;
  };
  const report = async (id: string) => {
    const route = await import("@/app/api/pictures/[id]/report/route");
    return route.POST(
      new Request(`http://x/api/pictures/${id}/report`, {
        method: "POST",
        headers: { origin: "http://x" },
      }),
      { params: Promise.resolve({ id }) },
    );
  };
  const putDraft = async (code: string, body: unknown) => {
    const route = await import("@/app/api/rooms/[code]/draft/route");
    return route.PUT(
      new Request(`http://x/api/rooms/${code}/draft`, {
        method: "PUT",
        headers: { origin: "http://x", "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ code }) },
    );
  };
  /** Library characters with a picture, the n-th first. */
  const pictured = async (n: number) => {
    const { characters } = await backend();
    const found = (await characters.search("", "pt", 200)).filter(
      (c) => c.imageUrl && !c.id.startsWith("u-"),
    );
    return found[n];
  };

  it("puts a player's picture of a library character on their card, and the cover stays", async () => {
    const lib = await pictured(0);
    const other = await pictured(1);
    const { code } = await pickingRoom("i1", "i2");
    as("i1");
    const sent = await upload(code, lib.id);
    expect(sent.status).toBe(200);
    const { imageUrl, picture } = (await sent.json()) as {
      imageUrl: string;
      picture: Tray["pictures"][number];
    };
    expect(picture).toMatchObject({
      url: imageUrl,
      mine: true,
      pending: false,
    });
    expect((await view(code)).body.pick?.draft).toEqual({
      characterId: lib.id,
      name: lib.name,
      imageUrl,
    });
    // a picture goes only with its own character
    expect(
      (await putDraft(code, { characterId: other.id, name: "x", imageUrl }))
        .status,
    ).toBe(400);
    expect(
      (
        await putDraft(code, {
          characterId: lib.id,
          name: lib.name,
          imageUrl: "https://evil.test/a.png",
        })
      ).status,
    ).toBe(400);

    // the tray: the library's own first, then the new one, with its author
    const seen = (await tray(lib.id)).pictures;
    expect(seen[0]).toMatchObject({ url: lib.imageUrl, author: null });
    expect(seen.find((p) => p.url === imageUrl)).toMatchObject({ mine: true });
    as("i2");
    expect(
      (await tray(lib.id)).pictures.find((p) => p.url === imageUrl),
    ).toMatchObject({ mine: false, author: { name: expect.any(String) } });

    // confirmed, the card wears it; one pick does not beat the head start
    as("i1");
    must(await A.confirmCard(code, { characterId: lib.id }));
    const { rooms, characters } = await backend();
    const state = (await rooms.get(code))?.state;
    const card = Object.values(state?.assignments ?? {}).find(
      (a) => a.pickerId === uidOf(jarFor("i1")),
    )?.character;
    expect(card).toMatchObject({ id: lib.id, imageUrl });
    expect((await characters.get(lib.id))?.imageUrl).toBe(lib.imageUrl);
  });

  it("hides a picture three people reported, never the library's", async () => {
    const lib = await pictured(2);
    const { code } = await pickingRoom("i3", "i4");
    as("i3");
    const { picture } = (await (await upload(code, lib.id)).json()) as {
      picture: { id: string; url: string };
    };
    // not one's own, not the library's
    expect((await report(picture.id)).status).toBe(400);
    as("i4");
    const cover = (await tray(lib.id)).pictures[0];
    expect(cover.author).toBeNull();
    expect((await report(cover.id)).status).toBe(400);

    for (const [who, hidden] of [
      ["i4", false],
      ["i4", false],
      ["i5", false],
      ["i6", true],
    ] as const) {
      as(who);
      expect(await (await report(picture.id)).json()).toEqual({ hidden });
    }
    as("i4");
    expect(
      (await tray(lib.id)).pictures.some((p) => p.url === picture.url),
    ).toBe(false);
    expect((await report(picture.id)).status).toBe(404);
  });

  it("moves the cover to the picture most players pick, past the library's head start", async () => {
    const { images, characters } = await backend();
    const author = {
      name: null,
      isGuest: true,
      guestNumber: 1,
      avatar: {
        kind: "creature" as const,
        dna: "Cat..Happy..0",
        color: "#DCE8FA",
      },
    };
    const add = (characterId: string, url: string) =>
      images.add({
        characterId,
        url,
        createdBy: "someone",
        author,
        status: "active",
        moderation: null,
      });

    // a player's character: no head start
    as("i7");
    const form = new FormData();
    form.set("name", "Cover Test Person");
    form.set("lang", "pt");
    form.set("image", pngFile());
    const made = must(await A.createCharacter(form));
    const first = made.imageUrl as string;
    await add(made.id, "https://img.test/b.png");
    await images.recordPick(made.id, "https://img.test/b.png", "v1", true);
    expect((await characters.get(made.id))?.imageUrl).toBe(
      "https://img.test/b.png",
    );
    await images.recordPick(made.id, first, "v2", true);
    await images.recordPick(made.id, first, "v3", true);
    // the same player twice is one pick
    await images.recordPick(made.id, "https://img.test/b.png", "v1", true);
    expect((await characters.get(made.id))?.imageUrl).toBe(first);

    // the library's own picture starts 20 picks ahead and wins a tie
    const lib = await pictured(3);
    const id = lib.id.replace(/^(en|pt|ja)-/, "");
    await add(id, "https://img.test/fat.png");
    for (let i = 0; i < 20; i++)
      await images.recordPick(id, "https://img.test/fat.png", `w${i}`, true);
    expect((await characters.get(lib.id))?.imageUrl).toBe(lib.imageUrl);
    await images.recordPick(id, "https://img.test/fat.png", "w20", true);
    expect((await characters.get(lib.id))?.imageUrl).toBe(
      "https://img.test/fat.png",
    );
    // in every language
    expect(
      (await characters.get(lib.id.replace(/^pt-/, "en-")))?.imageUrl,
    ).toBe("https://img.test/fat.png");
  });

  it("weighs a cover kept as shown less than a picture chosen, and every report against it", async () => {
    const { images, characters } = await backend();
    const lib = await pictured(5);
    const id = lib.id.replace(/^(en|pt|ja)-/, "");
    const fan = "https://img.test/fan.png";
    await images.add({
      characterId: id,
      url: fan,
      createdBy: "someone",
      author: {
        name: null,
        isGuest: true,
        guestNumber: 1,
        avatar: { kind: "creature", dna: "Cat..Happy..0", color: "#DCE8FA" },
      },
      status: "active",
      moderation: null,
    });
    const cover = async () => (await characters.get(lib.id))?.imageUrl;
    // 16 kept the cover as the card showed it: 20 + √16 = 24
    for (let i = 0; i < 16; i++)
      await images.recordPick(id, lib.imageUrl as string, `k${i}`, false);
    for (let i = 0; i < 24; i++)
      await images.recordPick(id, fan, `c${i}`, true);
    // a tie: the older one stays
    expect(await cover()).toBe(lib.imageUrl);
    // one who chose it already adds nothing by keeping it
    await images.recordPick(id, fan, "c0", false);
    expect(await cover()).toBe(lib.imageUrl);
    // one who kept the cover, then chose it: a pick instead of a keep (21 + √15)
    await images.recordPick(id, lib.imageUrl as string, "k0", true);
    await images.recordPick(id, fan, "c24", true);
    expect(await cover()).toBe(fan);
    // two reports take four off: the library's own is never hidden, but it sinks
    const [, theirs] = await images.list(id, "c0", 2);
    expect(theirs.url).toBe(lib.imageUrl);
    expect(theirs.score).toBeCloseTo(21 + Math.sqrt(15));
    await images.report(theirs.id, "r1", 3);
    await images.report(theirs.id, "r2", 3);
    const after = await images.list(id, "c0", 2);
    expect(after.map((p) => p.url)).toEqual([fan, lib.imageUrl]);
    expect(after[1].score).toBeCloseTo(17 + Math.sqrt(15));
    expect(after[1].status).toBe("active");
  });

  it("refuses what the detector flags, and shows what it could not check only to its author", async () => {
    const lib = await pictured(4);
    const { code } = await pickingRoom("i8", "i9");
    vi.stubEnv("SIGHTENGINE_API_USER", "user");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "secret");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          Response.json({
            status: "success",
            nudity: { sexual_activity: 0.9, sexual_display: 0.1, erotica: 0.1 },
            gore: {
              classes: { body_organ: 0, serious_injury: 0, corpse: 0 },
              type: { animated: 0 },
            },
          }),
        ),
      );
      as("i8");
      const refused = await upload(code, lib.id);
      expect(refused.status).toBe(400);
      expect(await refused.json()).toEqual({ error: "image_rejected" });

      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new TypeError("fetch failed");
        }),
      );
      const waiting = (await (await upload(code, lib.id)).json()) as {
        picture: { url: string; pending: boolean };
      };
      expect(waiting.picture.pending).toBe(true);
      expect(
        (await tray(lib.id)).pictures.find(
          (p) => p.url === waiting.picture.url,
        ),
      ).toMatchObject({ pending: true });
      as("i9");
      expect(
        (await tray(lib.id)).pictures.some(
          (p) => p.url === waiting.picture.url,
        ),
      ).toBe(false);
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      warn.mockRestore();
    }
  });

  it("tidies away pictures sent for names that never became characters", async () => {
    const { code } = await pickingRoom("i10", "i11");
    as("i10");
    const { imageUrl } = (await (await upload(code)).json()) as {
      imageUrl: string;
    };
    const { images } = await backend();
    const { tidyPictures } = await import("./pictures");
    expect(await images.find(null, imageUrl)).not.toBeNull();
    // a day is not up yet
    await tidyPictures();
    expect(await images.find(null, imageUrl)).not.toBeNull();
    const done = await tidyPictures(Date.now() + 25 * 3600_000);
    expect(done.orphans).toBeGreaterThan(0);
    expect(await images.find(null, imageUrl)).toBeNull();
  });
});

describe("impostor, local mode", () => {
  it("deals the cards with the vote, plays a round and records the match", async () => {
    const players = ["imp1", "imp2", "imp3", "imp4"];
    as("imp1");
    const { code } = must(
      await A.createRoom({
        ...ROOM,
        ...TIMES,
        game: "impostor",
        visibility: "public",
        seats: 10,
      }),
    );
    for (const p of players.slice(1)) {
      as(p);
      must(await A.joinRoom(code));
    }
    as("imp1");
    must(await A.startGame(code));
    for (const p of players) {
      as(p);
      expect((await view(code)).body.phase).toBe("voting");
      must(await A.voteTheme(code, 0));
    }
    // the cards came with the vote: never shown, never sent
    as("imp1");
    let v = (await view(code)).body;
    expect(v.phase).toBe("replying");
    expect(v.reveal?.kind).toBe("deal");
    expect(JSON.stringify(v)).not.toContain("deals");
    skipTo(v);

    // who holds which card: the impostor's is the odd one out
    const cards: Record<string, string> = {};
    const idOf: Record<string, string> = {};
    for (const p of players) {
      as(p);
      const mine = (await view(code)).body;
      cards[p] = mine.imp?.card?.characterId ?? "";
      idOf[p] = mine.youId;
      expect(mine.imp?.impostors).toBe(1);
    }
    const ids = Object.values(cards);
    const odd = players.find(
      (p) => ids.filter((id) => id === cards[p]).length === 1,
    );
    expect(odd).toBeDefined();
    const crewCard = ids.find((id) => id !== cards[odd as string]);

    // two questions before the vote: everyone answers each
    for (let q = 0; q < 2; q++) {
      for (const p of players) {
        as(p);
        const now = (await view(code)).body;
        const kind = now.imp?.asked.at(-1)?.question.kind;
        must(
          await A.replyCard(
            code,
            kind === "word"
              ? { word: "pizza" }
              : { n: kind === "scale" ? 5 : 0 },
          ),
        );
      }
      as("imp1");
      skipTo((await view(code)).body);
    }
    as("imp1");
    v = (await view(code)).body;
    expect(v.phase).toBe("talking");
    expect(v.imp?.asked.every((a) => a.answers?.length === 4)).toBe(true);

    // everyone sends the impostor out (the impostor votes for someone else)
    for (const p of players) {
      as(p);
      const target = p === odd ? players.find((x) => x !== odd) : odd;
      must(await A.accuse(code, idOf[target as string]));
    }
    as(odd as string);
    v = (await view(code)).body;
    expect(v.phase).toBe("last_chance");
    expect(v.reveal).toMatchObject({
      kind: "out",
      id: idOf[odd as string],
      impostor: true,
    });
    skipTo(v);
    must(await A.guessCrewCard(code, "Ninguém sabe"));
    v = (await view(code)).body;
    expect(v.phase).toBe("finished");
    expect(v.imp?.end).toMatchObject({
      winner: "crew",
      impostorIds: [idOf[odd as string]],
    });
    expect(v.imp?.end?.crew.characterId).toBe(crewCard);

    // the questions the screens read the words from
    const route = await import("@/app/api/impostor/questions/route");
    const bank = (await (await route.GET()).json()) as {
      questions: { id: string }[];
    };
    expect(bank.questions.length).toBe(134);
    for (const a of v.imp?.asked ?? [])
      expect(bank.questions.some((q) => q.id === a.question.id)).toBe(true);
  });
});
