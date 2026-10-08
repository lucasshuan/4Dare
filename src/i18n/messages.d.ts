// Message keys are checked at compile time against the English files: a typo
// or a key that moved fails `tsc`, not the screen. One import per namespace
// in request.ts.
import type chat from "../../messages/en/chat.json";
import type common from "../../messages/en/common.json";
import type game from "../../messages/en/game.json";
import type home from "../../messages/en/home.json";
import type impostor from "../../messages/en/impostor.json";
import type lineup from "../../messages/en/lineup.json";
import type lobby from "../../messages/en/lobby.json";
import type meta from "../../messages/en/meta.json";
import type pickCard from "../../messages/en/pickCard.json";
import type player from "../../messages/en/player.json";
import type profile from "../../messages/en/profile.json";
import type result from "../../messages/en/result.json";
import type room from "../../messages/en/room.json";
import type settings from "../../messages/en/settings.json";
import type stageCast from "../../messages/en/stageCast.json";
import type stageDraw from "../../messages/en/stageDraw.json";
import type stageOpening from "../../messages/en/stageOpening.json";
import type turn from "../../messages/en/turn.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: {
      chat: typeof chat;
      common: typeof common;
      game: typeof game;
      home: typeof home;
      impostor: typeof impostor;
      lineup: typeof lineup;
      lobby: typeof lobby;
      meta: typeof meta;
      pickCard: typeof pickCard;
      player: typeof player;
      profile: typeof profile;
      result: typeof result;
      room: typeof room;
      settings: typeof settings;
      stageCast: typeof stageCast;
      stageDraw: typeof stageDraw;
      stageOpening: typeof stageOpening;
      turn: typeof turn;
    };
  }
}
