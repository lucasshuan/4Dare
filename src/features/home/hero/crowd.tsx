"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { GUEST_NAME_COUNT, guestWords } from "@/game/guest-names";
import { creatureUri, dnaOf } from "@/lib/avatar";
import s from "./crowd.module.css";

/** The stage's wavy foot (its top edge), in a 1440×72 box. */
export const WAVE = "M0 44 C 220 6, 460 0, 720 30 S 1180 72, 1440 22";

const loadSays = (locale: string): Promise<{ SAYS: readonly string[] }> => {
  switch (locale) {
    case "en":
      return import("./crowd-says/en");
    case "es":
      return import("./crowd-says/es");
    case "ja":
      return import("./crowd-says/ja");
    default:
      return import("./crowd-says/pt");
  }
};

const EMOJI: readonly (readonly [string, string])[] = [
  ["😂", s.shake],
  ["❤️", s.pulse],
  ["🔥", s.flick],
  ["👀", s.look],
  ["🤔", s.tilt],
  ["🎉", s.spin],
  ["💀", s.pop],
  ["😭", s.shake],
  ["👏", s.clap],
  ["🫡", s.tilt],
  ["⭐", s.spin],
  ["😱", s.pulse],
  ["🍿", s.hopx],
  ["🤝", s.clap],
];
const HELLO = ["👋", "🙋", "✌️", "😎"];
/** The least room two bubbles keep between them, in px. */
const GAP = 22;

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const dims = () =>
  innerWidth < 640
    ? { n: 5, s: 62, sink: 18 }
    : innerWidth < 1000
      ? { n: 7, s: 74, sink: 33 }
      : { n: 10, s: 86, sink: 40 };

/** The wave's height above the stage's foot at x (0..1), read off its own path. */
function readWave() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 1440 72");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", WAVE);
  svg.appendChild(p);
  document.body.appendChild(svg);
  const len = p.getTotalLength();
  const pts: [number, number][] = [];
  for (let i = 0; i <= 160; i++) {
    const q = p.getPointAtLength((len * i) / 160);
    pts.push([q.x / 1440, 72 - q.y]);
  }
  svg.remove();
  return (x: number) => {
    const t = Math.max(0, Math.min(1, x));
    const k = pts.findIndex((q) => q[0] >= t);
    if (k <= 0) return pts[Math.max(0, k)][1];
    const [x0, y0] = pts[k - 1];
    const [x1, y1] = pts[k];
    return y0 + ((t - x0) / (x1 - x0 || 1)) * (y1 - y0);
  };
}

type Member = HTMLSpanElement & {
  _depth?: number;
  _dk?: number;
};
type Said = HTMLSpanElement & { _end?: () => void };
interface Span {
  l: number;
  r: number;
}

/**
 * The crowd peeking over the stage's wavy foot: guests' creatures standing
 * behind it, now and then rising to say something (a line of table talk or
 * an emoji, never two bubbles touching), strolling to a free spot, or walking
 * off as someone new walks in. Walkers pass behind whoever stands, darkening
 * as they overlap. Decoration only: it is hidden from assistive tech, rests
 * in a hidden tab, and stands still with reduced motion.
 */
export function HeroCrowd({ me }: { me?: number }) {
  const locale = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const meRef = useRef(me);
  meRef.current = me;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const waveAt = readWave();
    let says: readonly string[] = [];
    let bag: string[] = [];
    let live = true;
    void loadSays(locale).then((m) => {
      if (live) says = m.SAYS;
    });
    const nextSay = () => {
      if (!bag.length) bag = [...says].sort(() => Math.random() - 0.5);
      return bag.pop();
    };
    let used = new Set<number>();
    const held = new Set<Span>();
    let lo = 0;
    let hi = 1000;
    let raf = 0;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (live) fn();
      }, ms);
      timers.add(id);
    };
    let d = dims();

    const footAt = (x: number) => {
      const W = el.clientWidth || innerWidth;
      const half = d.s / 2 / W;
      let low = Number.POSITIVE_INFINITY;
      let sum = 0;
      for (let i = 0; i <= 8; i++) {
        const h = waveAt(x - half + (2 * half * i) / 8);
        low = Math.min(low, h);
        sum += h;
      }
      // where the wave flattens out the ribbon covers the stage's foot: stand higher there
      return Math.max(Math.min(sum / 9, low + 4), 36) - d.sink;
    };
    const members = () => [...el.children] as Member[];
    const place = (m: Member, x: number) => {
      m.style.left = `${x * 100}%`;
      m.style.bottom = `${footAt(x)}px`;
      m.dataset.x = String(x);
      delete m.dataset.to;
    };
    // the spot a creature stands on or walks to; walkers leaving claim nothing
    const spotOf = (o: Member) => Number(o.dataset.to ?? o.dataset.x);
    const minGap = () => (d.s * 1.15) / (el.clientWidth || innerWidth);
    const spotFree = (to: number, me: Member) =>
      members().every(
        (o) =>
          o === me ||
          Math.abs(spotOf(o) - to) >= minGap() ||
          spotOf(o) < 0 ||
          spotOf(o) > 1,
      );
    const newGuest = () => {
      let g = 0;
      for (let t = 0; t < 60; t++) {
        g = Math.floor(Math.random() * GUEST_NAME_COUNT);
        if (!used.has(g) && g !== meRef.current) break;
      }
      used.add(g);
      return g;
    };
    const member = (g: number) => {
      const m = document.createElement("span") as Member;
      m.className = s.p;
      m.dataset.g = String(g);
      const body = document.createElement("span");
      body.className = s.body;
      body.style.setProperty(
        "--bob",
        `${(2.4 + Math.random() * 1.6).toFixed(2)}s`,
      );
      body.style.setProperty("--bd", `${(-Math.random() * 3).toFixed(2)}s`);
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.src = creatureUri(dnaOf(guestWords(g)));
      body.appendChild(img);
      m.appendChild(body);
      return m;
    };
    const build = () => {
      d = dims();
      el.style.setProperty("--cs", `${d.s}px`);
      used = new Set();
      held.clear();
      el.replaceChildren();
      for (let i = 0; i < d.n; i++) {
        const x = 0.035 + (0.93 / (d.n - 1)) * i + (Math.random() - 0.5) * 0.02;
        const m = member(newGuest());
        place(m, x);
        el.appendChild(m);
      }
    };
    const idle = () =>
      members().filter(
        (p) =>
          !p.classList.contains(s.talking) &&
          !p.classList.contains(s.walking) &&
          Number(p.dataset.x) > 0.02 &&
          Number(p.dataset.x) < 0.98,
      );

    // every bubble or emoji holds its own stretch of the screen; a new one goes only where nothing else is
    const hold = (span: Span) => {
      for (const o of held)
        if (!(o.r + GAP <= span.l || span.r + GAP <= o.l)) return false;
      held.add(span);
      return true;
    };
    const speak = (p: Member, said: Said, ms: number, fade: boolean) => {
      p.appendChild(said);
      const pr = p.getBoundingClientRect();
      const cx = pr.left + pr.width / 2;
      const vw = document.documentElement.clientWidth;
      const w = said.offsetWidth;
      let left = cx - w / 2;
      if (said.classList.contains(s.say)) {
        // kept on screen: it slides back in by what spills, its tail stays on the speaker
        left = Math.max(10, Math.min(vw - 10 - w, cx - w / 2));
        const dx = cx - w / 2 - left;
        if (Math.abs(dx) > 0.5) {
          said.style.setProperty("--sx", `calc(-50% - ${dx}px)`);
          said.style.setProperty(
            "--tx",
            `calc(50% + ${Math.max(-w / 2 + 14, Math.min(w / 2 - 14, dx))}px)`,
          );
        }
      }
      const span = { l: left, r: left + w };
      if (!hold(span)) {
        said.remove();
        return false;
      }
      p.classList.add(s.talking);
      const end = () => {
        held.delete(span);
        said.remove();
        if (!p.querySelector(`.${s.say}, .${s.emo}`))
          p.classList.remove(s.talking);
      };
      said._end = end;
      later(() => {
        if (fade) {
          said.classList.add(s.out);
          later(end, 320);
        } else end();
      }, ms);
      return true;
    };
    const emoji = (text: string, kind: string) => {
      const e = document.createElement("span") as Said;
      e.className = `${s.emo} ${kind}`;
      e.textContent = text;
      return e;
    };
    const talk = () => {
      if (document.hidden) return;
      const ps = idle().sort(() => Math.random() - 0.5);
      // a few tries: the first with room above them talks
      for (const p of ps.slice(0, 4)) {
        if (Math.random() < 0.34 || !says.length) {
          const [e, kind] = pick(EMOJI);
          if (speak(p, emoji(e, kind), 1900, false)) return;
        } else {
          const b = document.createElement("span") as Said;
          b.className = s.say;
          b.textContent = nextSay() ?? "";
          if (speak(p, b, 2400, true)) return;
        }
      }
    };

    // whoever is in front stays in front: each darkens by how much it sits behind someone, read every frame
    const depthOf = (p: Member) => {
      if (p._depth === undefined) p._depth = ++hi;
      return p._depth;
    };
    const depthTick = () => {
      if (raf) return;
      const step = () => {
        const xs = members().map((p) => {
          const r = p.getBoundingClientRect();
          return { p, cx: r.left + r.width / 2, w: r.width, d: depthOf(p) };
        });
        xs.slice()
          .sort((a, b) => a.d - b.d)
          .forEach((o, i) => {
            o.p.style.zIndex = String(1 + i);
          });
        let moving = false;
        for (const a of xs) {
          let target = 0;
          for (const b of xs) {
            if (b === a || b.d <= a.d) continue;
            // 0 when the two only touch, 1 once they mostly cover each other
            const t = (a.w * 0.78 - Math.abs(a.cx - b.cx)) / (a.w * 0.4);
            if (t > target) target = Math.min(1, t);
          }
          const cur = a.p._dk ?? 0;
          const next = cur + (target - cur) * 0.2;
          const v = Math.abs(next - target) < 0.004 ? target : next;
          if (v !== cur) {
            a.p._dk = v;
            a.p.style.setProperty("--dk", v.toFixed(3));
          }
          if (v !== target || a.p.classList.contains(s.walking)) moving = true;
        }
        raf =
          moving && !document.hidden && live ? requestAnimationFrame(step) : 0;
      };
      raf = requestAnimationFrame(step);
    };

    const walk = (p: Member, from: number, to: number, done?: () => void) => {
      for (const said of p.querySelectorAll<Said>(`.${s.say}, .${s.emo}`))
        said._end ? said._end() : said.remove();
      p.classList.remove(s.talking);
      const W = el.clientWidth || innerWidth;
      const ms = Math.max(650, ((Math.abs(to - from) * W) / 105) * 1000);
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 14; i++) {
        const x = from + ((to - from) * i) / 14;
        frames.push({ left: `${x * 100}%`, bottom: `${footAt(x)}px` });
      }
      p.classList.add(s.walking);
      p.classList.toggle(s.left, to < from);
      p.dataset.to = String(to);
      // a new walker goes behind everyone it meets, the ones already walking too
      p._depth = --lo;
      const a = p.animate(frames, {
        duration: ms,
        easing: "linear",
        fill: "forwards",
      });
      depthTick();
      a.onfinish = () => {
        place(p, to);
        a.cancel();
        p.classList.remove(s.walking, s.left);
        p._depth = ++hi;
        done?.();
      };
    };
    const swap = () => {
      const ps = idle();
      if (!ps.length) return;
      const p = pick(ps);
      const x = Number(p.dataset.x);
      const outTo = x < 0.5 ? -0.08 : 1.08;
      walk(p, x, outTo, () => {
        used.delete(Number(p.dataset.g));
        p.remove();
      });
      // the newcomer comes from the other side half the time, crossing the crowd
      const fromX = Math.random() < 0.5 ? outTo : outTo < 0 ? 1.08 : -0.08;
      const m = member(newGuest());
      place(m, fromX);
      m.classList.add(s.walking);
      m.dataset.to = String(x);
      el.appendChild(m);
      later(
        () =>
          walk(m, fromX, x, () => {
            if (Math.random() < 0.5)
              speak(m, emoji(pick(HELLO), s.pop), 1600, false);
          }),
        700,
      );
    };
    // most moves are strolls to a free spot nearby; some are someone leaving and someone new arriving
    const move = () => {
      if (document.hidden) return;
      if (Math.random() < 0.4) return swap();
      const ps = idle();
      if (!ps.length) return;
      const p = pick(ps);
      const x = Number(p.dataset.x);
      for (let t = 0; t < 16; t++) {
        const to = Math.max(
          0.03,
          Math.min(
            0.97,
            x + (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.16),
          ),
        );
        if (spotFree(to, p)) return walk(p, x, to);
      }
    };

    build();
    // only while the stage's foot is on screen
    let seen = true;
    const io = new IntersectionObserver((es) => {
      for (const e of es) seen = e.isIntersecting;
    });
    io.observe(el.parentElement ?? el);
    const talkId = window.setInterval(() => seen && talk(), 1700);
    const moveId = still ? 0 : window.setInterval(() => seen && move(), 1500);
    let wide = dims().n;
    const onResize = () => {
      const n = dims().n;
      if (n === wide) {
        for (const m of members())
          if (!m.classList.contains(s.walking)) place(m, Number(m.dataset.x));
        return;
      }
      wide = n;
      build();
    };
    window.addEventListener("resize", onResize);
    return () => {
      live = false;
      io.disconnect();
      window.clearInterval(talkId);
      window.clearInterval(moveId);
      for (const id of timers) window.clearTimeout(id);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.replaceChildren();
    };
  }, [locale]);

  return <div ref={root} className={s.crowd} aria-hidden="true" />;
}
