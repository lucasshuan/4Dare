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

async function startCreating(page: Page, name: string) {
  await page.getByRole("textbox").first().fill(name);
  await page.getByRole("button", { name: /create “/i }).click();
  await expect(
    page.getByRole("button", { name: /choose a picture/i }),
  ).toBeVisible();
}

/** Saves the new character and confirms it, as soon as the crop shows up. */
async function saveAndConfirm(page: Page) {
  await expect(page.getByLabel("Zoom")).toBeVisible();
  await page.getByRole("button", { name: /save and pick/i }).click();
  await page.getByRole("button", { name: /confirm pick/i }).click();
}

test("a picture pasted or picked right before saving goes with the character", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const host = await newPlayer(browser);
  const guest = await newPlayer(browser);
  const code = await createRoom(host);
  await joinRoom(guest, code);
  await startMatch(host);
  await voteAll([host, guest]);

  // pasted (as copied from a web page), then saved at once
  await startCreating(host, "Pasted");
  const png = (await drawPicture(host, "image/png")).toString("base64");
  await host.evaluate(async (png) => {
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], "image.png", { type: "image/png" }));
    document.body.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true }),
    );
  }, png);
  await saveAndConfirm(host);

  // a .jfif file the system gives no type
  await startCreating(guest, "Jfif");
  await guest.locator("input[type=file]").setInputFiles({
    name: "photo.jfif",
    mimeType: "",
    buffer: await drawPicture(guest, "image/jpeg"),
  });
  await saveAndConfirm(guest);

  for (const page of [host, guest]) {
    await expect
      .poll(async () => {
        const other = (await viewOf(page, code)).players.find((p) => !p.isYou);
        return other?.card?.imageUrl ?? null;
      })
      .not.toBeNull();
  }
});
