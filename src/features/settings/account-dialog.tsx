"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, LogOut, ShieldAlert, UserRoundCog } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { PROVIDER_NAME, ProviderLogo } from "@/components/ui/auth-button";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/toast";
import { meKey } from "@/features/data/use-me";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { meNamed, useDisplayName } from "@/lib/names";
import {
  deleteAccount,
  signOutEverywhere,
  unlinkProvider,
} from "@/server/actions";
import type { AccountInfo, Me } from "@/server/contract";

const PROVIDERS = ["discord", "google"] as const;

/**
 * The account box: e-mail, the providers to sign in with (link one more,
 * unlink one of two), the data to download, signing out everywhere, and
 * deleting the account once its @handle is typed back.
 */
export function AccountDialog({
  open,
  onOpenChange,
  me,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: Me;
}) {
  const t = useTranslations("settings.account");
  const name = useDisplayName();
  const toast = useToast();
  const router = useRouter();
  // back to this page (its language included) after the provider
  const here = typeof window === "undefined" ? "/" : window.location.pathname;
  const client = useQueryClient();
  const { run, pending } = useAction();
  const [typed, setTyped] = useState("");
  const { data: info, refetch } = useQuery({
    queryKey: ["account", me.id],
    enabled: open,
    queryFn: async (): Promise<AccountInfo | null> => {
      const res = await fetch("/api/me/account", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as AccountInfo;
    },
  });
  const linked = info?.providers ?? (me.provider ? [me.provider] : []);

  const leave = async () => {
    await client.invalidateQueries({ queryKey: meKey });
    onOpenChange(false);
    router.push("/");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      icon={<UserRoundCog strokeWidth={1.75} />}
    >
      <ScrollArea
        className="flex-1"
        contentClassName="flex flex-col gap-6 p-5 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <Avatar avatar={me.avatar} size={52} />
          <div className="flex min-w-0 flex-col">
            <b className="truncate font-bold text-[17px]">
              {name(meNamed(me))}
            </b>
            <span className="truncate font-mono text-[13px] text-ink-muted">
              @{me.handle}
            </span>
          </div>
        </div>

        <Section title={t("email")}>
          <span
            className={cn("font-semibold", !info?.email && "text-ink-muted")}
          >
            {me.authMode === "local"
              ? t("testAccount")
              : (info?.email ?? t("noEmail"))}
          </span>
        </Section>

        <Section title={t("providers")} hint={t("providersHint")}>
          <ul className="flex flex-col">
            {PROVIDERS.map((p) => {
              const on = linked.includes(p);
              return (
                <li
                  key={p}
                  className="flex items-center gap-3 border-line border-t py-2.5 first:border-t-0 first:pt-0"
                >
                  <ProviderLogo provider={p} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="font-semibold">{PROVIDER_NAME[p]}</b>
                    {on ? (
                      <span className="text-[13px] text-yes">
                        {t("connected")}
                      </span>
                    ) : null}
                  </span>
                  {on ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending || linked.length < 2}
                      title={linked.length < 2 ? t("lastOne") : undefined}
                      onClick={async () => {
                        const r = await run(() => unlinkProvider(p));
                        if (r.ok) await refetch();
                      }}
                    >
                      {t("disconnect")}
                    </Button>
                  ) : info?.canLink ? (
                    // a full trip to the provider and back, through /auth/link
                    <a
                      href={`/auth/link?${new URLSearchParams({ provider: p, next: here })}`}
                      className={buttonClass("secondary", "sm")}
                    >
                      {t("connect")}
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title={t("data")} hint={t("downloadHint")}>
          <a
            href="/api/me/export"
            download
            className={buttonClass("secondary", "sm", "self-start")}
          >
            <Download strokeWidth={1.75} />
            {t("download")}
          </a>
        </Section>

        <Section title={t("sessions")}>
          <Button
            size="sm"
            className="self-start"
            disabled={pending}
            onClick={async () => {
              const r = await run(() => signOutEverywhere());
              if (!r.ok) return;
              toast(t("signedOutAll"));
              await leave();
            }}
          >
            <LogOut strokeWidth={1.75} />
            {t("signOutAll")}
          </Button>
        </Section>

        <section className="flex flex-col gap-3 rounded-xl border-[1.5px] border-no/40 bg-no-soft/40 p-4">
          <h3 className="flex items-center gap-2 font-bold text-no">
            <ShieldAlert className="size-5" strokeWidth={1.75} />
            {t("delete")}
          </h3>
          <p className="text-[14px] text-ink-muted">{t("deleteHint")}</p>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-[13px]">
              {t("deleteType", { handle: me.handle ?? "" })}
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              className="h-11 rounded-lg border-[1.5px] border-line-strong bg-surface px-3.5 font-mono outline-none focus-visible:border-no"
            />
          </label>
          <Button
            variant="danger"
            size="sm"
            className="self-start"
            disabled={pending || typed.trim().replace(/^@/, "") !== me.handle}
            onClick={async () => {
              const r = await run(() =>
                deleteAccount(typed.trim().replace(/^@/, "")),
              );
              if (!r.ok) return;
              toast(t("deleted"));
              await leave();
            }}
          >
            {t("deleteNow")}
          </Button>
        </section>
      </ScrollArea>
    </Modal>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex flex-col">
        <h3 className="font-bold text-[15px]">{title}</h3>
        {hint ? (
          <span className="text-[13px] text-ink-muted">{hint}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
