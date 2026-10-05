"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { useMe } from "@/features/data/use-me";
import { cn } from "@/lib/cn";
import { deferred, useDeferred } from "@/lib/hooks/use-deferred";
import { useDisplayName } from "@/lib/names";
import type { Me } from "@/server/contract";

/** A guest's trigger looks unfinished on purpose: dashed outline, faded avatar, muted name and a "Guest" tag. */
export const userMenuTrigger = (me: Me) =>
  cn(
    "group inline-flex h-10 min-w-0 max-w-60 items-center gap-2.5 rounded-pill py-1 pr-3 pl-1 font-semibold transition-colors duration-200 ease-soft hover:bg-sunken data-popup-open:bg-sunken",
    me.isGuest &&
      "max-w-72 border-[1.5px] border-line-strong border-dashed text-ink-muted",
  );

/** What the trigger shows: avatar, name, the "Guest" tag and the chevron. */
export function UserMenuFace({ me }: { me: Me }) {
  const t = useTranslations("home.user");
  const name = useDisplayName();
  return (
    <>
      <Avatar
        avatar={me.avatar}
        size={32}
        className={cn(me.isGuest && "opacity-60 grayscale")}
      />
      {/* phones keep only the avatar, so the bar fits next to the language and theme */}
      <span className="min-w-0 truncate max-sm:sr-only">{name(me)}</span>
      {me.isGuest ? (
        <span className="shrink-0 rounded-pill bg-line px-2 py-0.5 font-bold text-[11px] text-ink-muted uppercase tracking-wide">
          {t("guestBadge")}
        </span>
      ) : null}
      <ChevronDown
        className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-data-popup-open:rotate-180"
        strokeWidth={2}
      />
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
  if (!me)
    return (
      <span className="h-10 w-16 animate-pulse rounded-pill bg-sunken sm:w-40" />
    );
  if (Popover) return <Popover {...props} />;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={false}
      className={userMenuTrigger(me)}
      {...reach}
    >
      <UserMenuFace me={me} />
    </button>
  );
}
