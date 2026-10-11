"use client";

import {
  type ComponentProps,
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { characterPath } from "@/lib/routes";
import { SheetPanel } from "./sheet-panel";

interface SheetDrawer {
  /** Slides `id`'s sheet over the page; the address stays the same. */
  open: (id: string) => void;
  /** A sheet is over the page. */
  isOpen: boolean;
}

const SheetDrawerContext = createContext<SheetDrawer | null>(null);

/** Whether a history entry is the one a sheet pushed. */
const sheetEntry = () =>
  (window.history.state as { sheet?: boolean } | null)?.sheet === true;

/**
 * Lets a page open character sheets in a drawer without changing its
 * address: the link under each sheet is still its own page (for search
 * engines and a new tab). Opening one adds a history entry with the same
 * address, so the phone's back closes the sheet instead of leaving.
 */
export function SheetDrawerProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const open = useCallback((next: string) => {
    if (!sheetEntry())
      window.history.pushState({ sheet: true }, "", window.location.href);
    setId(next);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (!sheetEntry()) setIsOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // a link inside the sheet went to another page
  // biome-ignore lint/correctness/useExhaustiveDependencies: closes on a new pathname only
  useEffect(() => setIsOpen(false), [pathname]);

  const value = useMemo(() => ({ open, isOpen }), [open, isOpen]);
  return (
    <SheetDrawerContext.Provider value={value}>
      {children}
      {id ? (
        <SheetPanel
          key={id}
          id={id}
          open={isOpen}
          onClose={() => {
            // the popstate that follows shuts it
            if (sheetEntry()) window.history.back();
            else setIsOpen(false);
          }}
          onClosed={() => setId(null)}
        />
      ) : null}
    </SheetDrawerContext.Provider>
  );
}

/** The page's sheet drawer; null outside a SheetDrawerProvider. */
export const useSheetDrawer = () => useContext(SheetDrawerContext);

/**
 * A link to a character's page that, on a plain click, opens its sheet in
 * the page's drawer instead. Modified clicks (new tab, new window) and pages
 * without a drawer follow the link.
 */
export function SheetLink({
  id,
  name,
  onClick,
  ...props
}: { id: string; name?: string } & Omit<ComponentProps<typeof Link>, "href">) {
  const drawer = useSheetDrawer();
  return (
    <Link
      {...props}
      href={characterPath(id, name)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (
          !drawer ||
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return;
        e.preventDefault();
        drawer.open(id);
      }}
    />
  );
}
