"use client";

import { AnimatePresence, m } from "motion/react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRoomContext } from "@/features/data/room-context";
import { beatOf } from "@/features/stage/stage";
import { useStage } from "@/features/stage/stage-context";
import type { GameKey } from "@/game/games";
import { SHOW_TIMING } from "@/game/show-timing";
import type { TitleCard } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";
import { preloadMusic, type Track, useMusic } from "@/lib/music";
import { useGameOption } from "@/lib/settings";
import { markOpeningReady } from "@/server/actions";
import {
  IMPOSTOR_SOUNDS,
  ImpostorTitle,
  impostorCues,
  impostorImages,
} from "./impostor-title";
import {
  LINEUP_IMAGES,
  LINEUP_SOUNDS,
  LineupTitle,
  lineupCues,
} from "./lineup-title";
import { rehearsed, useRehearsal } from "./rehearsal";
import type { Bleed, TitlePlayer } from "./title-kit";
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

/**
 * What shows past the canvas before a scene paints it: its set's darkest
 * colour. Who am I?'s stage opens in a circle over the screen before it, so
 * nothing covers that.
 */
const BACKDROP: Record<GameKey, string> = {
  "who-am-i": "transparent",
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

const preloads = new Map<string, Promise<void>>();

/**
 * Fetches a game's title scene (its take, sounds, pictures, What for?'s chalk
 * unless `chalk` is off) ahead of its match, so it starts on the dot. Resolves
 * once all of it is in; a part that fails counts as in (the scene does
 * without it), and asking again waits on the same fetches.
 */
export function preloadTitle(
  game: GameKey,
  o: { ja: boolean; chalk: boolean },
): Promise<void> {
  // the upright room or the wide one, as the window is now
  const portrait = window.innerWidth < window.innerHeight;
  const key = `${game} ${o.ja} ${o.chalk} ${portrait}`;
  const known = preloads.get(key);
  if (known) return known;
  const parts: Promise<unknown>[] = [
    preloadMusic(TITLE_TRACK[game]),
    preloadTitleSounds(
      game === "impostor"
        ? IMPOSTOR_SOUNDS
        : game === "lineup"
          ? LINEUP_SOUNDS
          : WHO_SOUNDS,
    ),
    ...(game === "impostor"
      ? impostorImages(portrait)
      : game === "lineup"
        ? LINEUP_IMAGES
        : ["/opening/crown.svg"]
    ).map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      return img.decode();
    }),
  ];
  if (game === "lineup" && o.chalk)
    parts.push(
      (o.ja
        ? import("@/features/lineup/chalk-font-ja")
        : import("@/features/lineup/chalk-font")
      ).then((m) => m.loadChalkFonts()),
    );
  const all = Promise.allSettled(parts).then(() => undefined);
  preloads.set(key, all);
  return all;
}

/** How long the lobby's panels take to leave for the loading screen (globals.css, .lobby-leave), with a margin (ms). */
const LOBBY_LEAVE_MS = 520;

/** The longest a page takes to say it is ready for a start, loaded and rehearsed or not, within the ready check's wait (ms). */
const READY_CAP = 4500;

/** Fetches `game`'s title scene as this page will play it (preloadTitle). */
function useOpeningFiles(game: GameKey): () => Promise<void> {
  const ja = useLocale() === "ja";
  const chalk = !useGameOption("lineup", "plainLetters");
  return useCallback(
    () => preloadTitle(game, { ja, chalk }),
    [game, ja, chalk],
  );
}

/**
 * A start's ready check, on this page: every page shows the loading screen
 * while the opening the match starts with is loaded and rehearsed behind it
 * (rehearsal.ts); then the page says it is ready (or after READY_CAP), and the
 * match begins for everyone together once they all have.
 */
export function useReadyCheck() {
  const { view, code, apply, watching } = useRoomContext();
  const w = view.phase === "lobby" ? view.starting : null;
  const waiting = w && !w.ready.includes(view.youId) ? w.until : null;
  useEffect(() => {
    if (waiting === null) return;
    let live = true;
    void Promise.race([
      rehearsed(waiting),
      new Promise<void>((done) => window.setTimeout(done, READY_CAP)),
    ]).then(async () => {
      // someone watching gets the opening ready too, but nobody waits on them
      if (!live || watching) return;
      const r = await markOpeningReady(code);
      if (r.ok) apply(r.data);
    });
    return () => {
      live = false;
    };
  }, [waiting, code, apply, watching]);
}

/**
 * Fits a canvas whole in the window, centred: the landscape one on a wide
 * window, the upright one on a tall one. What is around it is the scene's own
 * set, carried past the canvas by each scene (`bleed` says how far).
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
  // a pixel more than the window, so no edge shows a hairline of the backdrop
  const bx = size ? Math.ceil((size.w / scale - canvas.w) / 2) + 1 : 0;
  const by = size ? Math.ceil((size.h / scale - canvas.h) / 2) + 1 : 0;
  const bleed = useMemo<Bleed>(() => ({ x: bx, y: by }), [bx, by]);
  return { ref, portrait, canvas, scale, bleed, ready: size !== null };
}

/**
 * A title scene over the whole window, under the match header and the chat:
 * its canvas scaled to fit and played on the server clock from `startsAt`.
 * A match's end plays its scene on it too.
 */
export function TitleStage({
  game,
  backdrop,
  startsAt,
  endsAt,
  cues,
  label,
  fonts,
  live = true,
  rehearse = null,
  length,
  files,
  children,
}: {
  game: GameKey;
  /** What shows past the canvas before the scene paints it, if not the game's title scene's. */
  backdrop?: string;
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
  /**
   * The start whose ready check this scene is rehearsed for (its `until`):
   * silent, off the clock, held at a few moments of its `length` (ms) once
   * its `files` are in. Null once the match is on.
   */
  rehearse?: number | null;
  length?: number;
  files?: () => Promise<void>;
  children: (portrait: boolean, bleed: Bleed) => ReactNode;
}) {
  const fit = useFit();
  const scene = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(0);
  useSceneClock(scene, startsAt, rehearse === null ? null : held);
  useTitleSounds(
    useMemo(() => cues(fit.portrait), [cues, fit.portrait]),
    startsAt,
    endsAt,
    rehearse !== null,
  );
  useRehearsal(
    rehearse,
    fit.ready,
    (length ?? endsAt - startsAt) / 1000,
    files ?? noFiles,
    setHeld,
  );
  return (
    <div
      ref={fit.ref}
      className="fixed inset-0 z-30 overflow-hidden"
      style={{
        background: backdrop ?? BACKDROP[game],
        // its own layer all along: the one painted unseen is the one that shows, not drawn again then
        willChange: "opacity",
        ...(live
          ? { transition: "opacity 0.2s ease-out" }
          : {
              // painted, rasterized and playing unseen: under one 8-bit step, where a plain 0 skips the
              // painting and leaves it all for the first visible frame
              opacity: 0.001,
              pointerEvents: "none",
            }),
      }}
    >
      <div
        ref={scene}
        aria-hidden
        className="absolute top-1/2 left-1/2 select-none"
        style={
          {
            width: fit.canvas.w,
            height: fit.canvas.h,
            transform: `translate(-50%, -50%) scale(${fit.scale})`,
            visibility: fit.ready ? undefined : "hidden",
            "--bx": `${fit.bleed.x}px`,
            "--by": `${fit.bleed.y}px`,
          } as CSSProperties
        }
      >
        {fit.ready ? children(fit.portrait, fit.bleed) : null}
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

const noFiles = () => Promise.resolve();

/**
 * The opening's title beat, from the start on (a moment ahead, then the
 * curtain): the scene is built then, unseen, and is `live` once its beat plays.
 */
function useTitleShow(): SceneProps | null {
  const { show, beat } = useStage();
  const title =
    show?.kind === "opening" && show.title ? beatOf(show, "title") : null;
  // before the curtain too: a start a moment ahead (START_LEAD_MS)
  const ahead = beat === null || beat.kind === "curtain";
  if (!show?.title || !title || (!ahead && beat.kind !== "title")) return null;
  return {
    card: show.title,
    first: show.first,
    startsAt: title.startsAt,
    until: title.until,
    live: beat?.kind === "title",
    rehearse: null,
  };
}

/**
 * The scene a start's ready check rehearses, unseen behind the loading
 * screen: the one the match opens with, which then plays on as it is.
 */
function useRehearsedTitle(): SceneProps | null {
  const { view } = useRoomContext();
  const w = view.phase === "lobby" ? view.starting : null;
  const key = w?.until ?? null;
  // built once the lobby has left for the loading screen: building it is heavy
  // work, which would stall the panels on their way out
  const [armed, setArmed] = useState<number | null>(null);
  useEffect(() => {
    if (key === null) return;
    const id = window.setTimeout(() => setArmed(key), LOBBY_LEAVE_MS);
    return () => window.clearTimeout(id);
  }, [key]);
  if (!w || armed !== key) return null;
  return {
    card: w.title,
    first: w.first,
    startsAt: 0,
    until: 0,
    live: false,
    rehearse: w.until,
  };
}

/** What a title scene plays: its card, its length and where it stands. */
interface SceneProps {
  card: TitleCard;
  first: boolean;
  startsAt: number;
  until: number;
  live: boolean;
  rehearse: number | null;
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
  const show = useTitleShow();
  const rehearsal = useRehearsedTitle();
  const on = show ?? rehearsal;
  return (
    <AnimatePresence>
      {on ? (
        // one scene from the rehearsal to the show: built and painted once
        <m.div
          key="title"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <Title {...on} />
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

function Title({ card, first, startsAt, until, live, rehearse }: SceneProps) {
  const { view } = useRoomContext();
  const t = useTranslations("room.title");
  const tg = useTranslations("home.games");
  const game = view.settings.game;
  const files = useOpeningFiles(game);
  const players = useTitlePlayers(card.crowned);
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
      startsAt={startsAt}
      endsAt={until}
      cues={cues}
      label={`${t("match", { n })} · ${name}`}
      live={live}
      rehearse={rehearse}
      length={first ? SHOW_TIMING.title.first : SHOW_TIMING.title.later}
      files={files}
    >
      {(portrait, bleed) =>
        game === "impostor" ? (
          <ImpostorTitle
            {...props}
            portrait={portrait}
            bleed={bleed}
            labels={labels.impostor}
          />
        ) : game === "lineup" ? (
          <LineupTitle
            {...props}
            portrait={portrait}
            bleed={bleed}
            labels={labels.lineup}
          />
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
