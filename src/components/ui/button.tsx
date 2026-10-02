import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "border-ink bg-ink text-on-ink hover:-translate-y-px",
  secondary: "border-line-strong bg-surface text-ink hover:-translate-y-px",
  ghost: "border-transparent bg-transparent text-ink-muted hover:text-ink",
  danger: "border-no bg-no text-on-no hover:-translate-y-px",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-base",
  lg: "h-14 px-8 text-lg",
};

/** Class names for anything that should look like a button (also links). */
export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill border-[1.5px] font-semibold",
    "transition-[transform,background-color,color,opacity] duration-150 ease-soft active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-5 [&_svg]:shrink-0",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}
