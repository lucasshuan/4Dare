"use client";

import { Popover } from "@base-ui/react/popover";
import { ChevronDown, Globe, Lock, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Segmented } from "@/features/create/settings-fields";
import {
  ROOM_NAME_MAX,
  ROOM_PASSWORD_MAX,
  type RoomSettings,
} from "@/game/types";
import { cn } from "@/lib/cn";

/**
 * The room's name as the page's title. The host gets a quiet pencil beside it:
 * the title turns into a field in place, Enter or leaving it saves, Esc puts
 * it back. An empty name is not kept.
 */
export function RoomTitle({
  title,
  name,
  editable,
  className,
  onRename,
}: {
  /** What the page shows: the name, or "<host>'s room" when there is none. */
  title: string;
  name: string;
  editable: boolean;
  className: string;
  onRename: (name: string) => void;
}) {
  const t = useTranslations("lobby");
  const tc = useTranslations("home.createRoom");
  const [draft, setDraft] = useState<string | null>(null);
  const done = () => {
    const next = draft?.trim() ?? "";
    setDraft(null);
    if (next && next !== (name || title)) onRename(next);
  };

  if (draft !== null)
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          done();
        }}
      >
        <input
          // biome-ignore lint/a11y/noAutofocus: it opens on the host's own click
          autoFocus
          aria-label={tc("roomName")}
          value={draft}
          maxLength={ROOM_NAME_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={done}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDraft(null);
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            className,
            "-mx-1 w-full rounded-sm bg-transparent px-1 shadow-[inset_0_-3px_0_var(--sky)] outline-none!",
          )}
        />
      </form>
    );

  return (
    <h1 className={cn(className, "wrap-break-word")}>
      {title}
      {editable ? (
        <button
          type="button"
          aria-label={t("rename")}
          onClick={() => setDraft(name || title)}
          className="ml-2 inline-flex size-10 translate-y-[-0.1em] items-center justify-center rounded-pill align-middle text-ink-muted transition-colors duration-200 ease-soft hover:bg-surface hover:text-ink"
        >
          <PenLine className="size-5" strokeWidth={2} />
        </button>
      ) : null}
    </h1>
  );
}

/**
 * Who can join, as a settings row; the host's row opens a dropdown to make
 * the room public or private (with its password).
 */
export function VisibilityRow({
  settings,
  editable,
  pending,
  onSave,
}: {
  settings: Pick<RoomSettings, "visibility" | "password">;
  editable: boolean;
  pending: boolean;
  onSave: (
    v: Pick<RoomSettings, "visibility" | "password">,
  ) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const tc = useTranslations("home.createRoom");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const isPublic = settings.visibility === "public";
  const Icon = isPublic ? Globe : Lock;
  const text = (
    <>
      {t(isPublic ? "public" : "private")}
      {/* the host shares the password; nobody else gets it */}
      {!isPublic && settings.password ? (
        <span className="ml-1.5 rounded-sm bg-sunken px-1.5 py-0.5 font-mono text-[13px]">
          {settings.password}
        </span>
      ) : null}
    </>
  );
  const icon = (
    <Icon className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
  );

  if (!editable)
    return (
      <li className="flex items-center gap-3">
        {icon}
        <span>{text}</span>
      </li>
    );

  const missing = draft.visibility === "private" && !draft.password.trim();
  return (
    <li>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setDraft(settings);
        }}
      >
        <Popover.Trigger
          aria-label={t("editVisibility")}
          className={cn(
            "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-1 text-left transition-colors duration-200 ease-soft hover:bg-sunken",
            open && "bg-sunken",
          )}
        >
          {icon}
          <span className="min-w-0 flex-1">{text}</span>
          <ChevronDown
            className={cn(
              "size-4.5 shrink-0 text-ink-muted transition-transform duration-200 ease-soft",
              open && "rotate-180",
            )}
            strokeWidth={2.25}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            className="z-50"
          >
            <Popover.Popup className="w-[min(320px,calc(100vw-2rem))] origin-(--transform-origin) rounded-md bg-surface p-4 shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
              <form
                className="flex flex-col gap-4"
                onSubmit={async (e: FormEvent) => {
                  e.preventDefault();
                  if (missing) return;
                  const saved = await onSave({
                    visibility: draft.visibility,
                    password:
                      draft.visibility === "private"
                        ? draft.password.trim()
                        : "",
                  });
                  if (saved) setOpen(false);
                }}
              >
                <div className="flex flex-col gap-2">
                  <span className="font-semibold text-sm">
                    {tc("visibility")}
                  </span>
                  <Segmented
                    label={tc("visibility")}
                    options={["public", "private"] as const}
                    value={draft.visibility}
                    onChange={(visibility) =>
                      setDraft((d) => ({ ...d, visibility }))
                    }
                    render={(v) => tc(v)}
                  />
                </div>
                {draft.visibility === "private" ? (
                  <TextField
                    label={tc("password")}
                    placeholder={tc("passwordPlaceholder")}
                    value={draft.password}
                    max={ROOM_PASSWORD_MAX}
                    autoComplete="off"
                    spellCheck={false}
                    data-1p-ignore
                    data-lpignore="true"
                    aria-invalid={missing}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, password: e.target.value }))
                    }
                  />
                ) : null}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={missing || pending}
                  >
                    {t("saveSettings")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </li>
  );
}
