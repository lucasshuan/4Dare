import { expect, test } from "@playwright/test";
import { newPlayer } from "./helpers";

test("a private room is listed with a lock and asks for its password", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);

  await host.goto("/en/new?game=who-am-i");
  await host.getByRole("textbox", { name: "Room name" }).fill("Pizza night");
  await host.getByRole("button", { name: "Private" }).click();
  // no password, no room
  await expect(
    host.getByRole("button", { name: /^create room$/i }),
  ).toBeDisabled();
  await host.getByRole("textbox", { name: "Password" }).fill("pizza");
  await host.getByRole("button", { name: /^create room$/i }).click();
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").pop() as string;
  // the host sees the password to share it
  await expect(host.getByText("pizza", { exact: true })).toBeVisible();

  // the game page links to every room of the game
  await guest.goto("/en/who-am-i");
  await guest.getByRole("link", { name: /see all/i }).click();
  await guest.waitForURL(/\/rooms\?game=who-am-i$/);
  await guest.getByRole("searchbox").fill("pizza");
  await expect(guest).toHaveURL(/q=pizza/);
  const row = guest.getByRole("listitem").filter({ hasText: "Pizza night" });
  await expect(row.getByText("Has a password")).toBeAttached();
  await row.getByRole("link", { name: /join/i }).click();

  await guest.waitForURL(new RegExp(`/r/${code}$`));
  const dialog = guest.getByRole("dialog");
  await dialog.getByLabel("Password").fill("pasta");
  await dialog.getByRole("button", { name: "Join" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Wrong password.");
  await dialog.getByLabel("Password").fill("pizza");
  await dialog.getByRole("button", { name: "Join" }).click();
  await expect(guest.getByRole("button", { name: /i'm ready/i })).toBeVisible();
  // the password stays with the host
  await expect(guest.getByText("pizza", { exact: true })).toHaveCount(0);
});
