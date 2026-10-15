import type { MetadataRoute } from "next";
import { SITE_URL } from "@/server/seo";

// Rooms stay crawlable so chat apps can draw the invite; their pages say noindex.
// The control panel (admin.4dare.com, /admin elsewhere) is a 404 to anyone but the admin.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
