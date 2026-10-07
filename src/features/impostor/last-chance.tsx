"use client";

import { Send } from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { keyClass } from "@/components/ui/button";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import { CardNameField } from "@/features/pick/card-name-field";
import { useStepStarted } from "@/features/room/match-frame";
import { type CardContent, cardText } from "@/game/character-search";
import type { Lang } from "@/game/types";
import { useDisplayName } from "@/lib/names";
import { guessCrewCard } from "@/server/actions";

/**
 * A caught impostor's last chance: they now know their card was the odd one
 * and type the crew's in the same search "Who am I?" uses. Everyone else
 * watches; the guess stays secret until the end.
 */
export function LastChance() {
  const t = useTranslations("impostor.last");
  const lang = useLocale() as Lang;
  const name = useDisplayName();
  const { view, code, me, playerById } = useRoomContext();
  const { act, pending } = useRoomAction();
  const started = useStepStarted();
  const [content, setContent] = useState<CardContent>({ kind: "empty" });
  const guesser = playerById(view.imp?.guessing);
  if (!guesser) return null;
  const mine = guesser.id === me.id;
  const text = cardText(content).trim();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (text) await act(() => guessCrewCard(code, text));
  };
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 py-6 text-center">
      <m.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex"
      >
        <Avatar avatar={guesser.avatar} seat={guesser.colorSlot} size={68} />
      </m.span>
      <h1 className="max-w-[640px] text-balance font-bold font-display text-[clamp(28px,4vw,44px)] leading-tight tracking-[-0.015em]">
        {mine ? t("yourTitle") : t("theirTitle", { name: name(guesser) })}
      </h1>
      <p className="max-w-[520px] text-ink-muted text-lg">
        {mine ? t("yourBody") : t("theirBody")}
      </p>
      {mine ? (
        // the send key sits beside the field, so the suggestions never cover it
        <form
          onSubmit={submit}
          className="flex w-full max-w-[560px] items-stretch gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <CardNameField
              value={content}
              onChange={setContent}
              lang={lang}
              label={t("fieldLabel")}
              readOnly={!started || pending}
              notFound={t("notListed")}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!text || !started || pending}
            aria-label={t("send")}
            className={keyClass("sky", {
              bounce: !!text,
              className: "shrink-0 px-5 text-lg sm:px-7",
            })}
          >
            <Send className="size-5" strokeWidth={2.25} />
            <span className="max-sm:hidden">{t("send")}</span>
          </button>
        </form>
      ) : null}
    </div>
  );
}
