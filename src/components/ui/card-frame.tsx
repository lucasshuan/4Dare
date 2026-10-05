import { useLocale } from "next-intl";
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { onSeat, seatColor } from "@/lib/seats";
import { logoFile } from "./logo";

/**
 * A character card's frame: the colour of the player whose card it is (the
 * one who has it on their head), the brand blue for a card nobody holds.
 * Seat rings drawn on it are gapped in the same colour.
 */
export function frameStyle(seat: number | null | undefined): CSSProperties {
  const fill = seat == null ? "var(--brand-stage)" : seatColor(seat);
  return {
    backgroundColor: fill,
    color: seat == null ? "var(--on-brand)" : onSeat(seat),
    "--ring-gap": fill,
  } as CSSProperties;
}

/** The small "?" seal in a frame's corner. */
export function FrameSeal({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-pill bg-white/20 font-display font-extrabold text-[17px] leading-none",
        className,
      )}
    >
      ?
    </span>
  );
}

/**
 * A card face down, where its picture would be (4:5): the frame's colour
 * with the "?" marks, a white "?" disc and, when it is big enough to read,
 * the 4Dare logo. Everything scales with its width.
 */
export function CardBack({
  seat,
  logo = false,
  className,
  style,
  ...rest
}: {
  seat: number | null | undefined;
  logo?: boolean;
} & Omit<ComponentProps<"span">, "children">) {
  const frame = frameStyle(seat);
  const locale = useLocale();
  return (
    <span
      {...rest}
      aria-hidden="true"
      style={{ ...frame, ...style }}
      className={cn(
        "@container q-marks relative flex aspect-4/5 w-full flex-col items-center justify-center overflow-hidden rounded-lg shadow-[inset_0_0_0_2px_rgba(255,255,255,0.5)]",
        className,
      )}
    >
      <span
        className="flex aspect-square w-[40%] items-center justify-center rounded-pill bg-white font-display font-extrabold text-[27cqw] leading-none shadow-[0_0_0_5px_rgba(255,255,255,0.25),0_12px_28px_rgba(15,30,70,0.35)]"
        style={{ color: frame.backgroundColor }}
      >
        ?
      </span>
      {logo ? (
        <span className="mt-[7cqw] flex rounded-pill bg-white px-[5cqw] py-[2.4cqw] shadow-[0_6px_16px_rgba(15,30,70,0.25)]">
          {/* biome-ignore lint/performance/noImgElement: the static brand file, in its own colours on any theme */}
          <img src={logoFile(locale)} alt="" className="h-[6.5cqw] w-auto" />
        </span>
      ) : null}
    </span>
  );
}
