"use client";

import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { deferred, useDeferred } from "@/lib/hooks/use-deferred";

/** A round flag for a language; `size-5` unless `className` says otherwise. */
export function Flag({ lang, className }: { lang: Lang; className?: string }) {
  return (
    // biome-ignore lint/performance/noImgElement: tiny static svg flags
    <img
      src={`/icons/flag-${lang}.svg`}
      alt=""
      width={20}
      height={20}
      className={cn(
        "size-5 shrink-0 rounded-pill shadow-[0_0_0_1px_var(--line)]",
        className,
      )}
    />
  );
}

export const LANGUAGE_TRIGGER =
  "inline-flex h-10 items-center gap-2 rounded-pill pr-3 pl-2.5 font-semibold text-sm transition-colors duration-200 ease-soft hover:bg-sunken data-popup-open:bg-sunken max-sm:size-10 max-sm:shrink-0 max-sm:justify-center max-sm:gap-0 max-sm:p-0 sm:bg-surface dark:data-popup-open:bg-line dark:hover:bg-line sm:dark:bg-sunken";

const loadSelect = deferred(() =>
  import("./language-select").then((m) => m.LanguageSelect),
);

/**
 * A select with flags and language names; keeps you on the same page. Only on
 * home and lobby. White in the light theme, like the theme toggle next to it.
 * The select comes after the page; until then a look-alike stands in.
 */
export function LanguageSwitch() {
  const t = useTranslations("common");
  const locale = useLocale() as Lang;
  const { loaded: Select, props, reach } = useDeferred(loadSelect);
  if (Select) return <Select {...props} />;
  return (
    <button
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={false}
      aria-label={t("language")}
      className={LANGUAGE_TRIGGER}
      {...reach}
    >
      <Flag lang={locale} className="max-sm:size-10 max-sm:shadow-none" />
      <span className="max-sm:sr-only">{t(`languages.${locale}`)}</span>
      <span aria-hidden className="text-ink-muted max-sm:hidden">
        <ChevronDown className="size-4" strokeWidth={2} />
      </span>
    </button>
  );
}
