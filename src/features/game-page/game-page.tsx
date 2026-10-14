"use client";

import {
  Check,
  ChevronLeft,
  Drama,
  Mail,
  Pause,
  Play,
  Plus,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { keyClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { JoinByCode } from "@/features/home/join-by-code";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import type { GameKey } from "@/game/games";
import { guestAvatar } from "@/game/guest-names";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { GAMES, newRoom } from "@/lib/routes";
import type { GameFactsData } from "@/server/community-contract";
import { GameFacts } from "./game-facts";
import s from "./game-page.module.css";
import { GameRanking } from "./game-ranking";
import { GameRooms } from "./game-rooms";
import {
  createRulesRunner,
  RULE_STEP_MS,
  type RulesCopy,
  type RulesRunner,
} from "./rules-scene";
import scene from "./rules-scene.module.css";

const ChalkFont = dynamic(() => import("@/features/lineup/chalk-font"));
const ChalkFontJa = dynamic(() => import("@/features/lineup/chalk-font-ja"));

const TONE: Record<GameKey, string> = {
  "who-am-i": s.who,
  impostor: s.imp,
  lineup: s.lin,
};

/** The banner's drifting marks: x, y (%), size (px), colour and period (s). */
const MARKS: [number, number, number, string, number][] = [
  [3, 58, 54, "var(--sky)", 7],
  [9, 18, 26, "var(--apricot)", 9],
  [21, 72, 22, "var(--yes)", 8],
  [24, 30, 36, "var(--sky)", 10],
  [40, 12, 20, "var(--apricot)", 7.5],
  [61, 18, 24, "var(--yes)", 9.5],
  [77, 30, 38, "var(--apricot)", 8.5],
  [80, 74, 22, "var(--sky)", 7],
  [93, 20, 30, "var(--sky)", 9],
  [97, 64, 48, "var(--yes)", 10.5],
];
const markOf = (game: GameKey, i: number) => {
  const [x, y, size, color, t] = MARKS[i];
  if (game === "impostor") return [x, y, size * 0.9, "#ffffff", t] as const;
  if (game === "lineup")
    return [x, y, size * 0.8, i % 2 ? "#7a4f2c" : "#b8322a", t] as const;
  return [x, y, size, color, t] as const;
};

/** The others at the rules round's table: the same strangers every time. */
const CAST = [11, 24, 37, 52].map(guestAvatar);

/** The words of `game`'s rules round, from its messages. */
function useRulesCopy(game: GameKey): {
  steps: string[];
  copy: RulesCopy;
} {
  const t = useTranslations("home.gamePage.how");
  const tw = useTranslations("home.games.whoAmI");
  const ti = useTranslations("home.games.impostor");
  const tl = useTranslations("home.games.whatFor");
  const steps = (
    {
      "who-am-i": tw.raw("rules"),
      impostor: ti.raw("rules"),
      lineup: tl.raw("rules"),
    } as Record<GameKey, string[]>
  )[game];
  return {
    steps,
    copy: {
      you: t("you"),
      whoAmI: {
        ask: tw("scene.ask"),
        yes: tw("scene.yes"),
        probably: tw("scene.probably"),
        unknown: tw("scene.unknown"),
        guess: tw("scene.guess"),
        hit: tw("scene.hit"),
      },
      impostor: {
        ask: ti("scene.ask"),
        range: ti("scene.range"),
        stamp: ti("scene.stamp"),
      },
      lineup: {
        sold: tl("scene.sold"),
        whatFor: tl("scene.whatFor"),
        teams: tl.raw("scene.teams") as RulesCopy["lineup"]["teams"],
      },
    },
  };
}

/**
 * The rules round: its scene in the banner, and the step it is on for the
 * list beside the pitch (tablets up) and the caption under the banner
 * (phones). Picking a step jumps there; the hold key pauses it. Reduced
 * motion starts it held.
 */
function useRules(game: GameKey) {
  const still = useReducedMotion() ?? false;
  const { me } = useMe();
  const { copy } = useRulesCopy(game);
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [held, setHeld] = useState(still);
  const [halted, setHalted] = useState(still);
  const runner = useRef<RulesRunner | null>(null);
  const node = useRef<HTMLDivElement | null>(null);
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const heldRef = useRef(held);
  heldRef.current = held;
  const stepRef = useRef(step);
  stepRef.current = step;
  const face = me?.avatar;

  // a new game, or your face once known: the round starts over where it was
  // biome-ignore lint/correctness/useExhaustiveDependencies: the face's own value, not its object, restarts it
  useEffect(() => {
    const root = node.current;
    if (!root) return;
    const r = createRulesRunner(root, {
      game,
      copy: copyRef.current,
      cast: { me: face ?? guestAvatar(3), others: CAST },
      still,
      onStep: (i) => {
        setStep(i);
        setRun((n) => n + 1);
      },
      onHalted: setHalted,
    });
    runner.current = r;
    r.setHeld(heldRef.current);
    r.run(Math.min(stepRef.current, RULE_STEP_MS[game].length - 1));
    return () => {
      r.destroy();
      runner.current = null;
    };
  }, [game, still, face?.kind === "creature" ? face.dna : face?.url]);

  useEffect(() => {
    runner.current?.setHeld(held);
  }, [held]);

  const jump = useCallback((i: number) => runner.current?.run(i), []);
  return {
    node,
    step,
    run,
    held,
    paused: halted,
    toggle: () => setHeld((h) => !h),
    jump,
  };
}

type Rules = ReturnType<typeof useRules>;

/**
 * A game's own page: its banner playing a round of the rules, step by step,
 * the name and pitch with the steps beside it, create or join by code, its
 * ranking and what it is made of, and its open rooms.
 */
export function GamePage({
  game,
  extra,
  facts,
}: {
  game: GameKey;
  /** The game's own, under the pitch. */
  extra?: ReactNode;
  /** What the page counts and shows, cached on the server; null when it could not be read. */
  facts: GameFactsData | null;
}) {
  const t = useTranslations("home");
  const gameName = useGameName();
  const locale = useLocale();
  useAuthErrorToast();
  const { match } = useCurrentMatch();
  const rules = useRules(game);
  const { steps } = useRulesCopy(game);

  return (
    <Screen
      left={<HubBrand />}
      right={<HubActions />}
      banner={
        <>
          {game === "lineup" ? (
            locale === "ja" ? (
              <ChalkFontJa />
            ) : (
              <ChalkFont />
            )
          ) : null}
          <Banner game={game} rules={rules} off={!!match} />
          <Caption game={game} steps={steps} rules={rules} />
        </>
      }
    >
      <div className={s.grid}>
        <div className={s.left}>
          <div className={s.intro}>
            <section className={s.pitch}>
              <Link href={GAMES} className={s.backLink}>
                <ChevronLeft strokeWidth={2} />
                {t("games.back")}
              </Link>
              <h1>{gameName(game)}</h1>
              <p>{t(`games.${GAME_INFO[game].messages}.pitch`)}</p>
              <Start game={game} off={!!match} />
              {extra}
            </section>
            <Steps game={game} steps={steps} rules={rules} />
          </div>
          <div className={s.rf}>
            <GameRanking game={game} facts={facts} />
            <GameFacts game={game} facts={facts} />
          </div>
        </div>
        <GameRooms game={game} off={!!match} />
      </div>
    </Screen>
  );
}

/** The banner: the game's art, its marks drifting, the round in the middle and, on wide screens, the way in beside it. */
function Banner({
  game,
  rules,
  off,
}: {
  game: GameKey;
  rules: Rules;
  off: boolean;
}) {
  const t = useTranslations("home.gamePage.how");
  const gameName = useGameName();
  const glyph =
    game === "who-am-i" ? (
      "?"
    ) : game === "impostor" ? (
      <Drama strokeWidth={2.4} />
    ) : (
      <Mail strokeWidth={2.4} />
    );
  return (
    <div
      className={cn(
        s.banner,
        TONE[game],
        "pt-[60px] sm:pt-[72px] sm:short:pt-[60px]",
      )}
    >
      <div className={s.back} aria-hidden="true">
        <span className={cn(s.glow, s.g1)} />
        <span className={cn(s.glow, s.g2)} />
        <span className={cn(s.glow, s.g3)} />
        {MARKS.map((_, i) => {
          const [x, y, size, color, period] = markOf(game, i);
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed marks
              key={i}
              className={s.mark}
              style={
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  "--fs": `${size}px`,
                  color,
                  "--t": `${period}s`,
                } as CSSProperties
              }
            >
              {glyph}
            </span>
          );
        })}
      </div>
      <span className={s.melt} aria-hidden="true" />
      <div className={s.row}>
        <div
          ref={rules.node}
          className={scene.scene}
          role="img"
          aria-label={t("scene", { game: gameName(game) })}
        />
        <div className={s.aside}>
          <Start game={game} off={off} />
        </div>
      </div>
    </div>
  );
}

/** Create a room, or join one with a code; off during a match. */
function Start({ game, off }: { game: GameKey; off: boolean }) {
  const t = useTranslations("home");
  return (
    <div inert={off ? true : undefined} className={cn(s.start, off && s.off)}>
      <Link
        href={newRoom(game)}
        className={keyClass("sky", { bounce: true, className: s.create })}
      >
        <Plus aria-hidden="true" />
        {t("create")}
      </Link>
      <JoinByCode />
    </div>
  );
}

/** The steps, listed beside the pitch (tablets up): the one on fills its bar; pick one to jump there. */
function Steps({
  game,
  steps,
  rules,
}: {
  game: GameKey;
  steps: string[];
  rules: Rules;
}) {
  const t = useTranslations("home.gamePage.how");
  const ms = RULE_STEP_MS[game];
  return (
    <section
      className={cn(s.how, rules.paused && s.paused)}
      aria-labelledby="how-h"
    >
      <div className={s.howHead}>
        <h2 id="how-h">{t("title")}</h2>
        <HoldKey rules={rules} />
      </div>
      <ol>
        {steps.map((text, i) => (
          <li key={text}>
            <button
              type="button"
              aria-current={i === rules.step ? "step" : undefined}
              onClick={() => rules.jump(i)}
              className={cn(
                s.step,
                i === rules.step && s.on,
                i < rules.step && s.done,
              )}
              style={{ "--d": `${ms[i]}ms` } as CSSProperties}
            >
              <span className={s.stepN}>
                {i < rules.step ? <Check aria-hidden="true" /> : i + 1}
              </span>
              <p>{text}</p>
              <span className={s.stepBar}>
                <i key={i === rules.step ? rules.run : "off"} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The steps as a caption under the banner (phones): one bar a step, and the text of the one on. */
function Caption({
  game,
  steps,
  rules,
}: {
  game: GameKey;
  steps: string[];
  rules: Rules;
}) {
  const t = useTranslations("home.gamePage.how");
  const ms = RULE_STEP_MS[game];
  const k = Math.min(rules.step, steps.length - 1);
  return (
    <section
      className={cn(s.caption, rules.paused && s.paused)}
      aria-label={t("title")}
    >
      <div className={s.capCard}>
        <div className={s.segs}>
          {steps.map((text, i) => (
            <button
              key={text}
              type="button"
              aria-label={t("step", { n: i + 1, text })}
              aria-current={i === rules.step ? "step" : undefined}
              onClick={() => rules.jump(i)}
              className={cn(
                s.seg,
                i === rules.step && s.on,
                i < rules.step && s.done,
              )}
              style={{ "--d": `${ms[i]}ms` } as CSSProperties}
            >
              <i key={i === rules.step ? rules.run : "off"} />
            </button>
          ))}
        </div>
        <div className={s.capRow}>
          <span className={s.capN}>
            {k + 1}/{steps.length}
          </span>
          <p>
            <span key={`${game}-${k}`}>{steps[k]}</span>
          </p>
          <HoldKey rules={rules} />
        </div>
      </div>
    </section>
  );
}

function HoldKey({ rules }: { rules: Rules }) {
  const t = useTranslations("home.gamePage.how");
  const label = rules.held ? t("play") : t("pause");
  return (
    <button
      type="button"
      className={s.hold}
      onClick={rules.toggle}
      aria-label={label}
      title={label}
    >
      {rules.held ? (
        <Play aria-hidden="true" strokeWidth={2} />
      ) : (
        <Pause aria-hidden="true" strokeWidth={2} />
      )}
    </button>
  );
}
