"use client";

import { ChevronLeft } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { HubActions } from "@/features/home/hub-actions";
import type { GameKey } from "@/game/games";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { dur, ease, riseIn } from "@/lib/motion";
import { GAME_PATHS } from "@/lib/routes";
import { createRoom } from "@/server/actions";
import type { CreateRoomInput } from "@/server/contract";
import { GameField } from "./game-field";
import { loadSetup, saveSetup } from "./last-setup";
import { SettingsFields } from "./settings-fields";
import { missingSets, ThemeFields } from "./theme-fields";

/** A new room for `game` (from /new?game=…); the game can still be switched here. */
export function CreateScreen({ game }: { game: GameKey }) {
  const t = useTranslations("home.createRoom");
  const router = useRouter();
  const { run, pending } = useAction();
  // The last setup lives in this browser, so it is read after the first render.
  const [settings, setSettings] = useState<CreateRoomInput | null>(null);
  useEffect(() => setSettings({ ...loadSetup(), game }), [game]);
  const noSets = settings !== null && missingSets(settings);

  return (
    <Screen right={<HubActions />}>
      <motion.form
        {...riseIn}
        className="flex max-w-[1040px] flex-col gap-6 sm:tiny:gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!settings || noSets) return;
          const r = await run(() => createRoom(settings));
          if (!r.ok) return;
          saveSetup(settings);
          router.push(`/r/${r.data.code}`);
        }}
      >
        <div className="flex flex-col gap-4 sm:tiny:gap-2">
          <Link
            href={GAME_PATHS[settings?.game ?? game]}
            className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            {t("back")}
          </Link>
          <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em] sm:tiny:text-[36px] sm:tiny:leading-10">
            {t("title")}
          </h1>
        </div>
        {settings ? (
          <LayoutGroup>
            <GameField
              value={settings.game}
              onChange={(next) => {
                setSettings({ ...settings, game: next });
                // The link keeps the game, so a reload or a shared link opens it again.
                window.history.replaceState(null, "", `?game=${next}`);
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: dur.base } }}
              className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10 lg:grid-cols-[auto_auto_1fr] lg:gap-x-12"
            >
              <SettingsFields value={settings} onChange={setSettings} />
            </motion.div>
            <ThemeFields
              value={settings}
              onChange={(v) => setSettings({ ...settings, ...v })}
            />
            <motion.div
              layout="position"
              transition={{ duration: dur.slow, ease: ease.soft }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={pending || noSets}
              >
                {t("submit")}
              </Button>
              <AnimatePresence>
                {noSets ? (
                  <motion.span
                    {...riseIn}
                    className="font-medium text-[13px] text-no"
                  >
                    {t("needOneSet")}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>
        ) : null}
      </motion.form>
    </Screen>
  );
}
