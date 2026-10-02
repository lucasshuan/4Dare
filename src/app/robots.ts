import type { MetadataRoute } from "next";
import { SITE_URL } from "@/server/seo";

// Rooms stay crawlable so chat apps can draw the invite; their pages say noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
