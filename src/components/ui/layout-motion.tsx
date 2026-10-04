"use client";

import { type FeatureBundle, LazyMotion } from "motion/react";
import type { ReactNode } from "react";

let loaded: FeatureBundle | undefined;
const load = () =>
  import("./layout-features").then((mod) => {
    loaded = mod.default;
    return loaded;
  });

/**
 * The app runs on `domAnimation` (see Providers); `layout` and `layoutId` need
 * the full set. Wrap the few subtrees that use them: the first one to mount
 * fetches it, and until then its `m` elements render still. Once loaded the
 * features are global, so later subtrees get it synchronously.
 */
export function LayoutMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loaded ?? load} strict>
      {children}
    </LazyMotion>
  );
}
