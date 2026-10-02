import type { MetadataRoute } from "next";
import { APP_NAME } from "@/config";

// Lets phones add Ludodare to the home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Guessing games to play with friends, right in the browser.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F5F9",
    theme_color: "#2B69C8",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
