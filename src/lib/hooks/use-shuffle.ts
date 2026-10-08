"use client";

import { useEffect, useState } from "react";

const inOrder = (count: number) => Array.from({ length: count }, (_, i) => i);

/**
 * The numbers 0 to `count` − 1 in a random order: in order on the server and
 * on the first paint, so hydration matches, then shuffled once mounted.
 */
export function useShuffle(count: number) {
  const [order, setOrder] = useState(() => inOrder(count));
  useEffect(() => {
    const a = inOrder(count);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    setOrder(a);
  }, [count]);
  return order;
}
