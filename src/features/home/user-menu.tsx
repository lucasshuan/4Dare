"use client";

import { Popover } from "@base-ui/react/popover";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Dices, LogOut, UserRoundPen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  AuthButton,
  PROVIDER_NAME,
  ProviderLogo,
} from "@/components/ui/auth-button";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { useMe } from "@/features/data/use-me";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { dur, ease } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { rerollGuest, signOut } from "@/server/actions";
import { useSignIn } from "./use-sign-in";

/** Avatar and name at the top right; the popover says who you are and how to sign in or out. */
export function UserMenu() {
  const t = useTranslations("home.user");
  const name = useDisplayName();
  const router = useRouter();
  const { me, refresh, setMe } = useMe();
  const { signIn, pending } = useSignIn();
  const { run, pending: leaving } = useAction();
  const { run: runReroll, pending: rerolling } = useAction();
  const client = useQueryClient();
  const [rolls, setRolls] = useState(0);
  const reroll = async () => {
    setRolls((n) => n + 1);
    const r = await runReroll(() => rerollGuest());
    if (!r.ok) return;
    setMe(r.data);
    // the rooms they sit in show the new name at once
    void client.invalidateQueries({ queryKey: ["room"] });
    void client.invalidateQueries({ queryKey: ["public-rooms"] });
  };

  if (!me)
    return (
      <span className="h-10 w-16 animate-pulse rounded-pill bg-sunken sm:w-40" />
    );
  return (
    <Popover.Root>
      {/* a guest's trigger looks unfinished on purpose: dashed outline, faded avatar, muted name and a "Guest" tag */}
      <Popover.Trigger
        className={cn(
          "group inline-flex h-10 min-w-0 max-w-60 items-center gap-2.5 rounded-pill py-1 pr-3 pl-1 font-semibold transition-colors duration-200 ease-soft hover:bg-sunken data-popup-open:bg-sunken",
          me.isGuest &&
            "max-w-72 border-[1.5px] border-line-strong border-dashed text-ink-muted",
        )}
      >
        <Avatar
          avatar={me.avatar}
          isGuest={me.isGuest}
          name={me.name}
          size={32}
          className={cn(me.isGuest && "opacity-60 grayscale")}
        />
        {/* phones keep only the avatar, so the bar fits next to the language and theme */}
        <span className="min-w-0 truncate max-sm:sr-only">{name(me)}</span>
        {me.isGuest ? (
          <span className="shrink-0 rounded-pill bg-line px-2 py-0.5 font-bold text-[11px] text-ink-muted uppercase tracking-wide">
            {t("guestBadge")}
          </span>
        ) : null}
        <ChevronDown
          className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-data-popup-open:rotate-180"
          strokeWidth={2}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(340px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-4 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <div className="flex items-center gap-3">
              {/* a new name and critter swap in */}
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={`${me.guestNumber}-${me.avatar.kind === "critter" ? me.avatar.seed : ""}`}
                  className="flex shrink-0"
                  initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                  transition={{ duration: dur.base, ease: ease.soft }}
                >
                  <Avatar
                    avatar={me.avatar}
                    isGuest={me.isGuest}
                    name={me.name}
                  />
                </motion.span>
              </AnimatePresence>
              <div className="flex min-w-0 flex-col">
                {/* a guest's name has the dice right beside it */}
                <span className="flex min-w-0 items-center gap-1.5">
                  <Popover.Title className="min-w-0 truncate font-semibold">
                    <AnimatePresence initial={false} mode="wait">
                      <motion.span
                        key={me.guestNumber}
                        className="block truncate"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: dur.fast, ease: ease.soft }}
                      >
                        {name(me)}
                      </motion.span>
                    </AnimatePresence>
                  </Popover.Title>
                  {me.isGuest ? (
                    <button
                      type="button"
                      aria-label={t("reroll")}
                      title={t("reroll")}
                      disabled={rerolling}
                      onClick={reroll}
                      className="flex size-7 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 ease-soft hover:bg-sunken hover:text-ink disabled:opacity-60"
                    >
                      <motion.span
                        aria-hidden="true"
                        className="flex"
                        animate={{ rotate: rolls * 360 }}
                        transition={{ duration: dur.slow, ease: ease.soft }}
                      >
                        <Dices className="size-4.5" strokeWidth={1.75} />
                      </motion.span>
                    </button>
                  ) : null}
                </span>
                <Popover.Description className="font-medium text-[13px] text-ink-muted">
                  {me.isGuest
                    ? t("guest")
                    : me.provider
                      ? t("connected", { provider: PROVIDER_NAME[me.provider] })
                      : t("account")}
                </Popover.Description>
              </div>
              {me.provider ? (
                <span className="ml-auto">
                  <ProviderLogo provider={me.provider} />
                </span>
              ) : null}
            </div>
            {me.isGuest ? (
              <>
                <p className="text-ink-muted text-sm">{t("guestHint")}</p>
                <div className="flex flex-col gap-2">
                  <AuthButton
                    wide
                    className="w-full"
                    provider="discord"
                    disabled={pending}
                    onClick={() => signIn("discord")}
                  />
                  <AuthButton
                    wide
                    className="w-full"
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
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/profile"
                  className={buttonClass("secondary", "sm")}
                >
                  <UserRoundPen strokeWidth={1.75} />
                  {t("editProfile")}
                </Link>
                <button
                  type="button"
                  disabled={leaving}
                  onClick={async () => {
                    if ((await run(() => signOut())).ok) {
                      await refresh();
                      router.push("/");
                    }
                  }}
                  className={buttonClass("ghost", "sm")}
                >
                  <LogOut strokeWidth={1.75} />
                  {t("signOut")}
                </button>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
