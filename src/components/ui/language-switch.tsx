"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { LANGS, type Lang } from "@/game/types";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** Flags + language names; keeps you on the same page. Only on home and lobby. */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const pathname = usePathname();
  const [, start] = useTransition();
  return (
    <ChoiceGroup label={t("language")}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          aria-label={compact ? t(`languages.${l}`) : undefined}
          onClick={() => start(() => router.replace(pathname, { locale: l }))}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-pill pr-3.5 pl-2 font-semibold text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft",
            l === locale
              ? "bg-surface text-ink shadow-card"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {/* biome-ignore lint/performance/noImgElement: tiny static svg flags */}
          <img
            src={`/icons/flag-${l}.svg`}
            alt=""
            width={20}
            height={20}
            className="size-5 rounded-pill shadow-[0_0_0_1px_var(--line)]"
          />
          <span>
            {compact ? t(`languagesShort.${l}`) : t(`languages.${l}`)}
          </span>
        </button>
      ))}
    </ChoiceGroup>
  );
}
