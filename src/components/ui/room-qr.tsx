"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Maximize2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import { encode } from "uqr";
import { cn } from "@/lib/cn";

// Fixed colours, not theme tokens: a camera needs dark marks on a light card in both themes.
const INK = "#1e2433";
const SKY = "#2b69c8";
const BUTTER = "#f6e3a1";
const PAPER = "#ffffff";

/** The 4Dare icon's bubble and "?" (public/brand/icon.svg), in its 1000-unit box. */
const BUBBLE =
  "M525 0L640 0Q700 0 700 60L700 489Q700 505 716 505L776 505Q820 505 820 549L820 611Q820 655 776 655L716 655Q700 655 688 665L511 809Q485 830 493 797L521 671Q525 655 509 655L70 655Q0 655 0 585L0 545Q0 465 61 414Q254 254 427 46Q465 0 525 0Z";
const QUESTION =
  "M533 454L460 467Q453 443 456 426Q458 409 466 397Q474 384 485 375Q495 365 504 356Q514 346 519 335Q524 324 522 309L522 309Q518 289 505 282Q492 275 471 279L471 279Q459 281 445 287Q431 292 417 300Q403 308 391 318L391 318L373 241Q388 230 404 222Q420 214 437 208Q454 203 469 200L469 200Q495 196 517 198Q540 200 559 210Q579 220 592 238Q605 255 610 282L610 282Q614 306 609 323Q604 340 594 354Q584 367 572 379Q561 390 550 401Q540 412 535 425Q530 437 533 454L533 454M525 596L525 596Q495 602 478 592Q461 582 456 555L456 555Q452 528 464 513Q476 498 506 493L506 493Q537 487 554 497Q571 507 576 534L576 534Q585 586 525 596";

/** QrCodeDataType.Position in uqr: the three corner eyes, drawn by hand instead. */
const POSITION = 2;

/**
 * The QR code's shapes: softly rounded square modules, rounded eyes in the brand blue,
 * and the 4Dare icon in a clearing in the middle (high error correction keeps
 * it readable).
 */
function useQrShapes(url: string) {
  return useMemo(() => {
    const qr = encode(url, { ecc: "H", border: 0 });
    const n = qr.size;
    // An odd clearing about a quarter wide, centred; well under what "H" recovers.
    const hole = Math.round(n * 0.26) | 1;
    const from = (n - hole) / 2;
    const inHole = (x: number, y: number) =>
      x >= from - 0.5 && x < from + hole && y >= from - 0.5 && y < from + hole;
    let d = "";
    qr.data.forEach((row, y) => {
      row.forEach((on, x) => {
        if (!on || qr.types[y][x] === POSITION || inHole(x, y)) return;
        // a softly rounded square, 0.9 of a module: rounder dots read worse when big
        d += `M${x + 0.27} ${y + 0.05}h0.46a0.22 0.22 0 0 1 0.22 0.22v0.46a0.22 0.22 0 0 1-0.22 0.22h-0.46a0.22 0.22 0 0 1-0.22-0.22v-0.46a0.22 0.22 0 0 1 0.22-0.22z`;
      });
    });
    const eyes = [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ];
    return { n, d, eyes, hole, from };
  }, [url]);
}

/** The code itself, drawn in an n×n box. `still` skips the reveal. */
function QrArt({ url, still }: { url: string; still: boolean }) {
  const { n, d, eyes, hole, from } = useQrShapes(url);
  const icon = hole - 1.4;
  const iconAt = from + 0.7;
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      className="block size-full"
      aria-hidden="true"
    >
      {/* the modules sweep out from the middle */}
      <motion.path
        d={d}
        fill={INK}
        initial={still ? false : { clipPath: "circle(0% at 50% 50%)" }}
        animate={{ clipPath: "circle(75% at 50% 50%)" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      {eyes.map(([x, y], i) => (
        <motion.g
          key={`${x}-${y}`}
          style={{ transformOrigin: `${x + 3.5}px ${y + 3.5}px` }}
          initial={still ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 22,
            delay: 0.15 + i * 0.08,
          }}
        >
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={6}
            height={6}
            rx={1.9}
            fill="none"
            stroke={INK}
            strokeWidth={1}
          />
          <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.9} fill={SKY} />
        </motion.g>
      ))}
      {/* the 4Dare icon in the clearing */}
      <motion.g
        style={{ transformOrigin: `${n / 2}px ${n / 2}px` }}
        initial={still ? false : { scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 18,
          delay: 0.35,
        }}
      >
        <rect
          x={iconAt}
          y={iconAt}
          width={icon}
          height={icon}
          rx={icon * 0.224}
          fill={SKY}
        />
        <g
          transform={`translate(${iconAt + icon * 0.2036} ${iconAt + icon * 0.2}) scale(${(icon / 1000) * 0.7229})`}
        >
          <path d={BUBBLE} fill={BUTTER} />
          <path d={QUESTION} fill={SKY} />
        </g>
      </motion.g>
    </svg>
  );
}

const noSubscribe = () => () => {};

/**
 * The room's link (the one "Copy link" copies) as a QR code on a small white
 * card, for friends next to you: a click opens it big, to scan from across the table.
 */
export function RoomQr({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const t = useTranslations("lobby");
  const tc = useTranslations("common");
  const still = useReducedMotion() ?? false;
  // The page's own address: known only in the browser.
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => null,
  );
  if (!origin)
    return <span className={cn("block size-32 shrink-0", className)} />;
  const url = `${origin}/r/${code}`;
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={t("qrOpen")}
        className={cn(
          "group relative block size-32 shrink-0 cursor-zoom-in rounded-xl p-2.5 shadow-card ring-1 ring-line transition-[translate,box-shadow,rotate] duration-300 ease-soft hover:-translate-y-0.5 hover:-rotate-1 hover:shadow-pop motion-reduce:transition-none",
          className,
        )}
        style={{ backgroundColor: PAPER }}
      >
        <QrArt url={url} still={still} />
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2 flex size-7 scale-75 items-center justify-center rounded-pill bg-ink text-on-ink opacity-0 shadow-card transition-[scale,opacity] duration-200 ease-soft group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100"
        >
          <Maximize2 className="size-3.5" strokeWidth={2.25} />
        </span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-scrim transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 flex w-[min(528px,calc(100vw-2rem))] flex-col items-center gap-5 rounded-xl bg-canvas p-6 text-center shadow-pop outline-none transition-[scale,opacity] duration-250 ease-soft data-ending-style:scale-90 data-starting-style:scale-90 data-ending-style:opacity-0 data-starting-style:opacity-0 sm:p-7">
          <Dialog.Close
            aria-label={tc("close")}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-pill text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <X className="size-5" strokeWidth={2} />
          </Dialog.Close>
          {/* clear of the close button */}
          <div className="flex flex-col gap-1.5 px-6">
            <Dialog.Title className="font-bold font-display text-2xl">
              {t("qrTitle")}
            </Dialog.Title>
            <Dialog.Description className="text-ink-muted">
              {t("qrBody")}
            </Dialog.Description>
          </div>
          <div
            className="aspect-square w-full max-w-[calc(100dvh-16rem)] rounded-xl p-6 shadow-card ring-1 ring-line"
            style={{ backgroundColor: PAPER }}
          >
            <QrArt url={url} still={still} />
          </div>
          <span className="font-medium font-mono text-3xl tracking-[0.3em]">
            {code}
          </span>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
