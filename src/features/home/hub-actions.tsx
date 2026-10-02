import { LanguageSwitch } from "@/components/ui/language-switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "./user-menu";

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
