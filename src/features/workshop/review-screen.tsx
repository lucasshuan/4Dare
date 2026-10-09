"use client";

import { ArrowLeft, Check, Eye, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Flag } from "@/components/ui/language-switch";
import { PageHead } from "@/components/ui/page-head";
import { PlayerName } from "@/components/ui/player-name";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { LANGS, type Lang } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { WORKSHOP } from "@/lib/routes";
import type { Translations } from "@/server/community-contract";
import type { ReviewItem } from "@/server/workshop";
import {
  approveSuggestion,
  refuseSuggestion,
  reviewSuggestion,
} from "@/server/workshop-actions";
import { MissionObject, QuestionObject, Sema, ThemeObject } from "./objects";
import { useRefreshWorkshop, useReviewQueue } from "./use-workshop";

/**
 * /workshop/review: the curators' queue, most wanted first. Each suggestion
 * with its votes, its texts in all four languages (the wand's and the
 * suggester's, editable; missing ones in red), and the three decisions:
 * put it live, mark it as being looked at, or leave it out saying why.
 */
export function ReviewScreen() {
  const t = useTranslations("workshop.reviewPage");
  const { data, isError } = useReviewQueue();
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <Link href={WORKSHOP} className={buttonClass("ghost", "md")}>
            <ArrowLeft className="size-5" strokeWidth={1.75} />
            {t("back")}
          </Link>
        }
      />
      {isError ? (
        <p className="rounded-[24px] border border-line-strong border-dashed p-7 font-semibold">
          {t("notCurator")}
        </p>
      ) : !data ? (
        <div className="grid gap-4">
          {["a", "b", "c"].map((k) => (
            <span
              key={k}
              className="h-[220px] animate-pulse rounded-[24px] bg-sunken"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="rounded-[24px] border border-line-strong border-dashed p-7 font-bold font-display text-[19px]">
          {t("empty")}
        </p>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence initial={false}>
            {data.map((item, i) => (
              <Entry key={item.suggestion.id} item={item} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </Screen>
  );
}

function Entry({ item, index }: { item: ReviewItem; index: number }) {
  const t = useTranslations("workshop.reviewPage");
  const tErrors = useTranslations("common.errors");
  const locale = useLocale();
  const toast = useToast();
  const refresh = useRefreshWorkshop();
  const s = item.suggestion;
  const keys = Object.keys(item.pieces);
  const [tr, setTr] = useState<Translations>(s.translations);
  const [reason, setReason] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [busy, setBusy] = useState(false);
  const langName = new Intl.DisplayNames([locale], { type: "language" });
  const textIn = (l: Lang, k: string) =>
    l === s.lang ? item.pieces[k] : (tr[l]?.[k] ?? "");
  const complete = LANGS.every((l) => keys.every((k) => textIn(l, k).trim()));

  const act = async (
    work: () => Promise<{ ok: boolean; error?: string }>,
    done: string,
  ) => {
    setBusy(true);
    const r = await work().catch(() => ({ ok: false, error: "unknown" }));
    setBusy(false);
    if (!r.ok) return toast(tErrors((r.error ?? "unknown") as "unknown"));
    toast(done);
    refresh();
  };

  const d = s.draft;
  return (
    <m.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.24 } }}
      transition={{
        duration: 0.42,
        ease: ease.soft,
        delay: Math.min(index, 8) * 0.04,
      }}
      className="grid gap-5 rounded-[24px] border border-line bg-surface p-4 sm:grid-cols-[260px_minmax(0,1fr)] sm:p-5"
    >
      <div className="grid content-start gap-3">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-muted">
          <Sema status={s.status} />
          {item.by ? <PlayerName player={item.by} /> : null}
        </div>
        {d.kind === "theme" ? (
          <ThemeObject
            name={d.theme.name}
            set={d.theme.set}
            starters={item.starters}
          />
        ) : d.kind === "question" ? (
          <QuestionObject question={{ ...d.question, themeName: null }} />
        ) : (
          <MissionObject mission={d.mission} />
        )}
        <span className="font-semibold text-[13px]">
          {t("votes", { yes: s.yes, no: s.no })}
        </span>
      </div>
      <div className="grid content-start gap-3">
        <div className="grid gap-2">
          {LANGS.map((l) => (
            <div
              key={l}
              className="grid gap-1.5 rounded-[14px] bg-sunken p-2.5 sm:grid-cols-[86px_minmax(0,1fr)] sm:items-start"
            >
              <span className="flex items-center gap-1.5 pt-1.5 font-medium font-mono text-[12px] uppercase">
                <Flag lang={l} className="size-[18px]" />
                {l}
                {l === s.lang ? (
                  <span className="font-sans text-[11px] text-ink-muted normal-case">
                    {t("original")}
                  </span>
                ) : null}
              </span>
              <div className="grid gap-1.5">
                {keys.map((k) => {
                  const v = textIn(l, k);
                  return (
                    <input
                      key={k}
                      value={v}
                      readOnly={l === s.lang}
                      aria-label={`${langName.of(l)}: ${item.pieces[k]}`}
                      placeholder={item.pieces[k]}
                      onChange={(e) =>
                        setTr((all) => ({
                          ...all,
                          [l]: { ...(all[l] ?? {}), [k]: e.target.value },
                        }))
                      }
                      className={cn(
                        "h-9 w-full min-w-0 rounded-[11px] border bg-surface px-2.5 text-[14px] outline-none focus-visible:border-sky focus-visible:outline-none",
                        l === s.lang &&
                          "border-transparent bg-transparent font-semibold",
                        l !== s.lang &&
                          (v.trim()
                            ? "border-line-strong"
                            : "border-no bg-no-soft"),
                      )}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {!complete ? (
          <p className="text-[13px] text-no font-semibold">{t("needAll")}</p>
        ) : null}
        <AnimatePresence initial={false}>
          {refusing ? (
            <m.label
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid gap-1.5 overflow-hidden"
            >
              <span className="font-semibold text-[14px]">{t("reason")}</span>
              <textarea
                value={reason}
                rows={2}
                maxLength={300}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPh")}
                className="w-full resize-none rounded-[14px] border border-line-strong bg-surface px-3 py-2 text-[14px] outline-none focus-visible:border-sky focus-visible:outline-none"
              />
            </m.label>
          ) : null}
        </AnimatePresence>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={busy || !complete}
            onClick={() =>
              act(() => approveSuggestion(s.id, tr), t("approved"))
            }
          >
            <Check className="size-5" strokeWidth={2} />
            {t("approve")}
          </Button>
          {s.status === "voting" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => act(() => reviewSuggestion(s.id), t("marked"))}
            >
              <Eye className="size-5" strokeWidth={1.75} />
              {t("mark")}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            disabled={busy || (refusing && reason.trim().length < 3)}
            onClick={() =>
              refusing
                ? act(() => refuseSuggestion(s.id, reason), t("refused"))
                : setRefusing(true)
            }
          >
            <X className="size-5" strokeWidth={1.75} />
            {t("refuse")}
          </Button>
        </div>
      </div>
    </m.article>
  );
}
