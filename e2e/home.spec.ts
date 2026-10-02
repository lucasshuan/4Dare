import { expect, test } from "@playwright/test";
import { createRoom, newPlayer } from "./helpers";

test("language switch keeps you on the same page", async ({ page }) => {
  await page.goto("/pt");
  await expect(page.getByRole("link", { name: "Criar sala" })).toBeVisible();
  await page.getByRole("button", { name: "日本語" }).click();
  await page.waitForURL(/\/ja$/);
  await expect(page.getByRole("link", { name: "ルームを作る" })).toBeVisible();
});

test("a public room shows up on someone else's home", async ({ browser }) => {
  const host = await newPlayer(browser);
  const visitor = await newPlayer(browser);
  const code = await createRoom(host);
  await visitor.goto("/en");
  const join = visitor.locator(`a[href$="/r/${code}"]`);
  await expect(join).toBeVisible({ timeout: 10_000 });
  await join.click();
  await visitor.waitForURL(new RegExp(`/r/${code}$`));
  await expect(
    visitor.getByRole("button", { name: /i'm ready/i }),
  ).toBeVisible();
});

test("signing in (test account) lets you pick a name", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: /sign in with discord/i }).click();
  await page.waitForURL(/\/profile$/);
  await page.getByRole("textbox", { name: "Name" }).fill("Bia");
  await page.getByRole("button", { name: "Colour 3" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await page.goto("/en");
  await expect(page.getByText("Bia", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();
});
