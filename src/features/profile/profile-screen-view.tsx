"use client";

import { UserRoundX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PageLoader } from "@/components/ui/loader";
import { Screen } from "@/components/ui/screen";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { ProfileBody, type ProfileMode } from "./profile-body";
import { useProfile } from "./use-profile";

/**
 * An account's profile once it loads: a loader first, a short note when
 * nobody has the handle. `?edit=1` opens the owner's editor.
 */
export function ProfileLoader({
  handle,
  mode,
  coverSlot,
}: {
  handle: string;
  mode: ProfileMode;
  coverSlot?: HTMLElement | null;
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const { data: view, isPending } = useProfile(handle);
  if (isPending) return <PageLoader label={tc("loading")} />;
  if (!view)
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <UserRoundX className="size-10 text-ink-muted" strokeWidth={1.5} />
        <h1 className="font-bold font-display text-2xl">{t("notFound")}</h1>
        <p className="text-ink-muted">{t("notFoundText", { handle })}</p>
      </div>
    );
  // the data only comes in the browser, so the address can be read here
  // (a modal has no address of its own)
  const editing =
    mode === "page" &&
    new URLSearchParams(window.location.search).get("edit") === "1";
  return (
    <ProfileBody
      key={view.id}
      view={view}
      mode={mode}
      coverSlot={coverSlot}
      startEditing={editing}
    />
  );
}

/** The profile as its own page: the cover runs the whole width, under the floating top bar. */
export function ProfilePage({ handle }: { handle: string }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  return (
    <Screen
      left={<HubBrand />}
      right={<HubActions />}
      banner={<div ref={setSlot} />}
    >
      <ProfileLoader handle={handle} mode="page" coverSlot={slot} />
    </Screen>
  );
}
