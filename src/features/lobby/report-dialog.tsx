"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { reportPlayer } from "@/features/data/room-actions";
import {
  type Avatar as AvatarData,
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  type ReportReason,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";

export interface ReportTarget {
  id: string;
  name: string;
  avatar: AvatarData;
}

/**
 * Reports someone in the room: a reason, a note if they like. What the
 * person wrote in the room's chat is kept with it (nobody reads reports yet).
 */
export function ReportDialog({
  code,
  target,
  onClose,
}: {
  code: string;
  /** Who is reported; null keeps the dialog closed. */
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const t = useTranslations("lobby");
  const toast = useToast();
  const { run, pending } = useAction();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  // the last one shown, so the dialog keeps its face while it closes
  const [shown, setShown] = useState(target);
  if (target && target.id !== shown?.id) {
    setShown(target);
    setReason(null);
    setNote("");
  }
  const send = async () => {
    if (!target || !reason) return;
    const r = await run(() =>
      reportPlayer(code, { targetId: target.id, reason, note }),
    );
    if (r.ok) {
      toast(t("reportSent"));
      onClose();
    }
  };
  return (
    <Modal
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("reportTitle", { name: shown?.name ?? "" })}
      icon={<Flag strokeWidth={1.75} />}
      size="compact"
    >
      <div className="flex flex-col gap-5 overflow-y-auto p-6 max-sm:p-4">
        {shown ? (
          <div className="flex items-center gap-3">
            <Avatar avatar={shown.avatar} size={44} />
            <p className="text-ink-muted text-sm leading-snug">
              {t("reportBody", { name: shown.name })}
            </p>
          </div>
        ) : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.07em]">
            {t("reportReason")}
          </legend>
          <div className="grid grid-cols-2 gap-2 max-[420px]:grid-cols-1">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  "rounded-md border-[1.5px] px-3 py-3 text-left font-semibold text-sm transition-colors duration-150 ease-soft",
                  reason === r
                    ? "border-no bg-no-soft text-no"
                    : "border-line text-ink hover:border-line-strong hover:bg-sunken",
                )}
              >
                {t(`reportReasons.${r}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-2">
          <span className="font-semibold text-[11px] text-ink-muted uppercase tracking-[0.07em]">
            {t("reportNote")}
          </span>
          <textarea
            value={note}
            maxLength={REPORT_NOTE_MAX}
            rows={3}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none rounded-md border-[1.5px] border-line bg-surface px-3 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-sky pointer-coarse:text-base"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="danger" disabled={!reason || pending} onClick={send}>
            <Flag strokeWidth={1.75} />
            {t("reportSend")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
