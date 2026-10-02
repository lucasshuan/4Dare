"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AuthButton } from "@/components/ui/auth-button";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMe } from "@/features/data/use-me";
import { Link, useRouter } from "@/i18n/navigation";
import { useDisplayName } from "@/lib/names";
import { PublicRooms } from "./public-rooms";
import { useSignIn } from "./use-sign-in";

const CODE_CHARS = /[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g;

export function HomeScreen() {
  const t = useTranslations("home");
  const router = useRouter();
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
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,500px)_minmax(0,472px)] lg:justify-between">
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="font-display font-extrabold text-[clamp(88px,12vw,120px)] leading-[0.9] tracking-[-0.03em]">
              Dare
            </h1>
            <p className="text-ink-muted text-lg">{t("pitch")}</p>
          </div>

          <Identity />

          <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
            <Link
              href="/new"
              className={buttonClass("primary", "lg", "max-sm:w-full")}
            >
              {t("create")}
            </Link>
            <form
              className="flex flex-col gap-2 max-sm:w-full"
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
                  className="h-14 w-40 min-w-0 rounded-md border-[1.5px] border-line-strong bg-surface px-4 font-medium font-mono text-2xl tracking-[0.2em] placeholder:text-line-strong max-sm:flex-1"
                />
                <Button type="submit" size="lg" disabled={code.length !== 5}>
                  {t("join")}
                </Button>
              </div>
            </form>
          </div>
        </section>

        <PublicRooms />
      </div>
    </Screen>
  );
}

/** Who you are: a guest with sign-in buttons, or an account with a link to the profile. */
function Identity() {
  const t = useTranslations("home");
  const name = useDisplayName();
  const { me } = useMe();
  const { signIn, pending } = useSignIn();

  if (!me)
    return <div className="h-[132px] animate-pulse rounded-xl bg-surface" />;
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar avatar={me.avatar} isGuest={me.isGuest} name={me.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{name(me)}</span>
          <span className="font-medium text-[13px] text-ink-muted">
            {me.isGuest ? t("guestHint") : t("accountHint")}
          </span>
        </div>
        {me.isGuest ? null : (
          <Link
            href="/profile"
            className={buttonClass("secondary", "sm", "shrink-0")}
          >
            {t("editProfile")}
          </Link>
        )}
      </div>
      {me.isGuest ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <AuthButton
              provider="discord"
              disabled={pending}
              onClick={() => signIn("discord")}
            />
            <AuthButton
              provider="google"
              disabled={pending}
              onClick={() => signIn("google")}
            />
          </div>
          {me.authMode === "local" ? (
            <span className="font-medium text-[13px] text-ink-muted">
              {t("testAccount")}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
