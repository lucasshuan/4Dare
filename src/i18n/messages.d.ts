// Message keys are checked at compile time against the English files: a typo
// or a key that moved fails `tsc`, not the screen. One import per namespace
// in request.ts.
import type chat from "../../messages/en/chat.json";
import type common from "../../messages/en/common.json";
import type impostor from "../../messages/en/games/impostor.json";
import type lineup from "../../messages/en/games/lineup.json";
import type whoAmI from "../../messages/en/games/whoAmI.json";
import type home from "../../messages/en/home.json";
import type lobby from "../../messages/en/lobby.json";
import type meta from "../../messages/en/meta.json";
import type profile from "../../messages/en/profile.json";
import type room from "../../messages/en/room.json";
import type settings from "../../messages/en/settings.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: {
      chat: typeof chat;
      common: typeof common;
      home: typeof home;
      lobby: typeof lobby;
      meta: typeof meta;
      profile: typeof profile;
      room: typeof room;
      settings: typeof settings;
      whoAmI: typeof whoAmI;
      impostor: typeof impostor;
      lineup: typeof lineup;
    };
  }
}
