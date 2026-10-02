"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { LANGS, type Lang } from "@/game/types";
import { usePathname, useRouter } from "@/i18n/navigation";

function Flag({ lang }: { lang: Lang }) {
  return (
    // biome-ignore lint/performance/noImgElement: tiny static svg flags
    <img
      src={`/icons/flag-${lang}.svg`}
      alt=""
      width={20}
      height={20}
      className="size-5 shrink-0 rounded-pill shadow-[0_0_0_1px_var(--line)]"
    />
  );
}

/** A select with flags and language names; keeps you on the same page. Only on home and lobby. */
export function LanguageSwitch() {
  const t = useTranslations("common");
  const locale = useLocale() as Lang;
  const router = useRouter();
  const pathname = usePathname();
  const [, start] = useTransition();
  const items = LANGS.map((l) => ({ value: l, label: t(`languages.${l}`) }));
  return (
    <Select.Root
      items={items}
      value={locale}
      onValueChange={(l) => {
        if (l && l !== locale)
          start(() => router.replace(pathname, { locale: l as Lang }));
      }}
    >
      <Select.Trigger
        aria-label={t("language")}
        className="inline-flex h-11 items-center gap-2 rounded-pill bg-sunken pr-3 pl-2.5 font-semibold text-sm transition-colors duration-200 ease-soft hover:bg-line data-popup-open:bg-line"
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
                  className="flex cursor-default items-center gap-2.5 rounded-md py-2 pr-3 pl-2 font-semibold text-sm outline-none select-none data-highlighted:bg-sky-soft"
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
