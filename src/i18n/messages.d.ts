// Message keys are checked at compile time against the English files: a typo
// or a key that moved fails `tsc`, not the screen. One import per namespace
// in request.ts.
import type chat from "../../messages/en/chat.json";
import type common from "../../messages/en/common.json";
import type community from "../../messages/en/community.json";
import type impostor from "../../messages/en/games/impostor.json";
import type lineup from "../../messages/en/games/lineup.json";
import type whoAmI from "../../messages/en/games/whoAmI.json";
import type home from "../../messages/en/home.json";
import type howTo from "../../messages/en/howTo.json";
import type legal from "../../messages/en/legal.json";
import type library from "../../messages/en/library.json";
import type lobby from "../../messages/en/lobby.json";
import type meta from "../../messages/en/meta.json";
import type nav from "../../messages/en/nav.json";
import type news from "../../messages/en/news.json";
import type profile from "../../messages/en/profile.json";
import type room from "../../messages/en/room.json";
import type settings from "../../messages/en/settings.json";
import type workshop from "../../messages/en/workshop.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: {
      chat: typeof chat;
      common: typeof common;
      community: typeof community;
      home: typeof home;
      howTo: typeof howTo;
      legal: typeof legal;
      library: typeof library;
      lobby: typeof lobby;
      meta: typeof meta;
      nav: typeof nav;
      news: typeof news;
      profile: typeof profile;
      room: typeof room;
      settings: typeof settings;
      workshop: typeof workshop;
      whoAmI: typeof whoAmI;
      impostor: typeof impostor;
      lineup: typeof lineup;
    };
  }
}
