"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { DEFAULT_SETTINGS } from "@/game/types";
import { Link, useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
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
    <Screen
      right={
        <Link
          href={WHO_AM_I}
          className="px-2 font-semibold text-ink-muted hover:text-ink"
        >
          {t("back")}
        </Link>
      }
    >
      <form
        className="flex max-w-[760px] flex-col gap-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => createRoom(settings));
          if (r.ok) router.push(`/r/${r.data.code}`);
        }}
      >
        <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
          {t("title")}
        </h1>
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
      </form>
    </Screen>
  );
}
