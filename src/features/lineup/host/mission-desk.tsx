"use client";

// The presenter's desk before the auction: three missions on paper strips,
// a tap seals one; "None of these" opens a line to write their own, the
// "What for" already printed.
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { keyClass } from "@/components/ui/button";
import { useStepStarted } from "@/features/room/match-frame";
import { MISSION_LINES, MISSION_MAX } from "@/game/lineup/rules";
import type { Lang } from "@/game/types";
import { chooseMission } from "@/server/actions";
import { useLineup, useLuAction } from "../use-lineup";

/** Their own words, first letter up, as the bank's missions read. */
const capital = (text: string) =>
  text.trim().replace(/^\p{Ll}/u, (c) => c.toLocaleUpperCase());

export function MissionDesk() {
  const t = useTranslations("lineup.host.desk");
  const lang = useLocale() as Lang;
  const { lu, code } = useLineup();
  const { run, pending } = useLuAction();
  const started = useStepStarted();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const options = lu.options ?? [];
  const lines = text.split("\n").length;
  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1 text-center text-chalk">
        <h2 className="m-0 font-bold font-chalk text-[clamp(28px,4.6vw,44px)] leading-tight">
          {t("title")}
        </h2>
        <p className="m-0 font-semibold text-sm opacity-85">{t("hint")}</p>
      </div>
      {writing ? (
        <div className="flex w-full flex-col items-center gap-3">
          <label className="w-full rounded-[14px] bg-[#fffdf6] px-5 py-4 text-[#1e2433] shadow-card">
            <span className="sr-only">{t("write")}</span>
            <span className="flex gap-2">
              {t("prefix") ? (
                <b className="shrink-0 pt-1 font-display font-extrabold text-[clamp(20px,3vw,26px)]">
                  {t("prefix")}
                </b>
              ) : null}
              <textarea
                // biome-ignore lint/a11y/noAutofocus: the field is why they opened this
                autoFocus
                value={text}
                rows={Math.min(MISSION_LINES, Math.max(2, lines))}
                maxLength={MISSION_MAX}
                placeholder={t("placeholder")}
                onChange={(e) =>
                  setText(
                    e.target.value
                      .split("\n")
                      .slice(0, MISSION_LINES)
                      .join("\n"),
                  )
                }
                className="min-w-0 flex-1 resize-none bg-transparent font-display font-extrabold text-[clamp(20px,3vw,26px)] leading-snug outline-none placeholder:text-[#1e2433]/35"
              />
            </span>
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setWriting(false)}
              className="h-12 rounded-pill border-[1.5px] border-line-strong bg-surface px-5 font-bold"
            >
              {t("back")}
            </button>
            <button
              type="button"
              disabled={!started || pending || !text.trim()}
              onClick={() =>
                run(() => chooseMission(code, { text: capital(text) }))
              }
              className={keyClass("yes", { className: "h-12 px-6 text-base" })}
            >
              {t("seal")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {options.map((o, k) => (
            <m.button
              key={o.id ?? k}
              type="button"
              disabled={!started || pending}
              onClick={() => run(() => chooseMission(code, { pick: k }))}
              initial={{ opacity: 0, y: 12, rotate: k % 2 ? 1 : -1 }}
              animate={{ opacity: 1, y: 0, rotate: k % 2 ? 0.6 : -0.6 }}
              transition={{
                delay: 0.08 * k,
                type: "spring",
                stiffness: 300,
                damping: 24,
              }}
              className="w-full rounded-[12px] border-[#e5d9bd] border-b-[3px] bg-[#fffdf6] px-5 py-4 text-left font-display font-extrabold text-[#1e2433] text-[clamp(17px,2.6vw,22px)] leading-snug shadow-card transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {o.text[lang]}
            </m.button>
          ))}
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="self-center font-bold text-chalk underline underline-offset-4"
          >
            {t("none")}
          </button>
        </div>
      )}
    </div>
  );
}
