import "server-only";
import { randomUUID } from "node:crypto";
import { uploadedPath } from "../../images";
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
    async remove(url) {
      const path = uploadedPath(url);
      if (!path) return;
      const [folder, name] = path.split("/");
      const { error } = await serviceClient()
        .storage.from(folder)
        .remove([name]);
      if (error) throw error;
    },
  };
}
