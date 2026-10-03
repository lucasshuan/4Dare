"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { seatColor } from "@/lib/seats";

/**
 * A soft wash of the colour of whoever's turn it is, behind the whole screen.
 * It stays theirs while others answer or check their guess, and fades into
 * the next player's colour when the turn moves on.
 */
export function TurnBackdrop({ seat }: { seat: number | null }) {
  // On <body>, so no moving parent drags the fixed layer along.
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => setBody(document.body), []);
  if (!body) return null;
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <AnimatePresence initial={false}>
        {seat === null ? null : (
          <motion.div
            key={seat}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{
              background: [
                `radial-gradient(70% 55% at 0% 0%, color-mix(in oklab, ${seatColor(seat)} 16%, transparent), transparent)`,
                `radial-gradient(60% 50% at 100% 100%, color-mix(in oklab, ${seatColor(seat)} 11%, transparent), transparent)`,
                `linear-gradient(color-mix(in oklab, ${seatColor(seat)} 4%, transparent), color-mix(in oklab, ${seatColor(seat)} 4%, transparent))`,
              ].join(", "),
            }}
          />
        )}
      </AnimatePresence>
    </div>,
    body,
  );
}
