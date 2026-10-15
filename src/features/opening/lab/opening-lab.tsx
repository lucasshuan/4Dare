"use client";

// The title scenes' lab (dev only): any game's scene, long or short, for any
// number of players, held at any moment or played from it, so every frame is a
// link and a screenshot: /en/dev/opening?game=impostor&first=0&players=8&at=6.6
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { GameKey } from "@/game/games";
import type { Lang } from "@/game/types";
import {
  type ServerClock,
  ServerClockContext,
} from "@/lib/hooks/use-server-clock";
import { ImpostorTitle } from "../impostor-title";
import { LineupTitle } from "../lineup-title";
import { sampleCast } from "../sample-cast";
import { titleCues } from "../scene-sound";
import { TitleFonts, TitleStage } from "../title-scene";
import { WhoTitle } from "../who-title";

type Query = Record<string, string | string[] | undefined>;

export function OpeningLab({ query }: { lang: Lang; query: Query }) {
  const get = (k: string) => {
    const v = query[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const game = (
    ["who-am-i", "impostor", "lineup"].includes(get("game") ?? "")
      ? get("game")
      : "who-am-i"
  ) as GameKey;
  const first = get("first") !== "0";
  const count = Math.max(2, Math.min(10, Number(get("players")) || 4));
  const n = Math.max(1, Number(get("n")) || (first ? 1 : 2));
  const at = Number(get("at")) || 0;
  const play = get("play") === "1";
  const photos = get("photos") === "1";
  const crowned = Number(get("crowned") ?? 1);
  // the scene's t = 0, on a clock that stands still at `at` or runs from it
  const [startsAt] = useState(() => Date.now() - at * 1000);
  const clock = useMemo<ServerClock>(
    () =>
      play
        ? { now: () => Date.now(), frozen: false, rate: 1 }
        : { now: () => startsAt + at * 1000, frozen: true, rate: 1 },
    [play, startsAt, at],
  );
  const t = useTranslations("room.title");
  const tg = useTranslations("home.games");
  const list = useMemo(
    () => sampleCast(count, photos, crowned),
    [count, photos, crowned],
  );
  const props = { players: list, n, first };
  const name =
    game === "impostor"
      ? tg("impostor.name")
      : game === "lineup"
        ? tg("whatFor.name")
        : tg("whoAmI.name");
  const cues = useMemo(
    () => () => titleCues(game, first, count),
    [game, first, count],
  );
  return (
    <ServerClockContext.Provider value={clock}>
      <TitleStage
        game={game}
        fonts={<TitleFonts game={game} />}
        startsAt={startsAt}
        endsAt={startsAt + (first ? 9000 : 6000)}
        cues={cues}
        label={`${t("match", { n })} · ${name}`}
      >
        {(portrait, bleed) =>
          game === "impostor" ? (
            <ImpostorTitle
              {...props}
              portrait={portrait}
              bleed={bleed}
              labels={{ case: t("case"), title: name }}
            />
          ) : game === "lineup" ? (
            <LineupTitle
              {...props}
              portrait={portrait}
              bleed={bleed}
              labels={{
                half: t("halfNumber", { n }),
                prevHalf: t("halfNumber", { n: Math.max(1, n - 1) }),
                rest: t("halfRest"),
                title: name,
                formation: t("formation"),
                or: t("formationOr"),
              }}
            />
          ) : (
            <WhoTitle
              {...props}
              portrait={portrait}
              labels={{ match: t("matchLabel"), title: name }}
            />
          )
        }
      </TitleStage>
    </ServerClockContext.Provider>
  );
}
