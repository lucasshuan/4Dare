"use client";

import { useEffect, useState } from "react";

/**
 * Where a turn through `count` things starts: 0 on the server and on the
 * first paint, so hydration matches, then a random place once mounted.
 */
export function useRandomStart(count: number) {
  const [start, setStart] = useState(0);
  useEffect(() => setStart(Math.floor(Math.random() * count)), [count]);
  return start;
}
