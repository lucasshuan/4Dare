"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";
import { ToastProvider } from "./ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 0, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
        {/* "user" = follow prefers-reduced-motion: transforms are skipped, fades stay */}
        <MotionConfig reducedMotion="user">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
