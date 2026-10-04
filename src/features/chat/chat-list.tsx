"use client";

import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useWithNames } from "@/components/ui/player-name";
import { useRoomContext } from "@/features/data/room-context";
import type { ChatPerson, SystemLine } from "@/game/chat";
import { themeSetEmoji } from "@/game/theme-sets";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { seatInk } from "@/lib/seats";
import { isEmojiOnly } from "./chat-ui";
import type { ChatLine } from "./use-chat";

/** Within this many px of the bottom, a new line scrolls the list down. */
const STICK_PX = 32;

/**
 * The open chat's messages, oldest first and bottom-aligned: others' lines
 * with their face and name, yours on the right in sky blue, emoji-only lines
 * big, system lines as centred pills. Lines that arrive while it is open rise
 * in; it keeps to the bottom when it was there (and always after you send).
 */
export function ChatList({
  messages,
  onRetry,
}: {
  messages: ChatLine[];
  onRetry: (id: number) => void;
}) {
  const t = useTranslations("chat");
  const { me } = useRoomContext();
  const ref = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  // lines already there when the chat opened, and your lines whose saved copy
  // replaced the one on its way, show without an entrance
  const still = useRef<Set<number> | null>(null);
  if (still.current === null)
    still.current = new Set(messages.map((m) => m.id));
  const sending = useRef<string[]>([]);
  const outbox = messages.filter((m) => m.id < 0);
  for (const m of messages)
    if (
      m.id > 0 &&
      m.by === me.id &&
      m.text !== null &&
      !still.current.has(m.id) &&
      sending.current.includes(m.text) &&
      !outbox.some((o) => o.text === m.text)
    )
      still.current.add(m.id);
  useEffect(() => {
    sending.current = messages.filter((m) => m.id < 0).map((m) => m.text ?? "");
  });

  const last = messages[messages.length - 1];
  const lastKey = last ? `${last.id}:${messages.length}` : "";
  const lastMine = last?.by === me.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the last line changes
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && (atBottom.current || lastMine)) {
      el.scrollTop = el.scrollHeight;
      atBottom.current = true;
    }
  }, [lastKey, lastMine]);

  return (
    <div
      ref={ref}
      role="log"
      aria-label={t("log")}
      onScroll={(e) => {
        const el = e.currentTarget;
        atBottom.current =
          el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
      }}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3.5 py-3"
    >
      <div className="mt-auto flex flex-col gap-2.5">
        {messages.map((m) => (
          <Line
            key={m.id}
            line={m}
            mine={m.by === me.id}
            enter={!still.current?.has(m.id)}
            onRetry={onRetry}
          />
        ))}
      </div>
    </div>
  );
}

function Line({
  line,
  mine,
  enter,
  onRetry,
}: {
  line: ChatLine;
  mine: boolean;
  enter: boolean;
  onRetry: (id: number) => void;
}) {
  const t = useTranslations("chat");
  const name = useDisplayName();
  const { playerById } = useRoomContext();

  if (line.system)
    return (
      <m.div
        initial={enter ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-full self-center rounded-[14px] bg-sunken px-3 py-1 text-center font-bold text-[12.5px] text-ink-muted leading-[1.55]"
      >
        <SystemText line={line.system} />
      </m.div>
    );

  const text = line.text ?? "";
  const big = isEmojiOnly(text);
  const bubble = (
    <p
      className={cn(
        "max-w-full whitespace-pre-wrap text-left [overflow-wrap:anywhere]",
        big
          ? "px-1 text-[34px] leading-[1.2]"
          : "px-3 py-[7px] text-[14.5px] leading-[1.35]",
        !big &&
          (mine
            ? "rounded-[16px_16px_5px_16px] bg-sky text-on-sky"
            : "rounded-[16px_16px_16px_5px] bg-sunken"),
        mine ? "justify-self-end" : "justify-self-start",
        line.state === "sending" && "opacity-70",
      )}
    >
      {text}
    </p>
  );
  const entrance = {
    initial: enter ? { opacity: 0, y: 14, scale: 0.96 } : false,
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.35, ease: gs.backOut(1.6) },
  } as const;

  if (mine)
    return (
      <m.div
        {...entrance}
        style={{ transformOrigin: "100% 100%" }}
        className="flex flex-col items-end"
      >
        {line.state === "failed" ? (
          <button
            type="button"
            onClick={() => onRetry(line.id)}
            className="flex max-w-full flex-col items-end gap-1 rounded-[16px]"
          >
            {bubble}
            <small className="font-semibold text-[12px] text-no">
              {t("failed")}
            </small>
          </button>
        ) : (
          bubble
        )}
      </m.div>
    );

  const p = playerById(line.by) ?? line.author;
  // the author's room colour, while they are in the room
  const slot = playerById(line.by)?.colorSlot ?? null;
  return (
    <m.div
      {...entrance}
      style={{ transformOrigin: "0% 100%" }}
      className="grid grid-cols-[28px_minmax(0,1fr)] items-end gap-x-2 gap-y-0.5"
    >
      {p ? (
        <Avatar
          avatar={p.avatar}
          isGuest={p.isGuest}
          name={p.name}
          size={28}
          seat={slot}
          className="row-span-2 self-end"
        />
      ) : (
        <span className="row-span-2" />
      )}
      <small
        style={slot === null ? undefined : { color: seatInk(slot) }}
        className="truncate pl-1 font-bold text-[12px] text-ink-muted"
      >
        {p ? name(p) : ""}
      </small>
      {bubble}
    </m.div>
  );
}

/** A system line in the viewer's language, players with their faces. */
function SystemText({ line }: { line: SystemLine }) {
  const t = useTranslations("chat.system");
  const lang = useLocale() as Lang;
  const withNames = useWithNames();
  const { me, playerById } = useRoomContext();
  const live = (p: ChatPerson) => playerById(p.id) ?? p;
  switch (line.type) {
    case "started":
      return t("started");
    case "theme":
      return t("theme", {
        emoji: themeSetEmoji(line.theme.set) ?? "✍️",
        theme: line.theme[lang],
      });
    case "order":
      return withNames((n) =>
        t("order", {
          names: line.players
            .map((p) => n(live(p), p.id === me.id))
            .join(lang === "ja" ? "、" : ", "),
        }),
      );
    case "firstTurn":
      return withNames((n) =>
        t("firstTurn", {
          n: line.n,
          name: n(live(line.player), line.player.id === me.id),
        }),
      );
  }
}
