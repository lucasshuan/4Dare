"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type LucideIcon,
  Mail,
  MessageCircleQuestion,
  Play,
  Plus,
  Tags,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type CSSProperties, useState } from "react";
import { keyClass } from "@/components/ui/button";
import { Face } from "@/components/ui/face";
import { QUESTION } from "@/components/ui/logo";
import { useToast } from "@/components/ui/toast";
import { useGameName } from "@/features/create/game-info";
import { useMe } from "@/features/data/use-me";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { newRoom, WORKSHOP, workshopPath } from "@/lib/routes";
import type {
  WorkshopItem,
  WorkshopKind,
  WorkshopPage,
} from "@/server/community-contract";
import { voteSuggestion } from "@/server/workshop-actions";
import s from "./sections.module.css";

const KIND: Record<WorkshopKind, [LucideIcon, string]> = {
  theme: [Tags, "var(--sky)"],
  question: [MessageCircleQuestion, "var(--apricot)"],
  mission: [Mail, "#b8790f"],
};
const SHOWN = 6;
const LIVE = 2;

const gamesOf = (item: WorkshopItem): GameKey[] =>
  item.kind === "theme"
    ? (item.theme?.games ?? [])
    : item.kind === "question"
      ? ["impostor"]
      : ["lineup"];
const titleOf = (item: WorkshopItem) =>
  item.theme?.name ?? item.question?.text ?? item.mission?.text ?? "";
const pctOf = (v: WorkshopItem["votes"]) => {
  const total = v ? v.yes + v.no : 0;
  return total && v ? Math.round((v.yes / total) * 100) : 0;
};

/** The Workshop's suggestions up for a vote (the most wanted first), then a couple just gone live; the reader's own votes in them. */
export function useVoting() {
  const lang = useLocale();
  const page = (status: "voting" | "live") => ({
    queryKey: ["home-workshop", lang, status],
    queryFn: async (): Promise<WorkshopPage> => {
      const res = await fetch(`/api/workshop?status=${status}&lang=${lang}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`workshop: ${res.status}`);
      return (await res.json()) as WorkshopPage;
    },
    staleTime: 60_000,
  });
  const voting = useQuery(page("voting")).data;
  const live = useQuery(page("live")).data;
  const open = (voting?.items ?? []).filter((i) => i.status === "voting");
  const items = [
    ...open
      .slice()
      .sort(
        (a, b) =>
          pctOf(b.votes) - pctOf(a.votes) ||
          (b.votes?.yes ?? 0) - (a.votes?.yes ?? 0),
      )
      .slice(0, SHOWN),
    ...(live?.items ?? []).slice(0, LIVE),
  ];
  const count = voting
    ? Object.values(voting.counts).reduce((n, c) => n + c.voting, 0)
    : 0;
  return { items, count };
}

function Ticket({ item, index }: { item: WorkshopItem; index: number }) {
  const t = useTranslations("home.sections.ofi");
  const te = useTranslations("common.errors");
  const toast = useToast();
  const client = useQueryClient();
  const gameName = useGameName();
  const { me } = useMe();
  const [votes, setVotes] = useState(item.votes);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const live = item.status === "live";
  const [Icon, tone] = KIND[item.kind];
  const games = gamesOf(item);
  const pct = pctOf(votes);
  const total = votes ? votes.yes + votes.no : 0;

  const vote = async (want: boolean) => {
    if (!votes || busy) return;
    if (!me || me.isGuest) return toast(t("signIn"));
    const next = votes.mine === want ? null : want;
    const before = votes;
    setVotes({
      yes: votes.yes - (votes.mine === true ? 1 : 0) + (next === true ? 1 : 0),
      no: votes.no - (votes.mine === false ? 1 : 0) + (next === false ? 1 : 0),
      mine: next,
    });
    setVoted(true);
    setBusy(true);
    const r = await voteSuggestion(item.id, next).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      setVotes(before);
      toast(te(r && !r.ok ? r.error : "unknown"));
      return;
    }
    setVotes({ ...r.data, mine: next });
    void client.invalidateQueries({ queryKey: ["workshop"] });
  };

  return (
    <article
      className={cn(s.tk, live && s.live, voted && s.voted)}
      style={{ "--i": index, "--k": tone } as CSSProperties}
      onAnimationEnd={() => setVoted(false)}
    >
      <div className={s.tkTop}>
        <span className={s.kind}>
          <Icon strokeWidth={2.2} aria-hidden="true" />
          {t(`kind.${item.kind}`)}
        </span>
        <span className={cn(s.light, live ? s.green : s.amber)}>
          {live ? t("live") : t("voting")}
        </span>
      </div>
      <h4>
        <Link href={workshopPath(item.id)}>{titleOf(item)}</Link>
      </h4>
      <p className={s.tkBy}>
        {item.by ? (
          <Face avatar={item.by.avatar} className={s.face} size={40} />
        ) : null}
        <span>
          {[item.by?.name, games.map(gameName).join(" · ")]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </p>
      {votes ? (
        <>
          <div className={s.pct}>
            <b>{pct}%</b>
            <span>{t("pct", { n: total })}</span>
          </div>
          <span className={s.tkBar} aria-hidden="true">
            <i style={{ "--p": pct } as CSSProperties} />
          </span>
        </>
      ) : (
        <span className={s.tkGap} />
      )}
      <div className={s.stub}>
        {live ? (
          <Link href={newRoom(games[0] ?? "who-am-i")} className={s.stubBtn}>
            <Play strokeWidth={2.2} aria-hidden="true" />
            {t("play")}
          </Link>
        ) : (
          <>
            <button
              type="button"
              className={s.vbtn}
              aria-pressed={votes?.mine === true}
              onClick={() => vote(true)}
            >
              <ThumbsUp strokeWidth={2.2} aria-hidden="true" />
              {t("yes")}
            </button>
            <button
              type="button"
              className={cn(s.vbtn, s.no)}
              aria-pressed={votes?.mine === false}
              aria-label={t("no")}
              title={t("no")}
              onClick={() => vote(false)}
            >
              <ThumbsDown strokeWidth={2.2} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/** The Workshop as tickets: an "any idea?" one first, then each suggestion with its stub to vote on. */
export function WorkshopRail({
  voting,
}: {
  voting: ReturnType<typeof useVoting>;
}) {
  const t = useTranslations("home.sections.ofi");
  return (
    <>
      <article
        className={cn(s.tk, s.ask)}
        style={{ "--i": 0 } as CSSProperties}
      >
        <span className={s.askQ} aria-hidden="true">
          <svg viewBox="366 190 252 414" aria-hidden="true">
            <path d={QUESTION} />
          </svg>
        </span>
        <h4>{t("askTitle")}</h4>
        <p>{t("askText")}</p>
        <div className={s.stub}>
          <Link
            href={WORKSHOP}
            className={keyClass("sky", { className: s.askKey })}
          >
            <Plus aria-hidden="true" />
            {t("suggest")}
          </Link>
        </div>
      </article>
      {voting.items.map((item, i) => (
        <Ticket key={item.id} item={item} index={i + 1} />
      ))}
    </>
  );
}
