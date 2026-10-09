"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useQuery } from "@tanstack/react-query";
import {
  CircleQuestionMark,
  Clock,
  GalleryVerticalEnd,
  House,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Plus,
  Search,
  SlidersHorizontal,
  Trophy,
  UserRound,
} from "lucide-react";
import { m } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { PROVIDER_NAME, ProviderLogo } from "@/components/ui/auth-button";
import { buttonClass } from "@/components/ui/button";
import { LayoutMotion } from "@/components/ui/layout-motion";
import { Logo } from "@/components/ui/logo";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { useMe } from "@/features/data/use-me";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import { useSignIn } from "@/features/home/use-sign-in";
import { accentStyle } from "@/features/profile/cover-paint";
import { LevelAvatar } from "@/features/profile/level";
import { profilePath } from "@/features/profile/profile-link";
import { usePlayerCard } from "@/features/profile/use-profile";
import { type GameKey, OPEN_GAMES } from "@/game/games";
import { levelOf } from "@/game/profile/xp";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAction } from "@/lib/hooks/use-action";
import type { DeferredProps } from "@/lib/hooks/use-deferred";
import { ease } from "@/lib/motion";
import { meNamed, useDisplayName } from "@/lib/names";
import {
  CHARACTERS,
  GAME_PATHS,
  HOW_TO_PLAY,
  NEW_ROOM,
  ROOMS,
  SETTINGS,
  WORKSHOP,
} from "@/lib/routes";
import { signOut } from "@/server/actions";
import type { MenuCounts } from "@/server/menu";
import { Bars, burgerClass } from "./menu-button";

type ItemKey =
  | "home"
  | "rooms"
  | "newRoom"
  | "profile"
  | "badges"
  | "matches"
  | "settings"
  | "characters"
  | "workshop"
  | "howTo";

interface Item {
  key: ItemKey;
  href: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Grey text at the right (how many rooms are open). */
  meta?: string;
  /** Shows the "new" tag until this day (a page that just arrived). */
  newUntil?: string;
}

type GroupKey = "play" | "you" | "community" | "library" | "help";

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** How long the picked row's marker shows before the menu slides away (ms). */
const CLOSE_AFTER = 230;

/**
 * A profile link inside the app opens the profile as a modal over the page
 * (@modal/(.)u). From the menu it goes to the profile's own page, which only
 * a full load gets past the interception for.
 */
const asPage = (e: MouseEvent<HTMLAnchorElement>) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  e.preventDefault();
  window.location.assign(e.currentTarget.href);
};

/**
 * The side menu: who you are, a "go to" filter and every page in five
 * groups (play, you, community, library, help). It slides in from the left
 * over a scrim; its own three bars sit where the page's are, folded into an
 * X. The current page's row wears a marker that glides to the row you pick.
 */
export function MenuDrawer({ open, onOpenChange, autoFocus }: DeferredProps) {
  const t = useTranslations("nav");
  const gameName = useGameName();
  const { me } = useMe();
  const { rooms } = usePublicRooms();
  const format = useFormatter();
  const { data: counts } = useQuery({
    queryKey: ["menu-counts"],
    queryFn: async (): Promise<MenuCounts> => {
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error(`menu: ${res.status}`);
      return (await res.json()) as MenuCounts;
    },
    staleTime: 60_000,
  });
  const path = usePathname();
  const tab = useSearchParams().get("tab");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const handle = me && !me.isGuest ? me.handle : null;
  const ownProfile = handle ? profilePath(handle) : null;
  const current =
    ownProfile && path === ownProfile
      ? tab === "badges"
        ? "badges"
        : tab === "activity"
          ? "matches"
          : "profile"
      : path === "/"
        ? "home"
        : // a page under a section marks the section (a character's sheet)
          ([CHARACTERS, WORKSHOP].find((root) => path.startsWith(`${root}/`)) ??
          path);

  const groups: { key: GroupKey; items: Item[]; games?: boolean }[] = [
    {
      key: "play",
      games: true,
      items: [
        { key: "home", href: "/", Icon: House },
        {
          key: "rooms",
          href: ROOMS,
          Icon: LayoutGrid,
          meta: t("meta.rooms", { n: rooms.length }),
        },
        { key: "newRoom", href: NEW_ROOM, Icon: Plus },
      ],
    },
    {
      key: "you",
      items: [
        { key: "profile", href: ownProfile ?? "/profile", Icon: UserRound },
        ...(ownProfile
          ? ([
              {
                key: "badges",
                href: `${ownProfile}?tab=badges`,
                Icon: Trophy,
              },
              {
                key: "matches",
                href: `${ownProfile}?tab=activity`,
                Icon: Clock,
              },
            ] as const)
          : []),
        {
          key: "settings",
          href: SETTINGS,
          Icon: SlidersHorizontal,
          newUntil: "2026-11-08",
        },
      ],
    },
    {
      key: "library",
      items: [
        {
          key: "characters",
          href: CHARACTERS,
          Icon: GalleryVerticalEnd,
          meta: counts ? format.number(counts.characters) : undefined,
          newUntil: "2026-11-08",
        },
        {
          key: "workshop",
          href: WORKSHOP,
          Icon: Lightbulb,
          meta: counts?.voting
            ? t("meta.voting", { n: counts.voting })
            : undefined,
          newUntil: "2026-11-08",
        },
      ],
    },
    {
      key: "help",
      items: [
        {
          key: "howTo",
          href: HOW_TO_PLAY,
          Icon: CircleQuestionMark,
          newUntil: "2026-11-08",
        },
      ],
    },
  ];

  const keyOf = (item: Item) =>
    item.key === "profile" || item.key === "badges" || item.key === "matches"
      ? item.key
      : item.href;
  const needle = fold(q);
  const hits = (label: string, keys = "") =>
    !needle || fold(`${label} ${keys}`).includes(needle);
  const shown = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        hits(t(`items.${i.key}`), t(`keys.${i.key}`)),
      ),
      tiles: g.games ? OPEN_GAMES.filter((k) => hits(gameName(k))) : [],
    }))
    .filter((g) => g.items.length || g.tiles.length);
  const marked = picked ?? current;
  const today = new Date().toISOString().slice(0, 10);

  const rows = () =>
    Array.from(
      navRef.current?.querySelectorAll<HTMLElement>("[data-nav-row]") ?? [],
    );
  const pick = (key: string) => {
    setPicked(key);
    window.setTimeout(() => onOpenChange(false), CLOSE_AFTER);
  };
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") rows()[0]?.click();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      rows()[0]?.focus();
    }
    if (e.key === "Escape" && q) {
      e.preventDefault();
      e.stopPropagation();
      setQ("");
    }
  };
  const onNavKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const all = rows();
    const i = all.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const j = e.key === "ArrowDown" ? Math.min(all.length - 1, i + 1) : i - 1;
    if (j < 0) searchRef.current?.focus();
    else all[j].focus();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setQ("");
          setPicked(null);
        }
      }}
    >
      <Dialog.Trigger
        autoFocus={autoFocus}
        aria-label={t("open")}
        className={burgerClass}
      >
        <Bars open={open} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-300 ease-soft data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup
          initialFocus={searchRef}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(372px,88vw)] flex-col bg-surface text-ink shadow-pop outline-none transition-transform duration-[420ms] ease-soft data-ending-style:-translate-x-[104%] data-starting-style:-translate-x-[104%] data-ending-style:duration-[260ms] data-ending-style:ease-[cubic-bezier(0.4,0,1,1)]"
        >
          <Dialog.Title className="sr-only">{t("menu")}</Dialog.Title>
          {/* the logo where the page's is; the X floats above (after the popup) */}
          {/* room for the X and the logo, which stay put above the sliding menu */}
          <div className="h-[72px] shrink-0 sm:h-[88px] sm:short:h-[72px]" />
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-2 pb-3">
            <Stagger i={0}>
              {me ? (
                <MeCard onPick={() => pick("profile")} />
              ) : (
                <span className="mx-3 mb-2.5 block h-[76px] animate-pulse rounded-[20px] bg-sunken" />
              )}
            </Stagger>
            <Stagger i={1}>
              <label className="mx-3 mb-1.5 flex h-[42px] items-center gap-2.5 rounded-[14px] border border-line-strong bg-surface px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
                <Search
                  className="size-[18px] text-ink-muted"
                  strokeWidth={1.75}
                />
                <span className="sr-only">{t("searchLabel")}</span>
                <input
                  ref={searchRef}
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onSearchKey}
                  placeholder={t("search")}
                  autoComplete="off"
                  className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
                />
              </label>
            </Stagger>
            <LayoutMotion>
              {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys walk the rows */}
              <div ref={navRef} onKeyDown={onNavKey} className="px-3">
                {shown.map((g, gi) => (
                  <Stagger key={g.key} i={gi + 2}>
                    <div className="flex flex-col gap-0.5 py-1">
                      <div className="px-3 pt-3 pb-1.5 font-semibold text-[11.5px] text-ink-muted uppercase tracking-[0.09em]">
                        {t(`groups.${g.key}`)}
                      </div>
                      {g.items.map((item) => {
                        const key = keyOf(item);
                        return (
                          <Row
                            key={key}
                            item={item}
                            label={t(`items.${item.key}`)}
                            marked={marked === key}
                            fresh={!!item.newUntil && today < item.newUntil}
                            newLabel={t("new")}
                            onPick={() => pick(key)}
                          />
                        );
                      })}
                      {g.tiles.length ? (
                        <div className="grid grid-cols-3 gap-2 pt-1 pb-1.5">
                          {g.tiles.map((game) => (
                            <Tile
                              key={game}
                              game={game}
                              name={gameName(game)}
                              marked={marked === GAME_PATHS[game]}
                              onPick={() => pick(GAME_PATHS[game])}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Stagger>
                ))}
                {shown.length === 0 ? (
                  <p className="px-3 py-4 text-[14px] text-ink-muted">
                    {t("empty", { q: q.trim() })}
                  </p>
                ) : null}
              </div>
            </LayoutMotion>
          </div>
        </Dialog.Popup>
        {/*
          the page's bars and logo, in their spots (laid out as the top bar),
          over the menu as it slides in: the bars fold into an X
        */}
        <div className="pointer-events-none fixed top-0 left-0 z-50 flex items-center gap-2 px-4 pt-4 sm:gap-4 sm:px-8 sm:pt-6 sm:short:pt-4 [&>*]:pointer-events-auto">
          <Dialog.Close aria-label={t("close")} className={burgerClass}>
            <Bars open={open} unfoldsIn />
          </Dialog.Close>
          <Link
            href="/"
            onClick={() => pick("home")}
            className="flex rounded-sm"
          >
            <Logo className="h-8 w-auto max-sm:h-7" />
          </Link>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Slides in from the left, one block after the other. */
function Stagger({ i, children }: { i: number; children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.46, ease: ease.soft, delay: i * 0.038 + 0.06 }}
    >
      {children}
    </m.div>
  );
}

/** The marker behind the current row, gliding to the one picked. */
function Marker() {
  return (
    <m.span
      layoutId="nav-marker"
      aria-hidden="true"
      transition={{ duration: 0.38, ease: ease.soft }}
      className="-z-10 absolute inset-0 rounded-[14px] bg-sky-soft"
    />
  );
}

function Row({
  item,
  label,
  marked,
  fresh,
  newLabel,
  onPick,
}: {
  item: Item;
  label: string;
  marked: boolean;
  fresh: boolean;
  newLabel: string;
  onPick: () => void;
}) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      scroll={item.key !== "badges" && item.key !== "matches"}
      data-nav-row
      aria-current={marked ? "page" : undefined}
      onClick={(e) => {
        onPick();
        if (item.href.startsWith("/u/")) asPage(e);
      }}
      className={cn(
        "relative isolate flex h-11 w-full items-center gap-3 rounded-[14px] px-3 text-left font-medium text-[15px] outline-none transition-colors duration-150 ease-soft focus-visible:outline-3 focus-visible:outline-sky",
        marked ? "font-bold" : "hover:bg-sunken/75",
      )}
    >
      {marked ? <Marker /> : null}
      <Icon
        className={cn(
          "size-5 shrink-0 transition-colors duration-150",
          marked ? "text-sky" : "text-ink-muted",
        )}
        strokeWidth={1.75}
      />
      <span className="min-w-0 truncate">{label}</span>
      {fresh ? (
        <span className="ml-auto inline-flex h-[18px] shrink-0 items-center rounded-pill bg-ink px-[7px] font-bold text-[10px] text-on-ink uppercase tracking-[0.06em]">
          {newLabel}
        </span>
      ) : null}
      {item.meta ? (
        <span
          className={cn(
            "shrink-0 font-medium font-mono text-[12px] text-ink-muted",
            fresh ? "ml-2" : "ml-auto",
          )}
        >
          {item.meta}
        </span>
      ) : null}
    </Link>
  );
}

function Tile({
  game,
  name,
  marked,
  onPick,
}: {
  game: GameKey;
  name: string;
  marked: boolean;
  onPick: () => void;
}) {
  return (
    <Link
      href={GAME_PATHS[game]}
      data-nav-row
      aria-current={marked ? "page" : undefined}
      onClick={onPick}
      className="group/tile flex flex-col gap-1.5 rounded-[12px] font-bold font-display text-[12.5px] leading-[1.15] outline-none focus-visible:outline-3 focus-visible:outline-sky"
    >
      <span
        className={cn(
          "block overflow-hidden rounded-[12px] transition-[translate,box-shadow] duration-150 ease-soft group-hover/tile:-translate-y-0.5",
          marked && "shadow-[0_0_0_3px_var(--sky)]",
        )}
      >
        <GameThumb game={game} size="fill" />
      </span>
      <span className="px-0.5">{name}</span>
    </Link>
  );
}

/** Who you are, at the top: an account's face, level and XP; a guest's way in. */
function MeCard({ onPick }: { onPick: () => void }) {
  const t = useTranslations("nav");
  const name = useDisplayName();
  const { me } = useMe();
  const { signIn, pending } = useSignIn();
  const account = !!me && !me.isGuest;
  const { data: card } = usePlayerCard(me?.id ?? "", account);
  if (!me) return null;
  if (me.isGuest)
    return (
      <div className="mx-3 mb-2.5 flex flex-col gap-2.5 rounded-[20px] bg-sunken p-3">
        <div className="flex flex-col gap-0.5">
          <b className="font-bold text-[15px] leading-tight">
            {t("guest.title")}
          </b>
          <small className="text-[12.5px] text-ink-muted">
            {t("guest.hint")}
          </small>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["discord", "google"] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              disabled={pending}
              onClick={() => signIn(provider)}
              className={buttonClass("secondary", "sm", "w-full")}
            >
              <ProviderLogo provider={provider} />
              {PROVIDER_NAME[provider]}
            </button>
          ))}
        </div>
      </div>
    );
  const xp = card?.numbers?.xp ?? 0;
  const { into, need } = levelOf(xp);
  return (
    <div
      style={accentStyle(card?.accent ?? null, me.avatar.color)}
      className="mx-3 mb-2.5 flex flex-col rounded-[20px] bg-sunken"
    >
      <Link
        href={me.handle ? profilePath(me.handle) : "/profile"}
        onClick={(e) => {
          onPick();
          if (me.handle) asPage(e);
        }}
        className="group flex items-center gap-3 rounded-[20px] p-3 pb-2 text-left outline-none focus-visible:outline-3 focus-visible:outline-sky"
      >
        <LevelAvatar
          avatar={me.avatar}
          xp={xp}
          stroke={3}
          tag="sm"
          on="sunken"
          avatarClass="size-[42px] text-lg"
        />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <b className="truncate font-bold text-[15px] leading-tight underline-offset-2 group-hover:underline">
            {name(meNamed(me))}
          </b>
          {me.handle ? (
            <small className="truncate text-[12.5px] text-ink-muted">
              {t("me", { handle: me.handle, into, need })}
            </small>
          ) : null}
        </span>
      </Link>
      <SignOut />
    </div>
  );
}

/** Sign out, at the account card's bottom right. */
function SignOut() {
  const t = useTranslations("nav");
  const { refresh } = useMe();
  const router = useRouter();
  const { run, pending } = useAction();
  const leave = async () => {
    if ((await run(() => signOut())).ok) {
      await refresh();
      router.push("/");
    }
  };
  return (
    <button
      type="button"
      disabled={pending}
      onClick={leave}
      className="mr-2 mb-2 inline-flex h-8 items-center gap-1.5 self-end rounded-pill px-3 font-semibold text-[13px] text-ink-muted transition-colors duration-150 ease-soft hover:bg-no-soft hover:text-no disabled:opacity-45"
    >
      <LogOut className="size-3.5" strokeWidth={2} />
      {t("signOut")}
    </button>
  );
}
