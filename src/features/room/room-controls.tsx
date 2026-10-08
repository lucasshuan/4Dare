"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { ThemeSwitch, ThemeToggle } from "@/components/ui/theme-toggle";
import { useRoomContext } from "@/features/data/room-context";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import { GAME_PATHS } from "@/lib/routes";
import { leaveRoom } from "@/server/actions";
import { LeaveIcon, leaveButtonClass } from "./leave-match-button";

/**
 * Sound, theme and the way out: the same three keys, in the same order, top
 * right of every screen of a room (lobby, match, results), after the clock
 * when there is one. Only rooms have them. `leave` swaps the plain way out for
 * another (the match's, which asks first).
 */
export function RoomControls({
  leave,
  className,
}: {
  leave?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <SoundToggle />
      {/* on a phone the theme is one key, so the row fits beside the clock */}
      <div className="flex max-sm:hidden">
        <ThemeToggle />
      </div>
      <ThemeSwitch className="sm:hidden" />
      {leave === undefined ? <LeaveRoomButton /> : leave}
    </div>
  );
}

/** "Leave" where nothing is lost by it (the lobby, the results): out at once, back to the game's page. */
function LeaveRoomButton() {
  const t = useTranslations("common.currentMatch");
  const { view, code } = useRoomContext();
  const router = useRouter();
  const { run, pending } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        await run(() => leaveRoom(code));
        router.push(GAME_PATHS[view.settings.game]);
      }}
      className={leaveButtonClass}
    >
      <LeaveIcon />
      <span className="max-sm:sr-only">{t("leaveShort")}</span>
    </button>
  );
}
