"use client";

import { ChevronUp, MessageCircle } from "lucide-react";
import { motion, useReducedMotionConfig } from "motion/react";
import { useTranslations } from "next-intl";
import type { Ref } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useRoomContext } from "@/features/data/room-context";
import type { ChatMessage } from "@/game/chat";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { countLabel } from "./chat-ui";

// stand-ins for the name and the text inside the translated line
const NAME = "\ue000";
const TEXT = "\ue001";

/**
 * The chat's head, the toggle for open and fold: icon, "Chat" (desktop) or
 * the last message (phone), the unread senders' faces (desktop), the count
 * and the chevron. Unread turns it sky blue.
 */
export function ChatHead({
  open,
  unread,
  faces,
  last,
  phone,
  bodyId,
  pop,
  onToggle,
  ref,
}: {
  open: boolean;
  unread: number;
  /** The latest unread line of each sender to show, newest first. */
  faces: ChatMessage[];
  /** The last player's line, for the phone bar. */
  last: ChatMessage | null;
  phone: boolean;
  bodyId: string;
  /** Goes up on every new unread message: the count pops. */
  pop: number;
  onToggle: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const t = useTranslations("chat");
  const reduced = useReducedMotionConfig() ?? false;
  const { playerById } = useRoomContext();
  const lit = unread > 0;
  const label = `${open ? t("fold") : t("open")}${lit ? `, ${t("unread", { count: unread })}` : ""}`;
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-controls={bodyId}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative flex h-14 w-full shrink-0 items-center gap-2.5 pr-3 pl-4 text-left transition-colors duration-300 ease-soft focus-visible:shadow-[inset_0_0_0_3px_currentColor] focus-visible:outline-none! max-sm:h-15 max-sm:pb-1",
        lit ? "bg-sky text-on-sky" : "text-ink",
      )}
    >
      <MessageCircle
        aria-hidden="true"
        className="size-[21px] shrink-0"
        strokeWidth={2}
      />
      {phone ? (
        <PhoneLine line={last} />
      ) : (
        <>
          <b className="font-display font-extrabold text-[18px]">
            {t("title")}
          </b>
          {faces.length > 0 ? (
            <span className="flex pl-0.5" aria-hidden="true">
              {faces.map((m) => {
                const p = playerById(m.by) ?? m.author;
                return p ? (
                  <Avatar
                    key={m.by}
                    avatar={p.avatar}
                    isGuest={p.isGuest}
                    name={p.name}
                    size={24}
                    className="-mr-[7px] shadow-[0_0_0_2px_var(--sky)]"
                  />
                ) : null;
              })}
            </span>
          ) : null}
          <span className="flex-1" />
        </>
      )}
      <motion.span
        key={pop}
        aria-hidden="true"
        initial={pop > 0 && !reduced ? { scale: 0.3 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.45, ease: gs.backOut(3) }}
        className={cn(
          "h-6 min-w-6 shrink-0 rounded-pill px-[7px] text-center font-mono font-semibold text-[12px] leading-6",
          lit ? "bg-on-sky text-sky" : "invisible",
        )}
      >
        {countLabel(unread)}
      </motion.span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-pill transition-transform duration-400 ease-soft",
          open && "rotate-180",
          lit ? "text-on-sky" : "text-ink-muted",
        )}
      >
        <ChevronUp className="size-[18px]" strokeWidth={2.25} />
      </span>
    </button>
  );
}

/** The phone bar's line: "[av] Bia: on my way!! 👋", or "Room chat" before any message. */
function PhoneLine({ line }: { line: ChatMessage | null }) {
  const t = useTranslations("chat");
  const name = useDisplayName();
  const { me, playerById } = useRoomContext();
  const p = line ? (playerById(line.by) ?? line.author) : null;
  if (!line || !p || line.text === null)
    return (
      <span className="min-w-0 flex-1 truncate text-[14.5px]">
        {t("empty")}
      </span>
    );
  const mine = line.by === me.id;
  const text = line.text.replace(/\s+/g, " ");
  return (
    <span className="min-w-0 flex-1 truncate text-[14.5px]">
      {t("line", { name: NAME, text: TEXT })
        .split(/([\ue000\ue001])/)
        .map((part, i) =>
          part === NAME ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed parts of one text
            <span key={i}>
              <Avatar
                avatar={p.avatar}
                isGuest={p.isGuest}
                name={p.name}
                size={18}
                className="mr-1 align-[-4px]"
              />
              <b className="font-bold">{mine ? t("me") : name(p)}</b>
            </span>
          ) : part === TEXT ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed parts of one text
            <span key={i}>{text}</span>
          ) : (
            part
          ),
        )}
    </span>
  );
}
