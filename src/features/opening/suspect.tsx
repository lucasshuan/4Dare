// One of the Impostor's suspects as both its opening and its end draw them:
// the costume (only its coloured shapes, no outline), the player's face in
// the hole and the card held up in both paws, standing, its back out with the
// row number. At the end the card turns and shows its picture.
import type { CSSProperties, ReactNode } from "react";
import type { Avatar } from "@/game/types";
import { cn } from "@/lib/cn";
import type { Suit } from "./suits";
import s from "./suspect.module.css";
import { avatarSrc, mix, rnd } from "./title-kit";
import { sec } from "./title-timing";

/** The four frames playing: from `delay`, `count` times over `dur` seconds (a walk in, a winner's dance). */
export interface FramePlay {
  delay: number;
  dur: number;
  count: number | "infinite";
}

const played = (play: FramePlay): CSSProperties => ({
  animationDelay: sec(play.delay),
  animationDuration: sec(play.dur),
  animationIterationCount: play.count,
});

/** What follows the body's pose (the face, the card, the eyes): still on the first frame, or playing the frames. */
export function Pose({
  g,
  play,
  children,
}: {
  g: Suit;
  play?: FramePlay;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(s.pose, play && s.play)}
      style={
        {
          "--t0": g.frames[0].css,
          "--t1": g.frames[1].css,
          "--t2": g.frames[2].css,
          "--t3": g.frames[3].css,
          transformOrigin: g.org,
          ...(play ? played(play) : null),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/** The round hole the face shows through (the eyes go in it too). */
export function Hole({ g, children }: { g: Suit; children: ReactNode }) {
  return (
    <span
      className={s.hole}
      style={{ left: g.ax, top: g.ay, width: g.avs, height: g.avs }}
    >
      {children}
    </span>
  );
}

/** The card's picture once it turns: the library's, or the silhouette a portrait without one shows. */
export interface HeldPicture {
  /** When it turns, in seconds from the scene's start. */
  at: number;
  src: string | null;
}

/**
 * The costume in the player's colour, their face in the hole and the card in
 * their paws. `i` is their place in the line-up (the number on the card, the
 * card's tilt).
 */
export function SuspectFigure({
  g,
  i,
  seat,
  avatar,
  play,
  picture,
}: {
  g: Suit;
  i: number;
  seat: string;
  avatar: Avatar;
  play?: FramePlay;
  picture?: HeldPicture;
}) {
  // the card standing up where the costume holds it, the paws on its edges
  const cw = Math.round(g.pw * 0.76);
  const ch = Math.round(cw * 1.36);
  const paw = (left: number) => (
    <span
      className={s.paw}
      style={{
        left,
        top: Math.round(ch * 0.5),
        width: g.pd,
        height: g.pd,
        backgroundColor: mix(seat, "#FFFFFF", 0.12),
      }}
    />
  );
  return (
    <>
      <div className={cn(s.suit, play && s.play)}>
        {g.frames.map((fr, k) => (
          <svg
            // biome-ignore lint/suspicious/noArrayIndexKey: the four frames, in order
            key={k}
            className={cn(s.frm, s[`f${k}`])}
            style={play ? played(play) : undefined}
            width={g.fw}
            height={g.fh}
            viewBox={g.vb}
            aria-hidden="true"
          >
            {fr.legS ? (
              <path
                d={fr.legS}
                fill="none"
                stroke={g.legC}
                strokeWidth={fr.legSW}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {fr.legF ? <path d={fr.legF} fill={g.legFC} /> : null}
            <g transform={fr.tr}>
              {g.back ? <path d={g.back} fill={g.backC} /> : null}
              {g.inner ? <path d={g.inner} fill={g.innerC} /> : null}
              <path d={fr.body} fill={seat} />
              {g.tuft ? <path d={g.tuft} fill={seat} /> : null}
              {g.stalk ? (
                <path
                  d={g.stalk}
                  fill="none"
                  stroke={seat}
                  strokeWidth={g.stW}
                  strokeLinecap="round"
                />
              ) : null}
              <path
                d={g.hl}
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity=".45"
                strokeWidth={g.hlW}
                strokeLinecap="round"
              />
            </g>
          </svg>
        ))}
      </div>
      <Pose g={g} play={play}>
        <Hole g={g}>
          <span className={s.face} style={{ background: avatar.color }}>
            {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
            <img src={avatarSrc(avatar)} alt="" />
          </span>
        </Hole>
        <div
          className={s.held}
          style={{
            left: Math.round(g.bl + (g.pw - cw) / 2),
            top: Math.round(g.bt - 8),
            width: cw,
            height: ch,
            transform: `rotate(${((rnd(i * 7 + 3) * 2 - 1) * 1.8).toFixed(2)}deg)`,
          }}
        >
          <div
            className={cn(s.flip, picture && s.turn)}
            style={picture ? { animationDelay: sec(picture.at) } : undefined}
          >
            <div className={s.cback}>
              <span
                className={s.cnum}
                style={{ fontSize: Math.round(cw * 0.46) }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            {picture ? (
              <div className={s.cfront}>
                {picture.src ? (
                  // biome-ignore lint/performance/noImgElement: a remote library picture
                  <img src={picture.src} alt="" />
                ) : (
                  <svg
                    viewBox="0 0 80 100"
                    preserveAspectRatio="xMidYMax slice"
                    aria-hidden="true"
                    className={s.nopic}
                  >
                    <circle cx="40" cy="42" r="15" />
                    <path d="M10 100c0-20 13-32 30-32s30 12 30 32z" />
                  </svg>
                )}
              </div>
            ) : null}
          </div>
          {paw(-Math.round(g.pd * 0.42))}
          {paw(cw - Math.round(g.pd * 0.58))}
        </div>
      </Pose>
    </>
  );
}
