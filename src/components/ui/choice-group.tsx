import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The pill track that holds segmented choices (language, theme, filters, settings). */
export function ChoiceGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        "m-0 inline-flex min-w-0 gap-1 rounded-pill border-0 bg-sunken p-1",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}
