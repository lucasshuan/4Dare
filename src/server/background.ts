import "server-only";
import { after } from "next/server";

/**
 * Work that must finish but nobody should wait for: realtime pings, saving a
 * match or a theme. A bare promise is not enough on Vercel, where the function
 * freezes once the response is sent; `after` keeps it alive until it is done.
 */
export function background(work: () => Promise<unknown>) {
  const run = () =>
    work().catch((error: unknown) =>
      console.error("background work failed", error),
    );
  try {
    after(run);
  } catch {
    // Outside a request (tests, scripts): run right away.
    void run();
  }
}
