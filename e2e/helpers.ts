import { type Browser, expect, type Page } from "@playwright/test";
import type { RoomView } from "@/game/types";

export const PHONE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};

/** A fresh browser context is a fresh guest. */
export async function newPlayer(browser: Browser, phone = false) {
  const ctx = await browser.newContext(phone ? PHONE : undefined);
  return ctx.newPage();
}

const button = (page: Page, name: RegExp) => page.getByRole("button", { name });

export async function createRoom(host: Page) {
  await host.goto("/en/who-am-i/new");
  await button(host, /^create room$/i).click();
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  return host.url().split("/").pop() as string;
}

export async function joinRoom(page: Page, code: string) {
  await page.goto(`/en/r/${code}`);
  await button(page, /i'm ready/i).click();
}

/** The room as this player is allowed to see it (same API the UI uses). */
export async function viewOf(page: Page, code: string): Promise<RoomView> {
  const res = await page.request.get(`/api/rooms/${code}`);
  expect(res.ok()).toBe(true);
  return res.json();
}

/** Every player votes; the first theme wins, then the result plays out before picking. */
export async function voteAll(players: Page[], option = 0) {
  for (const page of players) {
    const themes = page
      .getByRole("group", { name: /vote for the theme/i })
      .getByRole("button");
    await expect(themes).toHaveCount(3);
    await themes.nth(option).click();
    await expect(themes.nth(option)).toHaveAttribute("aria-pressed", "true");
  }
  for (const page of players)
    await expect(page.getByRole("heading", { name: /the theme is/i })).toBeVisible();
}

/** Every player creates a new character named "Hero <n>" for their target and confirms it. */
export async function pickAll(players: Page[]) {
  for (const [i, page] of players.entries()) {
    await page
      .getByRole("textbox")
      .first()
      .fill(`Hero ${i + 1}`);
    await button(page, /create “hero/i).click();
    await button(page, /save and pick/i).click();
    await button(page, /confirm pick/i).click();
  }
}

/** Polls until one of the pages shows the question box, or the match ends. */
async function nextAsker(players: Page[]) {
  for (let i = 0; i < 120; i++) {
    for (const page of players) {
      if (await button(page, /send question/i).isVisible()) return page;
      if (await button(page, /back to rooms/i).isVisible()) return null;
    }
    await players[0].waitForTimeout(250);
  }
  throw new Error("nobody got to ask");
}

/**
 * Plays turns until the podium: ask, everyone answers "Yes", then guess.
 * With `missFirst`, the first guess is wrong and the picker turns it down.
 */
export async function playToEnd(
  players: Page[],
  code: string,
  { missFirst = false } = {},
) {
  let missed = !missFirst;
  for (let round = 0; round < 30; round++) {
    const asker = await nextAsker(players);
    if (!asker) return;
    const others = players.filter((p) => p !== asker);

    await asker.getByRole("textbox").first().fill("Is it a person?");
    await button(asker, /send question/i).click();
    for (const page of others) {
      const send = button(page, /send answer/i);
      // players who are out of the match have nothing to answer
      const asked = await send
        .waitFor({ timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (!asked) continue;
      await button(page, /^yes$/i).click();
      await send.click();
    }

    await expect(button(asker, /take a guess/i)).toBeVisible({
      timeout: 20_000,
    });
    const askerId = (await viewOf(asker, code)).youId;
    const seenByOther = (await viewOf(others[0], code)).players.find(
      (p) => p.id === askerId,
    );
    const name = seenByOther?.card?.name;
    expect(name, "others see the asker's card").toBeTruthy();
    // ...but the asker never does
    await expect(asker.getByText(name as string)).toHaveCount(0);

    if (!missed) {
      missed = true;
      await asker.getByRole("textbox").first().fill("Nobody at all");
      await button(asker, /take a guess/i).click();
      const pickerId = seenByOther?.pickedById;
      const picker = await pageOf(others, code, pickerId);
      await button(picker, /not yet/i).click();
      continue;
    }
    await asker
      .getByRole("textbox")
      .first()
      .fill(name as string);
    await button(asker, /take a guess/i).click();
  }
  throw new Error("the match did not end");
}

async function pageOf(
  pages: Page[],
  code: string,
  id: string | null | undefined,
) {
  for (const page of pages)
    if ((await viewOf(page, code)).youId === id) return page;
  throw new Error(`no page for ${id}`);
}
