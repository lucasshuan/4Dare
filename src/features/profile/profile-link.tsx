"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/** The path of an account's profile. */
export const profilePath = (handle: string) => `/u/${handle}`;

/** A link to an account's profile: over the page as a modal, its own page when opened anew. */
export function ProfileLink({
  handle,
  className,
  children,
  onClick,
}: {
  handle: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={profilePath(handle)}
      scroll={false}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
