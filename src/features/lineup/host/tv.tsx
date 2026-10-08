// The booth's old TV: a dark cabinet, a curved screen with scan lines and a
// soft glow, two knobs. Drawn in CSS: nothing to load, nothing moving.
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tv({
  children,
  className,
  screenClassName,
}: {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-[26px] bg-[#2b2622] p-3 pb-9 shadow-[0_14px_30px_rgba(18,14,10,0.35),inset_0_2px_0_rgba(255,255,255,0.08)] sm:p-4 sm:pb-11",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] bg-[#16302a] text-chalk shadow-[inset_0_0_40px_rgba(0,0,0,0.55)]",
          screenClassName,
        )}
      >
        {children}
        {/* scan lines and the glass's glow, over the picture */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0 1px, transparent 1px 3px)",
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12), transparent 55%)",
          }}
        />
      </div>
      <span
        aria-hidden="true"
        className="absolute right-6 bottom-3 flex gap-2 sm:bottom-3.5"
      >
        <i className="block size-4 rounded-pill bg-[#4a4039] shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)]" />
        <i className="block size-4 rounded-pill bg-[#4a4039] shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)]" />
      </span>
      <span
        aria-hidden="true"
        className="absolute bottom-4 left-6 font-bold font-mono text-[10px] text-white/35 tracking-[0.2em]"
      >
        4DARE
      </span>
    </div>
  );
}
