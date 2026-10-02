"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { cn } from "@/lib/cn";

/** Light / dark. Only on home and lobby, next to the language switch. */
export function ThemeToggle() {
  const t = useTranslations("common.theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? resolvedTheme : undefined;
  const item = (value: "light" | "dark", Icon: typeof Sun) => (
    <button
      type="button"
      aria-label={t(value)}
      aria-pressed={current === value}
      onClick={() => setTheme(value)}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-pill transition-[background-color,color,box-shadow] duration-200 ease-soft",
        current === value
          ? "bg-surface text-ink shadow-card"
          : "text-ink-muted hover:text-ink",
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </button>
  );
  return (
    <ChoiceGroup label={t("label")}>
      {item("light", Sun)}
      {item("dark", Moon)}
    </ChoiceGroup>
  );
}
