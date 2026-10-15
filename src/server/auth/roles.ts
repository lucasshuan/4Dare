import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GameError } from "@/game/types";
import { can, type Power } from "@/lib/roles";
import { getBackend } from "@/server/backend";
import type { Account } from "@/server/contract";

/** The caller, read once per request (layouts, pages and actions share it). */
const caller = cache(() => getBackend().auth.me("pt"));

/** The caller when they may do `what`; null otherwise. */
export async function allowed(what: Power): Promise<Account | null> {
  const me = await caller();
  return can(me, what) ? me : null;
}

async function only(what: Power): Promise<Account> {
  const me = await caller();
  if (me.isGuest) throw new GameError("sign_in_needed");
  if (!can(me, what)) throw new GameError("unauthorized");
  return me;
}

/** Every admin action and /api/admin route starts here. */
export const adminOnly = () => only("admin");

/** The Workshop's review: curators and the admin. */
export const curatorOnly = () => only("curate");

/**
 * A panel page or layout: the admin, else a 404 as if there were no page.
 * Layouts and pages render side by side, so each one checks on its own.
 */
export async function adminPage(): Promise<Account> {
  const me = await allowed("admin");
  if (!me) notFound();
  return me;
}
