"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LayoutGrid, Link2 } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/ui/page-head";
import { useWithNames } from "@/components/ui/player-name";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { GamePill } from "@/features/workshop/objects";
import { OPEN_GAMES } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { NEWS } from "@/lib/routes";
import type {
  NewsGame,
  NewsItem,
  NewsPage,
  NewsReactionKey,
} from "@/server/community-contract";
import { reactToNews } from "@/server/news-actions";
import { markNewsSeen } from "./news-seen";

type KindFilter = "all" | "new" | "better" | "fix";

const REACTIONS: { key: NewsReactionKey; emoji: string }[] = [
  { key: "love", emoji: "❤️" },
  { key: "party", emoji: "🎉" },
  { key: "wow", emoji: "😮" },
];

const KIND_EMOJI = {
  new: "✨",
  better: "🔧",
  fix: "🩹",
  workshop: "💡",
  notice: "📜",
} as const;

const fits = (n: NewsItem, kind: KindFilter) =>
  kind === "all" ||
  n.kind === kind ||
  (kind === "new" && n.kind === "workshop");

/**
 * /news: what changed, by day. A filter by game (and 4Dare itself) and by
 * kind. Every post is a card of the same size; each has its link and
 * reactions for accounts, and what the Workshop put live credits who
 * suggested it.
 */
export function NewsScreen() {
  const t = useTranslations("news");
  const lang = useLocale();
  const gameName = useGameName();
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [game, setGame] = useState<NewsGame | "all">("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [focus, setFocus] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["news", lang],
    queryFn: async (): Promise<NewsPage> => {
      const res = await fetch(`/api/news?lang=${lang}`);
      if (!res.ok) throw new Error(`news: ${res.status}`);
      return (await res.json()) as NewsPage;
    },
  });

  // the filters live in the link; a #post link opens on that post
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("game");
    const k = p.get("kind");
    if (g && (g === "site" || (OPEN_GAMES as readonly string[]).includes(g)))
      setGame(g as NewsGame);
    if (k === "new" || k === "better" || k === "fix") setKind(k);
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) setFocus(hash);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (game !== "all") p.set("game", game);
    if (kind !== "all") p.set("kind", kind);
    const qs = p.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
    );
  }, [game, kind]);
  useEffect(() => {
    if (data?.items[0]) markNewsSeen(data.items[0].at);
  }, [data]);
  useEffect(() => {
    if (!focus || !data) return;
    const el = document.getElementById(focus);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus, data]);

  const list = (data?.items ?? []).filter(
    (n) => (game === "all" || n.game === game) && fits(n, kind),
  );
  const days: { day: string; at: number; items: NewsItem[] }[] = [];
  for (const n of list) {
    const d = new Date(n.at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = days.at(-1);
    if (last?.day === key) last.items.push(n);
    else days.push({ day: key, at: n.at, items: [n] });
  }
  const dayLabel = (at: number) => {
    const start = (x: Date) =>
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((start(now) - start(new Date(at))) / 86_400_000);
    return diff === 0 ? t("today") : diff === 1 ? t("yesterday") : null;
  };

  let index = 0;
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <fieldset className="-mx-1 m-0 flex min-w-0 flex-1 gap-2 overflow-x-auto border-0 px-1 py-0.5 [scrollbar-width:none]">
          <legend className="sr-only">{t("gameLabel")}</legend>
          {(["all", ...OPEN_GAMES, "site"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={game === g}
              onClick={() => setGame(g)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill border px-3.5 font-semibold text-sm transition-[background-color,border-color,color,scale] duration-150 ease-soft active:scale-[0.96]",
                g !== "all" && g !== "site" && "pl-1.5",
                game === g
                  ? "border-ink bg-ink text-on-ink"
                  : "border-line bg-surface hover:bg-sunken",
              )}
            >
              {g === "all" ? (
                t("all")
              ) : g === "site" ? (
                <>
                  <LayoutGrid className="size-4" strokeWidth={2} />
                  {t("site")}
                </>
              ) : (
                <>
                  <GameThumb game={g} size="tiny" />
                  {gameName(g)}
                </>
              )}
            </button>
          ))}
        </fieldset>
        <Segmented
          size="sm"
          label={t("kindLabel")}
          options={["all", "new", "better", "fix"] as const}
          value={kind}
          onChange={setKind}
          render={(k) => t(`kinds.${k}`)}
        />
      </div>
      {!data ? (
        <div className="grid gap-4">
          {["a", "b"].map((k) => (
            <span
              key={k}
              className="h-[220px] animate-pulse rounded-[24px] bg-sunken"
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="grid justify-items-start gap-2 rounded-[24px] border border-line-strong border-dashed p-7">
          <b className="font-bold font-display text-[19px]">
            {data.items.length ? t("empty") : t("nothing")}
          </b>
          {data.items.length ? (
            <span className="text-ink-muted">{t("emptyHint")}</span>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-9">
          {days.map((d) => {
            const rel = dayLabel(d.at);
            const date = format.dateTime(d.at, {
              day: "numeric",
              month: "long",
            });
            return (
              <section
                key={d.day}
                aria-label={date}
                className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]"
              >
                <div className="md:sticky md:top-24 md:self-start">
                  <b className="block font-bold font-display text-[19px] leading-tight">
                    {rel ?? date}
                  </b>
                  {rel ? (
                    <small className="text-[13px] text-ink-muted">{date}</small>
                  ) : null}
                </div>
                <div className="grid items-stretch gap-3 sm:grid-cols-2">
                  {d.items.map((n) => (
                    <Post
                      key={n.id}
                      item={n}
                      index={index++}
                      signedIn={data.signedIn}
                      flash={focus === n.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Screen>
  );
}

function KindTag({ kind }: { kind: NewsItem["kind"] }) {
  const t = useTranslations("news");
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-pill px-2 font-bold text-[11.5px]",
        kind === "new" && "bg-sky-soft",
        kind === "better" && "bg-yes-soft",
        kind === "fix" && "bg-surface",
        kind === "workshop" && "bg-butter text-on-butter",
        kind === "notice" && "bg-apricot-soft",
      )}
    >
      <span aria-hidden="true">{KIND_EMOJI[kind]}</span>
      {t(`kinds.${kind}`)}
    </span>
  );
}

function GameTag({ game }: { game: NewsGame }) {
  const t = useTranslations("news");
  return game === "site" ? (
    <span className="inline-flex h-6 items-center rounded-pill bg-ink px-[9px] font-bold text-[11.5px] text-on-ink">
      {t("site")}
    </span>
  ) : (
    <GamePill game={game} />
  );
}

function Post({
  item,
  index,
  signedIn,
  flash,
}: {
  item: NewsItem;
  index: number;
  signedIn: boolean;
  flash: boolean;
}) {
  const t = useTranslations("news");
  const withNames = useWithNames();
  const toast = useToast();
  const locale = useLocale();
  const by = item.by;
  const body = by
    ? withNames((n) => item.body.replace("{by}", n(by)))
    : item.body.replace("{by}", "");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${locale}${NEWS}#${encodeURIComponent(item.id)}`,
      );
      toast(t("copied"));
    } catch {
      // the browser refused the clipboard
    }
  };
  return (
    <m.article
      id={item.id}
      initial={{ opacity: 0, y: 12 }}
      animate={
        flash
          ? {
              opacity: 1,
              y: 0,
              boxShadow: [
                "0 0 0 0 color-mix(in oklch, var(--sky) 55%, transparent)",
                "0 0 0 12px transparent",
              ],
            }
          : { opacity: 1, y: 0 }
      }
      transition={{
        duration: flash ? 1.2 : 0.42,
        ease: ease.soft,
        delay: Math.min(index, 10) * 0.04,
      }}
      className={cn(
        "flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[24px] border border-line bg-surface",
      )}
    >
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <KindTag kind={item.kind} />
          <GameTag game={item.game} />
          <button
            type="button"
            onClick={copy}
            aria-label={t("copy")}
            title={t("copy")}
            className="ml-auto flex size-8 items-center justify-center rounded-pill text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <Link2 className="size-4" strokeWidth={2} />
          </button>
        </div>
        {item.title ? (
          <h3 className="font-display font-extrabold text-[19px] leading-[1.1] tracking-[-0.015em]">
            {item.title}
          </h3>
        ) : null}
        <p className="text-[15px] text-ink-muted leading-[1.55]">{body}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {item.action ? (
            <Link
              href={item.action.href}
              className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong bg-surface px-3.5 font-semibold text-[14px] transition-colors hover:bg-sunken"
            >
              {item.action.label}
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          ) : null}
          <Reactions item={item} signedIn={signedIn} />
        </div>
      </div>
    </m.article>
  );
}

function Reactions({ item, signedIn }: { item: NewsItem; signedIn: boolean }) {
  const t = useTranslations("news");
  const tErrors = useTranslations("common.errors");
  const toast = useToast();
  const client = useQueryClient();
  const lang = useLocale();
  const { me } = useMe();
  const [counts, setCounts] = useState(item.reactions);
  const [mine, setMine] = useState(item.mine);
  const toggle = async (key: NewsReactionKey) => {
    if (!signedIn || !me || me.isGuest) return toast(t("signIn"));
    const had = mine.includes(key);
    setMine((all) => (had ? all.filter((x) => x !== key) : [...all, key]));
    setCounts((c) => ({
      ...c,
      [key]: Math.max(0, (c[key] ?? 0) + (had ? -1 : 1)),
    }));
    const r = await reactToNews(item.id, key).catch(() => null);
    if (!r?.ok) {
      setMine(item.mine);
      setCounts(item.reactions);
      toast(tErrors(r && !r.ok ? r.error : "unknown"));
      return;
    }
    setCounts(r.data);
    void client.invalidateQueries({ queryKey: ["news", lang] });
  };
  return (
    <div className="ml-auto flex gap-1">
      {REACTIONS.map((r) => {
        const n = counts[r.key] ?? 0;
        const on = mine.includes(r.key);
        return (
          <button
            key={r.key}
            type="button"
            aria-pressed={on}
            aria-label={t(`reactions.${r.key}`)}
            title={t(`reactions.${r.key}`)}
            onClick={() => void toggle(r.key)}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-pill border px-2 text-[13px] transition-[background-color,border-color,scale] duration-150 ease-soft active:scale-90",
              on ? "border-sky bg-sky-soft" : "border-line hover:bg-sunken",
            )}
          >
            <m.span
              key={`${r.key}-${on}`}
              initial={on ? { scale: 0.4, rotate: -30 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 14 }}
              aria-hidden="true"
            >
              {r.emoji}
            </m.span>
            <AnimatePresence mode="popLayout" initial={false}>
              {n ? (
                <m.span
                  key={n}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="font-medium font-mono text-[12px] tabular-nums"
                >
                  {n}
                </m.span>
              ) : null}
            </AnimatePresence>
          </button>
        );
      })}
    </div>
  );
}
