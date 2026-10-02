// The server end to end, in local mode: actions + route handlers + engine, with fake cookies per player.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { RoomView } from "@/game/types";

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

const as = (name: string) => {
  caller = name;
};

type Actions = typeof import("./actions");
let A: Actions;
let roomRoute: typeof import("@/app/api/rooms/[code]/route");

beforeAll(async () => {
  A = await import("./actions");
  roomRoute = await import("@/app/api/rooms/[code]/route");
});

async function view(code: string): Promise<{ status: number; body: RoomView }> {
  const res = await roomRoute.GET(new Request(`http://x/api/rooms/${code}`), {
    params: Promise.resolve({ code }),
  });
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
      await A.createRoom({ visibility: "private", seats: 3, stepSeconds: 60 }),
    );
    expect(code).toMatch(/^[2-9A-Z]{5}$/);

    as("p2");
    expect((await view(code)).status).toBe(403);
    must(await A.joinRoom(code.toLowerCase()));
    as("p3");
    must(await A.joinRoom(code));
    as("p4");
    expect(await A.joinRoom(code)).toEqual({ ok: false, error: "room_full" });

    as("p2");
    expect(await A.startGame(code)).toEqual({ ok: false, error: "not_host" });
    as("p1");
    must(await A.startGame(code));

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
    const turnId = v.turn?.playerId as string;
    const nameOf = (id: string) =>
      [...jars.entries()].find(
        ([, j]) => j.get("dare_uid") === id,
      )?.[0] as string;
    const turnName = nameOf(turnId);

    as(turnName);
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
    expect(await A.passTurn(code)).toEqual({ ok: false, error: "too_early" });

    // nobody's own character name ever reaches their browser
    for (const p of ["p1", "p2", "p3"]) {
      as(p);
      const mine = (await view(code)).body;
      const uid = jarFor(p).get("dare_uid") as string;
      expect(JSON.stringify(mine)).not.toContain(`Hero of ${uid}`);
    }
  });

  it("rejects bad input and bad pictures", async () => {
    as("q1");
    expect(
      await A.createRoom({
        visibility: "public",
        seats: 9 as 4,
        stepSeconds: 60,
      }),
    ).toEqual({
      ok: false,
      error: "invalid_input",
    });
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
    const form = new FormData();
    form.set("name", "Jean");
    form.set("color", "#DCE8FA");
    form.set("avatar", "color");
    expect(await A.updateProfile(form)).toEqual({
      ok: false,
      error: "unauthorized",
    });
    must(await A.enterTestAccount());
    const me = must(await A.updateProfile(form));
    expect(me).toMatchObject({
      isGuest: false,
      name: "Jean",
      avatar: { kind: "color", color: "#DCE8FA" },
    });
  });

  it("guests start with a critter; accounts can pick another one", async () => {
    as("r2");
    const guest = must(await A.enterTestAccount());
    expect(guest.avatar).toMatchObject({ kind: "critter" });
    const form = new FormData();
    form.set("name", "Bia");
    form.set("color", "#F4C7D9");
    form.set("avatar", "critter");
    form.set("seed", "<svg>");
    expect(await A.updateProfile(form)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    form.set("seed", "k3x9q");
    form.set("color", "#123456");
    expect(await A.updateProfile(form)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    // the random pastel the guest started with is kept if they don't pick one
    form.set("color", guest.avatar.color);
    expect(must(await A.updateProfile(form)).avatar.color).toBe(
      guest.avatar.color,
    );
    form.set("color", "#F4C7D9");
    expect(must(await A.updateProfile(form)).avatar).toEqual({
      kind: "critter",
      seed: "k3x9q",
      color: "#F4C7D9",
    });
  });
});
