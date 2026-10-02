"use client";

import { useEffect, useState } from "react";

/** The server's time (local clock + offset), re-rendering every `everyMs`. */
export function useServerClock(offset: number, everyMs = 200) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    setNow(Date.now() + offset);
    const id = window.setInterval(() => setNow(Date.now() + offset), everyMs);
    return () => window.clearInterval(id);
  }, [offset, everyMs]);
  return now;
}
