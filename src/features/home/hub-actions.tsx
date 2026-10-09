import { LanguageSwitch } from "@/components/ui/language-switch";
import { Wordmark } from "@/components/ui/screen";
import { ThemeSwitch, ThemeToggle } from "@/components/ui/theme-toggle";
import { CurrentMatchBadge } from "@/features/current-match/match-lock";
import { MenuButton } from "@/features/nav/menu-button";
import { UserMenu } from "./user-menu";

/** Top left of the hub screens: the side menu, the logo, then the match you are in, if any. */
export function HubBrand() {
  return (
    <>
      <MenuButton />
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
      {/* phones get the one-key switch: the bar also holds the menu's bars */}
      <span className="contents max-sm:hidden">
        <ThemeToggle />
      </span>
      <ThemeSwitch className="sm:hidden" />
      <UserMenu />
    </>
  );
}
