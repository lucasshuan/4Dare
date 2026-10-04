"use client";

import { AnimatePresence, m } from "motion/react";
import { Avatar } from "@/components/ui/avatar";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { useRoomContext } from "@/features/data/room-context";
import type { ChatMessage } from "@/game/chat";
import { gs } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { seatInk } from "@/lib/seats";

/** A message popped above the folded tab until `until` (server ms). */
export interface Bubble {
  line: ChatMessage;
  until: number;
}

/**
 * Desktop only: unread messages pop above the folded tab (face, name, text),
 * stacked with the newest at the bottom, and leave after 3 s or as the chat
 * opens. Decorative for screen readers: the live region says them.
 */
export function ChatBubbles({ bubbles }: { bubbles: Bubble[] }) {
  const name = useDisplayName();
  const { playerById } = useRoomContext();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-0 bottom-full mb-3 flex w-[340px] flex-col items-end gap-2"
    >
      <LayoutMotion>
        <AnimatePresence initial>
          {bubbles.map(({ line }) => {
            const p = playerById(line.by) ?? line.author;
            // the author's room colour, while they are in the room
            const slot = playerById(line.by)?.colorSlot ?? null;
            return (
              <m.div
                key={line.id}
                layout="position"
                initial={{ opacity: 0, y: 16, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.4, ease: gs.backOut(1.8) },
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  scale: 0.9,
                  transition: { duration: 0.3, ease: gs.p2In },
                }}
                style={{ transformOrigin: "85% 100%" }}
                className="flex max-w-[300px] items-end gap-2"
              >
                {p ? (
                  <Avatar
                    avatar={p.avatar}
                    isGuest={p.isGuest}
                    name={p.name}
                    size={30}
                    seat={slot}
                  />
                ) : null}
                <p className="min-w-0 rounded-[18px_18px_6px_18px] bg-surface px-3.5 py-[9px] text-[15px] text-ink leading-[1.35] shadow-pop">
                  <small
                    style={slot === null ? undefined : { color: seatInk(slot) }}
                    className="block truncate font-bold text-[12px] text-ink-muted"
                  >
                    {p ? name(p) : ""}
                  </small>
                  <span className="line-clamp-4 whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {line.text}
                  </span>
                </p>
              </m.div>
            );
          })}
        </AnimatePresence>
      </LayoutMotion>
    </div>
  );
}
