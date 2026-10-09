import { useSyncExternalStore } from "react";

/**
 * Which profile the modal shows (null: none). A modal needs no address of its
 * own: a link to a profile sets this and the host (profile-modal-host) opens it.
 */
let open: string | null = null;
const listeners = new Set<() => void>();

const set = (handle: string | null) => {
  open = handle;
  for (const l of listeners) l();
};

export const openProfile = (handle: string) => set(handle);
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
