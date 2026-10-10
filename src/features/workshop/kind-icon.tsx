import { MessageCircleQuestion, Shapes, Tags, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import type { WorkshopKind } from "@/server/community-contract";

const ICONS = {
  all: Shapes,
  theme: Tags,
  question: MessageCircleQuestion,
  mission: Target,
};

/** One visual identity for each Workshop kind, in filters and the composer. */
export function WorkshopKindIcon({
  kind,
  className,
}: {
  kind: WorkshopKind | "all";
  className?: string;
}) {
  const Icon = ICONS[kind];
  return (
    <Icon
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
      strokeWidth={1.75}
    />
  );
}
