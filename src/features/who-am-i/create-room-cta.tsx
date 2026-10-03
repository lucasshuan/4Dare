import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * The page's main action, big and in the seat colours: the colours drift under a soft
 * glow, a shine sweeps by now and then, and it lifts on hover (still with reduced motion).
 */
export function CreateRoomCta({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative isolate inline-flex h-16 select-none items-center justify-center gap-2.5 rounded-pill px-8 font-display font-extrabold text-on-sky text-xl tracking-[-0.01em]",
        "transition-transform duration-300 ease-soft hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.98]",
        className,
      )}
    >
      {/* the glow: the same colours, blurred, brighter on hover */}
      <span
        aria-hidden="true"
        className="absolute inset-1 -z-20 rounded-pill bg-seats opacity-60 blur-lg transition-opacity duration-300 group-hover:opacity-100 animate-seats-drift motion-reduce:animate-none"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden rounded-pill bg-seats animate-seats-drift motion-reduce:animate-none"
      >
        <span className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/50 to-transparent animate-shine motion-reduce:hidden" />
      </span>
      <Plus
        className="size-6 shrink-0 transition-transform duration-300 ease-soft group-hover:rotate-90"
        strokeWidth={2.75}
      />
      {children}
    </Link>
  );
}
