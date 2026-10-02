import { expect, test } from "@playwright/test";
import { createRoom, newPlayer } from "./helpers";

test("the hub leads to the game, and the language select keeps the page", async ({
  page,
}) => {
  await page.goto("/pt");
  await page.getByRole("link", { name: /quem sou eu\?/i }).click();
  await page.waitForURL(/\/pt\/who-am-i$/);
  await expect(page.getByRole("link", { name: "Criar sala" })).toBeVisible();
  await page.getByRole("combobox", { name: "Idioma" }).click();
  await page.getByRole("option", { name: "日本語" }).click();
  await page.waitForURL(/\/ja\/who-am-i$/);
  await expect(page.getByRole("link", { name: "ルームを作る" })).toBeVisible();
});

test("a public room shows up for someone else", async ({ browser }) => {
  const host = await newPlayer(browser);
  const visitor = await newPlayer(browser);
  const code = await createRoom(host);
  await visitor.goto("/en/who-am-i");
  const join = visitor.locator(`a[href$="/r/${code}"]`);
  await expect(join).toBeVisible({ timeout: 10_000 });
  await join.click();
  await visitor.waitForURL(new RegExp(`/r/${code}$`));
  await expect(
    visitor.getByRole("button", { name: /i'm ready/i }),
  ).toBeVisible();
});

test("signing in from the user menu (test account) lets you pick a name", async ({
  page,
}) => {
  await page.goto("/en");
  await page
    .locator("header")
    .getByRole("button", { expanded: false })
    .first()
    .click();
  await expect(page.getByText("You're playing as a guest")).toBeVisible();
  await page.getByRole("button", { name: /sign in with discord/i }).click();
  await page.waitForURL(/\/profile$/);
  await page.getByRole("textbox", { name: "Name" }).fill("Bia");
  await page.getByRole("button", { name: "Colour 3" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await page.goto("/en");
  const menu = page
    .locator("header")
    .getByRole("button", { expanded: false })
    .first();
  await expect(menu).toContainText("Bia");
  await menu.click();
  await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();
});
