import "server-only";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import type { FileStore } from "../types";
import { dataPath } from "./disk";

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
      mkdirSync(/* turbopackIgnore: true */ dataPath("uploads", folder), {
        recursive: true,
      });
      const name = `${randomUUID()}.${ext}`;
      writeFileSync(
        /* turbopackIgnore: true */ dataPath("uploads", folder, name),
        bytes,
      );
      return `/api/files/${folder}/${name}`;
    },
  };
}
