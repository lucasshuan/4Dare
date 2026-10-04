import {
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from "@playwright/test";
import type { RoomView } from "@/game/types";

export const PHONE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};

/** Players' contexts, by the test that opened them. */
const opened: { testId: string; ctx: BrowserContext }[] = [];

/**
 * A fresh browser context is a fresh guest. The players of earlier tests are
 * closed first: their pages would keep polling the server for the rest of the run.
 */
export async function newPlayer(browser: Browser, phone = false) {
  const testId = test.info().testId;
  for (const old of opened.filter((o) => o.testId !== testId)) {
    opened.splice(opened.indexOf(old), 1);
    await old.ctx.close().catch(() => {});
  }
  const ctx = await browser.newContext(phone ? PHONE : undefined);
  opened.push({ testId, ctx });
  return ctx.newPage();
}

const button = (page: Page, name: RegExp) => page.getByRole("button", { name });

/** /new opens the room right away, with the last setup. */
export async function createRoom(host: Page) {
  await host.goto("/en/new?game=who-am-i");
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  return host.url().split("/").pop() as string;
}

/** The host opens "Edit settings" in the lobby, makes `change` and saves. */
export async function editSettings(host: Page, change: () => Promise<void>) {
  await button(host, /edit settings/i).click();
  await change();
  await button(host, /^save$/i).click();
  await expect(button(host, /edit settings/i)).toBeVisible();
}

export async function joinRoom(page: Page, code: string) {
  await page.goto(`/en/r/${code}`);
  await button(page, /i'm ready/i).click();
}

/**
 * The host starts once the lobby shows everyone ready, so the "start
 * anyway?" question never comes up.
 */
export async function startMatch(host: Page) {
  await expect(
    host.getByRole("img", { name: /^ready$/i }).first(),
  ).toBeVisible();
  await expect(host.getByRole("img", { name: /^not ready/i })).toHaveCount(0);
  await button(host, /start match/i).click();
}

/** The room as this player is allowed to see it (same API the UI uses). */
export async function viewOf(page: Page, code: string): Promise<RoomView> {
  const res = await page.request.get(`/api/rooms/${code}`);
  expect(res.ok()).toBe(true);
  return res.json();
}

/**
 * Every player votes at once (the vote is short); the first theme wins, then
 * the theme show plays before picking. The opening plays first: wait for the
 * cards, never for text that lives in a single beat of a show.
 */
export async function voteAll(players: Page[], option = 0) {
  await Promise.all(
    players.map(async (page) => {
      const themes = page
        .getByRole("group", { name: /vote for the theme/i })
        .getByRole("button");
      await expect(themes).toHaveCount(3, { timeout: 15_000 });
      for (let i = 0; i < 3; i++)
        await expect(themes.nth(i)).toBeEnabled({ timeout: 15_000 });
      await themes.nth(option).click();
    }),
  );
}

/** Every player creates a new character named "Hero <n>" for their target and confirms it. */
export async function pickAll(players: Page[]) {
  for (const [i, page] of players.entries()) {
    // the theme show plays before the pick table
    const field = page.getByRole("textbox", { name: /character for/i });
    await expect(field).toBeVisible({ timeout: 20_000 });
    await field.fill(`Hero ${i + 1}`);
    await button(page, /create “hero/i).click();
    await button(page, /save and pick/i).click();
    await button(page, /confirm pick/i).click();
  }
}

/**
 * Polls until one of the pages shows the question box, or the match ends.
 * The first turn's clock waits for the cast show: a question sent before it
 * starts is refused, so this also waits for that.
 */
async function nextAsker(players: Page[], code: string) {
  for (let i = 0; i < 120; i++) {
    for (const page of players) {
      if (await button(page, /send question/i).isVisible()) {
        const view = await viewOf(page, code);
        const wait = (view.stepStartsAt ?? 0) - view.serverNow;
        if (wait > 0) await page.waitForTimeout(wait + 100);
        return page;
      }
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
    const asker = await nextAsker(players, code);
    if (!asker) return;
    const others = players.filter((p) => p !== asker);

    await asker
      .getByRole("textbox", { name: /yes-or-no question/i })
      .fill("Is it a person?");
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

    const guessField = asker.getByRole("textbox", { name: /your guess/i });
    if (!missed) {
      missed = true;
      await guessField.fill("Nobody at all");
      await button(asker, /take a guess/i).click();
      const pickerId = seenByOther?.pickedById;
      const picker = await pageOf(others, code, pickerId);
      await button(picker, /not yet/i).click();
      continue;
    }
    await guessField.fill(name as string);
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
