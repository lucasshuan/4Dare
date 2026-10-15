import {
  Flag,
  FlaskConical,
  Gamepad2,
  Hammer,
  LayoutDashboard,
  type LucideIcon,
  SlidersVertical,
  Users,
} from "lucide-react";
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
  {
    group: "Jogos",
    items: [
      { id: "games", label: "Jogos", path: "/games", Icon: Gamepad2 },
      {
        id: "music",
        label: "Mesa de som",
        path: "/music",
        Icon: SlidersVertical,
      },
      { id: "lab", label: "Laboratório", path: "/lab", Icon: FlaskConical },
    ],
  },
  {
    group: "Comunidade",
    items: [
      {
        id: "workshop",
        label: "Oficina",
        path: "/workshop",
        Icon: Hammer,
        count: (c) => (c.workshop ? { n: c.workshop, hot: true } : null),
      },
      { id: "users", label: "Usuários", path: "/users", Icon: Users },
      {
        id: "reports",
        label: "Denúncias",
        path: "/reports",
        Icon: Flag,
        count: (c) => (c.reports ? { n: c.reports, hot: true } : null),
      },
    ],
  },
];

export const SECTIONS = NAV.flatMap((g) => g.items);

/** The bottom bar on phones: the pages used the most, then the full menu. */
export const TABS = ["overview", "games", "lab"];

/** The section a path (relative to the base) belongs to. */
export function sectionOf(rel: string): AdminSection | undefined {
  const first = `/${rel.split("/").filter(Boolean)[0] ?? ""}`;
  return SECTIONS.find((s) => (s.path || "/") === first);
}
