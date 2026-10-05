import { expect, test } from "@playwright/test";
import { createRoom, joinRoom, newPlayer, startMatch, viewOf } from "./helpers";

test("a vote taken back gives back the seconds it cut", async ({ browser }) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await joinRoom(guest, code);
  await startMatch(host);

  const themes = host
    .getByRole("group", { name: /vote for the theme/i })
    .getByRole("button");
  await expect(themes).toHaveCount(3, { timeout: 15_000 });
  await expect(themes.nth(0)).toBeEnabled({ timeout: 15_000 });
  const deadline = (await viewOf(host, code)).deadline ?? 0;

  await themes.nth(0).click();
  await expect(themes.nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(host.getByText(/^−\d+ s$/)).toBeVisible();
  await expect
    .poll(async () => (await viewOf(host, code)).deadline ?? 0)
    .toBeLessThan(deadline);

  // the same theme again takes the vote back, and the seconds it cut
  await themes.nth(0).click();
  await expect(themes.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(host.getByText(/^\+\d+ s$/)).toBeVisible();
  const back = await viewOf(host, code);
  expect(back.deadline).toBe(deadline);
  expect(back.vote?.yourVote).toBeNull();
  if (process.env.SHOT) await host.screenshot({ path: process.env.SHOT });
});
