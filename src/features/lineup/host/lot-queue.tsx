"use client";

// The presenter's queue of lots: the next ones in order (up, down, out),
// the search over the whole library (the same in-memory index as "Who am
// I?"), a name written by hand as a paper card, and this round's dealt cards
// as suggestions peeking from the bottom. The lot on air is locked.
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useCharacterIndex } from "@/features/pick/use-character-index";
import { searchItems, thumbUrl } from "@/game/character-search";
import { QUEUE_MAX } from "@/game/lineup/rules";
import type { LuCard } from "@/game/lineup/types";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { lineUpLots } from "@/server/actions";
import type { QueueItem } from "@/server/contract";
import { CardFace } from "../card";
import { useLineup, useLuAction } from "../use-lineup";

/** A queued card as the server takes it back: by what it is. */
const itemOf = (c: LuCard): QueueItem =>
  c.id.startsWith("paper:")
    ? { kind: "paper", name: c.name }
    : c.id.startsWith("x:")
      ? { kind: "extra", id: c.id.slice(2) }
      : { kind: "char", id: c.id };

function Mini({ card }: { card: LuCard }) {
  return (
    <span className="block w-10 shrink-0 rounded-[4px] bg-white p-[3px] shadow-card">
      <CardFace card={card} />
    </span>
  );
}

export function LotQueue({ className }: { className?: string }) {
  const t = useTranslations("lineup.host.queue");
  const lang = useLocale() as Lang;
  const { lu, code } = useLineup();
  const { run, pending } = useLuAction();
  const [query, setQuery] = useState("");
  const { data: index } = useCharacterIndex(lang, true);
  const queue = lu.queue ?? [];
  const full = queue.length >= QUEUE_MAX;
  const queued = new Set(queue.map((c) => c.id));
  const send = (items: QueueItem[]) => {
    setQuery("");
    void run(() => lineUpLots(code, items));
  };
  const now = queue.map(itemOf);
  const results = useMemo(
    () => (index && query.trim() ? searchItems(index, query, 6) : []),
    [index, query],
  );
  const move = (i: number, by: number) => {
    const next = [...now];
    const [x] = next.splice(i, 1);
    next.splice(i + by, 0, x);
    send(next);
  };
  return (
    <section
      aria-label={t("title")}
      className={cn(
        "flex w-full flex-col gap-3 rounded-[22px] bg-surface p-4 shadow-card",
        className,
      )}
    >
      <h3 className="m-0 font-bold font-display text-lg">{t("title")}</h3>
      {queue.length ? (
        <ol className="flex flex-col gap-1.5">
          {queue.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center gap-2.5 rounded-[12px] bg-sunken py-1.5 pr-1.5 pl-2"
            >
              <span className="w-5 text-center font-mono text-[13px] text-ink-muted">
                {i + 1}
              </span>
              <Mini card={c} />
              <span className="min-w-0 flex-1 truncate font-semibold text-sm">
                {c.name}
              </span>
              <button
                type="button"
                aria-label={t("up", { name: c.name })}
                disabled={i === 0 || pending}
                onClick={() => move(i, -1)}
                className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface disabled:opacity-30"
              >
                <ArrowUp className="size-4" />
              </button>
              <button
                type="button"
                aria-label={t("down", { name: c.name })}
                disabled={i === queue.length - 1 || pending}
                onClick={() => move(i, 1)}
                className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface disabled:opacity-30"
              >
                <ArrowDown className="size-4" />
              </button>
              <button
                type="button"
                aria-label={t("remove", { name: c.name })}
                disabled={pending}
                onClick={() => send(now.filter((_, k) => k !== i))}
                className="grid size-8 place-items-center rounded-pill text-ink-muted hover:bg-surface"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="m-0 rounded-[12px] bg-butter-soft px-3 py-2 font-semibold text-[13px]">
          {t("empty")}
        </p>
      )}

      <label className="group flex h-11 items-center gap-2.5 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 focus-within:border-sky">
        <Search
          className="size-4.5 shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
        <span className="sr-only">{t("search")}</span>
        <input
          type="search"
          value={query}
          disabled={full}
          placeholder={full ? t("full") : t("search")}
          onChange={(e) => setQuery(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      {query.trim() ? (
        <ul className="flex flex-col gap-1">
          {results.map((r) => {
            const card: LuCard = {
              id: r.id,
              name: r.name,
              origin: r.origin,
              imageUrl: thumbUrl(r.imageUrl, 120),
            };
            const taken = queued.has(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={taken || pending || full}
                  onClick={() => send([...now, { kind: "char", id: r.id }])}
                  className="flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left hover:bg-sunken disabled:opacity-40"
                >
                  <Mini card={card} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-semibold text-sm">
                      {r.name}
                    </b>
                    {r.origin ? (
                      <small className="block truncate text-[12px] text-ink-muted">
                        {r.origin}
                      </small>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              disabled={pending || full}
              onClick={() =>
                send([...now, { kind: "paper", name: query.trim() }])
              }
              className="flex w-full items-center gap-2.5 rounded-[12px] px-2 py-2 text-left font-semibold text-sm hover:bg-sunken"
            >
              <span className="grid w-10 shrink-0 place-items-center text-[22px]">
                ✍️
              </span>
              {t("paper", { name: query.trim().slice(0, 40) })}
            </button>
          </li>
        </ul>
      ) : null}

      {lu.deal?.length ? (
        <div className="flex flex-col gap-2">
          <span className="font-bold text-[12px] text-ink-muted uppercase tracking-[0.08em]">
            {t("suggestions")}
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {lu.deal.slice(0, 8).map(({ i, card }) => (
              <button
                key={card.id}
                type="button"
                title={card.name}
                aria-label={card.name}
                disabled={pending || full}
                onClick={() => send([...now, { kind: "deal", i }])}
                className="flex w-[68px] shrink-0 flex-col items-center gap-1 transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                <span className="block w-full rounded-[5px] bg-white p-1 shadow-card">
                  <CardFace card={card} />
                </span>
                <span className="w-full truncate text-center font-semibold text-[11px]">
                  {card.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
