"use client";

import { UserRoundX } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageLoader } from "@/components/ui/loader";
import { ProfileBody } from "./profile-body";
import { useProfile } from "./use-profile";

/** An account's profile once it loads: a loader first, a short note when nobody has the handle. */
export function ProfileLoader({ handle }: { handle: string }) {
  const t = useTranslations("player");
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
  return <ProfileBody view={view} />;
}
