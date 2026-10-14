"use client";

import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Tip } from "@/components/ui/tip";
import { useMe } from "@/features/data/use-me";
import { cn } from "@/lib/cn";
import { deferred, useDeferred } from "@/lib/hooks/use-deferred";
import { meNamed, useDisplayName } from "@/lib/names";
import type { Me } from "@/server/contract";

/**
 * The round avatar alone, like the language flag beside it; the name and the
 * "Guest" tag stay for screen readers. A guest's avatar looks unfinished on
 * purpose: faded and grey.
 */
export const userMenuTrigger = (me: Me) =>
  cn(
    "tb-key tb-me inline-flex size-10 shrink-0 items-center justify-center rounded-pill transition-colors duration-200 ease-soft hover:bg-sunken data-popup-open:bg-sunken dark:data-popup-open:bg-line dark:hover:bg-line",
    me.isGuest && "tb-guest text-ink-muted",
  );

/** The trigger's tip: who you are, and "Guest" for a guest. */
export function useUserMenuLabel(me: Me | null | undefined) {
  const t = useTranslations("home.user");
  const name = useDisplayName();
  if (!me) return "";
  const who = name(meNamed(me));
  return me.isGuest ? `${who} · ${t("guestBadge")}` : who;
}

/** What the trigger shows: the avatar, then the name and "Guest" tag for screen readers. */
export function UserMenuFace({ me }: { me: Me }) {
  const t = useTranslations("home.user");
  const name = useDisplayName();
  return (
    <>
      <Avatar
        avatar={me.avatar}
        size={32}
        className={cn("size-10", me.isGuest && "opacity-60 grayscale")}
      />
      <span className="sr-only">{name(meNamed(me))}</span>
      {me.isGuest ? <span className="sr-only">{t("guestBadge")}</span> : null}
    </>
  );
}

const loadPopover = deferred(() =>
  import("./user-menu-popover").then((m) => m.UserMenuPopover),
);

/**
 * Avatar and name at the top right; the popover says who you are and how to
 * sign in or out. It comes after the page; until then a look-alike stands in.
 */
export function UserMenu() {
  const { me } = useMe();
  const { loaded: Popover, props, reach } = useDeferred(loadPopover);
  const label = useUserMenuLabel(me);
  if (!me)
    return (
      <span className="size-10 shrink-0 animate-pulse rounded-pill bg-sunken" />
    );
  if (Popover) return <Popover {...props} />;
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={false}
        className={userMenuTrigger(me)}
        {...reach}
      >
        <UserMenuFace me={me} />
      </button>
    </Tip>
  );
}
