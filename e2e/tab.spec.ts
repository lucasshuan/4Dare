import { expect, type Page, test } from "@playwright/test";
import { createRoom, joinRoom, newPlayer } from "./helpers";

/** Pretends the player switched to another tab (or came back) and tells the page. */
async function setAway(page: Page, away: boolean) {
  await page.evaluate((hidden) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    Object.defineProperty(document, "hasFocus", {
      configurable: true,
      value: () => !hidden,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, away);
}

const iconHrefs = (page: Page) =>
  page.$$eval('link[rel~="icon"]', (links) =>
    links.map((l) => l.getAttribute("href") ?? ""),
  );

test("the tab title follows the page and its clock; the icon calls you back", async ({
  browser,
}) => {
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);

  await host.goto("/en");
  await expect(host).toHaveTitle("4Dare: guessing games to play with friends");
  await host.goto("/en/who-am-i");
  await expect(host).toHaveTitle("Who am I? Play online with friends · 4Dare");

  // alone there is no clock; once someone joins, it counts down in the title
  const code = await createRoom(host);
  await expect(host).toHaveTitle(`Lobby · ${code} · 4Dare`);
  await joinRoom(guest, code);
  await expect(host).toHaveTitle(
    new RegExp(`^\\d:\\d\\d · Lobby · ${code} · 4Dare$`),
  );

  // the guest wanders off; the match starts and the theme vote waits on them
  await setAway(guest, true);
  await host.getByRole("button", { name: /start match/i }).click();
  await expect(guest).toHaveTitle(/^\d:\d\d · Vote for a theme! · 4Dare$/);
  await expect
    .poll(async () =>
      (await iconHrefs(guest)).every((h) => h.startsWith("data:")),
    )
    .toBe(true);

  // back on the tab: the usual icons come back
  await setAway(guest, false);
  await expect
    .poll(async () =>
      (await iconHrefs(guest)).some((h) => h.startsWith("data:")),
    )
    .toBe(false);
});
