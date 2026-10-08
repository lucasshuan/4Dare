"use client";

// What for?'s match screen: one screen for the whole round, the scene picked
// by the step and the show on now. Loaded only by What for? rooms
// (room-stage.tsx), with its chalk fonts.
import { AnimatePresence, m } from "motion/react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { useStage } from "@/features/stage/stage-context";
import { useGameOption } from "@/lib/settings";
import { AuctionScreen } from "./auction";
import { BreakScreen, WrapScene } from "./boards-side";
import { CoinDefs } from "./coin";
import { BoardEditor } from "./editor";
import { EnvelopeScene } from "./envelope";
import { JudgeScreen } from "./judge";
import { RoundCard, RulesScene, SecretScene } from "./opening";
import { PresentStage } from "./present";
import { RoundScore } from "./score";
import { TallyScene } from "./tally";
import { TradeScreen } from "./trade";
import { useLineup } from "./use-lineup";

const ChalkFont = dynamic(() => import("./chalk-font"));
const ChalkFontJa = dynamic(() => import("./chalk-font-ja"));

/** The scene on screen now, and a key that changes when it does. */
function useScene(): { key: string; node: React.ReactNode } | null {
  const { view, lu } = useLineup();
  const { show, beat } = useStage();
  const kind = beat?.kind ?? show?.beats[0]?.kind;
  if (show) {
    switch (kind) {
      case "curtain":
        return { key: "curtain", node: null };
      case "round":
        return { key: "round", node: <RoundCard n={show.n} of={lu.rounds} /> };
      case "rules":
        return beat ? { key: "rules", node: <RulesScene beat={beat} /> } : null;
      case "secret":
        return beat
          ? {
              key: "secret",
              node: <SecretScene beat={beat} first={show.first} />,
            }
          : null;
      case "wrap":
        return { key: "wrap", node: <WrapScene /> };
      case "envelope":
        return beat
          ? { key: "envelope", node: <EnvelopeScene beat={beat} /> }
          : null;
      case "votes":
      case "stamp":
        return {
          key: `tally-${show.startsAt}`,
          node: <TallyScene show={show} />,
        };
      // the first lot coming in, and every hammer, play on the auction table
      case "entrance":
      case "sold":
        return { key: "auction", node: <AuctionScreen /> };
    }
  }
  switch (view.phase) {
    case "bidding":
      return { key: "auction", node: <AuctionScreen /> };
    case "halftime":
      return { key: "break", node: <BreakScreen /> };
    case "trading":
      return { key: "trade", node: <TradeScreen /> };
    case "defending":
      return { key: "defend", node: <BoardEditor /> };
    case "presenting":
      return { key: "stage", node: <PresentStage /> };
    case "judging":
    case "tiebreak":
      return { key: `judge-${view.phase}`, node: <JudgeScreen /> };
    case "scoring":
      return { key: "score", node: <RoundScore /> };
  }
  return null;
}

export function LineupScreen() {
  const plain = useGameOption("lineup", "plainLetters");
  const ja = useLocale() === "ja";
  const scene = useScene();
  return (
    <div className="relative flex w-full flex-col items-center">
      <CoinDefs />
      {plain ? null : ja ? <ChalkFontJa /> : <ChalkFont />}
      <AnimatePresence mode="wait" initial={false}>
        {scene ? (
          <m.div
            key={scene.key}
            className="flex w-full flex-col items-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.35 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {scene.node}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
