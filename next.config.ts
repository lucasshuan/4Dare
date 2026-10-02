import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // lets several dev servers run side by side (e.g. NEXT_DIST_DIR=.next-e2e)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // character images are cropped in the browser and sent through a server action
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default withNextIntl(nextConfig);
