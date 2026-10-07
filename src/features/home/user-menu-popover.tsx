"use client";

import { Popover } from "@base-ui/react/popover";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dices,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRoundPen,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { type ReactNode, useState } from "react";
import {
  AuthButton,
  PROVIDER_NAME,
  ProviderLogo,
} from "@/components/ui/auth-button";
import { Avatar } from "@/components/ui/avatar";
import { useMe } from "@/features/data/use-me";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import type { DeferredProps } from "@/lib/hooks/use-deferred";
import { dur, ease } from "@/lib/motion";
import { meNamed, useDisplayName } from "@/lib/names";
import { updateSettings, useSettings } from "@/lib/settings";
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
  const openSettings = () => {
    onOpenChange(false);
    setSettingsOpen(true);
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
  return (
    <>
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
                        ? t("connected", {
                            provider: PROVIDER_NAME[me.provider],
                          })
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
                  <MenuSeparator />
                  <MenuItems>
                    <MenuItem
                      icon={<Settings strokeWidth={1.75} />}
                      onClick={openSettings}
                    >
                      {t("settings")}
                    </MenuItem>
                  </MenuItems>
                  <MenuSeparator />
                  <QuickRow />
                </>
              ) : (
                <>
                  <MenuItems>
                    <MenuItem
                      icon={<UserRoundPen strokeWidth={1.75} />}
                      href="/profile"
                    >
                      {t("editProfile")}
                    </MenuItem>
                    <MenuItem
                      icon={<Settings strokeWidth={1.75} />}
                      onClick={openSettings}
                    >
                      {t("settings")}
                    </MenuItem>
                  </MenuItems>
                  <MenuSeparator />
                  <QuickRow>
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
  children,
}: {
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return href ? (
    <Link href={href} className={ITEM}>
      {icon}
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={ITEM}>
      {icon}
      {children}
    </button>
  );
}

const ICON_BUTTON =
  "flex size-9 items-center justify-center rounded-pill text-ink-muted transition-colors duration-150 ease-soft hover:bg-sunken hover:text-ink aria-pressed:bg-sunken aria-pressed:text-ink [&_svg]:size-[18px]";

/** The last row: sound on or off, light or dark, then whatever the caller adds (sign out). */
function QuickRow({ children }: { children?: ReactNode }) {
  const t = useTranslations("home.user");
  const tTheme = useTranslations("common.theme");
  const { muted } = useSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <div className="-mx-1 flex items-center gap-1">
      <button
        type="button"
        aria-pressed={!muted}
        aria-label={muted ? t("soundOff") : t("soundOn")}
        title={muted ? t("soundOff") : t("soundOn")}
        onClick={() => updateSettings((s) => ({ ...s, muted: !s.muted }))}
        className={ICON_BUTTON}
      >
        {muted ? (
          <VolumeX strokeWidth={1.75} />
        ) : (
          <Volume2 strokeWidth={1.75} />
        )}
      </button>
      <button
        type="button"
        aria-label={dark ? tTheme("light") : tTheme("dark")}
        title={dark ? tTheme("light") : tTheme("dark")}
        onClick={() => setTheme(dark ? "light" : "dark")}
        className={ICON_BUTTON}
      >
        {dark ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
      </button>
      {children}
    </div>
  );
}
