import { useSyncExternalStore } from "react";

/** What the modal shows: whose profile, and optionally a tab first or the editor. */
export interface OpenProfile {
  handle: string;
  tab?: string;
  edit?: boolean;
}

/**
 * Which profile the modal shows (null: none). A modal needs no address of its
 * own: a link to a profile sets this and the host (profile-modal-host) opens it.
 */
let open: OpenProfile | null = null;
const listeners = new Set<() => void>();

const set = (next: OpenProfile | null) => {
  open = next;
  for (const l of listeners) l();
};

export const openProfile = (
  handle: string,
  opts?: Omit<OpenProfile, "handle">,
) => set({ handle, ...opts });
export const closeProfile = () => set(null);

export function useOpenProfile() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => null,
  );
}
