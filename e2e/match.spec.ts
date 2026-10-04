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

// One whole match: the other specs cover the desktop layout, and the engine
// tests the podium clock that takes everyone back on its own.
test("three players on phones, with a wrong guess checked by the picker", {
  tag: "@smoke",
}, async ({ browser }) => {
  test.setTimeout(240_000);
  const players = [
    await newPlayer(browser, true),
    await newPlayer(browser, true),
    await newPlayer(browser, true),
  ];
  const [host, ...guests] = players;
  const code = await createRoom(host);
  for (const page of guests) await joinRoom(page, code);
  await expect(
    host.getByRole("img", { name: /^ready$/i }).first(),
  ).toBeVisible();
  // one browser, one seat (a guest signing in twice used to take two)
  expect((await viewOf(host, code)).players).toHaveLength(3);

  await startMatch(host);
  await voteAll(players);
  await pickAll(players);

  // nobody sees their own card
  for (const page of players) {
    const me = (await viewOf(page, code)).players.find((p) => p.isYou);
    expect(me?.cardHidden).toBe(true);
    expect(me?.card).toBeNull();
  }

  await playToEnd(players, code, { missFirst: true });

  const view = await viewOf(host, code);
  expect(view.phase).toBe("finished");
  expect(
    view.history.some((h) => h.kind === "guess" && h.result === "miss"),
  ).toBe(true);
  await expect(
    host.getByRole("heading", { name: /discovered first/i }),
  ).toBeVisible();

  // the host takes everyone back to the lobby for another match; a named room
  // leads with its name, the greeting is the line under it
  await host.getByRole("button", { name: /back to the lobby/i }).click();
  await expect(host.getByText(/another round/i)).toBeVisible();
  for (const page of guests) {
    await expect(page.getByText(/back in/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /i'm ready/i }),
    ).toBeVisible();
  }
});
