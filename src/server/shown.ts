import "server-only";
import { guestName } from "@/game/guest-names";
import type { Lang } from "@/game/types";
import type { Account, Me } from "./contract";

/** The caller as the browser gets them: their guest name in `lang`, not its number. */
export function showMe(account: Account, lang: Lang): Me {
  const { guestNumber, ...rest } = account;
  return { ...rest, guestName: guestName(guestNumber, lang) };
}
