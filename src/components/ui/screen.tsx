"use client";

import { m, type Variants } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { Logo } from "./logo";

/**
 * Room a banner leaves at its top for the top bar, which floats over it.
 * Keep in step with the bar's height below.
 */
export const UNDER_TOPBAR = "pt-[60px] sm:pt-[72px] sm:short:pt-[60px]";

/**
 * How a page leaves when a parent plays its `leave` variant (the lobby, when
 * the match starts): the top bar slides up and the content fades and shrinks.
 */
const LEAVE = { duration: 0.45, ease: gs.p2In };
const BAR_LEAVES: Variants = {
  leave: { y: "-100%", opacity: 0, transition: LEAVE },
};
const CONTENT_LEAVES: Variants = {
  leave: { opacity: 0, scale: 0.97, transition: LEAVE },
};

/**
 * Page shell: header row and a centred column. `left={null}` drops the wordmark.
 * With a `banner`, it runs full width under the top bar, which stays at the
 * top as you scroll: see-through over the banner, frosted glass once there is
 * something scrolling under it.
 */
export function Screen({
  left,
  right,
  banner,
  children,
  wide,
  className,
}: {
  left?: ReactNode;
  right?: ReactNode;
  /** Full width, right under the top bar; it should start with UNDER_TOPBAR. */
  banner?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const bar = (
    <>
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {left === undefined ? <Wordmark /> : left}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        {right}
      </div>
    </>
  );
  if (banner) {
    return (
      <div className="flex min-h-dvh flex-col">
        <TopBar>{bar}</TopBar>
        {/* the banner slides up under the bar */}
        <div className="-mt-[72px] sm:-mt-[88px] sm:short:-mt-[72px]">
          {banner}
        </div>
        <main
          className={cn(
            "mx-auto w-full max-w-[1120px] flex-1 px-4 pt-6 pb-[calc(2rem+var(--dock))] sm:px-8 sm:pt-8 sm:pb-[calc(3rem+var(--dock))] sm:short:pb-[calc(1.5rem+var(--dock))]",
            className,
          )}
        >
          {children}
        </main>
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pt-4 pb-[calc(2rem+var(--dock))] sm:gap-10 sm:px-8 sm:pt-6 sm:pb-[calc(3rem+var(--dock))] sm:short:gap-6 sm:short:pt-4 sm:short:pb-[calc(1.5rem+var(--dock))]">
      <m.header
        variants={BAR_LEAVES}
        className={cn(
          "mx-auto flex w-full items-center justify-between gap-3",
          wide ? "max-w-[1120px]" : "max-w-[1120px]",
        )}
      >
        {bar}
      </m.header>
      <m.main
        variants={CONTENT_LEAVES}
        className={cn("mx-auto w-full max-w-[1120px] flex-1", className)}
      >
        {children}
      </m.main>
    </div>
  );
}

/**
 * The bar over a banner: sticky, clear at the top, frosted once the page
 * scrolls under it. Its top padding matches the plain header's, so the bar
 * sits at the same height on every page; the bottom mirrors it.
 */
function TopBar({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 4);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-[72px] border-b px-4 pt-4 transition-[background-color,border-color,backdrop-filter] duration-300 ease-soft sm:h-[88px] sm:px-8 sm:pt-6 sm:short:h-[72px] sm:short:pt-4",
        scrolled
          ? "border-line/70 bg-canvas/70 backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3">
        {children}
      </div>
    </header>
  );
}

export function Wordmark() {
  return (
    <Link href="/" className="group min-w-0 rounded-sm">
      {/* smaller on phones, and shrinks further so it never runs under the language, theme and user menu */}
      <Logo className="h-8 w-auto max-sm:h-7" />
    </Link>
  );
}

export function ThemeTag({
  label,
  theme,
  emoji,
}: {
  label: string;
  theme: string;
  /** The theme set's emoji. */
  emoji?: string | null;
}) {
  return (
    // a surface pill, so it reads on any step's colour behind it
    <span
      title={theme}
      className="inline-flex h-10 min-w-0 max-w-full items-center gap-2 rounded-pill bg-surface pr-4 pl-3 font-bold text-[15px] text-ink shadow-card"
    >
      {emoji ? (
        <span aria-hidden className="shrink-0">
          {emoji}
        </span>
      ) : null}
      <span className="shrink-0 whitespace-nowrap font-semibold text-[13px] text-ink-muted max-sm:sr-only">
        {label}
      </span>
      <span className="truncate">{theme}</span>
    </span>
  );
}
