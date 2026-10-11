import { useLocale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import type { ComponentProps } from "react";
import type { Lang } from "@/game/types";
import { localizePath, routePath } from "./paths";
import { routing } from "./routing";

// Locale-aware Link, usePathname, useRouter, getPathname. Use these instead of next/link and next/navigation.
// They take and give the app's route paths ("/who-am-i") and write the
// address in the language it is for ("/pt/quem-sou-eu"), see ./paths.

const nav = createNavigation(routing);

type RouterHref = Parameters<ReturnType<typeof nav.useRouter>["push"]>[0];

function localizeHref<H>(lang: string, href: H): H {
  const l = lang as Lang;
  if (typeof href === "string") return localizePath(l, href) as H;
  if (href && typeof href === "object" && "pathname" in href) {
    const { pathname } = href;
    if (typeof pathname === "string")
      return { ...href, pathname: localizePath(l, pathname) };
  }
  return href;
}

export function Link({
  href,
  locale,
  ...props
}: ComponentProps<typeof nav.Link>) {
  const current = useLocale();
  return (
    <nav.Link
      {...props}
      locale={locale}
      href={localizeHref(locale ?? current, href)}
    />
  );
}

/** The page's route path, whatever language its address is in. */
export function usePathname() {
  return routePath(nav.usePathname());
}

export function useRouter() {
  const router = nav.useRouter();
  const current = useLocale();
  type Options = { locale?: string } | undefined;
  const to = (href: RouterHref, options: Options) =>
    localizeHref(options?.locale ?? current, href);
  return {
    ...router,
    push: (href: RouterHref, options?: Parameters<typeof router.push>[1]) =>
      router.push(to(href, options), options),
    replace: (
      href: RouterHref,
      options?: Parameters<typeof router.replace>[1],
    ) => router.replace(to(href, options), options),
    prefetch: (
      href: RouterHref,
      options?: Parameters<typeof router.prefetch>[1],
    ) => router.prefetch(to(href, options), options),
  };
}

export const getPathname: typeof nav.getPathname = (args) =>
  nav.getPathname({ ...args, href: localizeHref(args.locale, args.href) });
