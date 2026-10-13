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
// tests the end's keys (one more, another game).
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
  // the end: once its scene made room, who is ready for the next one (the host always is)
  await expect(host.getByText(/1 of 3 ready/i)).toBeVisible({
    timeout: 30_000,
  });
  const [eager, slow] = guests;
  await eager.getByRole("button", { name: /^ready$/i }).click();
  await expect(host.getByText(/2 of 3 ready/i)).toBeVisible();

  // anyone takes everyone back to the lobby; whoever said they were ready
  // stays ready. A named room leads with its name, the greeting is the line under it
  await slow.getByRole("button", { name: /back to the lobby/i }).click();
  await expect(host.getByText(/another match/i)).toBeVisible();
  for (const page of guests)
    await expect(page.getByText(/back in/i)).toBeVisible();
  await expect(
    eager.getByRole("button", { name: /^ready$/i, pressed: true }),
  ).toBeVisible();
  await expect(
    slow.getByRole("button", { name: /^ready$/i, pressed: false }),
  ).toBeVisible();
});
