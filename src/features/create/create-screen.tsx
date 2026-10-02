"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { HubActions } from "@/features/home/hub-actions";
import { DEFAULT_SETTINGS } from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { riseIn } from "@/lib/motion";
import { WHO_AM_I } from "@/lib/routes";
import { createRoom } from "@/server/actions";
import type { CreateRoomInput } from "@/server/contract";
import { SettingsFields } from "./settings-fields";

export function CreateScreen() {
  const t = useTranslations("home.createRoom");
  const router = useRouter();
  const { run, pending } = useAction();
  const [settings, setSettings] = useState<CreateRoomInput>({
    visibility: "public",
    seats: 4,
    stepSeconds: DEFAULT_SETTINGS.stepSeconds,
  });

  return (
    <Screen right={<HubActions />}>
      <motion.form
        {...riseIn}
        className="flex max-w-[760px] flex-col gap-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => createRoom(settings));
          if (r.ok) router.push(`/r/${r.data.code}`);
        }}
      >
        <div className="flex flex-col gap-4">
          <Link
            href={WHO_AM_I}
            className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            {t("back")}
          </Link>
          <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
            {t("title")}
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-10">
          <SettingsFields value={settings} onChange={setSettings} />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="self-start"
          disabled={pending}
        >
          {t("submit")}
        </Button>
      </motion.form>
    </Screen>
  );
}
