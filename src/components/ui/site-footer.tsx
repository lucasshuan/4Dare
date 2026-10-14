"use client";

import { useLocale, useTranslations } from "next-intl";
import { appName, CONTACT_EMAIL } from "@/config";
import { Link } from "@/i18n/navigation";
import { PRIVACY, TERMS } from "@/lib/routes";
import { Logo, LogoMark } from "./logo";

const LINK =
  "whitespace-nowrap rounded-pill px-2 py-1.5 font-semibold text-[13px] text-ink-muted transition-colors duration-200 hover:bg-ink/8 hover:text-ink focus-visible:bg-ink/8 focus-visible:text-ink focus-visible:outline-none min-[481px]:px-2.5 min-[481px]:text-[13.5px]";

/**
 * Under every page: one solid line with just what a footer has to carry,
 * who (the logo, back to the top), the year, and the legal and contact links.
 */
export function SiteFooter() {
  const t = useTranslations("nav.footer");
  const locale = useLocale();
  return (
    <footer className="bg-sunken pt-5 pb-[calc(20px+var(--dock))]">
      <div className="mx-auto flex min-h-9 w-full max-w-[calc(1600px+64px)] items-center gap-2.5 px-4 min-[481px]:gap-3.5 sm:px-8">
        <button
          type="button"
          aria-label={t("top", { name: appName(locale) })}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group inline-flex flex-none items-center rounded-[8px] focus-visible:outline-2 focus-visible:outline-sky focus-visible:outline-offset-4"
        >
          <Logo className="h-[22px] w-auto max-[480px]:hidden" />
          <LogoMark className="h-6 w-auto min-[481px]:hidden" />
        </button>
        <small className="whitespace-nowrap font-semibold text-[13px] text-ink-muted">
          © {new Date().getFullYear()} {appName(locale)}
        </small>
        <nav
          aria-label={t("label")}
          className="ml-auto flex max-[480px]:-mr-2 min-[481px]:gap-1"
        >
          <Link href={PRIVACY} className={LINK}>
            {t("privacy")}
          </Link>
          <Link href={TERMS} className={LINK}>
            {t("terms")}
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
            {t("contact")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
