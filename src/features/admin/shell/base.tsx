"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";

interface Base {
  /** The panel's root: "" on admin.4dare.com, /admin (or /pt/admin) elsewhere. */
  base: string;
  /** The site's home, for the way back. */
  site: string;
}

const BaseContext = createContext<Base>({ base: "/admin", site: "/" });

export function AdminBaseProvider({
  base,
  site,
  children,
}: Base & { children: ReactNode }) {
  const value = useMemo(() => ({ base, site }), [base, site]);
  return <BaseContext value={value}>{children}</BaseContext>;
}

export const useAdminBase = () => useContext(BaseContext);

/** A panel path ("/rooms") as a link on this host. */
export function useAdminHref() {
  const { base } = useAdminBase();
  return (path: string) => `${base}${path}` || "/";
}

/** The path under the panel's base ("" for the overview). */
export function useRelPath() {
  const path = usePathname();
  const { base } = useAdminBase();
  const rel = base && path.startsWith(base) ? path.slice(base.length) : path;
  return rel === "/" ? "" : rel;
}
