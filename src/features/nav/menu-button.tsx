"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { deferred, useDeferred } from "@/lib/hooks/use-deferred";

const loadDrawer = deferred(() =>
  import("./menu-drawer").then((m) => m.MenuDrawer),
);

/**
 * The three bars at the left of the logo. They open the side menu, which
 * comes after the page; until it lands the button stands in and a press
 * still opens it.
 */
export function MenuButton() {
  const t = useTranslations("nav");
  const { loaded: Drawer, props, reach } = useDeferred(loadDrawer);
  if (Drawer) return <Drawer {...props} />;
  return (
    <button
      type="button"
      aria-label={t("open")}
      aria-expanded={false}
      className={burgerClass}
      {...reach}
    >
      <Bars />
    </button>
  );
}

export const burgerClass =
  "group/burger relative flex size-11 shrink-0 items-center justify-center rounded-pill text-ink transition-colors duration-150 ease-soft hover:bg-sunken focus-visible:outline-3 focus-visible:outline-sky -ml-2 sm:-ml-2.5";

/**
 * Three bars that fold into an X when `open`. `inMenu`: the side menu's
 * own (an X), unfolded while the menu slides in or out, so the bars turn
 * into the X as it opens and back as it closes.
 */
export function Bars({
  open = false,
  inMenu = false,
}: {
  open?: boolean;
  inMenu?: boolean;
}) {
  const x = open || inMenu;
  // the menu's popup is group/menu; these undo the X while it slides
  const flat =
    inMenu &&
    "group-data-starting-style/menu:translate-y-0 group-data-starting-style/menu:rotate-0 group-data-ending-style/menu:translate-y-0 group-data-ending-style/menu:rotate-0";
  const bar =
    "absolute left-0 h-0.5 rounded-pill bg-current transition-[translate,rotate,opacity,width,scale] duration-[340ms] ease-soft";
  return (
    <span aria-hidden="true" className="relative block h-3.5 w-5">
      <i
        className={cn(bar, "top-0 w-5", x && "translate-y-1.5 rotate-45", flat)}
      />
      <i
        className={cn(
          bar,
          "top-1.5 w-[13px] group-hover/burger:w-5",
          x && "scale-x-20 opacity-0",
          inMenu &&
            "group-data-ending-style/menu:scale-x-100 group-data-ending-style/menu:opacity-100 group-data-starting-style/menu:scale-x-100 group-data-starting-style/menu:opacity-100",
        )}
      />
      <i
        className={cn(
          bar,
          "top-3 w-5",
          x && "-translate-y-1.5 -rotate-45",
          flat,
        )}
      />
    </span>
  );
}
