"use client";

import { ImagePlus, UserRoundPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { MiniCard } from "@/components/ui/mini-card";
import type { ProfileView } from "@/server/contract";
import { Card } from "./activity";

/** The pictures someone sent for characters and the characters they made. */
export function ContributionsPanel({ view }: { view: ProfileView }) {
  const t = useTranslations("profile.contributions");
  return (
    <div className="flex flex-col gap-4">
      <Card title={t("pictures")} icon={<ImagePlus strokeWidth={1.75} />}>
        {view.pictures.length === 0 ? (
          <p className="text-ink-muted text-sm">{t("nonePictures")}</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-3">
            {view.pictures.map((p) => (
              <li key={p.id} className="flex">
                <MiniCard
                  image={p.url}
                  name={p.character?.name ?? "?"}
                  sub={p.character?.origin ?? undefined}
                  width={108}
                  className="w-full"
                  badge={
                    p.status === "pending" ? (
                      <Tag className="bg-butter text-on-butter">
                        {t("pending")}
                      </Tag>
                    ) : p.cover ? (
                      <Tag className="bg-yes text-on-yes">{t("cover")}</Tag>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t("characters")} icon={<UserRoundPlus strokeWidth={1.75} />}>
        {view.characters.length === 0 ? (
          <p className="text-ink-muted text-sm">{t("noneCharacters")}</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))] gap-3">
            {view.characters.map((c) => (
              <li key={c.id} className="flex">
                <MiniCard
                  image={c.imageUrl}
                  name={c.name}
                  sub={c.origin ?? undefined}
                  width={108}
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Tag({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`whitespace-nowrap rounded-pill px-2 py-0.5 font-bold text-[10.5px] uppercase tracking-[0.06em] shadow-card ${className}`}
    >
      {children}
    </span>
  );
}
