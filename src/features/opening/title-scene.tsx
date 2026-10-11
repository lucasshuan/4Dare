"use client";

import { AnimatePresence, m } from "motion/react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRoomContext } from "@/features/data/room-context";
import { beatOf } from "@/features/stage/stage";
import { useStage } from "@/features/stage/stage-context";
import type { GameKey } from "@/game/games";
import type { Beat, ShowView } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";
import { type Track, useMusic } from "@/lib/music";
import { useGameOption } from "@/lib/settings";
import {
  IMPOSTOR_IMAGES,
  IMPOSTOR_SOUNDS,
  ImpostorTitle,
  impostorCues,
} from "./impostor-title";
import {
  LINEUP_IMAGES,
  LINEUP_SOUNDS,
  LineupTitle,
  lineupCues,
} from "./lineup-title";
import type { TitlePlayer } from "./title-kit";
import {
  preloadTitleSounds,
  type TitleCue,
  useTitleSounds,
} from "./title-sound";
import { MUSIC_AT } from "./title-timing";
import { useSceneClock } from "./use-scene-clock";
import { WHO_SOUNDS, WhoTitle, whoCues } from "./who-title";

/** The canvases the scenes are drawn on: a landscape screen's, and a phone's held upright (at 2×). */
const CANVAS = {
  landscape: { w: 1280, h: 720 },
  portrait: { w: 780, h: 1688 },
} as const;

/** What shows past the canvas before a scene paints it: its set's darkest colour. */
const BACKDROP: Record<GameKey, string> = {
  "who-am-i": "var(--brand-stage)",
  impostor: "#07050b",
  lineup: "#1c0e05",
};

/** The take each game's title scene plays from the top. */
export const TITLE_TRACK: Record<GameKey, Track> = {
  "who-am-i": "stage",
  impostor: "impostor",
  lineup: "matchday",
};

const ChalkFont = dynamic(() => import("@/features/lineup/chalk-font"));
const ChalkFontJa = dynamic(() => import("@/features/lineup/chalk-font-ja"));

/** What for?'s chalk, which its title scene writes in (unless "Plain letters" is on). */
export function TitleFonts({ game }: { game: GameKey }) {
  const plain = useGameOption("lineup", "plainLetters");
  const ja = useLocale() === "ja";
  if (game !== "lineup" || plain) return null;
  return ja ? <ChalkFontJa /> : <ChalkFont />;
}

/**
 * Fetches a game's title scene (sounds, pictures, What for?'s chalk unless
 * `chalk` is off) ahead of its match, so it starts on the dot.
 */
export function preloadTitle(
  game: GameKey,
  o: { ja: boolean; chalk: boolean },
) {
  if (game === "lineup" && o.chalk)
    void (
      o.ja
        ? import("@/features/lineup/chalk-font-ja")
        : import("@/features/lineup/chalk-font")
    ).then((m) => m.loadChalkFonts());
  preloadTitleSounds(
    game === "impostor"
      ? IMPOSTOR_SOUNDS
      : game === "lineup"
        ? LINEUP_SOUNDS
        : WHO_SOUNDS,
  );
  for (const src of game === "impostor"
    ? IMPOSTOR_IMAGES
    : game === "lineup"
      ? LINEUP_IMAGES
      : ["/opening/crown.svg"]) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

/**
 * Fits a canvas whole in the window, centred: the landscape one on a wide
 * window, the upright one on a tall one. What is around it is the scene's own
 * set, carried past the canvas by each scene.
 */
function useFit() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const portrait = size ? size.w < size.h : false;
  const canvas = portrait ? CANVAS.portrait : CANVAS.landscape;
  const scale = size ? Math.min(size.w / canvas.w, size.h / canvas.h) : 0;
  return { ref, portrait, canvas, scale, ready: size !== null };
}

/**
 * A title scene over the whole window, under the match header and the chat:
 * its canvas scaled to fit and played on the server clock from `startsAt`.
 */
export function TitleStage({
  game,
  startsAt,
  endsAt,
  cues,
  label,
  fonts,
  live = true,
  children,
}: {
  game: GameKey;
  /** The fonts the scene writes in, if it brings its own. */
  fonts?: ReactNode;
  startsAt: number;
  endsAt: number;
  cues: (portrait: boolean) => TitleCue[];
  /** What a screen reader says: "Match 2 · Impostor". */
  label: string;
  /**
   * Off while the curtain before it is down: the scene is already built and
   * painted, unseen, so it starts on the dot even on a slow phone.
   */
  live?: boolean;
  children: (portrait: boolean) => ReactNode;
}) {
  const fit = useFit();
  const scene = useRef<HTMLDivElement>(null);
  useSceneClock(scene, startsAt);
  useTitleSounds(
    useMemo(() => cues(fit.portrait), [cues, fit.portrait]),
    startsAt,
    endsAt,
  );
  return (
    <div
      ref={fit.ref}
      className="fixed inset-0 z-30 overflow-hidden"
      style={{
        background: BACKDROP[game],
        ...(live
          ? {}
          : {
              // painted, rasterized and playing unseen: under one 8-bit step, where a plain 0 skips the
              // painting and leaves it all for the first visible frame
              opacity: 0.001,
              willChange: "opacity",
              pointerEvents: "none",
            }),
      }}
    >
      <div
        ref={scene}
        aria-hidden
        className="absolute top-1/2 left-1/2 select-none"
        style={{
          width: fit.canvas.w,
          height: fit.canvas.h,
          transform: `translate(-50%, -50%) scale(${fit.scale})`,
          visibility: fit.ready ? undefined : "hidden",
        }}
      >
        {fit.ready ? children(fit.portrait) : null}
      </div>
      {live ? (
        <p className="sr-only" role="status">
          {label}
        </p>
      ) : null}
      {fonts}
    </div>
  );
}

/**
 * The opening's title beat, from the curtain before it on: the scene is built
 * then, unseen, and is `live` once its beat plays.
 */
function useTitleShow(): { show: ShowView; beat: Beat; live: boolean } | null {
  const { show, beat } = useStage();
  const title =
    show?.kind === "opening" && show.title ? beatOf(show, "title") : null;
  if (!show || !title || (beat?.kind !== "title" && beat?.kind !== "curtain"))
    return null;
  return { show, beat: title, live: beat.kind === "title" };
}

/** The players a title scene draws: the match's, in seat order. */
function useTitlePlayers(crowned: readonly string[]): TitlePlayer[] {
  const { view } = useRoomContext();
  const ids = view.lu?.dealtIds;
  const players = ids
    ? ids.flatMap((id) => view.players.filter((p) => p.id === id))
    : view.players.filter((p) => !p.away);
  const list = players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    slot: p.colorSlot,
    crowned: crowned.includes(p.id),
  }));
  // the same list while the players look the same, so the scene isn't drawn again on every update of the room
  const key = JSON.stringify(list);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on what the list holds
  return useMemo(() => list, [key]);
}

/**
 * The match's title scene, over everything but the header and the chat, while
 * the opening's title beat plays; it fades out into the next beat.
 */
export function OpeningScene() {
  const on = useTitleShow();
  return (
    <AnimatePresence>
      {on ? (
        <m.div
          key={on.show.startsAt}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <Title show={on.show} beat={on.beat} live={on.live} />
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function Title({
  show,
  beat,
  live,
}: {
  show: ShowView;
  beat: Beat;
  live: boolean;
}) {
  const { view } = useRoomContext();
  const t = useTranslations("room.title");
  const tg = useTranslations("home.games");
  const game = view.settings.game;
  const card = show.title ?? { n: 1, crowned: [] };
  const players = useTitlePlayers(card.crowned);
  const first = show.first;
  const props = { players, n: card.n, first };
  const count = players.length;
  const cues = useMemo(
    () =>
      game === "impostor"
        ? () => impostorCues(first)
        : game === "lineup"
          ? () => lineupCues(first)
          : () => whoCues(first, count),
    [game, first, count],
  );
  const name =
    game === "impostor"
      ? tg("impostor.name")
      : game === "lineup"
        ? tg("whatFor.name")
        : tg("whoAmI.name");
  const n = card.n;
  const labels = useMemo(
    () => ({
      impostor: { case: t("case"), title: name },
      lineup: {
        half: t("halfNumber", { n }),
        prevHalf: t("halfNumber", { n: Math.max(1, n - 1) }),
        rest: t("halfRest"),
        title: name,
        formation: t("formation"),
        or: t("formationOr"),
      },
      who: { match: t("matchLabel"), title: name },
    }),
    [t, name, n],
  );
  return (
    <TitleStage
      game={game}
      fonts={<TitleFonts game={game} />}
      startsAt={beat.startsAt}
      endsAt={beat.until}
      cues={cues}
      label={`${t("match", { n })} · ${name}`}
      live={live}
    >
      {(portrait) =>
        game === "impostor" ? (
          <ImpostorTitle
            {...props}
            portrait={portrait}
            labels={labels.impostor}
          />
        ) : game === "lineup" ? (
          <LineupTitle {...props} portrait={portrait} labels={labels.lineup} />
        ) : (
          <WhoTitle {...props} portrait={portrait} labels={labels.who} />
        )
      }
    </TitleStage>
  );
}

/**
 * The music at a match's start: the lobby's stops at once, and the game's take
 * plays from its top as the number flies to the corner.
 */
export function OpeningMusic() {
  const { view } = useRoomContext();
  const { show } = useStage();
  const clock = useClock();
  const title = show?.kind === "opening" ? beatOf(show, "title") : null;
  const at = title
    ? title.startsAt + (show?.first ? MUSIC_AT.first : MUSIC_AT.later) * 1000
    : null;
  // on this page's clock, once per show: a clock re-estimated later doesn't move it
  // biome-ignore lint/correctness/useExhaustiveDependencies: fixed when the show comes in
  const restartAt = useMemo(
    () => (at === null ? null : performance.now() + (at - clock.now())),
    [at],
  );
  useMusic(
    restartAt === null ? undefined : TITLE_TRACK[view.settings.game],
    3,
    restartAt,
  );
  return null;
}
