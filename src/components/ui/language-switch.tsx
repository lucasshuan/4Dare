"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { deferred, useDeferred } from "@/lib/hooks/use-deferred";
import { Tip } from "./tip";

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
  "tb-key tb-lang inline-flex size-10 shrink-0 items-center justify-center rounded-pill transition-colors duration-200 ease-soft hover:bg-sunken data-popup-open:bg-sunken dark:data-popup-open:bg-line dark:hover:bg-line";

const loadSelect = deferred(() =>
  import("./language-select").then((m) => m.LanguageSelect),
);

/**
 * A select with flags and language names; keeps you on the same page. Only on
 * home and lobby. The trigger is the round flag alone, like the theme key next
 * to it.
 * The select comes after the page; until then a look-alike stands in.
 */
export function LanguageSwitch() {
  const t = useTranslations("common");
  const locale = useLocale() as Lang;
  const { loaded: Select, props, reach } = useDeferred(loadSelect);
  if (Select) return <Select {...props} />;
  return (
    <Tip label={t("language")}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={false}
        aria-label={t("language")}
        className={LANGUAGE_TRIGGER}
        {...reach}
      >
        <Flag lang={locale} className="size-10 shadow-none" />
        <span className="sr-only">{t(`languages.${locale}`)}</span>
      </button>
    </Tip>
  );
}
