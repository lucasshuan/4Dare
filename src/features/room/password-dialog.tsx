"use client";

import { Dialog } from "@base-ui/react/dialog";
import { LockKeyhole } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ROOM_PASSWORD_MAX } from "@/game/types";

/**
 * Asks a newcomer for the password of a private room. `onSubmit` resolves to
 * an error message to show (wrong password) or null once they are in.
 */
export function PasswordDialog({
  onSubmit,
  onCancel,
}: {
  onSubmit: (password: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const t = useTranslations("room.password");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // a new error shakes the box, even when it is the same text again
  const [tries, setTries] = useState(0);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-scrim transition-opacity duration-200 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="-translate-x-1/2 -translate-y-1/2 fixed top-1/2 left-1/2 z-50 w-[min(400px,calc(100vw-2rem))] rounded-xl bg-canvas p-6 shadow-pop outline-none transition-[scale,opacity] duration-200 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0 sm:p-7">
          <motion.form
            key={tries}
            animate={tries ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!value.trim() || pending) return;
              setPending(true);
              const problem = await onSubmit(value);
              setPending(false);
              if (problem) {
                setError(problem);
                setTries((n) => n + 1);
              }
            }}
          >
            <span className="flex size-12 items-center justify-center rounded-pill bg-butter-soft text-ink">
              <LockKeyhole className="size-6" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col gap-1.5">
              <Dialog.Title className="font-bold font-display text-2xl">
                {t("title")}
              </Dialog.Title>
              <Dialog.Description className="text-ink-muted">
                {t("body")}
              </Dialog.Description>
            </div>
            <div className="flex flex-col gap-2">
              <TextField
                label={t("label")}
                type="password"
                value={value}
                maxLength={ROOM_PASSWORD_MAX}
                autoFocus
                autoComplete="off"
                aria-invalid={!!error}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
              />
              {error ? (
                <span role="alert" className="font-medium text-[13px] text-no">
                  {error}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={pending || !value.trim()}
              >
                {t("enter")}
              </Button>
              <Button variant="ghost" onClick={onCancel}>
                {t("back")}
              </Button>
            </div>
          </motion.form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
