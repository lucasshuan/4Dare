"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Crown,
  Gamepad2,
  Image as ImageIcon,
  Sparkles,
  Star,
  Tags,
  UserRoundPlus,
  WandSparkles,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { Face } from "@/components/ui/face";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { useMe } from "@/features/data/use-me";
import { ProfileLink } from "@/features/profile/profile-link";
import { RoomArt } from "@/features/rooms/room-art";
import { GAME_KEYS } from "@/game/games";
import { guestAvatar } from "@/game/guest-names";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { CONTRIBUTIONS, RANKINGS } from "@/lib/routes";
import type {
  LibraryHelper,
  MyRankingRow,
  RankingRow,
} from "@/server/community-contract";
import type { PersonRef } from "@/server/contract";
import type { HomeData } from "@/server/home";
import { useSignIn } from "../use-sign-in";
import s from "./sections.module.css";

/** A name that opens its profile. */
const Who = ({ person }: { person: PersonRef }) => (
  <ProfileLink handle={person.handle} className={s.who}>
    {person.name}
  </ProfileLink>
);

function Row({
  place,
  person,
  value,
  extra,
}: {
  place: number;
  person: PersonRef;
  value: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <li className={cn(s.rr, place === 1 && s.first)}>
      <span className={s.pos}>
        {place === 1 ? <Crown strokeWidth={2.2} aria-label="1" /> : place}
      </span>
      <Face avatar={person.avatar} className={s.face} size={40} />
      <Who person={person} />
      {extra}
      <span className={s.v}>{value}</span>
    </li>
  );
}

/** The reader on the week's total: their place, or how a guest gets one. */
function You() {
  const t = useTranslations("home.sections.rank");
  const format = useFormatter();
  const lang = useLocale();
  const { me } = useMe();
  const { signIn, pending } = useSignIn();
  const member = !!me && !me.isGuest;
  const { data } = useQuery({
    queryKey: ["rankings-me", lang, "all", "week"],
    enabled: member,
    queryFn: async (): Promise<MyRankingRow> => {
      const res = await fetch(`/api/rankings/me?period=week&lang=${lang}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`rank: ${res.status}`);
      return (await res.json()) as MyRankingRow;
    },
    staleTime: 60_000,
  });
  if (!me) return null;
  if (!member)
    return (
      <div className={cn(s.you, s.guest)}>
        <span>
          <b>{t("guest")}</b> {t("guestTail")}
        </span>
        <span className={s.two}>
          {(["discord", "google"] as const).map((p) => (
            <button
              key={p}
              type="button"
              disabled={pending}
              onClick={() => signIn(p)}
              className={cn(s.prov, p === "discord" && s.discord)}
            >
              {/* biome-ignore lint/performance/noImgElement: a tiny static svg */}
              <img src={`/icons/${p}.svg`} alt="" width={18} height={18} />
              {p === "discord" ? "Discord" : "Google"}
            </button>
          ))}
        </span>
      </div>
    );
  const row = data?.me ?? null;
  return (
    <div className={s.you}>
      <Face avatar={me.avatar} className={s.face} size={40} />
      <span className={s.youTxt}>
        <b>{row ? t("you", { place: row.place }) : t("noXp")}</b>
      </span>
      {row ? (
        <span className={s.v}>{t("xp", { xp: format.number(row.xp) })}</span>
      ) : null}
    </div>
  );
}

/** The week's total: a little podium, the next three, and you. */
function Total({ rows }: { rows: RankingRow[] }) {
  const t = useTranslations("home.sections.rank");
  const format = useFormatter();
  const xp = (n: number) => t("xp", { xp: format.number(n) });
  const pod = (i: number, cls: string) => {
    const r = rows[i];
    return (
      <div className={cn(s.mp, cls, !r && s.ghostPod)}>
        {i === 0 && r ? (
          // biome-ignore lint/performance/noImgElement: a static svg
          <img className={s.crown} src="/opening/crown.svg" alt="" />
        ) : null}
        <Face
          avatar={r?.person.avatar ?? guestAvatar(40 + i)}
          className={s.face}
          size={68}
        />
        {r ? <Who person={r.person} /> : <b>·</b>}
        <small>{r ? xp(r.xp) : " "}</small>
        <span className={s.blk}>{i + 1}</span>
      </div>
    );
  };
  return (
    <article
      className={cn(s.rkc, s.total)}
      style={{ "--i": 0 } as CSSProperties}
      aria-labelledby="rk-all-h"
    >
      <span className={s.flagTag}>
        <Star strokeWidth={2} aria-hidden="true" />
        {t("flag")}
      </span>
      <header>
        <span className={s.kicker}>
          <Gamepad2 strokeWidth={2} aria-hidden="true" />
          {t("allKicker")}
        </span>
        <h4 id="rk-all-h">{t("allTitle")}</h4>
        <p>{t("allText")}</p>
      </header>
      <div className={s.pod}>
        {pod(1, s.p2)}
        {pod(0, s.p1)}
        {pod(2, s.p3)}
      </div>
      {rows.length > 3 ? (
        <ol className={s.list} start={4}>
          {rows.slice(3, 6).map((r) => (
            <Row
              key={r.person.id}
              place={r.place}
              person={r.person}
              value={xp(r.xp)}
            />
          ))}
        </ol>
      ) : rows.length ? null : (
        <p className={s.empty}>{t("empty")}</p>
      )}
      <You />
    </article>
  );
}

function Helpers({
  helpers,
  photos,
}: {
  helpers: LibraryHelper[];
  photos: string[];
}) {
  const t = useTranslations("home.sections.rank");
  return (
    <article
      className={cn(s.rkc, s.contrib)}
      style={{ "--i": 4 } as CSSProperties}
      aria-labelledby="rk-c-h"
    >
      <div className={cn(s.rkArt, s.cArt)} aria-hidden="true">
        {photos.slice(0, 4).map((src, i) => (
          <span
            key={src}
            className={s.ph}
            style={{ "--r": `${[-8, 5, -3, 9][i]}deg` } as CSSProperties}
          >
            {/* biome-ignore lint/performance/noImgElement: a library photo from storage */}
            <img src={src} alt="" loading="lazy" decoding="async" />
          </span>
        ))}
      </div>
      <header>
        <span className={cn(s.kicker, s.alt)}>
          <Sparkles strokeWidth={2} aria-hidden="true" />
          {t("contribKicker")}
        </span>
        <h4 id="rk-c-h">{t("contribTitle")}</h4>
        <p>{t("contribText")}</p>
      </header>
      {helpers.length ? (
        <ol className={s.list}>
          {helpers.map((h, i) => (
            <Row
              key={h.person.id}
              place={i + 1}
              person={h.person}
              value={h.total}
              extra={
                <span
                  className={s.mix}
                  title={t("mix", {
                    pictures: h.pictures,
                    aliases: h.aliases,
                    characters: h.characters,
                    live: h.live,
                  })}
                >
                  <ImageIcon strokeWidth={2} aria-hidden="true" />
                  {h.pictures}
                  <Tags strokeWidth={2} aria-hidden="true" />
                  {h.aliases}
                  <UserRoundPlus strokeWidth={2} aria-hidden="true" />
                  {h.characters}
                  <WandSparkles strokeWidth={2} aria-hidden="true" />
                  {h.live}
                </span>
              }
            />
          ))}
        </ol>
      ) : (
        <p className={s.empty}>{t("empty")}</p>
      )}
      <Link href={CONTRIBUTIONS} className={s.more}>
        {t("contribMore")}
        <ArrowRight strokeWidth={2} aria-hidden="true" />
      </Link>
    </article>
  );
}

/** The week's rankings, side by side: every game together, each game, and who helped most. */
export function RankRail({ data }: { data: HomeData }) {
  const t = useTranslations("home.sections.rank");
  const format = useFormatter();
  const gameName = useGameName();
  return (
    <>
      <Total rows={data.ranks.all} />
      {GAME_KEYS.map((g, gi) => {
        const rows = data.ranks.games[g];
        return (
          <article
            key={g}
            className={s.rkc}
            style={{ "--i": gi + 1 } as CSSProperties}
            aria-labelledby={`rk-${g}-h`}
          >
            <div className={s.rkArt} aria-hidden="true">
              <RoomArt game={g} />
            </div>
            <header>
              <span className={s.kicker}>
                <GameThumb game={g} size="tiny" />
                {t("perGame")}
              </span>
              <h4 id={`rk-${g}-h`}>{gameName(g)}</h4>
              <p>{t("gameText")}</p>
            </header>
            {rows.length ? (
              <ol className={s.list}>
                {rows.map((r) => (
                  <Row
                    key={r.person.id}
                    place={r.place}
                    person={r.person}
                    value={t("xp", { xp: format.number(r.xp) })}
                  />
                ))}
              </ol>
            ) : (
              <p className={s.empty}>{t("empty")}</p>
            )}
            <Link href={`${RANKINGS}?game=${g}`} className={s.more}>
              {t("more")}
              <ArrowRight strokeWidth={2} aria-hidden="true" />
            </Link>
          </article>
        );
      })}
      <Helpers
        helpers={data.helpers}
        photos={data.library.cards.flatMap((c) =>
          c.imageUrl ? [c.imageUrl] : [],
        )}
      />
    </>
  );
}
