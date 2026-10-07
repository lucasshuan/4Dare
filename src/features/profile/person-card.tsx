"use client";

import { Popover } from "@base-ui/react/popover";
import { Quote } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import type { Avatar as AvatarData } from "@/game/types";
import { cn } from "@/lib/cn";
import { hours } from "./activity";
import { accentStyle } from "./profile-body";
import { ProfileLink } from "./profile-link";
import { usePlayerCard } from "./use-profile";

/** Who a face in a room belongs to, as the room shows them. */
export interface Person {
  id: string;
  isGuest: boolean;
  name: string;
  avatar: AvatarData;
}

/**
 * A face (or a name) that opens its person's quick card on a click or a tap:
 * an account's cover, name, @handle, quote and numbers, with a way to its
 * profile; a guest's face and name only.
 */
export function PersonCard({
  person,
  children,
  className,
  side = "bottom",
  align = "start",
}: {
  person: Person;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "cursor-pointer rounded-lg text-left outline-none focus-visible:outline-2 focus-visible:outline-sky focus-visible:outline-offset-2",
          className,
        )}
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className="z-50"
        >
          <Popover.Popup className="w-[min(300px,calc(100vw-1.5rem))] origin-[var(--transform-origin)] overflow-hidden rounded-xl bg-surface text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <PersonCardBody person={person} onLeave={() => setOpen(false)} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The quick card's inside; `onLeave` runs when it opens the profile. */
export function PersonCardBody({
  person,
  onLeave,
}: {
  person: Person;
  onLeave?: () => void;
}) {
  const t = useTranslations("player");
  const tc = useTranslations("common");
  const format = useFormatter();
  const { data: card, isPending } = usePlayerCard(person.id, !person.isGuest);

  if (person.isGuest || (!isPending && !card))
    return (
      <div className="flex items-center gap-3 p-4">
        <Avatar avatar={person.avatar} size={52} />
        <div className="flex min-w-0 flex-col">
          <Popover.Title className="m-0 truncate font-bold text-[17px]">
            {person.name}
          </Popover.Title>
          <span className="font-medium text-[13px] text-ink-muted">
            {t("card.guest")}
          </span>
        </div>
      </div>
    );

  return (
    <div style={accentStyle(card?.accent ?? null)} className="flex flex-col">
      <div
        className="h-12"
        style={{
          background: `linear-gradient(120deg, ${person.avatar.color}, color-mix(in oklab, ${person.avatar.color} 60%, var(--accent)))`,
        }}
      />
      <div className="-mt-5 flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-end gap-3">
          <span className="rounded-pill bg-surface p-[3px]">
            <Avatar avatar={person.avatar} size={52} />
          </span>
          <div className="flex min-w-0 flex-col pb-0.5">
            <Popover.Title className="m-0 truncate font-bold text-[17px] leading-tight">
              {card?.name ?? person.name}
            </Popover.Title>
            {card ? (
              <span className="truncate font-medium font-mono text-[12.5px] text-ink-muted">
                @{card.handle}
              </span>
            ) : null}
          </div>
        </div>
        {!card ? (
          <div
            role="status"
            aria-label={tc("loading")}
            className="grid grid-cols-3 gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[46px] animate-pulse rounded-lg bg-sunken"
              />
            ))}
          </div>
        ) : (
          <>
            {card.quote ? (
              <p className="flex gap-2 text-[14px] leading-snug">
                <Quote
                  className="mt-0.5 size-3.5 shrink-0 text-(--accent)"
                  strokeWidth={2.25}
                />
                {card.quote}
              </p>
            ) : null}
            <dl className="grid grid-cols-3 gap-1.5">
              <Num
                value={format.number(card.matches)}
                label={t("kpis.matches", { n: card.matches })}
              />
              <Num
                value={`${card.matches ? Math.round((card.wins / card.matches) * 100) : 0}%`}
                label={t("kpis.wins")}
              />
              <Num
                value={t("kpis.hoursValue", {
                  n: format.number(hours(card.timeMs)),
                })}
                label={t("kpis.hours")}
              />
            </dl>
            <ProfileLink
              handle={card.handle}
              onClick={onLeave}
              className={buttonClass("primary", "sm", "w-full")}
            >
              {t("card.seeProfile")}
            </ProfileLink>
          </>
        )}
      </div>
    </div>
  );
}

function Num({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg bg-sunken px-2.5 py-1.5">
      <dt className="truncate font-semibold text-[11px] text-ink-muted">
        {label}
      </dt>
      <dd className="font-medium font-mono text-[15px] tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/**
 * The person under a match card's peek: face, name, @handle and a way to
 * their profile (an account's), or "Guest".
 */
export function PersonStrip({ person }: { person: Person }) {
  const t = useTranslations("player.card");
  const { data: card } = usePlayerCard(person.id, !person.isGuest);
  return (
    <div className="flex items-center gap-2.5">
      <Avatar avatar={person.avatar} size={32} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-sm">{person.name}</span>
        <span className="truncate font-medium font-mono text-[12px] text-ink-muted">
          {person.isGuest ? t("guest") : card ? `@${card.handle}` : " "}
        </span>
      </div>
      {card ? (
        <ProfileLink
          handle={card.handle}
          className={buttonClass("secondary", "sm", "h-8 px-3 text-[13px]")}
        >
          {t("seeProfile")}
        </ProfileLink>
      ) : null}
    </div>
  );
}
