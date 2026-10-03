import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Behind the button, left to right; on hover or focus they fan out like a hand of cards. */
const CARDS = [
  {
    colors: "bg-apricot text-on-apricot",
    rest: "[--x:-40px] -rotate-10",
    fan: "group-hover:-translate-x-14 group-hover:-translate-y-9 group-hover:-rotate-16 group-focus-within:-translate-x-14 group-focus-within:-translate-y-9 group-focus-within:-rotate-16",
  },
  {
    colors: "bg-butter text-on-butter",
    rest: "[--x:0px] [animation-delay:120ms]",
    fan: "group-hover:-translate-y-10 group-focus-within:-translate-y-10",
  },
  {
    colors: "bg-yes text-on-yes",
    rest: "[--x:40px] rotate-10 [animation-delay:240ms]",
    fan: "group-hover:translate-x-14 group-hover:-translate-y-9 group-hover:rotate-16 group-focus-within:translate-x-14 group-focus-within:-translate-y-9 group-focus-within:rotate-16",
  },
];

/**
 * The page's main action. Three "?" cards hide behind it and peek over its top now and
 * then; on hover they fan out. The top padding gives them room, so the button lines up
 * with the code field's label and input beside it.
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
    <div className={cn("group relative isolate flex pt-5", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-5 bottom-0 -z-10"
      >
        {CARDS.map((card) => (
          <span
            key={card.colors}
            className={cn(
              "absolute top-2.5 left-1/2 -ml-4 grid h-[42px] w-8 place-items-center rounded-[7px] border-2 border-ink font-display font-extrabold text-lg",
              "translate-x-(--x) transition-[translate,rotate] duration-500 ease-spring",
              "animate-peek group-focus-within:animate-none group-hover:animate-none motion-reduce:animate-none",
              card.colors,
              card.rest,
              card.fan,
            )}
          >
            ?
          </span>
        ))}
      </span>
      <Link
        href={href}
        className="inline-flex h-16 w-full select-none items-center justify-center gap-2.5 rounded-pill bg-ink px-8 font-display font-extrabold text-on-ink text-xl tracking-[-0.01em] transition-[scale] duration-300 ease-spring active:scale-[0.98] group-hover:scale-[1.02]"
      >
        <Plus className="size-6 shrink-0" strokeWidth={2.75} />
        {children}
      </Link>
    </div>
  );
}
