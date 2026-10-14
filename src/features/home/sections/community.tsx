"use client";

import {
  ChevronLeft,
  ChevronRight,
  GalleryVerticalEnd,
  type LucideIcon,
  Scissors,
  Trophy,
  WandSparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import type { HomeData } from "@/server/home";
import { LibraryStrip } from "./library-strip";
import { RankRail } from "./rank-rail";
import s from "./sections.module.css";
import { useVoting, WorkshopRail } from "./workshop-rail";

/** Once in view, for good: the sub-section plays its entrance once. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      return setShown(true);
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
}

/** A rail's arrows: off at its ends; a press moves it about a card and more. */
function useRail(rail: RefObject<HTMLDivElement | null>) {
  const [ends, setEnds] = useState({ start: true, end: false });
  const check = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth - 2;
    setEnds({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max });
  }, [rail]);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [rail, check]);
  const slide = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = (el.children[1] ?? el.firstElementChild) as HTMLElement | null;
    const step = Math.max(
      (card?.getBoundingClientRect().width ?? 0) + 16,
      el.clientWidth * 0.62,
    );
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: still ? "auto" : "smooth" });
  };
  return { ends, slide, check };
}

/** A sub-section's divider: its number, a strip of tape with the title, a perforated line the scissors run along, and the rail's arrows. */
function Divider({
  n,
  tone,
  Icon,
  title,
  id,
  meta,
  rail,
}: {
  n: string;
  tone: string;
  Icon: LucideIcon;
  title: string;
  id: string;
  meta: ReactNode;
  rail?: ReturnType<typeof useRail>;
}) {
  const t = useTranslations("home.sections.community");
  return (
    <div className={s.cdiv} style={{ "--tone": tone } as CSSProperties}>
      <span className={s.cdivN} aria-hidden="true">
        {n}
      </span>
      <h3 id={id} className={s.tape}>
        <Icon aria-hidden="true" />
        <span>{title}</span>
      </h3>
      <span className={s.cut} aria-hidden="true">
        <span className={s.perf} />
        <span className={s.sc}>
          <Scissors strokeWidth={2} />
        </span>
      </span>
      <span className={s.cdivMeta}>{meta}</span>
      {rail ? (
        <span className={s.cnav}>
          <button
            type="button"
            className={s.cbtn}
            aria-label={t("prev")}
            disabled={rail.ends.start}
            onClick={() => rail.slide(-1)}
          >
            <ChevronLeft strokeWidth={2} />
          </button>
          <button
            type="button"
            className={s.cbtn}
            aria-label={t("next")}
            disabled={rail.ends.end}
            onClick={() => rail.slide(1)}
          >
            <ChevronRight strokeWidth={2} />
          </button>
        </span>
      ) : null}
    </div>
  );
}

/**
 * "The crowd makes the game": three rails in the open, each under a strip of
 * tape. The week's rankings (every game, each game, and who helped most), the
 * Workshop's suggestions up for a vote, and the library's characters drifting by.
 */
export function Community({ data }: { data: HomeData }) {
  const t = useTranslations("home.sections");
  const b = (c: ReactNode) => <b>{c}</b>;
  const rank = useReveal<HTMLElement>();
  const ofi = useReveal<HTMLElement>();
  const lib = useReveal<HTMLElement>();
  const rankRail = useRef<HTMLDivElement>(null);
  const ofiRail = useRef<HTMLDivElement>(null);
  const rankNav = useRail(rankRail);
  const ofiNav = useRail(ofiRail);
  const voting = useVoting();

  // the tickets arrive after the page: the arrows wake up with them
  // biome-ignore lint/correctness/useExhaustiveDependencies: recheck when the tickets come in
  useEffect(() => ofiNav.check(), [voting.items.length]);

  return (
    <section className={s.sec} aria-labelledby="comm-h">
      <div className={s.head}>
        <div>
          <span className={s.eyebrow}>{t("community.eyebrow")}</span>
          <h2 id="comm-h">{t("community.title")}</h2>
          <p>{t("community.sub")}</p>
        </div>
      </div>
      <section
        ref={rank.ref}
        className={cn(s.csub, rank.shown && s.in)}
        aria-labelledby="c-rank"
      >
        <Divider
          n="01"
          tone="var(--brand-butter)"
          Icon={Trophy}
          title={t("rank.title")}
          id="c-rank"
          meta={t("rank.meta")}
          rail={rankNav}
        />
        <div ref={rankRail} className={s.rail}>
          <RankRail data={data} />
        </div>
      </section>
      <section
        ref={ofi.ref}
        className={cn(s.csub, ofi.shown && s.in)}
        aria-labelledby="c-ofi"
      >
        <Divider
          n="02"
          tone="#f4c09a"
          Icon={WandSparkles}
          title={t("ofi.title")}
          id="c-ofi"
          meta={t.rich("ofi.meta", { n: voting.count, b })}
          rail={ofiNav}
        />
        <div ref={ofiRail} className={cn(s.rail, s.tickets)}>
          <WorkshopRail voting={voting} />
        </div>
      </section>
      <section
        ref={lib.ref}
        className={cn(s.csub, lib.shown && s.in)}
        aria-labelledby="c-lib"
      >
        <Divider
          n="03"
          tone="#a9e0d9"
          Icon={GalleryVerticalEnd}
          title={t("lib.title")}
          id="c-lib"
          meta={t.rich("lib.meta", {
            characters: data.library.characters,
            pictures: data.library.pictures,
            b,
          })}
        />
        <p className={s.csubP}>{t("lib.text")}</p>
        <LibraryStrip cards={data.library.cards} />
      </section>
    </section>
  );
}
