import { LayoutDashboard, type LucideIcon } from "lucide-react";
import type { AdminCounts } from "@/server/admin/overview";

/** A page of the panel, at `path` under the panel's base ("" on admin.4dare.com, /admin elsewhere). */
export interface AdminSection {
  id: string;
  label: string;
  path: string;
  Icon: LucideIcon;
  /** The number at the row's right; hot = something waits on the admin. */
  count?: (c: AdminCounts) => { n: number; hot?: boolean } | null;
}

export const NAV: { group: string; items: AdminSection[] }[] = [
  {
    group: "Operação",
    items: [
      { id: "overview", label: "Visão geral", path: "", Icon: LayoutDashboard },
    ],
  },
];

export const SECTIONS = NAV.flatMap((g) => g.items);

/** The bottom bar on phones: the pages used the most, then the full menu. */
export const TABS = ["overview"];

/** The section a path (relative to the base) belongs to. */
export function sectionOf(rel: string): AdminSection | undefined {
  const first = `/${rel.split("/").filter(Boolean)[0] ?? ""}`;
  return SECTIONS.find((s) => (s.path || "/") === first);
}
