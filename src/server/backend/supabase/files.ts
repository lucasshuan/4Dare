import "server-only";
import { randomUUID } from "node:crypto";
import type { FileStore } from "../types";
import { serviceClient } from "./clients";

const EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Pictures go to the public buckets "characters" and "avatars". */
export function supabaseFiles(): FileStore {
  return {
    async put(folder, bytes, contentType) {
      const ext = EXT[contentType];
      if (!ext) throw new Error(`unsupported type ${contentType}`);
      const path = `${randomUUID()}.${ext}`;
      const bucket = serviceClient().storage.from(folder);
      const { error } = await bucket.upload(path, bytes, {
        contentType,
        upsert: false,
        cacheControl: "31536000",
      });
      if (error) throw error;
      return bucket.getPublicUrl(path).data.publicUrl;
    },
  };
}
