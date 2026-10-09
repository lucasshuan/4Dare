"use client";

import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { openProfile } from "./open-profile";

/** The path of an account's profile. */
export const profilePath = (handle: string) => `/u/${handle}`;

/**
 * A link to an account's profile: a click opens it as a modal over the page;
 * a new tab or window gets its own page.
 */
export function ProfileLink({
  handle,
  className,
  style,
  children,
  onClick,
}: {
  handle: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={profilePath(handle)}
      scroll={false}
      className={className}
      style={style}
      onClick={(e) => {
        onClick?.();
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        openProfile(handle);
      }}
    >
      {children}
    </Link>
  );
}
