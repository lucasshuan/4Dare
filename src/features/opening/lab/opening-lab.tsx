"use client";

// The title scenes' lab (dev only): any game's scene, long or short, for any
// number of players, held at any moment or played from it, so every frame is a
// link and a screenshot: /en/dev/opening?game=impostor&first=0&players=8&at=6.6
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { GameKey } from "@/game/games";
import type { Avatar, Lang } from "@/game/types";
import { avatarColor, randomDna } from "@/lib/avatar";
import {
  type ServerClock,
  ServerClockContext,
} from "@/lib/hooks/use-server-clock";
import { ImpostorTitle, impostorCues } from "../impostor-title";
import { LineupTitle, lineupCues } from "../lineup-title";
import type { TitlePlayer } from "../title-kit";
import { TitleFonts, TitleStage } from "../title-scene";
import { WhoTitle, whoCues } from "../who-title";

type Query = Record<string, string | string[] | undefined>;

const NAMES = [
  "Nobel",
  "AranhaSombria",
  "Bia",
  "CiclopeCalmo",
  "Rafa",
  "CaracolLento",
  "GatoDescolado",
  "Lu",
  "PandaSonolento",
  "SapoFeliz",
];

/** A made-up picture, like an account's from Discord or Google. */
function photo(i: number): Avatar {
  const hue = (i * 67) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="hsl(${hue} 45% 70%)"/><circle cx="50" cy="40" r="20" fill="hsl(${hue} 30% 35%)"/><path d="M14 100c4-24 18-34 36-34s32 10 36 34z" fill="hsl(${hue} 30% 35%)"/></svg>`;
  return {
    kind: "image",
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    color: "#D7DDE8",
  };
}

function players(
  count: number,
  photos: boolean,
  crowned: number,
): TitlePlayer[] {
  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: count }, (_, i) => {
    const dna = randomDna(random);
    const avatar: Avatar =
      photos && i % 2 === 1
        ? photo(i)
        : { kind: "creature", dna, color: avatarColor(dna) };
    return {
      id: `p${i + 1}`,
      name: NAMES[i % NAMES.length],
      avatar,
      slot: i,
      crowned: i === crowned,
    };
  });
}

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
    () => players(count, photos, crowned),
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
    () =>
      game === "impostor"
        ? () => impostorCues(first)
        : game === "lineup"
          ? () => lineupCues(first)
          : () => whoCues(first, count),
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
