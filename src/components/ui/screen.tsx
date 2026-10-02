import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Page shell: header row and a centred column. */
export function Screen({
  left,
  right,
  children,
  wide,
  className,
}: {
  left?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pt-4 pb-8 sm:gap-10 sm:px-8 sm:pt-6 sm:pb-12 sm:short:gap-6 sm:short:pt-4 sm:short:pb-6">
      <header
        className={cn(
          "mx-auto flex w-full items-center justify-between gap-3",
          wide ? "max-w-[1120px]" : "max-w-[1120px]",
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          {left ?? <Wordmark />}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          {right}
        </div>
      </header>
      <main className={cn("mx-auto w-full max-w-[1120px] flex-1", className)}>
        {children}
      </main>
    </div>
  );
}

export function Wordmark() {
  return (
    <Link
      href="/"
      className="shrink-0 font-display font-extrabold text-[28px] leading-8 tracking-[-0.02em]"
    >
      Dare
    </Link>
  );
}

export function ThemeTag({ label, theme }: { label: string; theme: string }) {
  return (
    <span
      title={theme}
      className="inline-flex min-w-0 max-w-full items-baseline gap-2 rounded-pill bg-butter px-4 py-1.5 font-semibold text-on-butter text-sm"
    >
      <span className="shrink-0 whitespace-nowrap font-medium max-sm:sr-only">
        {label}
      </span>
      <span className="truncate">{theme}</span>
    </span>
  );
}
