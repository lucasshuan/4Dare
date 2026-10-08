"use client";

import dynamic from "next/dynamic";
import { useRoomContext } from "@/features/data/room-context";
import { ImpostorResult } from "@/features/impostor/impostor-result";
import { WhoAmIResult } from "@/features/who-am-i/who-am-i-result";

const LineupResult = dynamic(() =>
  import("@/features/lineup/lineup-result").then((m) => m.LineupResult),
);

/** End of the match: each game's own result. */
export function ResultScreen() {
  const { view } = useRoomContext();
  if (view.lu) return <LineupResult />;
  return view.imp?.end ? <ImpostorResult /> : <WhoAmIResult />;
}
