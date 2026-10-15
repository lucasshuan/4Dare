"use client";

import {
  Clapperboard,
  Music,
  Pause,
  Play,
  SlidersVertical,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { codeClips, titleMoments } from "@/features/opening/scene-sound";
import type { GameKey } from "@/game/games";
import { MOMENT_TRACKS, MOMENTS, type TrackId } from "@/game/music-tunes";
import { cleanClips } from "@/game/scene-clips";
import { SOUND_LIBRARY } from "@/game/sounds";
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
      <SceneSounds game={game} />
    </div>
  );
}

/** The title scenes' sounds, each a way into the Cenas tab with it chosen. */
function SceneSounds({ game }: { game: GameKey }) {
  const href = useAdminHref();
  const d = useDraft();
  return (
    <>
      <header style={{ marginTop: 18 }}>
        <h2>Sons das cenas</h2>
      </header>
      {(["first", "later"] as const).map((kind) => {
        const first = kind === "first";
        const raw = d.value(`scenes.${game}.${kind}`);
        let clips = codeClips(game, first);
        if (typeof raw === "string" && raw)
          try {
            clips = cleanClips(JSON.parse(raw)) ?? clips;
          } catch {}
        const moments = titleMoments(game, first, 4);
        return (
          <div key={kind} className="clist" style={{ marginTop: 8 }}>
            <small className="flbl">
              {first ? "Abertura da primeira partida" : "Abertura da revanche"}
            </small>
            {clips.map((c) => (
              <Link
                key={c.id}
                className={c.off ? "markrow off" : "markrow"}
                href={href(
                  `/games/${game}?tab=scenes&kind=${kind}&clip=${c.id}`,
                )}
              >
                <span>
                  {c.label}
                  <small>
                    {c.off
                      ? "fora da cena"
                      : `${SOUND_LIBRARY.find((x) => x.id === c.sound)?.name ?? c.sound} · ${moments.find((m) => m.id === c.anchor)?.label ?? "—"}${c.offset ? ` ${c.offset > 0 ? "+" : "−"}${Math.abs(c.offset).toFixed(2).replace(".", ",")} s` : ""} · ×${String(c.gain).replace(".", ",")}`}
                  </small>
                </span>
                <Clapperboard className="i" />
              </Link>
            ))}
          </div>
        );
      })}
    </>
  );
}
