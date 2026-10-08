"use client";

// The opening's last word with a presenter. The players meet them as the
// show's host, under a spotlight (that it all plays on a TV is the verdict's
// surprise); the presenter sees the picture flicker and pull back: it was
// their booth's TV all along.
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import type { Beat } from "@/game/types";
import { useDisplayName } from "@/lib/names";
import { beatDelay, useBeatAgo, useLineup } from "../use-lineup";
import { Tv } from "./tv";

export function ChairScene({ beat }: { beat: Beat }) {
  const t = useTranslations("lineup.host");
  const name = useDisplayName();
  const { lu, me, playerById } = useLineup();
  const still = useReducedMotion() ?? false;
  const ago = useBeatAgo(beat);
  const at = (frac: number) => beatDelay(beat, ago, frac);
  const host = lu.presenterId ? playerById(lu.presenterId) : null;
  if (!host) return null;
  const you = host.id === me.id;
  const title = you
    ? t(lu.drawn ? "chairYouDrawn" : "chairYou")
    : t(lu.drawn ? "chairDrawn" : "chair", { name: name(host, false) });
  const face = (
    <Avatar
      avatar={host.avatar}
      size={68}
      seat={host.colorSlot}
      className="size-[110px]"
    />
  );
  return (
    <div className="flex w-full flex-col items-center gap-5 text-center text-chalk">
      {you ? (
        // the picture glitches and pulls back into the booth's TV
        <m.div
          initial={{ opacity: 0, scale: 1.6 }}
          animate={{
            opacity: [0, 1, 0.4, 1],
            scale: still ? 1 : [1.6, 1.6, 1.15, 1],
            x: still ? 0 : [0, -6, 5, 0],
          }}
          transition={{ delay: at(0), duration: 0.9, times: [0, 0.3, 0.6, 1] }}
        >
          <Tv
            className="w-[min(70vw,300px)]"
            screenClassName="grid aspect-[4/3] place-items-center"
          >
            {face}
          </Tv>
        </m.div>
      ) : (
        // the host of the show, under a spotlight
        <m.div
          className="relative grid place-items-center px-10 pt-6 pb-4"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: at(0),
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[50%]"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, rgba(255,240,190,0.35), transparent 65%)",
            }}
          />
          <span className="relative">{face}</span>
          <span aria-hidden="true" className="relative -mt-3 text-[38px]">
            🎙️
          </span>
        </m.div>
      )}
      <m.h2
        className="m-0 max-w-[90vw] text-balance font-bold font-chalk text-[clamp(28px,5vw,48px)] leading-tight"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: at(0.25) }}
      >
        {title}
      </m.h2>
      <m.p
        className="m-0 max-w-[520px] text-balance font-semibold opacity-85"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: at(0.45) }}
      >
        {you ? t("chairYouHint") : t("chairHint")}
      </m.p>
    </div>
  );
}
