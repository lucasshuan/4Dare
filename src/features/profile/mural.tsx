"use client";

import { Popover } from "@base-ui/react/popover";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { EyeOff, Flag, MoreHorizontal } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import {
  deleteMuralLine,
  postMuralLine,
  reportMuralLine,
} from "@/server/actions";
import type { MuralLine, MuralView } from "@/server/contract";
import { ProfileLink } from "./profile-link";

const BODY_MAX = 200;
const muralKey = (handle: string) => ["mural", handle] as const;

/** The mural's pages, newest first; each next page is older than the last line. */
function useMural(handle: string) {
  const lang = useLocale();
  return useInfiniteQuery({
    queryKey: muralKey(handle),
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }): Promise<MuralView | null> => {
      const before = pageParam === null ? "" : `&before=${pageParam}`;
      const res = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/mural?lang=${lang}${before}`,
        { cache: "no-store" },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`mural: ${res.status}`);
      return (await res.json()) as MuralView;
    },
    getNextPageParam: (last) =>
      last?.more ? (last.lines.at(-1)?.at ?? null) : null,
    staleTime: 15_000,
  });
}

/**
 * A profile's mural: a line of up to 200 characters for accounts the owner
 * lets write, replies one level deep, the owner taking down any line, three
 * reports hiding one. Guests read it; they just don't get the box.
 */
export function MuralPanel({ handle }: { handle: string }) {
  const t = useTranslations("profile.mural");
  const client = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMural(handle);
  const first = data?.pages[0] ?? null;
  const lines = (data?.pages ?? []).flatMap((p) => p?.lines ?? []);
  const refresh = () =>
    client.invalidateQueries({ queryKey: muralKey(handle) });
  if (!data) return null;
  return (
    <div className="flex flex-col gap-4">
      {first?.canWrite ? (
        <Composer
          handle={handle}
          parentId={null}
          placeholder={t("placeholder")}
          onDone={refresh}
        />
      ) : null}
      {lines.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <Line
              key={line.id}
              line={line}
              handle={handle}
              canReply={!!first?.canReply}
              onChange={refresh}
            />
          ))}
        </ul>
      )}
      {hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {t("older")}
        </Button>
      ) : null}
    </div>
  );
}

/** The box to write a line or a reply, counting down to 200. */
function Composer({
  handle,
  parentId,
  placeholder,
  onDone,
  onCancel,
  autoFocus,
}: {
  handle: string;
  parentId: number | null;
  placeholder: string;
  onDone: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const t = useTranslations("profile.mural");
  const { run, pending } = useAction();
  const [body, setBody] = useState("");
  const length = [...body.trim()].length;
  const send = async () => {
    const r = await run(() => postMuralLine(handle, body, parentId));
    if (!r.ok) return;
    setBody("");
    onDone();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (length && !pending) void send();
      }}
      className={cn(
        "flex flex-col gap-2 rounded-xl",
        parentId === null ? "bg-surface p-3.5" : "bg-sunken p-2.5",
      )}
    >
      <textarea
        value={body}
        rows={parentId === null ? 2 : 1}
        maxLength={BODY_MAX + 20}
        placeholder={placeholder}
        aria-label={parentId === null ? t("label") : placeholder}
        // biome-ignore lint/a11y/noAutofocus: a reply box opens to be typed in
        autoFocus={autoFocus}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (length && length <= BODY_MAX && !pending) void send();
          }
        }}
        className="w-full resize-none rounded-lg border-0 bg-transparent px-1 py-1 font-medium text-[15px] outline-none placeholder:text-ink-muted"
      />
      <div className="flex items-center justify-end gap-2">
        <span
          className={cn(
            "mr-auto font-mono text-[12px]",
            length > BODY_MAX ? "text-no" : "text-ink-muted",
          )}
        >
          {length} / {BODY_MAX}
        </span>
        {onCancel ? (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant="primary"
          disabled={!length || length > BODY_MAX || pending}
        >
          {parentId === null ? t("publish") : t("reply")}
        </Button>
      </div>
    </form>
  );
}

/** One line: who, when, what, its replies and what the reader may do with it. */
function Line({
  line,
  handle,
  canReply,
  onChange,
  reply = false,
}: {
  line: MuralLine;
  handle: string;
  canReply: boolean;
  onChange: () => void;
  reply?: boolean;
}) {
  const t = useTranslations("profile.mural");
  const format = useFormatter();
  const toast = useToast();
  const client = useQueryClient();
  const { run } = useAction();
  // "2 h ago" counts from when the mural was read
  const [now] = useState(Date.now);
  const [replying, setReplying] = useState(false);
  const [armed, setArmed] = useState(false);
  // "Delete" asks once more; the question goes away on its own
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);
  const remove = async () => {
    if (!armed) return setArmed(true);
    const r = await run(() => deleteMuralLine(line.id));
    if (!r.ok) return;
    // gone at once, before the refetch
    client.setQueryData<InfiniteData<MuralView | null>>(
      muralKey(handle),
      (old) =>
        old && {
          ...old,
          pages: old.pages.map(
            (p) =>
              p && {
                ...p,
                lines: p.lines
                  .filter((l) => l.id !== line.id)
                  .map((l) => ({
                    ...l,
                    replies: l.replies.filter((x) => x.id !== line.id),
                  })),
              },
          ),
        },
    );
    onChange();
  };
  const report = async () => {
    const r = await run(() => reportMuralLine(line.id));
    if (r.ok) toast(t("reported"));
  };
  const action =
    "rounded-pill px-2.5 py-1 font-semibold text-[12.5px] text-ink-muted transition-colors duration-150 hover:bg-sunken hover:text-ink";
  return (
    <li
      className={cn(
        "flex gap-3",
        reply ? "mt-3" : "rounded-xl bg-surface p-3.5 sm:p-4",
      )}
    >
      <ProfileLink
        handle={line.author.handle}
        className="flex shrink-0 self-start rounded-pill"
      >
        <Avatar avatar={line.author.avatar} size={reply ? 26 : 40} />
      </ProfileLink>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <ProfileLink
            handle={line.author.handle}
            className="font-bold text-[15px] underline-offset-2 hover:underline"
          >
            {line.author.name}
          </ProfileLink>
          <span className="font-mono text-[12.5px] text-ink-muted">
            @{line.author.handle}
          </span>
          <time
            dateTime={new Date(line.at).toISOString()}
            className="text-[12.5px] text-ink-muted"
          >
            {format.relativeTime(line.at, now)}
          </time>
        </div>
        {line.hidden ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-pill bg-no-soft px-2.5 py-0.5 font-semibold text-[12px] text-no">
            <EyeOff className="size-3.5" strokeWidth={2} />
            {t("hiddenNote")}
          </span>
        ) : null}
        <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
          {line.body}
        </p>
        <div className="-ml-2.5 flex flex-wrap items-center">
          {!reply && canReply ? (
            <button
              type="button"
              className={action}
              onClick={() => setReplying(true)}
            >
              {t("reply")}
            </button>
          ) : null}
          {line.canDelete ? (
            <button
              type="button"
              className={cn(
                action,
                "hover:bg-no-soft hover:text-no",
                armed && "bg-no text-on-no hover:bg-no hover:text-on-no",
              )}
              onClick={remove}
              onBlur={() => setArmed(false)}
            >
              {armed ? t("deleteConfirm") : t("delete")}
            </button>
          ) : null}
          {!line.mine ? (
            <Popover.Root>
              <Popover.Trigger
                aria-label={t("more")}
                className={cn(action, "flex")}
              >
                <MoreHorizontal className="size-4" strokeWidth={2} />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner
                  sideOffset={6}
                  align="start"
                  className="z-[60]"
                >
                  <Popover.Popup className="rounded-lg bg-surface p-1 shadow-pop outline-none">
                    <Popover.Close
                      onClick={report}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-semibold text-sm hover:bg-sunken"
                    >
                      <Flag
                        className="size-4 text-ink-muted"
                        strokeWidth={1.75}
                      />
                      {t("report")}
                    </Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          ) : null}
        </div>
        {line.replies.length ? (
          <ul className="flex flex-col">
            {line.replies.map((r) => (
              <Line
                key={r.id}
                line={r}
                handle={handle}
                canReply={false}
                onChange={onChange}
                reply
              />
            ))}
          </ul>
        ) : null}
        {replying ? (
          <div className="mt-2">
            <Composer
              handle={handle}
              parentId={line.id}
              placeholder={t("replyPlaceholder", { name: line.author.name })}
              autoFocus
              onCancel={() => setReplying(false)}
              onDone={() => {
                setReplying(false);
                onChange();
              }}
            />
          </div>
        ) : null}
      </div>
    </li>
  );
}
