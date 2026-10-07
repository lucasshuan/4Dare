"use client";

import { ChevronLeft, RotateCcw } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";
import { Screen } from "@/components/ui/screen";
import { MatchLockPage } from "@/features/current-match/match-lock";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { DEFAULT_GAME, type GameKey, isGameKey } from "@/game/games";
import { applyPreset, defaultPreset } from "@/game/presets";
import { type ErrorCode, ROOM_NAME_MAX } from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { meNamed, useDisplayName } from "@/lib/names";
import { GAME_PATHS } from "@/lib/routes";
import { getSettings } from "@/lib/settings";
import { createRoom } from "@/server/actions";
import { loadSetup } from "./last-setup";
import { backClass } from "./room-setup";

/**
 * /new?game=…: opens a room for that game (an unknown one falls back to the
 * first) right away and goes into it. It starts with the last setup (or the
 * preset chosen for the game's new rooms) and is named after the host
 * ("Bob123's room"); the rest is changed in the lobby, under "Edit advanced
 * settings". The page is static, so the game is read here.
 */
export function CreateScreen() {
  const t = useTranslations("home");
  const tErrors = useTranslations("common.errors");
  const router = useRouter();
  const { run } = useAction();
  const { me } = useMe();
  const displayName = useDisplayName();
  // No new room while a match is going: the screen turns into the lock.
  const { match, isLoading } = useCurrentMatch();
  const [failed, setFailed] = useState<{
    game: GameKey;
    error: ErrorCode;
  } | null>(null);
  // Each try once, even when the effect runs twice; "Try again" starts the next.
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (started.current === attempt || isLoading || match || !me) return;
    started.current = attempt;
    const asked = new URLSearchParams(window.location.search).get("game");
    const game = isGameKey(asked) ? asked : DEFAULT_GAME;
    const name = roomName(displayName(meNamed(me)), (n) =>
      t("rooms.roomOf", { name: n }),
    );
    // the preset this person starts the game's rooms from, if any: an
    // account's own, in case this device hasn't taken them yet
    const presets = me.isGuest
      ? getSettings().presets
      : (me.settings?.presets ?? getSettings().presets);
    const preset = defaultPreset(presets, game);
    const setup = { ...loadSetup(), game, name };
    void run(() =>
      createRoom(preset ? applyPreset(setup, preset) : setup),
    ).then((r) => {
      if (r.ok) router.replace(`/r/${r.data.code}`);
      else setFailed({ game, error: r.error as ErrorCode });
    });
  }, [attempt, isLoading, match, me, displayName, t, run, router]);

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      {match ? (
        <m.div {...riseIn}>
          <MatchLockPage match={match} />
        </m.div>
      ) : failed ? (
        // what went wrong, and another go: never a page with just "Back"
        <m.div {...riseIn} className="flex flex-col items-start gap-4">
          <Link href={GAME_PATHS[failed.game]} className={backClass}>
            <ChevronLeft className="size-4" strokeWidth={2} />
            {t("createRoom.back")}
          </Link>
          <div role="alert" className="flex flex-col gap-1">
            <h1 className="font-bold font-display text-2xl">
              {t("createRoom.failed")}
            </h1>
            <p className="text-ink-muted">{tErrors(failed.error)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFailed(null);
              setAttempt((n) => n + 1);
            }}
            className={buttonClass("primary", "lg")}
          >
            <RotateCcw />
            {t("createRoom.retry")}
          </button>
        </m.div>
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
