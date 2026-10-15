"use client";

import { useEffect } from "react";
import { useMe } from "@/features/data/use-me";
import { setViewerAdmin } from "@/game/games";
import { setSiteTunes, type Tunes } from "@/game/tune";
import { can } from "@/lib/roles";

/**
 * Puts the panel's values in force in the browser (the layout reads them on
 * the server), before anything below renders, and tells the menus whether the
 * person is the admin (who also sees the games in test).
 */
export function SiteTunes({ tunes }: { tunes: Tunes }) {
  setSiteTunes(tunes);
  const { me } = useMe();
  const admin = can(me, "admin");
  useEffect(() => setViewerAdmin(admin), [admin]);
  return null;
}
