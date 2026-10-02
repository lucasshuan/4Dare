import "server-only";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FileStore } from "../types";
import { DATA_DIR } from "./disk";

export const UPLOADS_DIR = join(DATA_DIR, "uploads");

const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Uploads go to .data/uploads and are served by /api/files/... */
export function localFiles(): FileStore {
  return {
    async put(folder, bytes, contentType) {
      const ext = EXT[contentType];
      if (!ext) throw new Error(`unsupported type ${contentType}`);
      const dir = join(UPLOADS_DIR, folder);
      mkdirSync(dir, { recursive: true });
      const name = `${randomUUID()}.${ext}`;
      writeFileSync(join(dir, name), bytes);
      return `/api/files/${folder}/${name}`;
    },
  };
}
