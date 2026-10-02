import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from "react";
import { cn } from "@/lib/cn";

const FIELD =
  "w-full rounded-md border-[1.5px] border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink-muted transition-colors focus-visible:border-sky";

interface Common {
  label: string;
  hint?: string;
  /** Shows "12/140" when set. */
  max?: number;
  className?: string;
}

export function TextField({
  label,
  hint,
  max,
  className,
  value,
  ...props
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, "className">) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="font-semibold text-sm">
        {label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={max}
        className={cn(FIELD, "h-13 short:h-11")}
        {...props}
      />
      <Hint
        hint={hint}
        max={max}
        length={typeof value === "string" ? value.length : 0}
      />
    </div>
  );
}

export function TextArea({
  label,
  hint,
  max,
  className,
  value,
  ...props
}: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={id} className="font-semibold text-sm">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={max}
        rows={2}
        className={cn(
          FIELD,
          "min-h-19 resize-none py-3 short:min-h-16 short:py-2 tiny:h-11 tiny:min-h-11",
        )}
        {...props}
      />
      <Hint
        hint={hint}
        max={max}
        length={typeof value === "string" ? value.length : 0}
      />
    </div>
  );
}

function Hint({
  hint,
  max,
  length,
}: {
  hint?: string;
  max?: number;
  length: number;
}) {
  if (!hint && !max) return null;
  return (
    <div className="flex justify-between gap-3 font-medium text-[13px] text-ink-muted leading-[18px]">
      <span>{hint}</span>
      {max ? (
        <span className="font-mono tabular-nums">{`${length}/${max}`}</span>
      ) : null}
    </div>
  );
}
