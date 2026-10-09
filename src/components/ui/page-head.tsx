import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A page's opening: a small grey eyebrow (its group in the side menu), the
 * big title, a line on what it is for, and actions on the right (a row
 * under it on phones).
 */
export function PageHead({
  eyebrow,
  title,
  lead,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-3.5 pb-[22px]",
        className,
      )}
    >
      <div className="grid min-w-0 gap-1.5">
        {eyebrow ? (
          <span className="font-semibold text-[12px] text-ink-muted uppercase leading-tight tracking-[0.08em]">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-balance font-display font-extrabold text-[clamp(30px,6vw,44px)] leading-[1.02] tracking-[-0.022em]">
          {title}
        </h1>
        {lead ? (
          <p className="max-w-[60ch] text-[15.5px] text-ink-muted">{lead}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2.5">{actions}</div> : null}
    </header>
  );
}
