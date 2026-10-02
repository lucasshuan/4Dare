import { expect, test } from "@playwright/test";
import { joinRoom, newPlayer } from "./helpers";

test("the host types the theme, and the next room starts the same way", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  await host.goto("/en/new?game=who-am-i");
  await host.getByRole("button", { name: /i type it/i }).click();
  await host.getByRole("button", { name: /^create room$/i }).click();
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").pop() as string;
  await expect(host.getByText(/the host types the theme/i)).toBeVisible();
  await joinRoom(guest, code);
  await host.getByRole("button", { name: /start match/i }).click();

  await expect(
    guest.getByRole("heading", { name: /is choosing the theme/i }),
  ).toBeVisible();
  await host
    .getByRole("textbox", { name: /theme of the match/i })
    .fill("Space pirates");
  await host.getByRole("button", { name: /use this theme/i }).click();
  for (const page of [host, guest]) {
    await expect(
      page.getByRole("heading", { name: /the theme is/i }),
    ).toBeVisible();
    await expect(page.getByText("Space pirates").first()).toBeVisible();
  }

  // a typed theme has no past picks, so no "Random" button
  await expect(guest.getByRole("textbox").first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(guest.getByRole("button", { name: /^random$/i })).toHaveCount(0);

  await host.goto("/en/new?game=who-am-i");
  await expect(
    host.getByRole("button", { name: /i type it/i }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("the vote only offers themes from the sets turned on", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  await host.goto("/en/new?game=who-am-i");
  await host.getByRole("button", { name: /turn all off/i }).click();
  const create = host.getByRole("button", { name: /^create room$/i });
  await expect(create).toBeDisabled();
  await host.getByRole("button", { name: /^sports$/i }).click();
  await create.click();
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").pop() as string;
  await joinRoom(guest, code);
  await host.getByRole("button", { name: /start match/i }).click();

  const themes = guest
    .getByRole("group", { name: /vote for the theme/i })
    .getByRole("button");
  await expect(themes).toHaveCount(3);
  for (let i = 0; i < 3; i++)
    await expect(themes.nth(i)).toContainText(/sports/i);
});
