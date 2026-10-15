"use client";

import { Music, Pause, Play, SlidersVertical } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { GameKey } from "@/game/games";
import { MOMENT_TRACKS, MOMENTS, type TrackId } from "@/game/music-tunes";
import { entryOf } from "@/game/tunables";
import { deskPlay, deskStop, releaseDesk, takeDesk } from "@/lib/music";
import { useDraft, useDraftInForce } from "../config/draft";
import { ResetEdits, TuneChoice } from "../config/fields";
import { useAdminHref } from "../shell/base";

const HINT: Record<(typeof MOMENTS)[number], string> = {
  room: "Do lobby (abafada) ao resultado",
  opening: "Recomeça do início quando o número voa",
  host: "Só para quem apresenta",
  end: "Tela de fim de jogo",
};

/** Which take plays at each moment of the game, with a quick listen. */
export function MusicTab({ game }: { game: GameKey }) {
  const href = useAdminHref();
  const d = useDraft();
  const [playing, setPlaying] = useState<string | null>(null);
  useDraftInForce();
  // the desk owns the music while something plays here
  useEffect(() => () => releaseDesk(), []);
  const listen = async (key: string, track: TrackId) => {
    if (playing === key) {
      deskStop();
      setPlaying(null);
      return;
    }
    takeDesk();
    await deskPlay(track);
    setPlaying(key);
  };
  const moments = MOMENTS.filter((m) => m in MOMENT_TRACKS[game]);
  return (
    <div className="card">
      <header>
        <h2>Música por momento</h2>
        <span className="spacer" />
        <Link className="btn sm" href={href("/music")}>
          <SlidersVertical className="i" />
          Abrir mesa de som
        </Link>
      </header>
      {moments.map((m) => {
        const key = `moments.${game}.${m}`;
        const v = d.value(key);
        const track = typeof v === "string" && v ? (v as TrackId) : null;
        return (
          <div
            key={m}
            className={key in d.edits ? "slot dirty" : "slot"}
            style={{
              gridTemplateColumns: "minmax(140px,220px) minmax(0,1fr) auto",
            }}
          >
            <span className="lbl">
              <b>{entryOf(key)?.label}</b>
              <small>{HINT[m]}</small>
            </span>
            <TuneChoice
              k={key}
              label={entryOf(key)?.label ?? m}
              icons={{ "": <Music className="size-4 opacity-40" /> }}
            />
            <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
              <button
                type="button"
                className="btn sm"
                disabled={!track}
                onClick={() => track && listen(key, track)}
              >
                {playing === key ? (
                  <Pause className="i" />
                ) : (
                  <Play className="i" />
                )}
                {playing === key ? "Parar" : "Ouvir"}
              </button>
              <ResetEdits keys={[key]} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
