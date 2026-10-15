"use client";

import type { GameKey } from "@/game/games";
import { useDraft } from "../config/draft";
import { gameColor } from "../format";

const sec = (ms: number) =>
  (ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/**
 * The beats of a game's opening, first match or rematch, as the values on
 * screen (unsaved ones included) would play them, and their sum.
 */
export function OpeningTimeline({
  game,
  first,
}: {
  game: GameKey;
  first: boolean;
}) {
  const d = useDraft();
  const n = (key: string) => {
    const v = d.value(key);
    return typeof v === "number" ? v : 0;
  };
  const pair = (key: string) => n(`${key}.${first ? "first" : "later"}`);
  const beats: [string, number, string][] = [
    ["Cortina", n("opening.curtain"), "#7c879b"],
    ["Título", pair("opening.title"), gameColor(game)],
  ];
  if (game === "who-am-i" && first)
    beats.push(["Cold open", n("opening.intro"), "#8a4fc4"]);
  if (game === "lineup") {
    if (first) beats.push(["Regras", n("lineup.rules"), "#b38600"]);
    beats.push(["Missão", pair("lineup.secret"), "#0b7a75"]);
  } else beats.push(["Entrada do voto", n("opening.entrance.vote"), "#0b7a75"]);
  const total = beats.reduce((a, b) => a + b[1], 0);
  return (
    <>
      <div className="tl">
        {beats.map(([label, ms, c]) => (
          <i
            key={label}
            style={{
              width: `${(ms / Math.max(1, total)) * 100}%`,
              background: `color-mix(in oklch, ${c} 28%, var(--surface))`,
            }}
            title={`${label}: ${sec(ms)} s`}
          >
            {label} · {sec(ms)} s
          </i>
        ))}
      </div>
      <p className="note" style={{ marginTop: 6 }}>
        Total: <b className="mono">{sec(total)} s</b>
      </p>
    </>
  );
}
