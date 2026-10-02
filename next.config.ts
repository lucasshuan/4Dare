import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // lets several dev servers run side by side (e.g. NEXT_DIST_DIR=.next-e2e)
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
