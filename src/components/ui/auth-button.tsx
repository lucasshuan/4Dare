"use client";

import { useTranslations } from "next-intl";
import type { Provider } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { buttonClass } from "./button";

export const PROVIDER_NAME: Record<Provider, string> = {
  discord: "Discord",
  google: "Google",
};

/** The brand logo, untouched (design system Brands assets). */
export function ProviderLogo({ provider }: { provider: Provider }) {
  return (
    // biome-ignore lint/performance/noImgElement: tiny static brand svg
    <img
      src={`/icons/${provider}.svg`}
      alt=""
      height={18}
      width={18}
      className="h-[18px] w-auto"
    />
  );
}

/** "Sign in with Discord/Google": neutral button, the colour comes only from the logo. */
export function AuthButton({
  provider,
  onClick,
  disabled,
  wide,
  className,
}: {
  provider: Provider;
  onClick: () => void;
  disabled?: boolean;
  /** Always the full label (the buttons are stacked, not side by side). */
  wide?: boolean;
  className?: string;
}) {
  const t = useTranslations("home");
  const label = t("signIn", { provider: PROVIDER_NAME[provider] });
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={buttonClass("secondary", "md", cn("px-5", className))}
    >
      <ProviderLogo provider={provider} />
      {wide ? (
        <span>{label}</span>
      ) : (
        <>
          <span className="max-sm:hidden">{label}</span>
          <span className="sm:hidden">{PROVIDER_NAME[provider]}</span>
        </>
      )}
    </button>
  );
}
