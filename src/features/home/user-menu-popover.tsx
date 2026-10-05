"use client";

import { Popover } from "@base-ui/react/popover";
import { useQueryClient } from "@tanstack/react-query";
import { Dices, LogOut, UserRoundPen } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
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
import { useAction } from "@/lib/hooks/use-action";
import type { DeferredProps } from "@/lib/hooks/use-deferred";
import { dur, ease } from "@/lib/motion";
import { meNamed, useDisplayName } from "@/lib/names";
import { rerollGuest, signOut } from "@/server/actions";
import { useSignIn } from "./use-sign-in";
import { UserMenuFace, userMenuTrigger } from "./user-menu";

/** The user menu itself, loaded after the page (user-menu.tsx shows a stand-in until then). */
export function UserMenuPopover({
  open,
  onOpenChange,
  autoFocus,
}: DeferredProps) {
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

  if (!me) return null;
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger autoFocus={autoFocus} className={userMenuTrigger(me)}>
        <UserMenuFace me={me} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(340px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-4 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <div className="flex items-center gap-3">
              {/* a new name and critter swap in */}
              <AnimatePresence initial={false} mode="popLayout">
                <m.span
                  key={`${me.guestName}-${me.avatar.kind === "critter" ? me.avatar.seed : ""}`}
                  className="flex shrink-0"
                  initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                  transition={{ duration: dur.base, ease: ease.soft }}
                >
                  <Avatar avatar={me.avatar} />
                </m.span>
              </AnimatePresence>
              <div className="flex min-w-0 flex-col">
                {/* a guest's name has the dice right beside it */}
                <span className="flex min-w-0 items-center gap-1.5">
                  <Popover.Title className="min-w-0 truncate font-semibold">
                    <AnimatePresence initial={false} mode="wait">
                      <m.span
                        key={me.guestName}
                        className="block truncate"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: dur.fast, ease: ease.soft }}
                      >
                        {name(meNamed(me))}
                      </m.span>
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
                      <m.span
                        aria-hidden="true"
                        className="flex"
                        animate={{ rotate: rolls * 360 }}
                        transition={{ duration: dur.slow, ease: ease.soft }}
                      >
                        <Dices className="size-4.5" strokeWidth={1.75} />
                      </m.span>
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
