import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * The page's main action, shaped like a key: a thick lip under it, a lift on hover, a
 * press that sinks it, and a small bounce now and then (not with reduced motion). It is
 * as tall as the code field's label and input beside it, lip included.
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
        "mb-1.5 inline-flex min-h-16 origin-bottom select-none items-center justify-center gap-2.5 self-stretch rounded-pill bg-sky px-8 font-display font-extrabold text-on-sky text-xl tracking-[-0.01em]",
        "shadow-[0_6px_0_var(--sky-deep)] transition-[translate,box-shadow] duration-150 ease-soft",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_0_var(--sky-deep)] active:translate-y-1.5 active:shadow-[0_0_0_var(--sky-deep)]",
        "animate-boing hover:animate-none active:animate-none motion-reduce:animate-none",
        className,
      )}
    >
      <Plus className="size-6 shrink-0" strokeWidth={2.75} />
      {children}
    </Link>
  );
}
