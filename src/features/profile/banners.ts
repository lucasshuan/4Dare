import type { CSSProperties } from "react";
import type { Banner, BannerPreset } from "@/game/profile/profile";

/** The app's covers: soft gradients with a little pattern, the same in light and dark. */
export const BANNER_PAINT: Record<BannerPreset, string> = {
  dawn: "radial-gradient(circle at 15% 120%, #FCE8D6 0 28%, transparent 29%), radial-gradient(circle at 85% -20%, #F4C7D9 0 34%, transparent 35%), linear-gradient(120deg, #F6E3A1, #F3B88E 55%, #E58FA8)",
  meadow:
    "radial-gradient(circle at 20% 110%, #BFE6C8 0 30%, transparent 31%), radial-gradient(circle at 70% 130%, #8FD3A6 0 32%, transparent 33%), linear-gradient(160deg, #DCF2E2, #A8DDB8 60%, #6CC296)",
  sea: "radial-gradient(ellipse at 30% 140%, #BFE3EA 0 40%, transparent 41%), radial-gradient(ellipse at 80% 130%, #86C6D6 0 38%, transparent 39%), linear-gradient(180deg, #DCE8FA, #9CC3EC 60%, #5F9BD8)",
  dusk: "radial-gradient(circle at 80% 30%, #F6E3A1 0 7%, transparent 8%), linear-gradient(180deg, #7A5AF5, #C2417A 60%, #F0A566)",
  candy:
    "repeating-linear-gradient(135deg, rgba(255,255,255,.28) 0 14px, transparent 14px 28px), linear-gradient(120deg, #F4C7D9, #D9C7F4 50%, #BFE3EA)",
  night:
    "radial-gradient(circle at 18% 30%, #fff 0 1px, transparent 2px), radial-gradient(circle at 62% 22%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 84% 58%, #fff 0 1px, transparent 2px), radial-gradient(circle at 38% 70%, #fff 0 1px, transparent 2px), radial-gradient(circle at 82% 26%, #F6E3A1 0 18px, transparent 19px), linear-gradient(180deg, #12233F, #1D4A93 70%, #2B69C8)",
};

/** How a cover paints: a preset, a picture, or (none) the avatar's pastel washing into the accent. */
export function bannerStyle(
  banner: Banner | null,
  avatarColor: string,
): CSSProperties {
  if (banner?.kind === "preset") return { background: BANNER_PAINT[banner.id] };
  if (banner?.kind === "image")
    return {
      backgroundImage: `url("${banner.url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: avatarColor,
    };
  return {
    background: `linear-gradient(120deg, ${avatarColor} 0%, color-mix(in oklab, ${avatarColor} 70%, var(--accent)) 60%, color-mix(in oklab, ${avatarColor} 45%, var(--accent)) 100%)`,
  };
}
