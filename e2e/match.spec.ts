import { expect, test } from "@playwright/test";
import {
  createRoom,
  joinRoom,
  newPlayer,
  pickAll,
  playToEnd,
  voteAll,
  viewOf,
} from "./helpers";

test("two players play a whole match", async ({ browser }) => {
  test.setTimeout(180_000);
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await joinRoom(guest, code);

  await expect(host.getByRole("img", { name: /^ready$/i })).toBeVisible();
  await host.getByRole("button", { name: /start match/i }).click();
  await voteAll([host, guest]);
  await pickAll([host, guest]);

  // nobody sees their own card
  for (const page of [host, guest]) {
    const view = await viewOf(page, code);
    const me = view.players.find((p) => p.isYou);
    expect(me?.cardHidden).toBe(true);
    expect(me?.card).toBeNull();
  }

  await playToEnd([host, guest], code);
  for (const page of [host, guest])
    await expect(
      page.getByRole("heading", { name: /discovered first/i }),
    ).toBeVisible();
  await expect(host.getByRole("button", { name: /play again/i })).toBeVisible();
});

test("three players on phones, with a wrong guess checked by the picker", async ({
  browser,
}) => {
  test.setTimeout(240_000);
  const players = [
    await newPlayer(browser, true),
    await newPlayer(browser, true),
    await newPlayer(browser, true),
  ];
  const [host, ...guests] = players;
  const code = await createRoom(host);
  for (const page of guests) await joinRoom(page, code);

  await host.getByRole("button", { name: /start match/i }).click();
  await voteAll(players);
  await pickAll(players);
  await playToEnd(players, code, { missFirst: true });

  const view = await viewOf(host, code);
  expect(view.phase).toBe("finished");
  expect(
    view.history.some((h) => h.kind === "guess" && h.result === "miss"),
  ).toBe(true);
  await expect(
    host.getByRole("heading", { name: /discovered first/i }),
  ).toBeVisible();
});
