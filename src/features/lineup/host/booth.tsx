"use client";

// The presenter's booth, step by step: the mission desk, the auction on the
// TV with their queue beside it, the trades and the stage as everyone sees
// them, the cameras while boards are made, the verdict; the remote under it
// all.
import { useTranslations } from "next-intl";
import { AuctionScreen } from "../auction";
import { BreakScreen } from "../boards-side";
import { PresentStage } from "../present";
import { TradeScreen } from "../trade";
import { useLineup } from "../use-lineup";
import { CamGrid } from "./cam-grid";
import { CueRemote } from "./cue-remote";
import { LotQueue } from "./lot-queue";
import { MissionDesk } from "./mission-desk";
import { Tv } from "./tv";
import { VerdictDesk } from "./verdict-desk";
import { CoveredLot } from "./wait-scenes";

/** The auction with the queue beside it (under it on a phone). */
export function BoothAuction() {
  const t = useTranslations("lineup.host.queue");
  const { view } = useLineup();
  return (
    <div className="grid w-full max-w-[1180px] grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col items-center gap-4">
        {view.phase === "queueing" ? (
          <>
            {/* the booth's TV shows what the players see: the lot under its cloth */}
            <Tv
              className="w-[min(70vw,300px)]"
              screenClassName="grid aspect-[4/3] place-items-center bg-[#e8dcc4]"
            >
              <div className="scale-[0.62]">
                <CoveredLot />
              </div>
            </Tv>
            <p className="m-0 max-w-[460px] text-balance text-center font-bold text-chalk text-lg">
              {t("empty")}
            </p>
          </>
        ) : view.phase === "halftime" ? (
          <BreakScreen />
        ) : (
          <AuctionScreen />
        )}
      </div>
      <div className="flex flex-col items-center gap-3 lg:sticky lg:top-4">
        <LotQueue />
        <CueRemote />
      </div>
    </div>
  );
}

export function Booth() {
  const { view } = useLineup();
  switch (view.phase) {
    case "choosing":
      return <MissionDesk />;
    case "queueing":
    case "bidding":
    case "halftime":
      return <BoothAuction />;
    case "trading":
      return (
        <div className="flex w-full flex-col items-center gap-4">
          <TradeScreen />
          <CueRemote />
        </div>
      );
    case "defending":
      return (
        <div className="flex w-full flex-col items-center gap-4">
          <CamGrid />
          <CueRemote />
        </div>
      );
    case "presenting":
      return (
        <div className="flex w-full flex-col items-center gap-4">
          <PresentStage />
          <CueRemote />
        </div>
      );
    case "verdict":
      return <VerdictDesk />;
    default:
      return null;
  }
}
