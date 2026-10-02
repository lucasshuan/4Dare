"use client";

import { Fragment, type ReactNode, useCallback } from "react";
import type { Avatar as AvatarData } from "@/game/types";
import { cn } from "@/lib/cn";
import { type Named, useDisplayName } from "@/lib/names";
import { Avatar } from "./avatar";

export type Person = Named & { avatar: AvatarData };

/** A player's name with their avatar beside it, sized to the text around it. */
export function PlayerName({
  player,
  isYou = false,
  className,
}: {
  player: Person;
  isYou?: boolean;
  className?: string;
}) {
  const name = useDisplayName();
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-[0.3em] whitespace-nowrap",
        className,
      )}
    >
      {/* sized in em of the text around it (text-[1em] undoes the avatar's own font size); sits on the baseline, nudged down to centre on the letters */}
      <Avatar
        avatar={player.avatar}
        isGuest={player.isGuest}
        name={player.name}
        size={20}
        className="size-[1.4em] translate-y-[0.3em] text-[1em]"
      />
      <span>{name(player, isYou)}</span>
    </span>
  );
}

/** Stands in for a player inside a translated text; never typed by anyone. */
const MARK = "⁣";

/**
 * Translated text with players in it, each shown as <PlayerName>. `build` gets
 * `n(player, isYou?)` to pass where the message expects a name:
 * `withNames((n) => t("pickedBy", { name: n(picker) }))`, or for a list,
 * `names: players.map((p) => n(p)).join(", ")`.
 */
export function useWithNames() {
  return useCallback(
    (build: (n: (p: Person, isYou?: boolean) => string) => string) => {
      const people: [Person, boolean][] = [];
      const text = build((p, isYou = false) => {
        people.push([p, isYou]);
        return `${MARK}${people.length - 1}${MARK}`;
      });
      // Odd parts are the players' places in `people`; the parts never move, so their place is their key.
      return text.split(MARK).map((part, i) => {
        if (i % 2 === 0)
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed parts of one text
          return <Fragment key={i}>{part}</Fragment>;
        const [p, isYou] = people[Number(part)];
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed parts of one text
        return <PlayerName key={i} player={p} isYou={isYou} />;
      }) satisfies ReactNode;
    },
    [],
  );
}
