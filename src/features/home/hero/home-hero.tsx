"use client";

import { Play, Plus, Zap } from "lucide-react";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { QUESTION } from "@/components/ui/logo";
import { useGameName } from "@/features/create/game-info";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { useOnlineByGame } from "@/features/data/use-public-rooms";
import type { JoinRequest } from "@/features/join/join-dialog";
import { LazyJoinDialog } from "@/features/join/lazy-join-dialog";
import { LiveDot } from "@/features/rooms/room-bits";
import type { GameKey } from "@/game/games";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { NEW_ROOM, newRoom } from "@/lib/routes";
import { ChoiceThumb } from "./choice-thumb";
import { CodeField } from "./code-field";
import { HeroCrowd, WAVE } from "./crowd";
import { DrawScene } from "./draw-scene";
import { CHOICES, GameDeck, nextChoice } from "./game-deck";
import { type Choice, Headline } from "./headline";
import s from "./hero.module.css";
import { Pass } from "./pass";

// the games' stage scenes come after the page: the hero opens on the draw
const SCENES: Record<GameKey, ComponentType> = {
  "who-am-i": dynamic(
    () =>
      import("@/features/who-am-i/who-am-i-banner").then((m) => m.WhoAmIBanner),
    { ssr: false },
  ),
  impostor: dynamic(
    () =>
      import("@/features/impostor/impostor-banner").then(
        (m) => m.ImpostorBanner,
      ),
    { ssr: false },
  ),
  lineup: dynamic(
    () => import("@/features/lineup/lineup-banner").then((m) => m.LineupBanner),
    { ssr: false },
  ),
};

/** How long each scene takes to play once through (the step lists add up to these). */
const SCENE_MS: Record<Choice, number> = {
  any: 7700,
  "who-am-i": 12500,
  impostor: 13600,
  lineup: 12550,
};
/** A beat to land, and for a game the 220ms its scene takes to swap in. */
const deckMs = (c: Choice) => SCENE_MS[c] + 600 + (c === "any" ? 0 : 220);
/** A pick holds the game picked; after this long with no picks the deck deals again. */
const RESUME_MS = 10_000;
const SWAP_MS = 220;

/** The big butter-yellow "?" drifting over the stage. */
const BigQ = ({ className }: { className: string }) => (
  <svg
    className={cn(s.bigq, className)}
    viewBox="366 190 252 414"
    aria-hidden="true"
  >
    <path d={QUESTION} />
  </svg>
);

/**
 * The home's stage (option A, "Palco"): a full-bleed blue, tinted by the game
 * on show, with the way in on the left (who's up for ___?, "Play now" and the
 * game it plays, a room with friends or a code, and who you are) and the game
 * playing on the right (the draw for any game). Until you pick, the game
 * button deals the next game each time a scene ends; a crowd of guests peeks
 * over the wavy foot.
 */
export function HomeHero() {
  const t = useTranslations("home.hero");
  const gameName = useGameName();
  const router = useRouter();
  const still = useReducedMotion() ?? false;
  const online = useOnlineByGame();
  const { match } = useCurrentMatch();
  const [choice, setChoice] = useState<Choice>("any");
  const [auto, setAuto] = useState(true);
  const [held, setHeld] = useState(false);
  const [shown, setShown] = useState<GameKey | null>(null);
  const [swap, setSwap] = useState(false);
  const [join, setJoin] = useState<JoinRequest | null>(null);
  const hero = useRef<HTMLElement>(null);
  const deckHover = useRef(false);
  const menuOpen = useRef(false);
  const heldRef = useRef(false);
  const resume = useRef(0);

  useEffect(() => {
    if (still) setAuto(false);
  }, [still]);

  // the deck holds while the hero is mostly out of view
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          heldRef.current = !e.isIntersecting;
          setHeld(!e.isIntersecting);
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // a game's scene swaps in with a little fade (none from the draw)
  useEffect(() => {
    if (choice === "any") return;
    if (shown === null || still) {
      setShown(choice);
      return;
    }
    if (shown === choice) return;
    setSwap(true);
    const id = window.setTimeout(() => {
      setShown(choice);
      setSwap(false);
    }, SWAP_MS);
    return () => window.clearTimeout(id);
  }, [choice, shown, still]);

  const resumeAuto = useCallback(() => {
    // not while you're on it, its menu is open, or the hero is out of view: a bit later
    if (deckHover.current || menuOpen.current || heldRef.current) {
      resume.current = window.setTimeout(resumeAuto, 4000);
      return;
    }
    setAuto(true);
  }, []);
  useEffect(() => () => window.clearTimeout(resume.current), []);

  const pick = (c: Choice) => {
    window.clearTimeout(resume.current);
    if (!still) resume.current = window.setTimeout(resumeAuto, RESUME_MS);
    setAuto(false);
    setChoice(c);
  };
  const create = () =>
    router.push(choice === "any" ? NEW_ROOM : newRoom(choice));
  const quick = (game: Choice) => setJoin({ kind: "quick", game });
  const total = online
    ? Object.values(online).reduce((a, n) => a + (n ?? 0), 0)
    : null;
  const Scene = shown ? SCENES[shown] : null;

  return (
    <section
      ref={hero}
      data-g={choice}
      className={s.hero}
      aria-labelledby="hero-title"
    >
      <div className={cn(s.glow, s.g1)} aria-hidden="true" />
      <div className={cn(s.glow, s.g2)} aria-hidden="true" />
      <div className={cn(s.glow, s.g3)} aria-hidden="true" />
      <div className={s.qfield} aria-hidden="true" />
      <div className={cn(s.beam, s.b1)} aria-hidden="true" />
      <div className={cn(s.beam, s.b2)} aria-hidden="true" />
      <BigQ className={s.q1} />
      <BigQ className={s.q2} />
      <BigQ className={s.q3} />
      <div className={s.grid}>
        <div className={s.copy}>
          <span
            className={s.livecount}
            style={total === null ? { visibility: "hidden" } : undefined}
          >
            <LiveDot color="#7ee0d8" />
            <span>
              {t.rich("online", {
                n: total ?? 0,
                b: (c) => <b>{c}</b>,
              })}
            </span>
          </span>
          <Headline choice={choice} id="hero-title" className={s.title} />
          <p className={s.sub}>{t("sub")}</p>
          <div
            className={cn(s.cta, match && s.off)}
            inert={match ? true : undefined}
          >
            <div className={s.split}>
              <button
                type="button"
                className={s.play}
                onClick={() => quick(choice)}
                aria-label={
                  choice === "any"
                    ? t("playAny")
                    : t("playGame", { game: gameName(choice) })
                }
              >
                <Play aria-hidden="true" />
                {t("play")}
              </button>
              <span
                className="contents"
                onPointerEnter={() => {
                  deckHover.current = true;
                }}
                onPointerLeave={() => {
                  deckHover.current = false;
                }}
              >
                <GameDeck
                  className={s.deck}
                  choice={choice}
                  auto={auto}
                  ms={deckMs(choice)}
                  held={held}
                  online={online}
                  onPick={pick}
                  onDeal={() => setChoice((c) => nextChoice(c))}
                  onOpenChange={(open) => {
                    menuOpen.current = open;
                  }}
                />
              </span>
            </div>
            <p className={s.hint}>
              <Zap aria-hidden="true" />
              {t("hint")}
            </p>
            <div className={s.cta2}>
              <button type="button" className={s.glassBtn} onClick={create}>
                <Plus aria-hidden="true" />
                <span>
                  {t("create")}
                  <span className={s.xl}>{t("withFriends")}</span>
                </span>
              </button>
              <CodeField onRoom={(room) => setJoin({ kind: "room", room })} />
            </div>
          </div>
          <Pass />
        </div>
        <div className={s.sceneBox}>
          {choice === "any" ? (
            <DrawScene
              onPlay={() => !match && quick("any")}
              onPick={(g) => pick(g)}
            />
          ) : (
            // biome-ignore lint/a11y/useSemanticElements: it wraps a whole scene, not a label
            <div
              role="button"
              tabIndex={0}
              aria-label={t("playGame", { game: gameName(choice) })}
              className={cn(s.sceneHost, swap && s.swap)}
              onClick={() => !match && quick(choice)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                if (!match) quick(choice);
              }}
            >
              {Scene ? <Scene /> : null}
            </div>
          )}
          <div className={s.tabs} role="tablist" aria-label={t("tabs")}>
            {CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={choice === c}
                aria-label={c === "any" ? t("any") : gameName(c)}
                className={s.tab}
                onClick={() => pick(c)}
              >
                <ChoiceThumb choice={c} className={s.tabThumb} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <HeroCrowd />
      <div className={s.edge} aria-hidden="true">
        <svg
          viewBox="0 0 1440 72"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={`${WAVE} V72 H0Z`} />
        </svg>
      </div>
      <LazyJoinDialog request={join} onClose={() => setJoin(null)} />
    </section>
  );
}
