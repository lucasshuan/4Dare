"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { LiveDot } from "@/features/rooms/room-bits";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import { ChoiceThumb } from "./choice-thumb";
import s from "./deck.module.css";
import type { Choice } from "./headline";

export const CHOICES: readonly Choice[] = ["any", ...GAME_KEYS];
export const nextChoice = (c: Choice) =>
  CHOICES[(CHOICES.indexOf(c) + 1) % CHOICES.length];

interface Card {
  id: number;
  choice: Choice;
  place: "front" | "back" | "gone";
  enter?: "come" | "fresh";
}

/** The name on the button: the old one leaves upward as the new one comes up. */
interface Name {
  id: number;
  choice: Choice;
  out: boolean;
}

/**
 * The game "Play now" plays, as a little deck: the game on top, the next one
 * peeking behind. While `auto`, its ring fills over `ms` and, full, deals the
 * next game (`onDeal`); hovering, an open menu or `held` (the hero out of
 * view) pause it. A press opens the list of games.
 */
export function GameDeck({
  choice,
  auto,
  ms,
  held,
  online,
  onPick,
  onDeal,
  onOpenChange,
  className,
}: {
  choice: Choice;
  auto: boolean;
  ms: number;
  held: boolean;
  online: Partial<Record<GameKey, number>> | null;
  onPick: (c: Choice) => void;
  onDeal: () => void;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const t = useTranslations("home.hero");
  const tg = useTranslations("home.games");
  const gameName = useGameName();
  const label = (c: Choice) => (c === "any" ? t("any") : gameName(c));
  const seq = useRef(2);
  const [cards, setCards] = useState<Card[]>(() => [
    { id: 0, choice: nextChoice(choice), place: "back" },
    { id: 1, choice, place: "front" },
  ]);
  const [names, setNames] = useState<Name[]>([{ id: 0, choice, out: false }]);
  const [lap, setLap] = useState(0);
  const shown = useRef(choice);

  // the front card is dealt away, the one behind comes forward, a new one slides in at the back
  // (before the paint: the button never shows the new game with the old cards for a frame)
  useLayoutEffect(() => {
    if (shown.current === choice) return;
    shown.current = choice;
    setLap((n) => n + 1);
    setCards((all) => {
      const live = all.filter((c) => c.place !== "gone");
      const back = live.find((c) => c.place === "back");
      const next: Card[] = live.map((c) =>
        c.place === "front" ? { ...c, place: "gone", enter: undefined } : c,
      );
      let out: Card[];
      if (back?.choice === choice)
        out = next.map((c) =>
          c.id === back.id ? { ...c, place: "front", enter: undefined } : c,
        );
      else
        out = [
          ...next.filter((c) => c.place !== "back"),
          { id: seq.current++, choice, place: "front", enter: "come" },
        ];
      return [
        {
          id: seq.current++,
          choice: nextChoice(choice),
          place: "back",
          enter: "fresh",
        },
        ...out,
      ];
    });
    setNames((all) => [
      ...all.filter((n) => !n.out).map((n) => ({ ...n, out: true })),
      { id: seq.current++, choice, out: false },
    ]);
    const id = window.setTimeout(() => {
      setCards((all) => all.filter((c) => c.place !== "gone"));
      setNames((all) => all.filter((n) => !n.out));
    }, 600);
    return () => window.clearTimeout(id);
  }, [choice]);

  const hint = (c: Choice) =>
    c === "any"
      ? t("anyHint")
      : t("gameHint", {
          n: online?.[c] ?? 0,
          players: tg(`${GAME_INFO[c].messages}.players`),
        });

  return (
    <Menu.Root onOpenChange={(open) => onOpenChange?.(open)}>
      <Menu.Trigger
        className={cn(
          s.deck,
          auto ? s.auto : s.manual,
          held && s.held,
          className,
        )}
        style={{ "--dur": `${ms}ms` } as CSSProperties}
      >
        <span className={s.cards} aria-hidden="true">
          {cards.map((c) => (
            <span
              key={c.id}
              className={cn(
                s.card,
                s[c.place],
                c.enter === "come" && s.come,
                c.enter === "fresh" && s.fresh,
              )}
            >
              <ChoiceThumb choice={c.choice} />
            </span>
          ))}
        </span>
        <span className={s.txt}>
          <small>{t("deck")}</small>
          <span className={s.name}>
            {names.map((n, i) => (
              <span
                key={n.id}
                className={cn(n.out ? s.out : i > 0 && s.in)}
                aria-hidden={n.out ? true : undefined}
              >
                {label(n.choice)}
              </span>
            ))}
          </span>
        </span>
        <span className={s.go} aria-hidden="true">
          <svg className={s.ring} viewBox="0 0 40 40" aria-hidden="true">
            <circle className={s.track} cx="20" cy="20" r="17" />
            <circle
              key={`${choice}-${lap}-${auto}`}
              className={s.fill}
              cx="20"
              cy="20"
              r="17"
              pathLength={100}
              onAnimationEnd={() => {
                if (auto) onDeal();
              }}
            />
          </svg>
          <ChevronDown strokeWidth={2} />
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start">
          <Menu.Popup className={s.menu}>
            <Menu.RadioGroup
              value={choice}
              onValueChange={(v) => onPick(v as Choice)}
            >
              {CHOICES.map((c) => (
                <Menu.RadioItem key={c} value={c} className={s.item}>
                  <ChoiceThumb choice={c} className="h-10 w-16" />
                  <span>
                    <b>{label(c)}</b>
                    <small>
                      {c === "any" ? null : <LiveDot color="var(--yes)" />}
                      {hint(c)}
                    </small>
                  </span>
                  <Menu.RadioItemIndicator className={s.check}>
                    <Check strokeWidth={2.25} />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
