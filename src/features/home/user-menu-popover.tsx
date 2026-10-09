"use client";

import { Popover } from "@base-ui/react/popover";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dices,
  LogOut,
  Settings,
  UserRound,
  UserRoundCog,
  UserRoundPen,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import {
  AuthButton,
  PROVIDER_NAME,
  ProviderLogo,
} from "@/components/ui/auth-button";
import { Avatar } from "@/components/ui/avatar";
import { useMe } from "@/features/data/use-me";
import { accentStyle } from "@/features/profile/cover-paint";
import { LevelAvatar, XpBar } from "@/features/profile/level";
import { profilePath } from "@/features/profile/profile-link";
import { usePlayerCard } from "@/features/profile/use-profile";
import { AccountDialog } from "@/features/settings/account-dialog";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { levelOf } from "@/game/profile/xp";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tLevel = useTranslations("profile.level");
  // the level ring and bar: the account's own card, fetched with the menu
  const { data: card } = usePlayerCard(me?.id ?? "", !!me && !me.isGuest);
  const numbers = me && !me.isGuest ? (card?.numbers ?? null) : null;
  const openSettings = () => {
    onOpenChange(false);
    setSettingsOpen(true);
  };
  const [accountOpen, setAccountOpen] = useState(false);
  const openAccount = () => {
    onOpenChange(false);
    setAccountOpen(true);
  };
  const signOutNow = async () => {
    if ((await run(() => signOut())).ok) {
      await refresh();
      router.push("/");
    }
  };
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
  const face = numbers ? (
    <LevelAvatar
      avatar={me.avatar}
      xp={numbers.xp}
      stroke={3}
      tag="sm"
      on="surface"
      avatarClass="size-11 text-lg"
    />
  ) : (
    <Avatar avatar={me.avatar} />
  );
  return (
    <>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger autoFocus={autoFocus} className={userMenuTrigger(me)}>
          <UserMenuFace me={me} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} align="end" className="z-50">
            <Popover.Popup
              style={accentStyle(card?.accent ?? null, me.avatar.color)}
              className="flex w-[min(340px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-4 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0"
            >
              <div className="flex items-center gap-3">
                {/* a new name and creature swap in */}
                <AnimatePresence initial={false} mode="popLayout">
                  <m.span
                    key={`${me.guestName}-${me.avatar.kind === "creature" ? me.avatar.dna : ""}`}
                    className="flex shrink-0"
                    initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
                    transition={{ duration: dur.base, ease: ease.soft }}
                  >
                    {/* an account's face opens its profile, like "My profile" */}
                    {me.handle && !me.isGuest ? (
                      <Link
                        href={profilePath(me.handle)}
                        scroll={false}
                        aria-label={t("myProfile")}
                        title={t("myProfile")}
                        onClick={() => onOpenChange(false)}
                        className="flex rounded-pill transition-[scale] duration-200 ease-soft hover:scale-105"
                      >
                        {face}
                      </Link>
                    ) : (
                      face
                    )}
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
                      : me.handle && numbers
                        ? `@${me.handle} · ${tLevel("title", { n: levelOf(numbers.xp).level })}`
                        : me.handle
                          ? `@${me.handle}`
                          : me.provider
                            ? t("connected", {
                                provider: PROVIDER_NAME[me.provider],
                              })
                            : t("account")}
                  </Popover.Description>
                </div>
              </div>
              {numbers ? <XpBar xp={numbers.xp} /> : null}
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
                  <MenuSeparator />
                  <QuickRow onSettings={openSettings} />
                </>
              ) : (
                <>
                  <MenuItems>
                    {me.handle ? (
                      <MenuItem
                        icon={<UserRound strokeWidth={1.75} />}
                        href={profilePath(me.handle)}
                        onClick={() => onOpenChange(false)}
                      >
                        {t("myProfile")}
                      </MenuItem>
                    ) : null}
                    <MenuItem
                      icon={<UserRoundPen strokeWidth={1.75} />}
                      href={
                        me.handle
                          ? `${profilePath(me.handle)}?edit=1`
                          : "/profile"
                      }
                      onClick={() => onOpenChange(false)}
                    >
                      {t("editProfile")}
                    </MenuItem>
                    <MenuItem
                      icon={<UserRoundCog strokeWidth={1.75} />}
                      onClick={openAccount}
                      end={
                        me.provider ? (
                          <ProviderLogo provider={me.provider} />
                        ) : null
                      }
                    >
                      {t("account")}
                    </MenuItem>
                  </MenuItems>
                  <MenuSeparator />
                  <QuickRow onSettings={openSettings}>
                    <button
                      type="button"
                      disabled={leaving}
                      onClick={signOutNow}
                      className="ml-auto inline-flex h-9 items-center gap-2 rounded-pill px-3 font-semibold text-ink-muted text-sm transition-colors duration-150 ease-soft hover:bg-no-soft hover:text-no focus-visible:bg-no-soft focus-visible:text-no active:bg-no active:text-on-no disabled:opacity-45"
                    >
                      <LogOut className="size-4" strokeWidth={2} />
                      {t("signOut")}
                    </button>
                  </QuickRow>
                </>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {me.isGuest ? null : (
        <AccountDialog
          open={accountOpen}
          onOpenChange={setAccountOpen}
          me={me}
        />
      )}
    </>
  );
}

const MenuSeparator = () => <div className="-mx-4 h-px bg-line" />;

const MenuItems = ({ children }: { children: ReactNode }) => (
  <div className="-mx-2 flex flex-col">{children}</div>
);

const ITEM =
  "flex h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left font-semibold transition-colors duration-150 ease-soft hover:bg-sunken [&_svg]:size-5 [&_svg]:text-ink-muted";

/** A row of the menu: a link with `href`, a button otherwise. */
function MenuItem({
  icon,
  href,
  onClick,
  end,
  children,
}: {
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  /** At the far right of the row (the account's provider). */
  end?: ReactNode;
  children: ReactNode;
}) {
  const tail = end ? <span className="ml-auto flex">{end}</span> : null;
  return href ? (
    <Link href={href} scroll={false} onClick={onClick} className={ITEM}>
      {icon}
      {children}
      {tail}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={ITEM}>
      {icon}
      {children}
      {tail}
    </button>
  );
}

/** The last row: settings, then whatever the caller adds (sign out). */
function QuickRow({
  onSettings,
  children,
}: {
  onSettings: () => void;
  children?: ReactNode;
}) {
  const t = useTranslations("home.user");
  return (
    <div className="-mx-1 flex items-center gap-1">
      <button
        type="button"
        onClick={onSettings}
        className="inline-flex h-9 items-center gap-2 rounded-pill px-3 font-semibold text-ink-muted text-sm transition-colors duration-150 ease-soft hover:bg-sunken hover:text-ink [&_svg]:size-[18px]"
      >
        <Settings strokeWidth={1.75} />
        {t("settings")}
      </button>
      {children}
    </div>
  );
}
