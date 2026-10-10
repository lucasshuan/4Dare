const IMAGE_TYPES: Record<string, string> = {
  apng: "image/apng",
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/x-icon",
  jfif: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  jxl: "image/jxl",
  pjpeg: "image/jpeg",
  pjp: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

/** Include extensions explicitly when the system does not recognize their MIME. */
export const IMAGE_ACCEPT = [
  "image/*",
  ...Object.keys(IMAGE_TYPES).map((extension) => `.${extension}`),
].join(",");

/** File metadata can omit an image's MIME. Decoding still verifies its contents. */
export function imageMime(file: Pick<File, "name" | "type">): string | null {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return type;
  if (type && type !== "application/octet-stream") return null;
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  return extension && Object.hasOwn(IMAGE_TYPES, extension)
    ? IMAGE_TYPES[extension]
    : null;
}
