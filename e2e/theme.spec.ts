import { expect, test } from "@playwright/test";
import { createRoom, editSettings, joinRoom, newPlayer } from "./helpers";

test("the host types the theme, and the next room starts the same way", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  await createRoom(host);
  await editSettings(host, async () => {
    await host.getByRole("tab", { name: /themes/i }).click();
    await host.getByRole("button", { name: /i type it/i }).click();
  });
  await expect(host.getByText(/the host types the theme/i)).toBeVisible();
  // the next room starts the same way
  const code = await createRoom(host);
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
});

test("the vote only offers themes from the sets turned on", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await editSettings(host, async () => {
    await host.getByRole("tab", { name: /themes/i }).click();
    await host.getByRole("button", { name: /turn all off/i }).click();
    await expect(host.getByRole("button", { name: /^save$/i })).toBeDisabled();
    await host.getByRole("button", { name: /^sports$/i }).click();
  });
  await joinRoom(guest, code);
  await host.getByRole("button", { name: /start match/i }).click();

  const themes = guest
    .getByRole("group", { name: /vote for the theme/i })
    .getByRole("button");
  await expect(themes).toHaveCount(3);
  for (let i = 0; i < 3; i++)
    await expect(themes.nth(i)).toContainText(/sports/i);
});
