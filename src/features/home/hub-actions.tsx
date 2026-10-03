import { LanguageSwitch } from "@/components/ui/language-switch";
import { Wordmark } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrentMatchBadge } from "@/features/current-match/match-lock";
import { UserMenu } from "./user-menu";

/** Top left of the hub screens: the logo, then the match you are in, if any. */
export function HubBrand() {
  return (
    <>
      <Wordmark />
      <CurrentMatchBadge />
    </>
  );
}

/** Top right of the hub screens: language, theme, then who you are. */
export function HubActions() {
  return (
    <>
      <LanguageSwitch />
      <ThemeToggle />
      <UserMenu />
    </>
  );
}
