import { expect, type Page, test } from "@playwright/test";

async function takePicture(
  page: Page,
  base64: string,
  method: "browse" | "drop" | "paste",
  type: string,
) {
  await page.evaluate(
    ({ base64, method, type }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const data = new DataTransfer();
      data.items.add(new File([bytes], "portrait.WEBP", { type }));
      const input = document.querySelector<HTMLInputElement>(
        '[role="dialog"] input[type="file"]',
      );
      if (!input) throw new Error("Missing picture input");
      if (method === "browse") {
        input.files = data.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (method === "drop") {
        document
          .querySelector(`label[for="${input.id}"]`)
          ?.dispatchEvent(
            new DragEvent("drop", { dataTransfer: data, bubbles: true }),
          );
      } else {
        document.body.dispatchEvent(
          new ClipboardEvent("paste", { clipboardData: data, bubbles: true }),
        );
      }
    },
    { base64, method, type },
  );
}

test("WebP works with missing or generic MIME when browsed, dropped or pasted", async ({
  page,
}) => {
  await page.goto("/en/characters", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "New character", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign in with Discord" }).click();
  await page.waitForURL(/\/profile/);
  await page.goto("/en/characters", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "New character", exact: true })
    .click();
  const dialog = page.getByRole("dialog");

  // An extension alone must never bypass the browser's content check.
  await takePicture(
    page,
    Buffer.from("not an image").toString("base64"),
    "browse",
    "",
  );
  await expect(dialog.getByRole("alert")).toHaveText(
    "That file isn't a picture.",
  );

  const webp = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 200;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas context");
    context.fillStyle = "#e85d75";
    context.fillRect(0, 0, 300, 200);
    return canvas.toDataURL("image/webp").split(",")[1];
  });
  for (const method of ["browse", "drop", "paste"] as const) {
    for (const type of ["image/webp", "", "application/octet-stream"]) {
      await takePicture(page, webp, method, type);
      await expect(dialog.getByLabel("Zoom")).toBeVisible();
      await expect(dialog.getByRole("alert")).toHaveCount(0);
      await expect
        .poll(() =>
          dialog
            .locator("img.reactEasyCrop_Image")
            .evaluate((img) => (img as HTMLImageElement).naturalWidth),
        )
        .toBe(300);
      await dialog
        .getByRole("button", { name: "Choose another", exact: true })
        .click();
      await expect(dialog.locator('input[type="file"]')).toHaveCount(1);
    }
  }
});
