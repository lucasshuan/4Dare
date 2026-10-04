import { expect, test } from "@playwright/test";
import {
  createRoom,
  editSettings,
  joinRoom,
  newPlayer,
  startMatch,
} from "./helpers";

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
  await startMatch(host);

  await expect(
    guest.getByRole("heading", { name: /is choosing the theme/i }),
  ).toBeVisible();
  await host
    .getByRole("textbox", { name: /theme of the match/i })
    .fill("Space pirates");
  await host.getByRole("button", { name: /use this theme/i }).click();
  // the theme show plays first; the theme stays in sight after it (header tag)
  for (const page of [host, guest])
    await expect(page.getByText("Space pirates").first()).toBeVisible({
      timeout: 15_000,
    });

  // a typed theme has no past picks, so no "Random" button
  for (const page of [host, guest])
    await expect(
      page.getByRole("combobox", { name: /character for/i }),
    ).toBeVisible({ timeout: 20_000 });
  await expect(guest.getByText("Space pirates").first()).toBeVisible();
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
  await startMatch(host);

  // the opening plays before the vote
  const themes = guest
    .getByRole("group", { name: /vote for the theme/i })
    .getByRole("button");
  await expect(themes).toHaveCount(3, { timeout: 15_000 });
  for (let i = 0; i < 3; i++)
    await expect(themes.nth(i)).toContainText(/sports/i);
});
