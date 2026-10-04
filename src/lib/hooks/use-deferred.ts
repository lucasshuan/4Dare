"use client";

import { type ComponentType, useCallback, useEffect, useState } from "react";

/** What a deferred component is handed when it takes over from its stand-in. */
export interface DeferredProps {
  /** Pressed before it arrived: open at once. */
  defaultOpen: boolean;
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
  const [state, setState] = useState<DeferredProps>({
    defaultOpen: false,
    autoFocus: false,
  });

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
    onFocus: () => {
      setState((s) => ({ ...s, autoFocus: true }));
      fetch();
    },
    onBlur: () => setState((s) => ({ ...s, autoFocus: false })),
    onClick: () => {
      setState({ defaultOpen: true, autoFocus: true });
      fetch();
    },
  };

  return { loaded: loaded?.Component ?? null, props: state, reach };
}
