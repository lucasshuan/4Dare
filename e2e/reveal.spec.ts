import { expect, type Page, test } from "@playwright/test";
import {
  createRoom,
  joinRoom,
  newPlayer,
  pickAll,
  startMatch,
  viewOf,
  voteAll,
} from "./helpers";

const button = (page: Page, name: RegExp) => page.getByRole("button", { name });

/** The page whose turn it is, once its question can go (the cast holds the first ask). */
async function asker(players: Page[], code: string) {
  for (let i = 0; i < 120; i++) {
    for (const page of players)
      if (await button(page, /send question/i).isVisible()) {
        const view = await viewOf(page, code);
        const wait = (view.stepStartsAt ?? 0) - view.serverNow;
        if (wait > 0) await page.waitForTimeout(wait + 100);
        return page;
      }
    await players[0].waitForTimeout(250);
  }
  throw new Error("nobody got to ask");
}

test("a letter typed over the answers reveal closes it and lands in the guess", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await joinRoom(guest, code);
  await startMatch(host);
  await voteAll([host, guest]);
  await pickAll([host, guest]);

  const me = await asker([host, guest], code);
  const other = me === host ? guest : host;
  await me
    .getByRole("textbox", { name: /yes-or-no question/i })
    .fill("Is it a person?");
  await button(me, /send question/i).click();
  await button(other, /^yes$/i).click();
  await button(other, /send answer/i).click();

  // the answers reveal is up, with the guess field focused under it
  const hint = me.getByText(/press any key to close/i);
  await expect(hint).toBeVisible({ timeout: 20_000 });
  const guess = me.getByRole("textbox", { name: /your guess/i });
  await expect(guess).toBeFocused();

  await me.keyboard.press("N");
  await expect(hint).toBeHidden();
  await expect(guess).toHaveValue("N");
});
