"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Portrait } from "@/components/ui/portrait";
import { RateBubble } from "@/components/ui/rate-bubble";
import { useRoomContext } from "@/features/data/room-context";
import { useStage } from "@/features/stage/stage-context";
import { rateFoundCharacter } from "@/server/actions";
import { isAwaited, useReached } from "./match-frame";

/** Answered or closed in this browser: it does not come back on a reload. */
const askedKey = (code: string, round: number) =>
  `4dare:found-asked:${code}:${round}`;

function wasAsked(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markAsked(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // private window or blocked storage: it may ask again after a reload
  }
}

/**
 * "Enjoyed being Darth Vader?": once a player discovers their character and
 * the hit's reveal is over, a bubble at the bottom asks, once per match. It
 * steps aside while the game waits on them (an answer to give), so it never
 * covers what they must do. The answer counts for the theme's draws, like a
 * verdict on a drawn character.
 */
export function FoundFeedback() {
  const t = useTranslations("room.found");
  const tp = useTranslations("room.pick");
  const { code, view, me } = useRoomContext();
  const { area } = useStage();
  const inMatch = area === "match" || area === "result";
  const card = inMatch && me.discoveredAt !== null ? me.card : null;
  const r = view.reveal;
  const hitUntil = r?.kind === "guess" && r.byId === me.id ? r.until : null;
  const revealOver = useReached(hitUntil);
  const key = askedKey(code, view.round);
  // The key it may ask under; read after mount, as the server render knows nothing of this browser.
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    setOpen(wasAsked(key) ? null : key);
  }, [key]);
  if (!card) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+var(--dock))] z-20 flex justify-center px-4">
      <RateBubble
        key={key}
        show={
          open === key &&
          (hitUntil === null || revealOver) &&
          !isAwaited(me.status)
        }
        labels={{
          question: t("question", { name: card.name }),
          yes: t("yes"),
          no: t("no"),
          thanks: tp("rateThanks"),
          dismiss: tp("rateDismiss"),
        }}
        onAnswer={(liked) => {
          // Fire and forget, like the draw's verdict.
          void rateFoundCharacter(code, liked);
          markAsked(key);
        }}
        onDismiss={() => markAsked(key)}
        thankNo
        lead={
          <span className="mr-1.5 w-8 shrink-0">
            <Portrait src={card.imageUrl} tone="you" className="rounded-md" />
          </span>
        }
        className="pointer-events-auto max-w-full pl-1.5"
      />
    </div>
  );
}
