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

export type KeyColor = "sky" | "yes" | "apricot" | "no";

const KEY_COLOR: Record<KeyColor, string> = {
  sky: "bg-sky text-on-sky [--key-lip:var(--sky-deep)]",
  yes: "bg-yes text-on-yes [--key-lip:var(--yes-deep)]",
  apricot: "bg-apricot text-on-apricot [--key-lip:var(--apricot-deep)]",
  no: "bg-no text-on-no [--key-lip:var(--no-deep)]",
};

/**
 * A big main action shaped like a key: a thick lip under it, a lift on hover and a press
 * that sinks it. `pressed` keeps it down (a toggle that is on); `bounce` adds a small
 * squash-and-stretch every few seconds (not with reduced motion). Size comes from the caller.
 */
export function keyClass(
  color: KeyColor,
  {
    pressed = false,
    bounce = false,
    className,
  }: { pressed?: boolean; bounce?: boolean; className?: string } = {},
) {
  return cn(
    "mb-1.5 inline-flex origin-bottom select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-pill font-display font-extrabold tracking-[-0.01em]",
    "transition-[translate,box-shadow,background-color,color,opacity] duration-150 ease-soft disabled:pointer-events-none disabled:opacity-45",
    pressed
      ? "translate-y-1.5 shadow-[0_0_0_var(--key-lip)]"
      : "shadow-[0_6px_0_var(--key-lip)] hover:-translate-y-0.5 hover:shadow-[0_8px_0_var(--key-lip)] active:translate-y-1.5 active:shadow-[0_0_0_var(--key-lip)]",
    bounce &&
      !pressed &&
      "animate-boing hover:animate-none active:animate-none disabled:animate-none motion-reduce:animate-none",
    KEY_COLOR[color],
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
