"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMe } from "@/features/data/use-me";
import { Link, useRouter } from "@/i18n/navigation";
import { useDisplayName } from "@/lib/names";

const CODE_CHARS = /[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g;

export function HomeScreen() {
  const t = useTranslations("home");
  const name = useDisplayName();
  const router = useRouter();
  const { me } = useMe();
  const [code, setCode] = useState("");

  return (
    <Screen
      left={<span />}
      right={
        <>
          <LanguageSwitch />
          <ThemeToggle />
        </>
      }
    >
      <section className="flex max-w-[560px] flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="font-display font-extrabold text-[clamp(88px,12vw,120px)] leading-[0.9] tracking-[-0.03em]">
            Dare
          </h1>
          <p className="text-ink-muted text-lg">{t("pitch")}</p>
        </div>

        {me ? (
          <div className="flex items-center gap-3 rounded-lg bg-surface p-4">
            <Avatar avatar={me.avatar} isGuest={me.isGuest} name={me.name} />
            <div className="flex flex-col">
              <span className="font-semibold">{name(me)}</span>
              <span className="font-medium text-[13px] text-ink-muted">
                {me.isGuest ? t("guestHint") : t("accountHint")}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-[76px] animate-pulse rounded-lg bg-surface" />
        )}

        <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
          <Link href="/new" className={buttonClass("primary", "lg")}>
            {t("create")}
          </Link>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 5) router.push(`/r/${code}`);
            }}
          >
            <label htmlFor="join-code" className="font-semibold text-sm">
              {t("joinLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="join-code"
                value={code}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="K7M2Q"
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(CODE_CHARS, "")
                      .slice(0, 5),
                  )
                }
                className="h-14 w-40 rounded-md border-[1.5px] border-line-strong bg-surface px-4 font-medium font-mono text-2xl tracking-[0.2em] placeholder:text-line-strong"
              />
              <Button type="submit" size="lg" disabled={code.length !== 5}>
                {t("join")}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Screen>
  );
}
