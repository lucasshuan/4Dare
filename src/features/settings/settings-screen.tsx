"use client";

import { useTranslations } from "next-intl";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { SettingsTabs } from "./settings-dialog";

/** /settings: the user menu's settings box, as a page of its own (the side menu's link). */
export function SettingsScreen() {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead eyebrow={tNav("groups.you")} title={t("title")} />
      <div className="flex h-[min(640px,calc(100dvh-14rem))] min-h-[420px] flex-col overflow-hidden rounded-xl bg-surface shadow-card max-sm:h-auto max-sm:min-h-0">
        <SettingsTabs />
      </div>
    </Screen>
  );
}
