"use client";

import { LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import type { ErrorCode } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { joinRoom } from "@/server/actions";

const CODE_CHARS = /[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g;
const CODE_LENGTH = 5;

/** Typing the fifth character joins the room, or says why it can't. No button. */
export function JoinByCode() {
  const t = useTranslations("home");
  const te = useTranslations("common.errors");
  const router = useRouter();
  const id = useId();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // A late answer for a code the player already changed is ignored.
  const latest = useRef("");

  const tryJoin = async (value: string) => {
    latest.current = value;
    setPending(true);
    setProblem(null);
    try {
      const r = await joinRoom(value);
      if (latest.current !== value) return;
      if (r.ok) return router.push(`/r/${r.data.code}`);
      setProblem(
        r.error === "not_found" ? t("codeNotFound") : te(r.error as ErrorCode),
      );
    } catch {
      if (latest.current === value) setProblem(te("unknown"));
    } finally {
      if (latest.current === value) setPending(false);
    }
  };

  return (
    <form
      className="relative flex flex-col gap-2 max-sm:w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === CODE_LENGTH && !pending) void tryJoin(code);
      }}
    >
      <label htmlFor={id} className="font-semibold text-sm">
        {t("joinLabel")}
      </label>
      <div className="relative">
        <input
          id={id}
          value={code}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="K7M2Q"
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `${id}-problem` : undefined}
          onChange={(e) => {
            const next = e.target.value
              .toUpperCase()
              .replace(CODE_CHARS, "")
              .slice(0, CODE_LENGTH);
            setCode(next);
            if (next.length < CODE_LENGTH) {
              latest.current = "";
              setProblem(null);
              setPending(false);
            } else if (next !== latest.current) {
              void tryJoin(next);
            }
          }}
          className={cn(
            "h-14 w-56 min-w-0 rounded-md border-[1.5px] bg-surface px-4 pr-12 font-medium font-mono text-2xl tracking-[0.2em] transition-colors placeholder:text-line-strong max-sm:w-full",
            problem ? "border-no" : "border-line-strong",
          )}
        />
        {pending ? (
          <LoaderCircle
            aria-label={t("joining")}
            className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-ink-muted"
            strokeWidth={2}
          />
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {problem ? (
          <motion.p
            key={problem}
            id={`${id}-problem`}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            // below the field without moving it, so "Create room" stays aligned
            className="absolute top-full left-0 mt-1.5 font-medium text-no text-sm"
          >
            {problem}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
