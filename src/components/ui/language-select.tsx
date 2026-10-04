"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { LANGS, type Lang } from "@/game/types";
import { getPathname, usePathname } from "@/i18n/navigation";
import type { DeferredProps } from "@/lib/hooks/use-deferred";
import { Flag, LANGUAGE_TRIGGER } from "./language-switch";

/** The language select itself, loaded after the page (language-switch.tsx shows a stand-in until then). */
export function LanguageSelect({ defaultOpen, autoFocus }: DeferredProps) {
  const t = useTranslations("common");
  const locale = useLocale() as Lang;
  const pathname = usePathname();
  const items = LANGS.map((l) => ({ value: l, label: t(`languages.${l}`) }));
  return (
    <Select.Root
      items={items}
      value={locale}
      defaultOpen={defaultOpen}
      onValueChange={(l) => {
        if (!l || l === locale) return;
        // A full load, not a client navigation: the whole app (its <html> included)
        // lives under the locale, and re-rendering it on the client trips React
        // over the theme script.
        window.location.assign(
          getPathname({ href: pathname, locale: l as Lang }) +
            window.location.search,
        );
      }}
    >
      <Select.Trigger
        aria-label={t("language")}
        autoFocus={autoFocus}
        className={LANGUAGE_TRIGGER}
      >
        <Flag lang={locale} />
        <Select.Value className="max-sm:sr-only">
          {(l: Lang) => t(`languages.${l}`)}
        </Select.Value>
        <Select.Icon className="text-ink-muted">
          <ChevronDown className="size-4" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          align="end"
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <Select.Popup className="min-w-44 origin-[var(--transform-origin)] rounded-lg bg-surface p-1.5 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <Select.List>
              {LANGS.map((l) => (
                <Select.Item
                  key={l}
                  value={l}
                  lang={l}
                  className="flex items-center gap-2.5 rounded-md py-2 pr-3 pl-2 font-semibold text-sm outline-none select-none data-highlighted:bg-sky-soft"
                >
                  <Flag lang={l} />
                  <Select.ItemText className="flex-1">
                    {t(`languages.${l}`)}
                  </Select.ItemText>
                  <Select.ItemIndicator className="text-sky">
                    <Check className="size-4" strokeWidth={2.25} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
