"use client";

// "The priciest": What for?'s dearest characters on average at auction, on
// the game's page. Read from a cached list; nothing shows until enough cards
// sold often enough.
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { PriciestCard } from "@/server/contract";
import { CardFace } from "./card";

/** Fewer than this and the list says little: it waits. */
const MIN_SHOWN = 3;

export function Priciest() {
  const t = useTranslations("home.games.whatFor");
  const format = useFormatter();
  const lang = useLocale();
  const { data } = useQuery({
    queryKey: ["lineup-priciest", lang],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/priciest?lang=${lang}`);
      if (!res.ok) throw new Error(`priciest: ${res.status}`);
      return ((await res.json()) as { cards: PriciestCard[] }).cards;
    },
    staleTime: 10 * 60_000,
  });
  if (!data || data.length < MIN_SHOWN) return null;
  return (
    <section className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col">
        <h2 className="font-bold font-display text-xl">
          {t("priciest.title")}
        </h2>
        <p className="text-[13px] text-ink-muted">{t("priciest.hint")}</p>
      </div>
      <ol className="grid grid-cols-4 gap-x-3 gap-y-4 sm:grid-cols-4">
        {data.map((c, i) => (
          <li key={c.id} className="flex min-w-0 flex-col items-center gap-1">
            <span className="relative w-full rounded-[6px] bg-white p-1 shadow-card">
              <CardFace card={c} />
              <span className="absolute -top-2 -left-2 grid size-6 place-items-center rounded-pill bg-ink font-bold font-mono text-[12px] text-on-ink">
                {i + 1}
              </span>
            </span>
            <span className="w-full truncate text-center font-semibold text-[12.5px]">
              {c.name}
            </span>
            <span className="rounded-[5px] bg-kraft px-1.5 font-mono font-semibold text-[12px] text-kraft-ink">
              {t("priciest.avg", {
                coins: format.number(c.avg, { maximumFractionDigits: 1 }),
              })}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
