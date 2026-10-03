"use client";

import { Popover } from "@base-ui/react/popover";
import { ChevronDown, LogOut, UserRoundPen } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useDisplayName } from "@/lib/names";
import { signOut } from "@/server/actions";
import { useSignIn } from "./use-sign-in";

/** Avatar and name at the top right; the popover says who you are and how to sign in or out. */
export function UserMenu() {
  const t = useTranslations("home.user");
  const name = useDisplayName();
  const router = useRouter();
  const { me, refresh } = useMe();
  const { signIn, pending } = useSignIn();
  const { run, pending: leaving } = useAction();

  if (!me)
    return (
      <span className="h-10 w-16 animate-pulse rounded-pill bg-sunken sm:w-40" />
    );
  return (
    <Popover.Root>
      <Popover.Trigger className="group inline-flex h-10 min-w-0 max-w-60 items-center gap-2.5 rounded-pill py-1 pr-3 pl-1 font-semibold transition-colors duration-200 ease-soft hover:bg-sunken data-popup-open:bg-sunken">
        <Avatar
          avatar={me.avatar}
          isGuest={me.isGuest}
          name={me.name}
          size={32}
        />
        {/* phones keep only the avatar, so the bar fits next to the language and theme */}
        <span className="min-w-0 truncate max-sm:sr-only">{name(me)}</span>
        <ChevronDown
          className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-data-popup-open:rotate-180"
          strokeWidth={2}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="flex w-[min(340px,calc(100vw-2rem))] origin-[var(--transform-origin)] flex-col gap-4 rounded-xl bg-surface p-4 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <div className="flex items-center gap-3">
              <Avatar avatar={me.avatar} isGuest={me.isGuest} name={me.name} />
              <div className="flex min-w-0 flex-col">
                <Popover.Title className="truncate font-semibold">
                  {name(me)}
                </Popover.Title>
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
