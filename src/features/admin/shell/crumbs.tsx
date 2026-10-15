"use client";

import Link from "next/link";
import {
  createContext,
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { sectionOf } from "../nav";
import { useAdminBase, useRelPath } from "./base";

/** One step of "Painel / Jogos / Quem sou eu? / Cenas": a label, and a panel path when it links. */
export interface Crumb {
  label: string;
  path?: string;
}

const CrumbsContext = createContext<{
  items: Crumb[] | null;
  set: (items: Crumb[] | null) => void;
}>({ items: null, set: () => {} });

export function CrumbsProvider({ children }: { children: ReactNode }) {
  const [items, set] = useState<Crumb[] | null>(null);
  return <CrumbsContext value={{ items, set }}>{children}</CrumbsContext>;
}

/** A page deeper than its section names its own steps (after "Painel"). @public */
export function SetCrumbs({ items }: { items: Crumb[] }) {
  const { set } = useContext(CrumbsContext);
  const key = JSON.stringify(items);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by content
  useEffect(() => {
    set(items);
    return () => set(null);
  }, [key, set]);
  return null;
}

/** Where you are, with links to the levels above. */
export function Crumbs() {
  const { items } = useContext(CrumbsContext);
  const { base } = useAdminBase();
  const section = sectionOf(useRelPath());
  const steps: Crumb[] = [
    { label: "Painel", path: "" },
    ...(items ?? (section?.path ? [{ label: section.label }] : [])),
  ];
  return (
    <nav className="crumbs" aria-label="Você está em">
      {steps.map((c, i) => {
        const last = i === steps.length - 1;
        const mid = !last && i > 0 && i < steps.length - 2;
        return (
          <Fragment key={`${c.path ?? ""}:${c.label}`}>
            {i ? <span className={mid ? "sep mid" : "sep"}>/</span> : null}
            {last || c.path === undefined ? (
              <b aria-current={last ? "page" : undefined}>{c.label}</b>
            ) : (
              <Link
                className={mid ? "mid" : undefined}
                href={`${base}${c.path}` || "/"}
              >
                {c.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
