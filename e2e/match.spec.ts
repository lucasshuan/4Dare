import { expect, test } from "@playwright/test";
import {
  createRoom,
  joinRoom,
  newPlayer,
  pickAll,
  playToEnd,
  startMatch,
  viewOf,
  voteAll,
} from "./helpers";

test("two players play a whole match", async ({ browser }) => {
  test.setTimeout(180_000);
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await joinRoom(guest, code);

  await expect(host.getByRole("img", { name: /^ready$/i })).toBeVisible();
  // one browser, one seat (a guest signing in twice used to take two)
  expect((await viewOf(host, code)).players).toHaveLength(2);
  await startMatch(host);
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

  // the host takes everyone back to the lobby for another match
  await host.getByRole("button", { name: /back to the lobby/i }).click();
  // a named room leads with its name; the greeting is the line under it
  await expect(host.getByText(/another round/i)).toBeVisible();
  await expect(guest.getByText(/back in/i)).toBeVisible();
  await expect(guest.getByRole("button", { name: /i'm ready/i })).toBeVisible();
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
  expect((await viewOf(host, code)).players).toHaveLength(3);

  await startMatch(host);
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

  // nobody presses anything: the podium's clock takes everyone to the lobby
  for (const page of players)
    await expect(page.getByText(/another round|back in/i)).toBeVisible({
      timeout: 25_000,
    });
});
