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
import type { Beat, ShowView } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";
import { preloadMusic, type Track, useMusic } from "@/lib/music";
import { useGameOption } from "@/lib/settings";
import { markLoaded } from "@/server/actions";
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

/** The longest a page waits on its own opening before saying it is ready anyway (ms), within the start's wait. */
const READY_CAP = 3000;

/**
 * Resolves once this page has `game`'s opening loaded (or after READY_CAP):
 * what the host's start and the room's handshake wait on.
 */
export function useOpeningLoaded(game: GameKey): () => Promise<void> {
  const ja = useLocale() === "ja";
  const chalk = !useGameOption("lineup", "plainLetters");
  return useCallback(
    () =>
      Promise.race([
        preloadTitle(game, { ja, chalk }),
        new Promise<void>((done) => window.setTimeout(done, READY_CAP)),
      ]),
    [game, ja, chalk],
  );
}

/**
 * The room's handshake: while the host's start waits for every page, this
 * one says so once its opening is loaded, and the match begins for everyone
 * together (no word on screen: it takes a moment).
 */
export function useStartHandshake() {
  const { view, code, apply } = useRoomContext();
  const loaded = useOpeningLoaded(view.settings.game);
  const w = view.phase === "lobby" ? view.starting : null;
  const waiting = w && !w.loaded.includes(view.youId) ? w.until : null;
  useEffect(() => {
    if (waiting === null) return;
    let live = true;
    void loaded().then(async () => {
      if (!live) return;
      const r = await markLoaded(code);
      if (r.ok) apply(r.data);
    });
    return () => {
      live = false;
    };
  }, [waiting, loaded, code, apply]);
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
  children: (portrait: boolean, bleed: Bleed) => ReactNode;
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

/**
 * The opening's title beat, from the start on (a moment ahead, then the
 * curtain): the scene is built then, unseen, and is `live` once its beat plays.
 */
function useTitleShow(): { show: ShowView; beat: Beat; live: boolean } | null {
  const { show, beat } = useStage();
  const title =
    show?.kind === "opening" && show.title ? beatOf(show, "title") : null;
  // before the curtain too: a start a moment ahead (START_LEAD_MS)
  const ahead = beat === null || beat.kind === "curtain";
  if (!show || !title || (!ahead && beat.kind !== "title")) return null;
  return { show, beat: title, live: beat?.kind === "title" };
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
      {(portrait, bleed) =>
        game === "impostor" ? (
          <ImpostorTitle
            {...props}
            portrait={portrait}
            bleed={bleed}
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
