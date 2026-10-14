"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { Face } from "@/components/ui/face";
import { BRAND, FOUR, QUESTION } from "@/components/ui/logo";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { OPEN_GAMES } from "@/game/games";
import { guestAvatar } from "@/game/guest-names";
import type { ContributionItem, RankingRow } from "@/server/community-contract";
import s from "./sections.module.css";

/** The logo's 4, between two moments. */
const Mark = () => (
  <svg className={s.sep} viewBox="-10 -10 840 850" aria-hidden="true">
    <path d={FOUR} fill={BRAND.blue} />
    <path d={QUESTION} fill={BRAND.butter} />
  </svg>
);

interface Moment {
  key: string;
  face: ReactNode;
  text: ReactNode;
}

/**
 * A strip of butter under the stage, running sideways: what the community
 * just did (a photo, a character, a nickname, a suggestion, one gone live),
 * or who leads the week when that's all there is. It holds while pointed at.
 */
export function Ribbon({
  moments,
  leaders,
}: {
  moments: ContributionItem[];
  leaders: RankingRow[];
}) {
  const t = useTranslations("home.sections.ribbon");
  const tg = useTranslations("home.games");
  const gameName = useGameName();
  const b = (c: ReactNode) => <b>{c}</b>;
  const face = (avatar: Parameters<typeof Face>[0]["avatar"]) => (
    <Face avatar={avatar} className={s.face} size={40} />
  );

  const items: Moment[] = moments.flatMap((m): Moment[] => {
    const name = m.by.name;
    const character = m.character?.name ?? "";
    let text: ReactNode;
    if (m.kind === "picture" && character)
      text = t.rich("picture", { name, character, b });
    else if (m.kind === "character" && character)
      text = t.rich("character", { name, character, b });
    else if (m.kind === "alias" && m.alias && character)
      text = t.rich("alias", { name, character, alias: m.alias.name, b });
    else if (m.kind === "suggestion" && m.suggestion)
      text = t.rich("suggestion", {
        name,
        kind: m.suggestion.kind,
        title: m.suggestion.title,
        b,
      });
    else if (m.kind === "live" && m.suggestion)
      text = t.rich("live", { name, title: m.suggestion.title, b });
    else return [];
    return [{ key: m.id, face: face(m.by.avatar), text }];
  });
  if (items.length < 4)
    for (const r of leaders.slice(0, 1))
      items.push({
        key: `lead-${r.person.id}`,
        face: face(r.person.avatar),
        text: t.rich("leader", { name: r.person.name, b }),
      });
  // never an empty strip: the games themselves, with who plays them
  if (items.length < 4)
    OPEN_GAMES.forEach((g, i) => {
      items.push({
        key: `game-${g}`,
        face: face(guestAvatar(7 + i * 13)),
        text: t.rich("game", {
          game: gameName(g),
          players: tg(`${GAME_INFO[g].messages}.players`),
          b,
        }),
      });
    });

  // long enough to cross the widest screen before it repeats
  const base = items.slice();
  for (let n = 1; base.length && items.length < 8; n++)
    items.push(...base.map((m) => ({ ...m, key: `${m.key}-${n}` })));

  const row = (copy: boolean) =>
    items.map((m) => (
      <span
        key={`${copy ? "b" : "a"}-${m.key}`}
        className={s.moment}
        aria-hidden={copy ? true : undefined}
      >
        {m.face}
        <span>{m.text}</span>
        <Mark />
      </span>
    ));

  return (
    <section
      className={s.ribbon}
      aria-label={t("label")}
      style={{ "--marquee": `${items.length * 7}s` } as CSSProperties}
    >
      <div className={s.track}>
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
