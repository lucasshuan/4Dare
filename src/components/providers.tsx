"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";
import { ProfileModalHost } from "@/features/profile/profile-modal-host";
import { SettingsSync } from "@/features/settings/settings-sync";
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
      {/* light until the person picks dark or "system" (settings) */}
      <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem>
        {/* "user" = follow prefers-reduced-motion: transforms are skipped, fades stay */}
        <MotionConfig reducedMotion="user">
          {/* `m` everywhere; the layout features load only where used (LayoutMotion) */}
          <LazyMotion features={domAnimation} strict>
            <ToastProvider>
              {children}
              <SettingsSync />
              <ProfileModalHost />
            </ToastProvider>
          </LazyMotion>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
