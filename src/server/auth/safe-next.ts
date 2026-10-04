/** Only same-site paths, so the sign-in routes can't be used to bounce people elsewhere. */
export function safeNext(raw: string | null) {
  return raw?.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
    ? raw
    : "/";
}
