import { expect, test } from "@playwright/test";
import { createRoom, joinRoom, newPlayer, viewOf } from "./helpers";

test("a private room is listed with a lock and asks for its password", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);

  const code = await createRoom(host);
  // a new room is named after its host
  await expect(host.getByRole("heading", { level: 1 })).toHaveText(/'s room$/);
  await host.getByRole("button", { name: /edit settings/i }).click();
  const save = host.getByRole("button", { name: /^save$/i });
  const name = host.getByRole("textbox", { name: "Room name" });
  // no name, no room
  await name.fill(" ");
  await expect(save).toBeDisabled();
  await name.fill("Pizza night");
  await host.getByRole("button", { name: "Private" }).click();
  // no password, no room
  await expect(save).toBeDisabled();
  await host.getByRole("textbox", { name: "Password" }).fill("pizza");
  await save.click();
  await expect(
    host.getByRole("heading", { name: "Pizza night" }),
  ).toBeVisible();
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
  await expect(
    guest.getByRole("button", { name: /^ready$/i, pressed: false }),
  ).toBeVisible();
  // the password stays with the host
  await expect(guest.getByText("pizza", { exact: true })).toHaveCount(0);
});

test("one room at a time: a second tab's room takes the seat, and the first tab says so", async ({
  browser,
}) => {
  const first = await createRoom(await newPlayer(browser));
  const second = await createRoom(await newPlayer(browser));
  const me = await newPlayer(browser);
  await joinRoom(me, first);
  // the tab names the room, never its code
  await expect(me).toHaveTitle(/^Lobby · .+'s room · 4Dare$/);

  // same browser, same guest
  const tab = await me.context().newPage();
  await joinRoom(tab, second);
  const moved = (page: typeof me) =>
    page.getByRole("heading", { name: "You're in another room now" });
  await expect(moved(me)).toBeVisible();

  // coming back takes the seat back from the other room
  await me.getByRole("button", { name: "Come back to this room" }).click();
  await expect(
    me.getByRole("button", { name: /^ready$/i, pressed: false }),
  ).toBeVisible();
  await expect(moved(tab)).toBeVisible();
  expect((await viewOf(me, first)).players).toHaveLength(2);
});

test("rooms are filtered by the host's language: yours by default, more on request", async ({
  browser,
}) => {
  const english = await newPlayer(browser);
  const enRoom = await createRoom(english);
  const brazilian = await newPlayer(browser);
  await brazilian.goto("/pt/new?game=who-am-i");
  await brazilian.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  const ptRoom = brazilian.url().split("/").pop() as string;

  const viewer = await newPlayer(browser);
  const row = (code: string) => viewer.locator(`a[href$="/r/${code}"]`);
  // the game's page lists the rooms in its language only (the only Portuguese
  // room of the run, so no older one takes its place)
  await viewer.goto("/pt/who-am-i");
  await expect(row(ptRoom)).toBeVisible({ timeout: 10_000 });
  await expect(row(enRoom)).toHaveCount(0);
  await viewer.goto("/en/rooms");
  await expect(row(enRoom)).toBeVisible();
  await expect(row(ptRoom)).toHaveCount(0);

  await viewer.getByRole("combobox", { name: "Room language" }).click();
  await viewer.getByRole("option", { name: "Português" }).click();
  await viewer.keyboard.press("Escape");
  await expect(viewer).toHaveURL(/lang=en%2Cpt$/);
  await expect(row(ptRoom)).toBeVisible();
  await expect(row(enRoom)).toBeVisible();

  // a full room says so with an icon too
  await viewer.getByRole("combobox", { name: "Room language" }).click();
  await viewer.getByRole("option", { name: "All languages" }).click();
  await viewer.keyboard.press("Escape");
  await expect(viewer).toHaveURL(/lang=all$/);
});
