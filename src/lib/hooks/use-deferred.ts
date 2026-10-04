"use client";

import {
  type ComponentType,
  type PointerEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

/** What a deferred component is handed when it takes over from its stand-in. */
export interface DeferredProps {
  /**
   * Open state, kept here so a press on the stand-in still counts when the
   * component swaps in between pointer down and up.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Its stand-in had the focus: take it over. */
  autoFocus: boolean;
}

/**
 * One load per module, shared by every caller: `load` must be a module-level
 * function (see deferred()).
 */
export function deferred<P>(
  load: () => Promise<ComponentType<P & DeferredProps>>,
) {
  let loading: Promise<ComponentType<P & DeferredProps>> | null = null;
  return () => {
    loading ??= load().catch((error: unknown) => {
      loading = null;
      throw error;
    });
    return loading;
  };
}

/**
 * A menu, select or dialog kept out of the page's first download. A stand-in
 * that looks the same shows until it arrives; it is fetched once the browser
 * is idle, or as soon as someone reaches for the stand-in (pointer, focus or
 * press), so opening never waits on a download in practice. A press before it
 * lands opens it when it does.
 */
export function useDeferred<P>(
  load: () => Promise<ComponentType<P & DeferredProps>>,
) {
  const [loaded, setLoaded] = useState<{
    Component: ComponentType<P & DeferredProps>;
  } | null>(null);
  const [open, onOpenChange] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);

  const fetch = useCallback(() => {
    load().then(
      (Component) => setLoaded({ Component }),
      () => {},
    );
  }, [load]);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(fetch, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(fetch, 1500);
    return () => window.clearTimeout(id);
  }, [fetch]);

  /** Spread on the stand-in. */
  const reach = {
    onPointerEnter: fetch,
    // the real menus open on pointer down, so the stand-in does too
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      onOpenChange(true);
      fetch();
    },
    onFocus: () => {
      setAutoFocus(true);
      fetch();
    },
    onBlur: () => setAutoFocus(false),
    onClick: () => {
      onOpenChange(true);
      setAutoFocus(true);
      fetch();
    },
  };

  const props: DeferredProps = { open, onOpenChange, autoFocus };
  return { loaded: loaded?.Component ?? null, props, reach };
}
