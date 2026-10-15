/**
 * The site and the control panel share one deployment: www.4dare.com is the
 * site, admin.4dare.com the panel (src/proxy.ts maps its root to /admin).
 * The auth cookies live on the whole 4dare.com, so one sign-in serves both.
 */

const SITE_DOMAIN = "4dare.com";

const bare = (host: string | null | undefined) =>
  (host ?? "").split(":")[0].toLowerCase();

/** The panel's own host (admin.4dare.com, or admin.<anything> elsewhere). */
export const isAdminHost = (host: string | null | undefined) =>
  bare(host).startsWith("admin.");

/** Where the auth cookies go: all of 4dare.com there, the host itself elsewhere. */
export function cookieDomain(host: string | null | undefined) {
  const h = bare(host);
  return h === SITE_DOMAIN || h.endsWith(`.${SITE_DOMAIN}`)
    ? `.${SITE_DOMAIN}`
    : undefined;
}

/** The panel's address from a page on `host`: its own host on 4dare.com, /admin elsewhere. */
export const adminHome = (host: string | null | undefined) =>
  cookieDomain(host) ? `https://admin.${SITE_DOMAIN}` : "/admin";

/** The site's address from the panel on `host`. */
export const siteHome = (host: string | null | undefined) =>
  cookieDomain(host) ? `https://www.${SITE_DOMAIN}` : "/";

/**
 * Where Discord and Google send people back: on 4dare.com always the site's
 * own host (the one the auth provider lets through), whatever host the
 * sign-in started on; the session cookie covers the panel too. Elsewhere
 * (a preview, localhost), the request's own origin.
 */
export const authOrigin = (host: string | null | undefined, origin: string) =>
  cookieDomain(host) ? `https://www.${SITE_DOMAIN}` : origin;
