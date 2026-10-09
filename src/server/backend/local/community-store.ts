import "server-only";
import type { CommunityStore } from "../community-types";

/** Local mode keeps no rankings or feed: the pages show their empty states. */
export function localCommunityStore(): CommunityStore {
  return {
    async ranking() {
      return [];
    },
    async place() {
      return null;
    },
    async feed() {
      return [];
    },
    async contributors() {
      return [];
    },
    async players() {
      return [];
    },
    async coPlayers() {
      return new Map();
    },
    async seated() {
      return new Map();
    },
    async mine() {
      return { pictures: 0, aliases: 0, suggestions: 0 };
    },
  };
}
