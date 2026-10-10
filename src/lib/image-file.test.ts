import { describe, expect, it } from "vitest";
import { IMAGE_ACCEPT, imageMime } from "./image-file";

describe("image file MIME", () => {
  it.each(["", "application/octet-stream", "image/webp"])(
    "recognizes WebP with MIME %j",
    (type) => {
      expect(imageMime({ name: "portrait.WEBP", type })).toBe("image/webp");
    },
  );

  it("keeps browser-recognized image formats and extension fallbacks", () => {
    expect(imageMime({ name: "picture", type: "image/avif" })).toBe(
      "image/avif",
    );
    expect(imageMime({ name: "picture.jfif", type: "" })).toBe("image/jpeg");
    expect(imageMime({ name: "picture.png", type: "" })).toBe("image/png");
  });

  it.each([
    ["apng", "image/apng"],
    ["tif", "image/tiff"],
    ["tiff", "image/tiff"],
    ["heic", "image/heic"],
    ["heif", "image/heif"],
    ["jxl", "image/jxl"],
  ])(
    "recognizes .%s with generic MIME and exposes it in the picker",
    (extension, mime) => {
      expect(
        imageMime({
          name: `picture.${extension.toUpperCase()}`,
          type: "application/octet-stream",
        }),
      ).toBe(mime);
      expect(IMAGE_ACCEPT.split(",")).toContain(`.${extension}`);
    },
  );

  it("rejects non-images and explicit non-image MIME types", () => {
    expect(imageMime({ name: "notes.txt", type: "" })).toBeNull();
    expect(
      imageMime({ name: "notes.txt", type: "application/octet-stream" }),
    ).toBeNull();
    expect(imageMime({ name: "picture.webp", type: "text/plain" })).toBeNull();
  });
});
