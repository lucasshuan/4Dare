import type { Me, Role } from "@/server/contract";

/** What a role can do beyond playing. The admin can do all a curator can. */
export type Power = "admin" | "curate";

/** The account's role; null for a guest. */
export const roleOf = (me: Pick<Me, "isGuest" | "role"> | null | undefined) =>
  me && !me.isGuest ? me.role : null;

/** Whether the person may do `what`. */
export function can(
  me: Pick<Me, "isGuest" | "role"> | null | undefined,
  what: Power,
): boolean {
  const role: Role | null = roleOf(me);
  if (what === "admin") return role === "admin";
  return role === "admin" || role === "curator";
}
