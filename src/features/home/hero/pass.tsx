"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Shuffle } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { Face } from "@/components/ui/face";
import { useMe } from "@/features/data/use-me";
import { openProfile } from "@/features/profile/open-profile";
import { levelOf, XP } from "@/game/profile/xp";
import { useAction } from "@/lib/hooks/use-action";
import { useDeferred } from "@/lib/hooks/use-deferred";
import { dur, ease } from "@/lib/motion";
import { meNamed, useDisplayName } from "@/lib/names";
import { rerollGuest } from "@/server/actions";
import type { Me, MeWeek } from "@/server/contract";
import { useSignIn } from "../use-sign-in";
import { loadUserMenu } from "../user-menu";
import { GardenStrip } from "./garden-strip";
import s from "./hero.module.css";

/** The account's XP and last week, for the pass card (null for a guest). */
function useWeek(me: Me | null) {
  const lang = useLocale();
  const member = !!me && !me.isGuest;
  return useQuery({
    queryKey: ["me-week", me?.id],
    enabled: member,
    queryFn: async (): Promise<MeWeek | null> => {
      const res = await fetch(`/api/me/week?lang=${lang}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`week: ${res.status}`);
      return ((await res.json()) as { week: MeWeek | null }).week;
    },
    staleTime: 60_000,
  }).data;
}

const utcMidnight = (now: number) => now - (now % 86_400_000);

/**
 * Who you are, under the way in. A guest sees the name and creature they
 * play as (a shuffle draws others) and how to sign in; an account sees its
 * level ring, XP and the day's first-match bonus, and its week as a little
 * garden. The account's card opens the user menu.
 */
export function Pass() {
  const t = useTranslations("home.hero");
  const name = useDisplayName();
  const { me, setMe } = useMe();
  const week = useWeek(me);
  const client = useQueryClient();
  const { run, pending: rolling } = useAction();
  const { signIn, pending } = useSignIn();
  const menu = useDeferred(loadUserMenu);

  if (!me) return <div className={s.pass} aria-hidden="true" />;

  if (me.isGuest) {
    const reroll = async () => {
      const r = await run(() => rerollGuest());
      if (!r.ok) return;
      setMe(r.data);
      void client.invalidateQueries({ queryKey: ["room"] });
      void client.invalidateQueries({ queryKey: ["public-rooms"] });
    };
    const who = name(meNamed(me));
    return (
      <div className={s.pass}>
        <span className={s.passCard}>
          <AnimatePresence initial={false} mode="popLayout">
            <m.span
              key={`${who}-${me.avatar.kind === "creature" ? me.avatar.dna : ""}`}
              className="flex"
              initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
              transition={{ duration: dur.base, ease: ease.soft }}
            >
              <Face avatar={me.avatar} className={`${s.face} ${s.passFace}`} />
            </m.span>
          </AnimatePresence>
          <span className={`${s.who} ${s.named}`}>
            <small>{t("youAre")}</small>
            <b>{who}</b>
          </span>
          <button
            type="button"
            className={s.shuffle}
            disabled={rolling}
            onClick={reroll}
            aria-label={t("reroll")}
            title={t("reroll")}
          >
            <Shuffle strokeWidth={2.2} aria-hidden="true" />
          </button>
        </span>
        <span className={`${s.passSide} ${s.passLink}`}>
          <span className={s.txt}>{t("signInLead")}</span>
          <span className={s.short}>{t("signInShort")}</span>
          {(["discord", "google"] as const).map((p) => (
            <button
              key={p}
              type="button"
              disabled={pending}
              onClick={() => signIn(p)}
              aria-label={p === "discord" ? "Discord" : "Google"}
              className={s.provider}
            >
              {/* biome-ignore lint/performance/noImgElement: a tiny static svg */}
              <img src={`/icons/${p}.svg`} alt="" width={18} height={18} />
            </button>
          ))}
          <span className={s.txt}>{t("signInTail")}</span>
        </span>
      </div>
    );
  }

  const xp = week?.xp ?? 0;
  const lv = levelOf(xp);
  const p = lv.into / lv.need;
  // the day's first match gives its bonus on the server's (UTC) day
  const today = utcMidnight(Date.now());
  const bonus = !!week && !week.plays.some((x) => x.at >= today);
  const who = name(meNamed(me));
  const card = (
    <button
      type="button"
      className={`${s.passCard} ${s.isBtn}`}
      aria-label={who}
      {...(menu.loaded ? {} : menu.reach)}
    >
      <span className={s.lvring} style={{ "--p": p } as CSSProperties}>
        <Face avatar={me.avatar} className={s.face} />
      </span>
      <span className={s.who}>
        <small>{t("hello", { name: who, level: lv.level })}</small>
        <span className={s.line}>
          <b>{t("xp", { xp })}</b>
          {bonus ? (
            <span
              className={s.xptag}
              title={t("dayBonusTip", { n: XP.dayFirst })}
            >
              <Gift strokeWidth={2.2} aria-hidden="true" />
              {t("dayBonus", { n: XP.dayFirst })}
            </span>
          ) : null}
        </span>
        <span className={s.xpbar} style={{ "--p": p } as CSSProperties}>
          <i />
        </span>
      </span>
    </button>
  );
  const Menu = menu.loaded;
  return (
    <div className={s.pass}>
      {Menu ? <Menu {...menu.props} anchor={card} /> : card}
      <GardenStrip
        plays={week?.plays ?? []}
        onOpen={() => me.handle && openProfile(me.handle)}
      />
    </div>
  );
}
