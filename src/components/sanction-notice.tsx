"use client";

import { Ban, Megaphone, VolumeX } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { useMe } from "@/features/data/use-me";
import { readSanctionNotice } from "@/server/actions";

const ICON = { warn: Megaphone, mute: VolumeX, ban: Ban };
const seenKey = (id: number) => `dare:notice:${id}`;

/**
 * What the 4Dare team decided about the person, once when they come in: a
 * warning (shown until they read it), a mute or a ban (once per visit).
 */
export function SanctionNotice() {
  const t = useTranslations("common.notice");
  const format = useFormatter();
  const { me, refresh } = useMe();
  const [closed, setClosed] = useState<number | null>(null);
  const n = me?.notice ?? null;
  let seen = false;
  if (n && n.kind !== "warn")
    try {
      seen = sessionStorage.getItem(seenKey(n.id)) === "1";
    } catch {}
  if (!n || seen || closed === n.id) return null;
  const Icon = ICON[n.kind];
  const close = () => {
    setClosed(n.id);
    if (n.kind === "warn") void readSanctionNotice(n.id).then(() => refresh());
    else
      try {
        sessionStorage.setItem(seenKey(n.id), "1");
      } catch {}
  };
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={t(n.kind)}
      icon={<Icon strokeWidth={1.75} />}
      size="compact"
    >
      <div className="flex flex-col gap-4 p-6 max-sm:p-4">
        {n.kind !== "warn" ? (
          <p className="text-ink-muted text-sm">
            {t(n.kind === "ban" ? "banBody" : "muteBody")}{" "}
            {n.until
              ? t("until", {
                  date: format.dateTime(n.until, {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : t("forever")}
          </p>
        ) : null}
        {n.reason ? (
          <blockquote className="rounded-xl bg-sunken px-4 py-3 text-sm">
            {n.kind !== "warn" ? (
              <b className="mb-1 block text-ink-muted text-xs">{t("why")}</b>
            ) : null}
            {n.reason}
          </blockquote>
        ) : null}
        <Button onClick={close}>{t("ok")}</Button>
      </div>
    </Modal>
  );
}
