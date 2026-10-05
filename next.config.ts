import { existsSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The same test as BACKEND in src/config.ts: with the Supabase keys the app
// never runs in local mode, so the build leaves local mode out.
const supabaseKeys = !!(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

// "motion/react" is `export * from "framer-motion"` plus `const motion = fm.motion`:
// that namespace read keeps all of framer-motion (drag, layout projection) in
// every page. Pointing it at framer-motion's own barrel (motion's sibling, the
// same copy) lets `m` + LazyMotion drop what a page does not use.
const framerMotion = join(
  realpathSync("node_modules/motion"),
  "../framer-motion/dist/es/index.mjs",
);
const motionAlias: Record<string, string> = existsSync(framerMotion)
  ? { "motion/react": `./${relative(process.cwd(), framerMotion)}` }
  : {};

const nextConfig: NextConfig = {
  // lets several dev servers run side by side (e.g. NEXT_DIST_DIR=.next-e2e)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    resolveAlias: {
      ...motionAlias,
      ...(supabaseKeys
        ? { "@/server/backend/local": "./src/server/backend/local/off.ts" }
        : {}),
    },
  },
  env: {
    // The Supabase integration on Vercel may set only SUPABASE_URL; the browser needs the public one.
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  },
  experimental: {
    // character images are cropped in the browser and sent through a server action
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default withNextIntl(nextConfig);
