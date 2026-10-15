"use client";

import { useSyncExternalStore } from "react";
import { useMe } from "@/features/data/use-me";
import { adminHome } from "@/lib/hosts";
import { can } from "@/lib/roles";
import { useAdminCounts } from "./use-admin-counts";

const noChange = () => () => {};

/**
 * The way into the control panel from the site, for the admin only:
 * admin.4dare.com on the real site, /admin on a dev server or a preview.
 * `waiting` is what waits on them (player pictures and the Workshop's queue).
 */
export function useAdminLink() {
  const { me } = useMe();
  const admin = can(me, "admin");
  const { data } = useAdminCounts(admin);
  const href = useSyncExternalStore(
    noChange,
    () => adminHome(window.location.host),
    () => "/admin",
  );
  return admin ? { href, waiting: data?.waiting ?? 0 } : null;
}
