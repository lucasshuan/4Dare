import { defineConfig } from "@playwright/test";

// End-to-end tests run against the app in local mode (no Supabase needed).
// Uses the Edge already installed on Windows; change `channel` if you prefer another browser.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec next dev -p 3100",
    url: "http://localhost:3100/en",
    reuseExistingServer: true,
    timeout: 180_000,
    // own build folder and data, so it can run next to `pnpm dev`
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DARE_DATA_DIR: ".data/e2e",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
