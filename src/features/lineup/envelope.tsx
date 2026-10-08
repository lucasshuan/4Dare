"use client";

// The kraft envelope with its wax seal, sealed the whole auction long; its
// scene: "What for?" fills the screen, the envelope drops and shakes, the seal
// pops, the flap opens and the mission rises out on a sheet of paper.
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import type { Beat, Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { beatDelay, useBeatAgo, useLineup } from "./use-lineup";

const FRONT = "polygon(0 34%, 50% 64%, 100% 34%, 100% 100%, 0 100%)";
const FLAP = "polygon(0 0, 100% 0, 100% 53%, 50% 100%, 0 53%)";

/** The envelope, sealed, as wide as it is given (its height follows). */
export function Envelope({
  sealed,
  small = false,
  className,
}: {
  sealed: boolean;
  small?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[100/62] w-full [perspective:1400px]",
        className,
      )}
    >
      <span className="absolute inset-0 rounded-[8%/13%] bg-kraft-deep shadow-[0_22px_44px_rgba(42,29,12,0.35)]" />
      <span
        className="absolute inset-0 rounded-[8%/13%]"
        style={{
          background:
            "linear-gradient(170deg, var(--kraft), color-mix(in oklab, var(--kraft) 80%, var(--kraft-deep)))",
          clipPath: FRONT,
        }}
      />
      <span
        className="absolute inset-x-0 top-0 h-[64%] origin-top rounded-t-[8%_20%]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--kraft) 90%, white), var(--kraft))",
          clipPath: FLAP,
        }}
      />
      {sealed ? (
        <span
          className={cn(
            "absolute top-[64%] left-1/2 grid aspect-square -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill font-display font-extrabold text-[#ffe7c4] shadow-[0_3px_0_#6e1813,0_8px_14px_rgba(0,0,0,0.3)]",
            small
              ? "w-[26%] text-[clamp(10px,2vw,16px)]"
              : "w-[22%] text-[clamp(18px,4vw,34px)]",
          )}
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #d9483c, var(--wax) 60%, #8a211b)",
          }}
        >
          ?
        </span>
      ) : null}
    </div>
  );
}

/** The sheet with the mission, ruled like a notebook. */
export function MissionLetter({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const t = useTranslations("lineup.envelope");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[10px] px-[7%] py-[6%] text-center shadow-[0_4px_12px_rgba(42,29,12,0.25)]",
        className,
      )}
      style={{
        background:
          "repeating-linear-gradient(#fffdf6 0 30px, #d9e4f2 30px 31px)",
      }}
    >
      <small className="font-bold text-[13px] text-wax uppercase tracking-[0.1em]">
        {t("whatFor")}
      </small>
      <p className="m-0 text-balance font-display font-extrabold text-[#1e2433] text-[clamp(22px,4.4vw,40px)] leading-[1.08] tracking-[-0.02em]">
        {text}
      </p>
    </div>
  );
}

/** The envelope's scene: only now does everyone find out what for. */
export function EnvelopeScene({ beat }: { beat: Beat }) {
  const t = useTranslations("lineup.envelope");
  const lang = useLocale() as Lang;
  const { lu } = useLineup();
  const ago = useBeatAgo(beat);
  const at = (frac: number) => beatDelay(beat, ago, frac);
  const mission = lu.mission?.text[lang] ?? "";
  return (
    <div className="relative flex w-full flex-col items-center pt-[3vh]">
      {/* "What for?" fills the screen, then makes room */}
      <m.h2
        className="m-0 font-bold font-chalk text-chalk leading-none"
        initial={{ opacity: 0, scale: 1.6, fontSize: "clamp(64px,16vw,160px)" }}
        animate={{
          opacity: [0, 1, 1],
          scale: [1.6, 1, 1],
          fontSize: [
            "clamp(64px,16vw,160px)",
            "clamp(64px,16vw,160px)",
            "clamp(30px,6vw,56px)",
          ],
        }}
        transition={{
          delay: at(0),
          duration: ((beat.until - beat.startsAt) * 0.3) / 1000,
          times: [0, 0.35, 1],
        }}
      >
        {t("whatFor")}
      </m.h2>
      <m.div
        className="mt-6 w-[min(86vw,520px)]"
        initial={{ y: -260, opacity: 0, rotate: -12 }}
        animate={{ y: 0, opacity: 1, rotate: [-12, 0, -3, 3, -2, 0] }}
        transition={{
          delay: at(0.12),
          y: { type: "spring", stiffness: 220, damping: 15, delay: at(0.12) },
          rotate: { duration: 0.9, delay: at(0.22) },
        }}
      >
        <OpeningEnvelope sealFrac={at(0.4)}>
          {/* the letter rises out of the open envelope */}
          <m.div
            initial={{ y: "60%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: at(0.5),
              type: "spring",
              stiffness: 120,
              damping: 16,
            }}
          >
            <MissionLetter text={mission} className="min-h-[150px] pb-[16%]" />
          </m.div>
        </OpeningEnvelope>
      </m.div>
    </div>
  );
}

/**
 * The envelope as it opens: the seal pops at `sealFrac` (s), the flap swings
 * up and the letter (`children`, in the flow so the scene keeps its height)
 * stands between the back and the front pocket, its foot still inside.
 */
function OpeningEnvelope({
  sealFrac,
  children,
}: {
  sealFrac: number;
  children: React.ReactNode;
}) {
  const shape = "absolute inset-x-0 bottom-0 aspect-[100/62]";
  return (
    <div className="relative pb-[30%] [perspective:1400px]">
      <span
        className={cn(
          shape,
          "rounded-[8%/13%] bg-kraft-deep shadow-[0_22px_44px_rgba(42,29,12,0.35)]",
        )}
      />
      <div className="relative z-[1] mx-[6%]">{children}</div>
      <div className={cn(shape, "z-[2]")}>
        <m.span
          className="absolute inset-x-0 top-0 h-[64%] origin-top"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--kraft) 90%, white), var(--kraft))",
            clipPath: FLAP,
          }}
          initial={{ rotateX: 0, opacity: 1 }}
          animate={{ rotateX: 180, opacity: [1, 1, 0] }}
          transition={{ delay: sealFrac + 0.15, duration: 0.5 }}
        />
        <span
          className="absolute inset-0 rounded-[8%/13%]"
          style={{
            background:
              "linear-gradient(170deg, var(--kraft), color-mix(in oklab, var(--kraft) 80%, var(--kraft-deep)))",
            clipPath: FRONT,
          }}
        />
        <m.span
          className="absolute top-[64%] left-1/2 grid aspect-square w-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill font-display font-extrabold text-[#ffe7c4] text-[clamp(18px,4vw,34px)] shadow-[0_3px_0_#6e1813,0_8px_14px_rgba(0,0,0,0.3)]"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #d9483c, var(--wax) 60%, #8a211b)",
          }}
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: [1, 1.35, 0], opacity: [1, 1, 0] }}
          transition={{ delay: sealFrac, duration: 0.35 }}
        >
          ?
        </m.span>
      </div>
    </div>
  );
}
