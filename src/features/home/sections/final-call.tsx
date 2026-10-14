"use client";

import { Play, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, useState } from "react";
import { Face } from "@/components/ui/face";
import { useCurrentMatch } from "@/features/data/use-current-match";
import type { JoinRequest } from "@/features/join/join-dialog";
import { LazyJoinDialog } from "@/features/join/lazy-join-dialog";
import { guestAvatar } from "@/game/guest-names";
import { useRouter } from "@/i18n/navigation";
import { NEW_ROOM } from "@/lib/routes";
import s from "./sections.module.css";

const FACES = [3, 41, 87, 130, 172, 219, 265, 311, 358, 402].map(guestAvatar);

/** The last call: there's time for a match. Play any game now, or open a room for friends. */
export function FinalCall() {
  const t = useTranslations("home");
  const router = useRouter();
  const { match } = useCurrentMatch();
  const [join, setJoin] = useState<JoinRequest | null>(null);
  return (
    <section className={s.sec} aria-labelledby="final-h">
      <div className={s.final}>
        <div className={s.qfield} aria-hidden="true" />
        <div>
          <h2 id="final-h">{t("sections.final.title")}</h2>
          <p>{t("sections.final.text")}</p>
          <div className={s.row} aria-hidden="true">
            {FACES.map((a, i) => (
              <Face
                key={a.kind === "creature" ? a.dna : i}
                avatar={a}
                className={s.face}
                size={56}
                style={{ animationDelay: `${-i * 0.3}s` } as CSSProperties}
              />
            ))}
          </div>
        </div>
        <div className={s.finalCta} inert={match ? true : undefined}>
          <button
            type="button"
            className={s.big}
            onClick={() => setJoin({ kind: "quick", game: "any" })}
            aria-label={t("hero.playAny")}
          >
            <Play aria-hidden="true" />
            {t("hero.play")}
          </button>
          <button
            type="button"
            className={s.glass}
            onClick={() => router.push(NEW_ROOM)}
          >
            <Plus aria-hidden="true" />
            <span>
              {t("hero.create")}
              <span className="max-sm:hidden">{t("hero.withFriends")}</span>
            </span>
          </button>
        </div>
      </div>
      <LazyJoinDialog request={join} onClose={() => setJoin(null)} />
    </section>
  );
}
