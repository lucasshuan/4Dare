"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { Face } from "@/components/ui/face";
import { Link } from "@/i18n/navigation";
import { characterPath } from "@/lib/routes";
import type { LibraryCard } from "@/server/community-contract";
import s from "./sections.module.css";

/** The library's most picked characters, their main photo on a little card each, drifting by (who made each one in its corner). */
export function LibraryStrip({ cards }: { cards: LibraryCard[] }) {
  const t = useTranslations("home.sections.lib");
  if (!cards.length) return null;
  const row = (copy: boolean) =>
    cards.map((c, i) => (
      <Link
        key={`${copy ? "b" : "a"}-${c.id}`}
        href={characterPath(c.id, c.name)}
        className={s.fcard}
        aria-label={t("open", { name: c.name })}
        aria-hidden={copy ? true : undefined}
        tabIndex={copy ? -1 : undefined}
        style={
          {
            "--t": `${(i % 2 ? 1 : -1) * (2 + (i % 3))}deg`,
            "--j": i,
          } as CSSProperties
        }
      >
        {/* biome-ignore lint/performance/noImgElement: a library photo from storage, any size */}
        <img
          src={c.imageUrl ?? ""}
          alt=""
          loading="lazy"
          decoding="async"
          width={132}
          height={165}
        />
        <b>{c.name}</b>
        {c.by ? (
          <span className={s.from}>
            <Face avatar={c.by.avatar} className={s.face} size={40} />
          </span>
        ) : null}
      </Link>
    ));
  return (
    <div className={s.marq}>
      <div className={s.marqTrack}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
