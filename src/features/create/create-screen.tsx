"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Screen } from "@/components/ui/screen";
import { MatchLockPage } from "@/features/current-match/match-lock";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import type { GameKey } from "@/game/games";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { GAME_PATHS } from "@/lib/routes";
import { createRoom } from "@/server/actions";
import type { CreateRoomInput } from "@/server/contract";
import { loadSetup, saveSetup } from "./last-setup";
import { backClass, RoomSetup } from "./room-setup";

/** A new room for `game` (from /new?game=…); the game can still be switched here. */
export function CreateScreen({ game }: { game: GameKey }) {
  const t = useTranslations("home.createRoom");
  const router = useRouter();
  const { run, pending } = useAction();
  // The last setup lives in this browser, so it is read after the first render.
  const [settings, setSettings] = useState<CreateRoomInput | null>(null);
  useEffect(() => setSettings({ ...loadSetup(), game }), [game]);
  // No new room while a match is going: the screen turns into the lock.
  const { match, isLoading } = useCurrentMatch();

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <motion.div {...riseIn}>
        {isLoading ? null : match ? (
          <MatchLockPage match={match} />
        ) : (
          <RoomSetup
            back={
              <Link
                href={GAME_PATHS[settings?.game ?? game]}
                className={backClass}
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
                {t("back")}
              </Link>
            }
            title={t("title")}
            submit={t("submit")}
            value={settings}
            onChange={(next) => {
              // The link keeps the game, so a reload or a shared link opens it again.
              if (next.game !== settings?.game)
                window.history.replaceState(null, "", `?game=${next.game}`);
              setSettings(next);
            }}
            pending={pending}
            onSubmit={async (v) => {
              const r = await run(() => createRoom(v));
              if (!r.ok) return;
              saveSetup(v);
              router.push(`/r/${r.data.code}`);
            }}
          />
        )}
      </motion.div>
    </Screen>
  );
}
