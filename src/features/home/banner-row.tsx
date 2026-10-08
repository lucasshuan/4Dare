import type { ReactNode } from "react";

/**
 * A game banner's scene with the page's way in beside it. Wide screens set the
 * scene on the left, in line with the page's column, and `aside` on the right,
 * over the rooms; narrower ones centre the scene and leave `aside` out (the
 * page shows it under the pitch). The scene should carry SCENE_WIDTH.
 */
export function BannerRow({
  aside,
  children,
}: {
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="xl:px-8">
      <div className="mx-auto grid w-full max-w-page xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:gap-10">
        {children}
        {/* low in the banner, clear of its melt, with room for the code's error under the field */}
        <div className="relative self-end pb-10 max-xl:hidden">{aside}</div>
      </div>
    </div>
  );
}

/** A banner scene's width: the banner's centre, or its left beside BannerRow's aside. */
export const SCENE_WIDTH =
  "mx-auto w-full max-w-[1040px] xl:mx-0 xl:max-w-[640px]";
