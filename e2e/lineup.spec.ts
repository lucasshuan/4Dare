import { expect, type Page, test } from "@playwright/test";
import { joinRoom, newPlayer, startMatch, viewOf } from "./helpers";

/** Clicks `name` on every page that shows it enabled, until the room leaves `phase`. */
async function untilPast(
  players: Page[],
  code: string,
  phase: string,
  name: RegExp,
) {
  await expect
    .poll(
      async () => {
        const view = await viewOf(players[0], code);
        if (view.phase !== phase) return view.phase;
        for (const page of players) {
          const key = page.getByRole("button", { name }).first();
          if (await key.isEnabled().catch(() => false))
            await key.click({ timeout: 2_000 }).catch(() => {});
        }
        return view.phase;
      },
      { timeout: 90_000, intervals: [500] },
    )
    .not.toBe(phase);
}

test("bids, builds the boards, presents, votes and sees the final score", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser, true);
  const players = [host, guest];
  await host.goto("/en/new?game=lineup");
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").pop() as string;

  // one round, no break, no trades
  await host.getByRole("button", { name: /change the auction/i }).click();
  await host
    .getByRole("group", { name: /^rounds$/i })
    .getByRole("button", { name: "1" })
    .click();
  await host.getByRole("switch", { name: /break halfway/i }).click();
  await host.getByRole("switch", { name: /trades after/i }).click();
  await host.getByRole("button", { name: /^save$/i }).click();
  await expect(host.getByText(/1 round/i)).toBeVisible();

  await joinRoom(guest, code);
  await startMatch(host);

  // the host takes the first lot for a coin; nobody wants the rest
  const bid = host.getByRole("button", { name: /^bid 1$/i });
  await expect(bid).toBeEnabled({ timeout: 30_000 });
  await bid.click();
  const pass = guest.getByRole("button", { name: /^pass$/i });
  await expect(pass).toBeEnabled({ timeout: 10_000 });
  await pass.click();
  await expect
    .poll(
      async () =>
        Object.values((await viewOf(host, code)).lu?.hands ?? {}).flat().length,
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  await untilPast(players, code, "bidding", /^pass$/i);

  // everyone's board as it came, then each owner on stage
  await untilPast(players, code, "defending", /^done$/i);
  await untilPast(players, code, "presenting", /^done talking$/i);

  // each votes for the board in the middle (their own): a tie, both win
  await expect
    .poll(async () => (await viewOf(host, code)).phase, { timeout: 30_000 })
    .toBe("judging");
  for (const page of players) {
    const middle = page.locator('button[aria-current="true"]');
    await expect(middle).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/tap the board in the middle/i)).toBeVisible({
      timeout: 20_000,
    });
    await middle.click();
  }

  await expect(host.getByText(/champions together/i)).toBeVisible({
    timeout: 30_000,
  });
  await untilPast(players, code, "scoring", /^see the final score$/i);
  for (const page of players)
    await expect(page.getByText(/^final score$/i)).toBeVisible({
      timeout: 30_000,
    });
});
