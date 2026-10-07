import { expect, type Page, test } from "@playwright/test";
import type { ImpQuestion } from "@/game/impostor/types";
import { joinRoom, newPlayer, startMatch, viewOf, voteAll } from "./helpers";

/**
 * Answers the open question with whatever the pad offers first, once the
 * pad opens (the step waits for the deal or the last answers' reveal).
 */
async function answer(page: Page, n: number, kind: ImpQuestion["kind"]) {
  await expect(
    page.getByText(new RegExp(`question ${n} of 2`, "i")),
  ).toBeVisible({ timeout: 20_000 });
  const send = page.getByRole("button", { name: /^answer$/i });
  if (kind === "word") {
    const field = page.getByRole("textbox", { name: /your answer/i });
    await expect(field).toBeEditable({ timeout: 20_000 });
    await field.fill("Brave");
  }
  const key =
    kind === "scale" || kind === "word"
      ? send
      : page.locator("div.grid button[aria-pressed]").first();
  await expect(key).toBeEnabled({ timeout: 20_000 });
  await key.click();
}

test("the crew answers, catches the impostor and sees both cards", async ({
  browser,
}) => {
  const players = [
    await newPlayer(browser),
    await newPlayer(browser),
    await newPlayer(browser),
  ];
  const [host, ...guests] = players;
  await host.goto("/en/new?game=impostor");
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").pop() as string;
  for (const page of guests) await joinRoom(page, code);
  await startMatch(host);
  await voteAll(players);

  // everyone holds a card; the impostor's is the one nobody else has, and
  // nobody's view shows anyone else's
  await expect
    .poll(async () => (await viewOf(host, code)).imp?.card?.name, {
      timeout: 20_000,
    })
    .toBeTruthy();
  const views = await Promise.all(players.map((p) => viewOf(p, code)));
  const names = views.map((v) => v.imp?.card?.name);
  const odd = names.findIndex((n) => names.filter((m) => m === n).length === 1);
  expect(odd).toBeGreaterThanOrEqual(0);
  const impostor = players[odd];
  const crew = players.filter((p) => p !== impostor);
  for (const v of views)
    expect(v.players.every((p) => p.card === null)).toBe(true);

  // two questions before the first vote, everyone answering each
  for (let q = 0; q < 2; q++) {
    await expect
      .poll(async () => (await viewOf(host, code)).imp?.asked.length, {
        timeout: 20_000,
      })
      .toBe(q + 1);
    const kind = (await viewOf(host, code)).imp?.asked[q].question.kind;
    for (const page of players) await answer(page, q + 1, kind ?? "pick");
  }

  // the crew votes for the impostor; the impostor for someone in the crew
  const nameOf = (page: Page) =>
    views[players.indexOf(page)].players.find((p) => p.isYou)?.name ?? "";
  for (const page of players) {
    const targetName = nameOf(page === impostor ? crew[0] : impostor);
    await expect(page.getByText(/who's the impostor/i)).toBeVisible({
      timeout: 20_000,
    });
    // the tiles open once the answers' reveal is over
    const tile = page
      .getByRole("listitem")
      .filter({ hasText: targetName })
      .getByRole("button")
      .first();
    await expect(tile).toBeEnabled({ timeout: 20_000 });
    await tile.click();
    await page.getByRole("button", { name: /^vote for/i }).click();
  }

  // the caught impostor's last chance, kept secret until the end
  await expect(impostor.getByText(/you were the impostor/i)).toBeVisible({
    timeout: 30_000,
  });
  const field = impostor.getByRole("combobox");
  await expect(field).toBeEditable({ timeout: 15_000 });
  await field.fill("Nobody at all");
  await impostor.getByRole("button", { name: /send guess/i }).click();

  for (const page of players)
    await expect(page.getByText(/the crew won/i)).toBeVisible({
      timeout: 30_000,
    });
  await expect(host.getByText(names[odd] as string).first()).toBeVisible();
  await expect(host.getByText(/guessed Nobody at all/i)).toBeVisible();
});
