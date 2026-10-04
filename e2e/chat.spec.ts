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

/** The chat's head: "Open chat" / "Fold chat", plus ", 2 new messages" when there are some. */
const head = (page: Page) =>
  page
    .locator("[data-chat]")
    .getByRole("button", { name: /^(open|fold) chat/i });
const field = (page: Page) => page.getByRole("textbox", { name: /^message$/i });
const log = (page: Page) => page.getByRole("log", { name: /messages/i });

/** Local mode polls the chat every 1.5 s. */
const ARRIVES = { timeout: 10_000 };

test("two players chat in the lobby: unread count, open and fold, limits, match started", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await joinRoom(guest, code);

  // folded: no stray textbox, nothing new
  await expect(head(host)).toHaveAttribute("aria-expanded", "false");
  await expect(head(host)).toHaveAccessibleName(/^open chat$/i);
  await expect(field(host)).toHaveCount(0);

  // opening on desktop focuses the field; send waits for text
  await head(host).click();
  await expect(head(host)).toHaveAttribute("aria-expanded", "true");
  await expect(field(host)).toBeFocused();
  await expect(button(host, /^send$/i)).toBeDisabled();

  // Enter sends, the field empties and keeps the focus
  await field(host).fill("hello from the host");
  await field(host).press("Enter");
  await expect(field(host)).toHaveValue("");
  await expect(field(host)).toBeFocused();
  await expect(log(host).getByText("hello from the host")).toBeVisible();

  // 280 characters at most
  await expect(field(host)).toHaveAttribute("maxlength", "280");
  await field(host).pressSequentially("y".repeat(285));
  await expect(field(host)).toHaveValue("y".repeat(280));
  await field(host).fill("");

  // the guest gets it folded: counted, and the tab names it
  await expect(head(guest)).toHaveAccessibleName(/1 new message/i, ARRIVES);
  await expect(field(guest)).toHaveCount(0);

  // opening reads it; Escape folds and the body goes
  await head(guest).click();
  await expect(log(guest).getByText("hello from the host")).toBeVisible();
  await expect(head(guest)).toHaveAccessibleName(/^fold chat$/i);
  await field(guest).press("Escape");
  await expect(head(guest)).toHaveAttribute("aria-expanded", "false");
  await expect(head(guest)).toBeFocused();
  await expect(field(guest)).toHaveCount(0);
  await expect(head(guest)).toHaveAccessibleName(/^open chat$/i);

  // your own lines never count
  await head(host).click();
  await expect(field(host)).toHaveCount(0);
  await expect(head(host)).toHaveAccessibleName(/^open chat$/i);

  // the match starts: the chat stays, with the system line
  await startMatch(host);
  await head(host).click();
  await expect(log(host).getByText("▶ Match started")).toBeVisible({
    timeout: 15_000,
  });
  // system lines never count
  await expect(head(guest)).toHaveAccessibleName(/^open chat$/i);
});

test("the phone bar shows the last line and opens without the keyboard", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const host = await newPlayer(browser);
  const phone = await newPlayer(browser, true);
  const code = await createRoom(host);
  await joinRoom(phone, code);

  await expect(head(phone)).toContainText(/room chat/i);
  await head(host).click();
  await field(host).fill("on my way");
  await field(host).press("Enter");

  await expect(head(phone)).toHaveAccessibleName(/1 new message/i, ARRIVES);
  await expect(head(phone)).toContainText("on my way");

  // a tap opens it without focusing the field (the keyboard would jump up)
  await head(phone).tap();
  await expect(field(phone)).toBeVisible();
  await expect(field(phone)).not.toBeFocused();
  await expect(log(phone).getByText("on my way")).toBeVisible();
  await field(phone).fill("coming");
  await button(phone, /^send$/i).tap();
  await expect(log(phone).getByText("coming")).toBeVisible();

  await head(phone).tap();
  await expect(field(phone)).toHaveCount(0);
  await expect(head(phone)).toContainText(/you: coming/i);
});

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

test("a key typed in the chat leaves the answers reveal up", async ({
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

  const hint = me.getByText(/press any key to close/i);
  await expect(hint).toBeVisible({ timeout: 20_000 });

  // the chat sits over the reveal and keeps its keys
  await head(me).click();
  await expect(field(me)).toBeFocused();
  await me.keyboard.press("N");
  await expect(field(me)).toHaveValue("N");
  await expect(hint).toBeVisible();
  await expect(me.getByRole("textbox", { name: /your guess/i })).toHaveValue(
    "",
  );
});
