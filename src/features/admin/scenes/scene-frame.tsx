"use client";

// A title scene alone, inside an iframe of the panel's Cenas tab at the
// device's size (the scenes pick their canvas by the window's shape). The tab
// sends what to play and the clock; the frame is silent: the tab plays the
// sounds, with the clips being edited.
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ImpostorTitle } from "@/features/opening/impostor-title";
import { LineupTitle } from "@/features/opening/lineup-title";
import { sampleCast } from "@/features/opening/sample-cast";
import { sceneLength } from "@/features/opening/scene-sound";
import { TitleFonts, TitleStage } from "@/features/opening/title-scene";
import { WhoTitle } from "@/features/opening/who-title";
import type { SceneGame } from "@/game/scene-clips";
import { setRoomTunes, type Tunes } from "@/game/tune";
import {
  type ServerClock,
  ServerClockContext,
} from "@/lib/hooks/use-server-clock";

/** The scene's t = 0 on the frame's clock. */
export const SCENE_T0 = 1_700_000_000_000;

export interface SceneSpec {
  game: SceneGame;
  first: boolean;
  players: number;
  photos: boolean;
  /** The values in force, with the panel's unsaved changes. */
  tunes: Tunes;
}

/** What the tab sends its frame. */
export type SceneMessage =
  | { kind: "spec"; spec: SceneSpec }
  | {
      kind: "clock";
      origin: number;
      wall: number;
      playing: boolean;
      speed: number;
    };

const silent = () => [];

export function SceneFrame() {
  const [spec, setSpec] = useState<SceneSpec | null>(null);
  const [clock, setClock] = useState({
    origin: SCENE_T0,
    wall: 0,
    playing: false,
    speed: 1,
  });
  useEffect(() => {
    const on = (e: MessageEvent<SceneMessage>) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data;
      if (m?.kind === "spec") {
        setRoomTunes(m.spec.tunes);
        setSpec(m.spec);
      }
      if (m?.kind === "clock")
        setClock({
          origin: m.origin,
          wall: m.wall,
          playing: m.playing,
          speed: m.speed,
        });
    };
    window.addEventListener("message", on);
    window.parent.postMessage({ kind: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);
  const server = useMemo<ServerClock>(
    () =>
      clock.playing
        ? {
            now: () => clock.origin + (Date.now() - clock.wall) * clock.speed,
            frozen: false,
            rate: clock.speed,
          }
        : { now: () => clock.origin, frozen: true, rate: clock.speed },
    [clock],
  );
  if (!spec) return null;
  return (
    <ServerClockContext.Provider value={server}>
      <Scene key={JSON.stringify(spec)} spec={spec} />
    </ServerClockContext.Provider>
  );
}

function Scene({ spec }: { spec: SceneSpec }) {
  const { game, first, players: count, photos } = spec;
  const t = useTranslations("room.title");
  const tg = useTranslations("home.games");
  const n = first ? 1 : 2;
  const players = useMemo(() => sampleCast(count, photos, 1), [count, photos]);
  const props = { players, n, first };
  const name =
    game === "impostor"
      ? tg("impostor.name")
      : game === "lineup"
        ? tg("whatFor.name")
        : tg("whoAmI.name");
  return (
    <TitleStage
      game={game}
      fonts={<TitleFonts game={game} />}
      startsAt={SCENE_T0}
      endsAt={SCENE_T0 + sceneLength(game, first) * 1000}
      cues={silent}
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
  );
}
