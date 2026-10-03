"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PageLoader } from "@/components/ui/loader";
import { Screen } from "@/components/ui/screen";
import { MatchLockPage } from "@/features/current-match/match-lock";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import type { GameKey } from "@/game/games";
import { ROOM_NAME_MAX } from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { GAME_PATHS } from "@/lib/routes";
import { createRoom } from "@/server/actions";
import { loadSetup } from "./last-setup";
import { backClass } from "./room-setup";

/**
 * /new?game=…: opens a room for `game` right away and goes into it. It starts
 * with the last setup and is named after the host ("Bob123's room"); the rest
 * is changed in the lobby, under "Edit settings".
 */
export function CreateScreen({ game }: { game: GameKey }) {
  const t = useTranslations("home");
  const router = useRouter();
  const { run } = useAction();
  const { me } = useMe();
  const displayName = useDisplayName();
  // No new room while a match is going: the screen turns into the lock.
  const { match, isLoading } = useCurrentMatch();
  const [failed, setFailed] = useState(false);
  // Once only, even when the effect runs twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current || isLoading || match || !me) return;
    started.current = true;
    const name = roomName(displayName(me), (n) =>
      t("rooms.roomOf", { name: n }),
    );
    void run(() => createRoom({ ...loadSetup(), game, name })).then((r) => {
      if (r.ok) router.replace(`/r/${r.data.code}`);
      else setFailed(true);
    });
  }, [isLoading, match, me, game, displayName, t, run, router]);

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      {match ? (
        <motion.div {...riseIn}>
          <MatchLockPage match={match} />
        </motion.div>
      ) : failed ? (
        <motion.div {...riseIn}>
          <Link href={GAME_PATHS[game]} className={backClass}>
            <ChevronLeft className="size-4" strokeWidth={2} />
            {t("createRoom.back")}
          </Link>
        </motion.div>
      ) : (
        // also while it checks for a match going on: one loader, start to end
        <PageLoader label={t("createRoom.creating")} />
      )}
    </Screen>
  );
}

/** "<name>'s room" in the host's language, the name cut short to fit ROOM_NAME_MAX. */
function roomName(name: string, roomOf: (name: string) => string) {
  const chars = [...name];
  const room = roomOf(name);
  const over = [...room].length - ROOM_NAME_MAX;
  return over > 0 ? roomOf(`${chars.slice(0, -over - 1).join("")}…`) : room;
}
