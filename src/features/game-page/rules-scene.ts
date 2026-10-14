// The rules round a game page's banner plays: one short round of the game,
// step by step, with the page's list and caption following along. It is
// plain DOM moved by hand (a script of timed beats, card flips and a paper
// torn off a board), so React only mounts its box and listens to its steps.

import { QUESTION } from "@/components/ui/logo";
import {
  PAPER_CURVES,
  paperLighting,
  paperMiddle,
  paperPeel,
  samplePaper,
} from "@/features/lineup/banner-paper-geometry";
import type { GameKey } from "@/game/games";
import type { Avatar } from "@/game/types";
import { avatarUri } from "@/lib/avatar";
import { figureBitmap } from "@/lib/figure-bitmap";
import { type Figure, figureUri } from "@/lib/figures";
import s from "./rules-scene.module.css";

/** How long each step stays on (ms), in the order the page lists them. */
export const RULE_STEP_MS: Record<GameKey, readonly number[]> = {
  "who-am-i": [1900, 1900, 2100, 2300, 3200],
  impostor: [2600, 2700, 2400, 3000],
  lineup: [3000, 2400, 2600, 3600, 3000],
};

/** The words the scene says, in the page's language. */
export interface RulesCopy {
  you: string;
  whoAmI: {
    ask: string;
    yes: string;
    probably: string;
    unknown: string;
    guess: string;
    hit: string;
  };
  impostor: { ask: string; range: string; stamp: string };
  lineup: {
    sold: string;
    whatFor: string;
    teams: readonly { mission: string; roles: readonly string[] }[];
  };
}

export interface RulesCast {
  /** You, in the middle of the round. */
  me: Avatar;
  /** The others at the table (at least four). */
  others: readonly Avatar[];
}

export interface RulesRunner {
  /** Plays from step `from`, the steps before it at once. */
  run(from: number): void;
  /** Held by the page (the pause key); a scene out of view or a hidden tab holds by itself. */
  setHeld(held: boolean): void;
  destroy(): void;
}

class Cancel extends Error {}

type Wait = (ms: number) => Promise<void>;
type Step = (w: Wait) => Promise<void>;
type Layout = { wide: boolean };
type Timing = (ms: number) => number;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rnd = (a: number, b: number) =>
  a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/** The Lineup boards' figures, one a team member (the jobs come from the copy). */
const LINEUP_TEAMS: readonly (readonly Figure[])[] = [
  ["robot", "pirate", "cat"],
  ["astronaut", "owl", "king"],
  ["witch", "fox", "lion"],
];

const SPARKLES =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

function h(cls: string, style = ""): HTMLDivElement {
  const d = document.createElement("div");
  d.className = cls;
  if (style) d.style.cssText = style;
  return d;
}
const esc = (t: string) =>
  t.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
const avatarSrc = (a: Avatar) =>
  a.kind === "creature" ? avatarUri(a.dna, 68) : a.url;
const img = (src: string) => `<img src="${esc(src)}" alt="" draggable="false">`;
const figFace = (f: Figure, cls = "") =>
  `<div class="${s.face} ${cls}">${img(figureUri(f))}<span class="${s.ln}"></span></div>`;
const qFace = () =>
  `<div class="${s.face} ${s.q}"><svg viewBox="366 190 252 414" aria-hidden="true"><path d="${QUESTION}"/></svg></div>`;
const paperHtml = (src: string) =>
  `<div class="${s.paperFront}">${img(src)}<span class="${s.frontLight}"></span></div><div class="${s.reverse}"><div class="${s.reverseFace}"><span class="${s.reverseLight}"></span></div></div>`;

interface Seat {
  el: HTMLDivElement;
  over: HTMLDivElement;
  card: HTMLDivElement | null;
  av: HTMLSpanElement;
  x: number;
}

function seat(
  sc: HTMLElement,
  x: number,
  who: Avatar,
  copy: RulesCopy,
  {
    card = "",
    you = false,
    tilt = 0,
    w = 33,
    top = "",
    float = 0,
  }: {
    card?: string;
    you?: boolean;
    tilt?: number;
    w?: number;
    top?: string;
    float?: number;
  } = {},
): Seat {
  const el = h(s.seat, `left:${x}%`);
  el.innerHTML = `<div class="${s.over}"></div>${
    card
      ? `<div class="${s.float}" style="--bd:${-float}s"><div class="${s.card}" style="--tilt:${tilt}deg;--w:${w}cqh"><div class="${s.inner}">${card}</div></div></div>`
      : ""
  }${top}<span class="${s.av} ${you ? s.you : ""}" style="--c:${who.color}">${img(avatarSrc(who))}${you ? `<span class="${s.me}">${esc(copy.you)}</span>` : ""}</span>`;
  sc.appendChild(el);
  return {
    el,
    over: el.querySelector(`.${s.over}`) as HTMLDivElement,
    card: el.querySelector(`.${s.card}`),
    av: el.querySelector(`.${s.av}`) as HTMLSpanElement,
    x,
  };
}

function say(sc: HTMLElement, html: string, cls = "") {
  const box = sc.querySelector(`.${s.say}`) as HTMLElement;
  box.innerHTML = `<div class="${s.bub} ${cls}">${html}</div>`;
  return box.firstElementChild as HTMLElement;
}

function confetti(
  sc: HTMLElement,
  x: number,
  y: number,
  colors: readonly string[],
) {
  for (let i = 0; i < 22; i++) {
    const c = h(s.conf, `left:${x}%;top:${y}%;background:${pick(colors)}`);
    sc.appendChild(c);
    const a = Math.random() * Math.PI * 2;
    const v = 14 + Math.random() * 34;
    c.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${Math.cos(a) * v * 1.6}cqh, ${Math.sin(a) * v - 18}cqh) rotate(${rnd(-300, 300)}deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(${Math.cos(a) * v * 2}cqh, ${Math.sin(a) * v + 26}cqh) rotate(${rnd(-500, 500)}deg)`,
          opacity: 0,
        },
      ],
      { duration: 1400, easing: "cubic-bezier(.2,.7,.4,1)" },
    ).onfinish = () => c.remove();
  }
}

/* ---------------- paper: put on a board, or torn off it ---------------- */

function paperParts(node: HTMLElement) {
  const q = (c: string) => node.querySelector(`.${c}`) as HTMLElement;
  return {
    front: q(s.paperFront),
    reverse: q(s.reverse),
    reverseFace: q(s.reverseFace),
    frontLight: q(s.frontLight),
    reverseLight: q(s.reverseLight),
  };
}

function lightPaper(node: HTMLElement) {
  const p = paperParts(node);
  const w = Math.max(1, node.offsetWidth);
  const hgt = Math.max(1, node.offsetHeight);
  const l = paperLighting(w, hgt);
  Object.assign(p.frontLight.style, {
    width: `${l.frontWidth}px`,
    height: `${l.height}px`,
  });
  Object.assign(p.reverseLight.style, {
    width: `${l.reverseWidth}px`,
    height: `${l.height}px`,
  });
  return { p, w, h: hgt };
}

function drawPeel(
  p: ReturnType<typeof paperParts>,
  peel: number,
  w: number,
  hgt: number,
  fromTop = false,
) {
  const g = paperPeel(peel, w, hgt, fromTop);
  p.front.style.clipPath = g.frontClip;
  p.reverseFace.style.clipPath = g.reverseClip;
  p.reverse.style.transform = g.reflection;
  p.frontLight.style.transform = g.frontShadeTransform;
  p.reverseLight.style.transform = g.reverseShadeTransform;
}

/** A paper landing on the board: the peel played backwards, then taped. */
function paperIn(
  node: HTMLElement,
  { delay = 0, rot = -3, dur = 720, still = false } = {},
): Promise<void> {
  const settle = () => {
    node.classList.remove(s.peeling);
    node.classList.add(s.settled);
    paperParts(node).front.style.clipPath = "";
    node.style.opacity = "";
    node.style.transform = `rotate(${rot}deg)`;
  };
  if (still) {
    settle();
    return Promise.resolve();
  }
  const { p, w, h: hgt } = lightPaper(node);
  node.classList.add(s.peeling);
  node.classList.remove(s.settled);
  const render = (v: number) => {
    drawPeel(p, samplePaper(PAPER_CURVES.peel, v / 0.8), w, hgt);
    node.style.transform = `translate(${-samplePaper(PAPER_CURVES.x, v)}%,${samplePaper(PAPER_CURVES.y, v)}%) rotate(${rot - samplePaper(PAPER_CURVES.rotation, v)}deg) scale(${samplePaper(PAPER_CURVES.scale, v)})`;
    node.style.opacity = String(samplePaper(PAPER_CURVES.opacity, v));
  };
  render(1);
  return new Promise((res) => {
    const t0 = performance.now() + delay;
    const step = (now: number) => {
      if (!node.isConnected) return res();
      const t = Math.max(0, Math.min(1, (now - t0) / Math.max(1, dur)));
      render(1 - t);
      if (t < 1) requestAnimationFrame(step);
      else {
        settle();
        res();
      }
    };
    requestAnimationFrame(step);
  });
}

/**
 * Bought: the card is torn all the way off the board (top right corner
 * first), then flies to the buyer while the tear plays backwards, landing
 * face up where `target` is.
 */
function paperToSeat(
  node: HTMLElement,
  target: HTMLElement,
  { rot = -4, endRot = 6, dur = 1050 } = {},
): Promise<void> {
  const from = node.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const { p, w, h: hgt } = lightPaper(node);
  const c0 = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
  const c1 = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
  const k = to.width / w;
  node.classList.add(s.peeling);
  node.classList.remove(s.settled);
  // where the visible sheet's middle sits on screen, off the box's middle
  const off = (peel: number, ro: number, sc: number) => {
    const m = paperMiddle(peel, w, hgt, true);
    const vx = (m.x - w / 2) * sc;
    const vy = (m.y - hgt / 2) * sc;
    const a = (ro * Math.PI) / 180;
    return {
      x: vx * Math.cos(a) - vy * Math.sin(a),
      y: vx * Math.sin(a) + vy * Math.cos(a),
    };
  };
  const A = 0.38; // the tear, then the carry while it folds back flat
  const roA = rot - 8;
  const scA = 1.04;
  const liftA = -8;
  const oA = off(1, roA, scA);
  const dA = { x: c0.x + oA.x, y: c0.y + liftA + oA.y };
  return new Promise((res) => {
    const t0 = performance.now();
    const step = (now: number) => {
      if (!node.isConnected) return res();
      const t = Math.min(1, (now - t0) / dur);
      let peel: number;
      let x = 0;
      let y = 0;
      let sc: number;
      let ro: number;
      if (t < A) {
        // speeds up into the tear, no stop at the top
        const u = t / A;
        const q = u * u * (1.6 - 0.6 * u);
        peel = q;
        sc = 1 + (scA - 1) * q;
        ro = rot + (roA - rot) * q;
        y = liftA * q;
      } else {
        // leaves at speed, slows into the seat, on a small arc
        const q = 1 - (1 - (t - A) / (1 - A)) ** 2.4;
        peel = 1 - q;
        sc = scA + (k - scA) * q;
        ro = roA + (endRot - roA) * q;
        const o = off(peel, ro, sc);
        const tx = dA.x + (c1.x - dA.x) * q;
        const ty = dA.y + (c1.y - dA.y) * q - Math.sin(q * Math.PI) * 30;
        x = tx - c0.x - o.x;
        y = ty - c0.y - o.y;
      }
      drawPeel(p, peel, w, hgt, true);
      node.style.transform = `translate(${x}px, ${y}px) rotate(${ro}deg) scale(${sc})`;
      if (t < 1) requestAnimationFrame(step);
      else res();
    };
    requestAnimationFrame(step);
  });
}

/* ---------------- the three rounds ---------------- */

type Scene = (
  sc: HTMLElement,
  layout: Layout,
  T: Timing,
  ctx: { copy: RulesCopy; cast: RulesCast; still: boolean; team: number },
) => Step[];

const whoAmI: Scene = (sc, L, T, { copy, cast }) => {
  const c = copy.whoAmI;
  sc.innerHTML = `<span class="${s.table}"></span><div class="${s.say}"></div>`;
  const o = cast.others;
  const spots: [number, number, Figure, Avatar][] = L.wide
    ? [
        [10, -10, "lady", o[0]],
        [30, -5, "king", o[1]],
        [70, 5, "owl", o[2]],
        [90, 10, "astronaut", o[3]],
      ]
    : [
        [18, -6, "king", o[1]],
        [82, 6, "owl", o[2]],
      ];
  const seats = spots.map(([x, tilt, fig, who], i) =>
    seat(sc, x, who, copy, { card: figFace(fig), tilt, float: i * 0.7 }),
  );
  const you = seat(sc, 50, cast.me, copy, {
    card: qFace() + figFace("cat", s.back),
    you: true,
    w: 39,
    float: 0.4,
  });
  const all = [...seats, you].sort((a, b) => a.x - b.x);
  for (const p of all) p.card?.classList.add(s.hide);
  const answers: [string, string][] = L.wide
    ? [
        [s.yes, c.yes],
        [s.prob, c.probably],
        [s.yes, c.yes],
        [s.unk, c.unknown],
      ]
    : [
        [s.yes, c.yes],
        [s.prob, c.probably],
      ];
  return [
    async (w) => {
      for (const p of all) {
        p.card?.classList.remove(s.hide);
        p.card?.classList.add(s.drop);
        await w(160);
      }
    },
    async (w) => {
      seats.forEach((p, i) => {
        p.card?.animate(
          [{ translate: "0 0" }, { translate: "0 -14%" }, { translate: "0 0" }],
          { duration: T(700), delay: T(i * 90), easing: "ease-in-out" },
        );
      });
      you.card?.animate(
        [
          { rotate: "0deg" },
          { rotate: "-7deg" },
          { rotate: "7deg" },
          { rotate: "0deg" },
        ],
        { duration: T(800), easing: "ease-in-out" },
      );
      await w(400);
    },
    async (w) => {
      // the question, typed out
      const bub = say(sc, "");
      for (let i = 1; i <= c.ask.length; i++) {
        bub.textContent = c.ask.slice(0, i);
        await w(T(36));
      }
    },
    async (w) => {
      for (let i = 0; i < seats.length; i++) {
        seats[i].over.innerHTML =
          `<span class="${s.chip} ${answers[i][0]}">${esc(answers[i][1])}</span>`;
        await w(T(380));
      }
    },
    async (w) => {
      for (const p of seats) p.over.firstElementChild?.classList.add(s.out);
      say(sc, esc(c.guess), s.dark);
      await w(T(900));
      you.card?.classList.add(s.flip, s.win);
      await w(T(520));
      say(sc, `${SPARKLES} ${esc(c.hit)}`, s.hit);
      all.forEach((p, i) => {
        setTimeout(() => p.av.classList.add(s.hop), T(i * 70));
      });
      if (T(1000) > 1)
        confetti(sc, 50, 45, [
          "#2b69c8",
          "#f6e3a1",
          "#ef7215",
          "#0b7a75",
          "#c2412f",
        ]);
    },
  ];
};

const impostor: Scene = (sc, L, T, { copy, cast }) => {
  const c = copy.impostor;
  sc.innerHTML = `<div class="${s.say}"></div>`;
  const spot = h(s.spot, "left:50%;opacity:.4");
  const floor = h(s.spotFloor, "left:50%;opacity:.5");
  sc.append(spot, floor);
  const o = cast.others;
  const xs = L.wide ? [10, 30, 50, 70, 90] : [18, 50, 82];
  const odd = L.wide ? 3 : 2;
  const youAt = 1;
  const people = L.wide
    ? [o[0], cast.me, o[1], o[2], o[3]]
    : [o[0], cast.me, o[2]];
  const tilts = L.wide ? [-6, -3, 0, 3, 6] : [-5, 0, 5];
  const seats = xs.map((x, i) =>
    seat(sc, x, people[i], copy, {
      card: `<div class="${s.face} ${s.num}">0${i + 1}</div>${figFace(i === odd ? "giraffe" : "lion", s.back)}`,
      you: i === youAt,
      tilt: tilts[i],
      w: 31,
      float: i * 0.6,
    }),
  );
  const oddCard = seats[odd].card as HTMLElement;
  return [
    async (w) => {
      for (const p of seats) {
        p.card?.classList.add(s.flip);
        await w(T(190));
      }
      await w(T(300));
      oddCard.classList.add(s.odd);
    },
    async (w) => {
      oddCard.classList.remove(s.odd);
      say(sc, `${esc(c.ask)}<span class="${s.rng}">${esc(c.range)}</span>`);
      await w(T(600));
      const scores = L.wide ? [8, 9, 8, 3, 9] : [8, 9, 3];
      for (let i = 0; i < seats.length; i++) {
        seats[i].over.innerHTML =
          `<span class="${s.score} ${i === odd ? s.odd : ""}">${scores[i]}</span>`;
        await w(T(240));
      }
    },
    async (w) => {
      sc.querySelector(`.${s.say}`)?.firstElementChild?.classList.add(s.out);
      const colors = ["#f0a566", "#f6e3a1", "#5ccfc6", "#c39bf2"];
      const voters = seats.map((_, i) => i).filter((i) => i !== odd);
      for (let j = 0; j < voters.length; j++) {
        const from = xs[voters[j]];
        const to = xs[odd] + (j - (voters.length - 1) / 2) * 3.2;
        const v = h(s.vote, `left:${from}%;top:86%;--c:${colors[j % 4]}`);
        sc.appendChild(v);
        v.animate(
          [
            { left: `${from}%`, top: "86%", scale: 0.4 },
            { left: `${(from + to) / 2}%`, top: "26%", scale: 1.25 },
            { left: `${to}%`, top: "45%", scale: 1 },
          ],
          {
            duration: T(700),
            easing: "cubic-bezier(.3,.7,.4,1)",
            fill: "forwards",
          },
        );
        await w(T(300));
      }
    },
    async (w) => {
      spot.style.left = `${xs[odd]}%`;
      floor.style.left = `${xs[odd]}%`;
      spot.style.opacity = "1";
      floor.style.opacity = "1";
      await w(T(650));
      const stamp = h(s.stamp, `left:${xs[odd]}%;top:55%`);
      stamp.textContent = c.stamp;
      sc.appendChild(stamp);
      oddCard.animate(
        [
          { rotate: "0deg" },
          { rotate: "-6deg" },
          { rotate: "5deg" },
          { rotate: "0deg" },
        ],
        { duration: T(500) },
      );
      await w(T(700));
      seats[odd].over.innerHTML = `<span class="${s.score} ${s.odd}">?</span>`;
    },
  ];
};

const lineup: Scene = (sc, L, T, { copy, cast, still, team }) => {
  const c = copy.lineup;
  const board = c.teams[team % c.teams.length];
  const figs = LINEUP_TEAMS[team % LINEUP_TEAMS.length];
  sc.innerHTML = `<div class="${s.board}"><div class="${s.chalk}"></div></div><div class="${s.say}"></div>`;
  const chalk = sc.querySelector(`.${s.chalk}`) as HTMLElement;
  const o = cast.others;
  const xs = L.wide ? [9, 25, 75, 91] : [12, 88];
  const youAt = L.wide ? 1 : 0;
  const people = L.wide ? [o[0], cast.me, o[1], o[2]] : [cast.me, o[1]];
  const seats = xs.map((x, i) =>
    seat(sc, x, people[i], copy, {
      you: i === youAt,
      top: `<span class="${s.team}"></span><span class="${s.coins}"><i></i><b>10</b></span>`,
    }),
  );
  let photo: HTMLDivElement | null = null;
  let env: HTMLDivElement | null = null;
  const lot = figureUri(figs[0]);
  return [
    async (w) => {
      photo = h(`${s.photo} ${s.paper}`, "left:50%;top:6%");
      photo.innerHTML = paperHtml(lot);
      sc.appendChild(photo);
      // the peel repaints the picture every frame: a bitmap copy is cheaper
      void figureBitmap(lot).then(
        (url) => {
          const pic = photo?.querySelector("img");
          if (pic) pic.src = url;
        },
        () => {},
      );
      void paperIn(photo, { rot: -4, dur: T(720), still });
      await w(T(800));
      const bids = L.wide
        ? [
            [0, 3],
            [2, 5],
            [1, 7],
          ]
        : [
            [1, 5],
            [0, 7],
          ];
      for (const [i, v] of bids) {
        seats[i].over.innerHTML =
          `<span class="${s.bid} ${i === youAt ? s.top : ""}">${v}</span>`;
        await w(T(520));
      }
    },
    async (w) => {
      const stamp = h(s.stamp, "left:50%;top:44%");
      stamp.textContent = c.sold;
      sc.appendChild(stamp);
      await w(T(750));
      for (const p of seats) p.over.innerHTML = "";
      stamp.remove();
      const y = seats[youAt];
      // sold: torn off the board, carried to your seat, laid over your coins
      const slot = y.el.querySelector(`.${s.team}`) as HTMLElement;
      slot.innerHTML = `<span class="${s.mini}">${img(lot)}</span>`;
      const mini = slot.firstElementChild as HTMLElement;
      const land = () => {
        mini.classList.add(s.on, s.landed);
        photo?.remove();
        // gone for good once faded, so your stars sit level with everyone's
        mini.animate(
          [
            { opacity: 1, scale: 1 },
            { opacity: 0, scale: 0.85 },
          ],
          {
            duration: T(450),
            delay: T(700),
            easing: "ease-in",
            fill: "forwards",
          },
        ).onfinish = () => mini.remove();
      };
      if (photo && !still && T(1050) > 1)
        void paperToSeat(photo, mini, { dur: T(1050) }).then(land);
      else land();
      const coins = y.el.querySelector(`.${s.coins}`) as HTMLElement;
      (coins.querySelector("b") as HTMLElement).textContent = "3";
      coins.classList.add(s.shake);
    },
    async (w) => {
      env = h(s.env);
      env.innerHTML = `<div class="${s.flap}"></div><div class="${s.seal}"></div><div class="${s.note}"><small>${esc(c.whatFor)}</small><b>${esc(board.mission)}</b></div>`;
      sc.appendChild(env);
      await w(T(900));
      env.classList.add(s.open);
    },
    async (w) => {
      // your board: the mission chalked on top, the team you bought under it, each with its job
      env?.animate([{ opacity: 1 }, { opacity: 0, translate: "-50% -12%" }], {
        duration: T(400),
        fill: "forwards",
      });
      await w(T(350));
      chalk.innerHTML = `<b class="${s.mission}">${esc(board.mission)}</b><span class="${s.row}">${figs
        .map(
          (f, k) =>
            `<span class="${s.pin}" style="--d:${T(250 + k * 330)}ms"><span class="${s.pinPhoto} ${s.paper}">${paperHtml(figureUri(f))}</span><span class="${s.role}">${esc(board.roles[k] ?? "")}</span></span>`,
        )
        .join("")}</span>`;
      chalk.querySelectorAll<HTMLElement>(`.${s.pinPhoto}`).forEach((ph, k) => {
        void paperIn(ph, {
          delay: T(250 + k * 330),
          rot: [-5, 3, -2][k],
          dur: T(720),
          still,
        });
      });
      await w(T(1400));
    },
    async (w) => {
      const stars = L.wide ? [1, 3, 0, 2] : [3, 1];
      for (let i = 0; i < seats.length; i++) {
        seats[i].over.innerHTML =
          `<span class="${s.bid} ${i === youAt ? s.top : ""}">★ ${stars[i]}</span>`;
        await w(T(260));
      }
      await w(T(300));
      const y = seats[youAt];
      const crown = document.createElement("img");
      crown.className = s.crown;
      crown.src = "/opening/crown.svg";
      crown.alt = "";
      crown.style.cssText = `left:${y.x}%;bottom:calc(3% + 13cqh)`;
      y.el
        .querySelector(`.${s.coins}`)
        ?.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: T(200),
          fill: "forwards",
        });
      sc.appendChild(crown);
      y.av.classList.add(s.hop);
      if (T(1000) > 1)
        confetti(sc, y.x, 40, ["#e7b94a", "#2b69c8", "#b8322a", "#eef2e6"]);
    },
  ];
};

const SCENES: Record<GameKey, Scene> = {
  "who-am-i": whoAmI,
  impostor,
  lineup,
};

/**
 * Plays `game`'s round in `root` again and again. Picking a step plays the
 * ones before it at once; the page's hold, the tab hiding or the scene
 * leaving the screen pause it where it is. `still` (reduced motion) skips
 * every wait and flight: each step just shows how it ends.
 */
export function createRulesRunner(
  root: HTMLElement,
  {
    game,
    copy,
    cast,
    still,
    onStep,
    onHalted,
  }: {
    game: GameKey;
    copy: RulesCopy;
    cast: RulesCast;
    still: boolean;
    /** The step now on (the steps' count once the round ends). */
    onStep: (step: number) => void;
    /** Paused or playing again, for whatever reason (the page's step bars wait with it). */
    onHalted?: (halted: boolean) => void;
  },
): RulesRunner {
  const steps = RULE_STEP_MS[game];
  let runId = 0;
  let held = false;
  let inView = true;
  let heldFor = 0;
  let wideNow: boolean | null = null;
  let lastTeam = -1;
  let at = 0;
  const halted = () => held || !inView || document.hidden;
  const layout = (): Layout => ({ wide: root.clientWidth >= 520 });
  let wasHalted: boolean | null = null;
  const sync = () => {
    const now = halted();
    root.classList.toggle(s.held, now);
    if (now !== wasHalted) {
      wasHalted = now;
      onHalted?.(now);
    }
  };

  // a board never comes back twice in a row
  const nextTeam = () => {
    const n = copy.lineup.teams.length;
    let i = 0;
    do i = Math.floor(Math.random() * n);
    while (i === lastTeam && n > 1);
    lastTeam = i;
    return i;
  };

  function run(from: number) {
    const my = ++runId;
    let fast = from > 0;
    const T: Timing = (ms) => (fast || still ? 1 : ms);
    const w: Wait = async (ms) => {
      if (my !== runId) throw new Cancel();
      if (fast || (still && ms <= 1)) return;
      await sleep(ms);
      while (my === runId && halted()) {
        const t = performance.now();
        await sleep(120);
        heldFor += performance.now() - t;
      }
      if (my !== runId) throw new Cancel();
    };
    const L = layout();
    wideNow = L.wide;
    root.classList.toggle(s.narrow, !L.wide);
    void (async () => {
      try {
        for (let first = true; ; first = false) {
          const start = first ? from : 0;
          fast = start > 0;
          root.classList.toggle(s.ff, fast);
          const play = SCENES[game](root, L, T, {
            copy,
            cast,
            still,
            team: nextTeam(),
          });
          for (let i = 0; i < steps.length; i++) {
            if (i < start) {
              await play[i](w);
              continue;
            }
            if (fast) {
              fast = false;
              void root.offsetWidth;
              await sleep(30);
              root.classList.remove(s.ff);
            }
            at = i;
            onStep(i);
            const t0 = performance.now();
            const h0 = heldFor;
            await play[i](w);
            const left = steps[i] - (performance.now() - t0 - (heldFor - h0));
            await w(Math.max(200, left));
          }
          onStep(steps.length);
          await w(1600);
        }
      } catch (e) {
        if (!(e instanceof Cancel)) throw e;
      }
    })();
  }

  const io =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) inView = e.isIntersecting;
            sync();
          },
          { threshold: 0.2 },
        )
      : null;
  io?.observe(root);
  document.addEventListener("visibilitychange", sync);
  // phone ⇄ wide: the round starts over where it was, laid out again
  let rz = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(rz);
    rz = window.setTimeout(() => {
      if (layout().wide !== wideNow) run(Math.min(at, steps.length - 1));
    }, 150);
  });
  ro.observe(root);

  return {
    run,
    setHeld(h) {
      held = h;
      sync();
    },
    destroy() {
      runId++;
      clearTimeout(rz);
      io?.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      root.replaceChildren();
    },
  };
}
