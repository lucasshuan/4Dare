"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import type { ErrorCode, PublicRoom } from "@/game/types";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { joinRoom } from "@/server/actions";
import s from "./hero.module.css";

const CODE_CHARS = /[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g;
const CODE_LENGTH = 5;

/**
 * A room's code, in glass: the go key shows once the code is whole. A listed
 * room plays the way in (`onRoom`); any other code joins straight away, or
 * says why it can't. A short code shakes.
 */
export function CodeField({
  onRoom,
  className,
}: {
  onRoom: (room: PublicRoom) => void;
  className?: string;
}) {
  const t = useTranslations("home");
  const te = useTranslations("common.errors");
  const router = useRouter();
  const id = useId();
  const { rooms } = usePublicRooms();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const latest = useRef("");

  const join = async (value: string) => {
    const listed = rooms.find((r) => r.code === value);
    if (listed) return onRoom(listed);
    latest.current = value;
    setPending(true);
    setProblem(null);
    try {
      const r = await joinRoom(value);
      if (latest.current !== value) return;
      if (r.ok) return router.push(`/r/${r.data.code}`);
      // a private room: its page asks for the password
      if (r.error === "password_required") return router.push(`/r/${value}`);
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
      className={cn(
        s.code,
        code.length === CODE_LENGTH && s.ready,
        shake && s.shake,
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        if (code.length < CODE_LENGTH) {
          setShake(false);
          requestAnimationFrame(() => setShake(true));
          setProblem(t("hero.codeShort"));
          return;
        }
        void join(code);
      }}
      onAnimationEnd={() => setShake(false)}
    >
      <label htmlFor={id} className="sr-only">
        {t("hero.code")}
      </label>
      <input
        id={id}
        value={code}
        maxLength={CODE_LENGTH}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="K7M2Q"
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${id}-problem` : undefined}
        onChange={(e) => {
          setCode(
            e.target.value
              .toUpperCase()
              .replace(CODE_CHARS, "")
              .slice(0, CODE_LENGTH),
          );
          latest.current = "";
          setProblem(null);
          setPending(false);
        }}
      />
      <button type="submit" className={s.go} aria-label={t("hero.codeGo")}>
        {pending ? (
          <LoaderCircle className="animate-spin" strokeWidth={2.4} />
        ) : (
          <ArrowRight strokeWidth={2.6} />
        )}
      </button>
      {problem ? (
        <p id={`${id}-problem`} role="alert" className={s.codeProblem}>
          {problem}
        </p>
      ) : null}
    </form>
  );
}
