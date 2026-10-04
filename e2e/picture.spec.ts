import { expect, type Page, test } from "@playwright/test";
import {
  createRoom,
  joinRoom,
  newPlayer,
  startMatch,
  viewOf,
  voteAll,
} from "./helpers";

/** A small picture drawn in the page, as the bytes of `type`. */
async function drawPicture(page: Page, type: string) {
  const data = await page.evaluate(async (type) => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#e85d75";
    ctx.fillRect(0, 0, 300, 200);
    return canvas.toDataURL(type).split(",")[1];
  }, type);
  return Buffer.from(data, "base64");
}

/** Types a name no character has, so the card turns into a new one ("New!"). */
async function typeNewName(page: Page, name: string) {
  const field = page.getByRole("combobox", { name: /character for/i });
  await expect(field).toBeVisible({ timeout: 20_000 });
  await expect(field).toBeEditable();
  await field.fill(name);
  await expect(page.getByText("New!", { exact: true })).toBeVisible();
}

/**
 * Confirms once the picture is on the server's copy of the card: the upload
 * keeps it on the draft, and Confirm takes a new name's picture from there
 * (Confirm stays disabled while the picture uploads).
 */
async function confirmWithPicture(page: Page, code: string) {
  await expect(page.getByLabel("Zoom")).toBeVisible();
  await expect
    .poll(async () => (await viewOf(page, code)).pick?.draft?.imageUrl ?? null)
    .not.toBeNull();
  const confirm = page.getByRole("button", { name: /^confirm$/i });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(confirm).toBeDisabled();
}

test("a picture pasted or browsed onto the card goes with the new character", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await joinRoom(guest, code);
  await startMatch(host);
  await voteAll([host, guest]);
  const run = Date.now().toString(36).slice(-5);

  // pasted (as copied from a web page) anywhere on the page: it lands on the card
  await typeNewName(host, `Zqxj Pasted ${run}`);
  const png = (await drawPicture(host, "image/png")).toString("base64");
  await host.evaluate(async (png) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "image.png", { type: "image/png" }));
    document.body.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true }),
    );
  }, png);
  await confirmWithPicture(host, code);

  // dropped on the card: a .jfif file the system gives no type
  await typeNewName(guest, `Zqxj Jfif ${run}`);
  const jpeg = (await drawPicture(guest, "image/jpeg")).toString("base64");
  await guest.evaluate(async (jpeg) => {
    const bytes = Uint8Array.from(atob(jpeg), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "photo.jfif", { type: "" }));
    // the card's picture is the drop target
    const card = document.querySelector("[data-pick-card]") as HTMLElement;
    const zone = card.firstElementChild as HTMLElement;
    for (const type of ["dragenter", "dragover", "drop"])
      zone.dispatchEvent(
        new DragEvent(type, { dataTransfer: data, bubbles: true }),
      );
  }, jpeg);
  await confirmWithPicture(guest, code);

  for (const page of [host, guest]) {
    await expect
      .poll(async () => {
        const other = (await viewOf(page, code)).players.find((p) => !p.isYou);
        return other?.card?.imageUrl ?? null;
      })
      .not.toBeNull();
  }
});
