import { Dices } from "lucide-react";
import { GameThumb } from "@/features/create/game-info";
import { cn } from "@/lib/cn";
import s from "./choice-thumb.module.css";
import type { Choice } from "./headline";

/** A game's thumbnail, or a dice for "any game"; sized by `className` (16:10). */
export function ChoiceThumb({
  choice,
  className,
}: {
  choice: Choice;
  className?: string;
}) {
  if (choice === "any")
    return (
      <span aria-hidden="true" className={cn(s.dice, className)}>
        <Dices strokeWidth={2} />
      </span>
    );
  return <GameThumb game={choice} size="sm" className={className} />;
}
