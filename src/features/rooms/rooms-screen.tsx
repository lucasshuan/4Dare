"use client";

import { Select } from "@base-ui/react/select";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  EyeOff,
  Globe,
  Languages,
  Layers,
  Lock,
  Search,
  X,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Flag } from "@/components/ui/language-switch";
import { Screen } from "@/components/ui/screen";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { MatchGate } from "@/features/current-match/match-lock";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import {
  DEFAULT_GAME,
  type GameKey,
  isGameKey,
  OPEN_GAMES,
} from "@/game/games";
import { GOSTO_KEYS, GOSTOS, type Gosto } from "@/game/gostos";
import { LANGS, type Lang } from "@/game/types";
import { Link } from "@/i18n/navigation";
import { ease, riseIn } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { GAMES, newRoom } from "@/lib/routes";
import { RoomRow, sortRooms } from "./room-row";

export type Access = "all" | "public" | "private";

export interface RoomFilters {
  /** null: every game. */
  game: GameKey | null;
  /** The room's name as listed ("<host>'s room" when it has none); empty: no search. */
  q: string;
  access: Access;
  /** The host's languages to show; null: every language. By default only the viewer's. */
  langs: Lang[] | null;
  /** Rooms with any of these gostos on stay out. */
  hide: Gosto[];
}

/** Case- and accent-insensitive, so "joao" finds "João". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** The filters as the link carries them: only what differs from the defaults. */
function toSearch({ game, q, access, langs, hide }: RoomFilters, locale: Lang) {
  const params = new URLSearchParams();
  if (game) params.set("game", game);
  if (q.trim()) params.set("q", q.trim());
  if (access !== "all") params.set("access", access);
  if (!langs) params.set("lang", "all");
  else if (langs.join() !== locale) params.set("lang", langs.join());
  if (hide.length) params.set("hide", hide.join());
  const s = params.toString();
  return s ? `?${s}` : "";
}

/**
 * The filters a link carries (?game=who-am-i&q=crew&access=private&lang=pt,ja&hide=real),
 * each optional. `lang` is "all" or languages separated by commas; anything
 * else means the viewer's. `hide` is gostos separated by commas.
 */
function fromSearch(search: string, locale: Lang): RoomFilters {
  const sp = new URLSearchParams(search);
  const game = sp.get("game");
  const access = sp.get("access");
  const lang = sp.get("lang");
  const picked = LANGS.filter((l) => lang?.split(",").includes(l));
  const hide = sp.get("hide")?.split(",") ?? [];
  return {
    game: isGameKey(game) ? game : null,
    q: (sp.get("q") ?? "").slice(0, 50),
    access: access === "public" || access === "private" ? access : "all",
    langs: lang === "all" ? null : picked.length ? picked : [locale],
    hide: GOSTO_KEYS.filter((g) => hide.includes(g)),
  };
}

/** /rooms: every listed room, filtered by game, a search, language and who can join. The filters live in the link. */
export function RoomsScreen() {
  const t = useTranslations("home.roomsPage");
  const locale = useLocale() as Lang;
  const tr = useTranslations("home.rooms");
  const name = useDisplayName();
  const { rooms, isLoading } = usePublicRooms();
  const { match } = useCurrentMatch();
  // The page is static: it starts with no filter, then takes the link's.
  const [filters, setFilters] = useState(() => fromSearch("", locale));
  const [linked, setLinked] = useState(false);
  const set = (patch: Partial<RoomFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  useEffect(() => {
    setFilters(fromSearch(window.location.search, locale));
    setLinked(true);
  }, [locale]);

  // A reload or a shared link opens the same filters.
  useEffect(() => {
    if (!linked) return;
    const next = `${window.location.pathname}${toSearch(filters, locale)}`;
    window.history.replaceState(null, "", next);
  }, [linked, filters, locale]);

  const shown = useMemo(() => {
    const q = fold(filters.q);
    return sortRooms(
      rooms.filter(
        (r) =>
          (!filters.game || r.game === filters.game) &&
          (filters.access === "all" ||
            (filters.access === "private") === r.locked) &&
          (!filters.langs || filters.langs.includes(r.host.lang)) &&
          filters.hide.every((g) => r.offGostos.includes(g)) &&
          (!q ||
            fold(r.name || tr("roomOf", { name: name(r.host) })).includes(q)),
      ),
    );
  }, [rooms, filters, name, tr]);
  const open = shown.filter((r) => r.status === "open").length;
  const filtered = !!(
    filters.game ||
    filters.q.trim() ||
    filters.access !== "all" ||
    filters.langs ||
    filters.hide.length
  );

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <div className="flex flex-col gap-6">
        <m.div {...riseIn} className="flex flex-col gap-4">
          <Link
            href={GAMES}
            className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            {t("back")}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
                {t("title")}
              </h1>
              <p className="font-medium text-ink-muted" aria-live="polite">
                {isLoading ? " " : t("count", { count: shown.length, open })}
              </p>
            </div>
            <Link
              href={newRoom(filters.game ?? DEFAULT_GAME)}
              inert={match ? true : undefined}
              className={buttonClass(
                "primary",
                "md",
                match ? "pointer-events-none opacity-35" : undefined,
              )}
            >
              {t("create")}
            </Link>
          </div>
        </m.div>

        <MatchGate className="flex flex-col gap-6">
          <Filters filters={filters} set={set} />

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[76px] animate-pulse rounded-lg bg-surface"
                />
              ))}
            </div>
          ) : shown.length ? (
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false} mode="popLayout">
                {shown.map((r) => (
                  <RoomRow
                    key={r.code}
                    room={r}
                    showGame
                    className="bg-surface shadow-card"
                  />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <m.div
              {...riseIn}
              className="flex flex-col items-center gap-4 rounded-xl border-[1.5px] border-line-strong border-dashed px-6 py-12 text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-pill bg-sunken text-ink-muted">
                <Search className="size-6" strokeWidth={1.75} />
              </span>
              <p className="max-w-sm text-ink-muted">
                {filtered ? t("emptyFiltered") : t("empty")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {filtered ? (
                  <button
                    type="button"
                    onClick={() =>
                      set({
                        game: null,
                        q: "",
                        access: "all",
                        langs: null,
                        hide: [],
                      })
                    }
                    className={buttonClass("secondary", "sm")}
                  >
                    {t("clearFilters")}
                  </button>
                ) : null}
                <Link
                  href={newRoom(filters.game ?? DEFAULT_GAME)}
                  className={buttonClass("primary", "sm")}
                >
                  {t("create")}
                </Link>
              </div>
            </m.div>
          )}
        </MatchGate>
      </div>
    </Screen>
  );
}

/** "all" stands for every game in the game select, and every language in the language one. */
const ALL_GAMES = "all";
const ALL_LANGS = "all";

function Filters({
  filters,
  set,
}: {
  filters: RoomFilters;
  set: (patch: Partial<RoomFilters>) => void;
}) {
  const t = useTranslations("home.roomsPage");
  const gameName = useGameName();
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.08, duration: 0.4, ease: ease.soft },
      }}
      className="flex flex-wrap gap-3 rounded-xl bg-surface p-4 shadow-card sm:p-5"
    >
      <label className="group flex h-13 min-w-64 flex-1 basis-full items-center gap-3 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 transition-colors focus-within:border-sky md:basis-0">
        <Search
          className="size-5 shrink-0 text-ink-muted transition-colors group-focus-within:text-sky"
          strokeWidth={1.75}
        />
        <span className="sr-only">{t("search")}</span>
        <input
          type="search"
          value={filters.q}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => set({ q: e.target.value })}
          className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-ink-muted focus-visible:outline-none! [&::-webkit-search-cancel-button]:hidden"
        />
        <AnimatePresence>
          {filters.q ? (
            <m.button
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              aria-label={t("clearSearch")}
              onClick={() => set({ q: "" })}
              className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-sunken text-ink-muted hover:text-ink"
            >
              <X className="size-4" strokeWidth={2} />
            </m.button>
          ) : null}
        </AnimatePresence>
      </label>

      <FilterSelect
        label={t("game")}
        value={filters.game ?? ALL_GAMES}
        onChange={(g) => set({ game: g === ALL_GAMES ? null : (g as GameKey) })}
        options={[
          {
            value: ALL_GAMES,
            label: t("allGames"),
            icon: <Layers className="size-4" strokeWidth={1.75} />,
          },
          ...OPEN_GAMES.map((g) => ({
            value: g,
            label: gameName(g),
            icon: <GameThumb game={g} size="xs" />,
          })),
        ]}
      />
      <LangSelect value={filters.langs} onChange={(langs) => set({ langs })} />
      <HideSelect value={filters.hide} onChange={(hide) => set({ hide })} />
      <FilterSelect
        label={t("access")}
        value={filters.access}
        onChange={(a) => set({ access: a as Access })}
        options={[
          {
            value: "all",
            label: t("accessOptions.all"),
            icon: <Layers className="size-4" strokeWidth={1.75} />,
          },
          {
            value: "public",
            label: t("accessOptions.public"),
            icon: <Globe className="size-4" strokeWidth={1.75} />,
          },
          {
            value: "private",
            label: t("accessOptions.private"),
            icon: <Lock className="size-4" strokeWidth={1.75} />,
          },
        ]}
      />
    </m.div>
  );
}

/** The filter selects' parts, alike in every one. */
const TRIGGER =
  "flex h-13 min-w-0 flex-1 items-center gap-2.5 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 text-left max-sm:px-3.5 font-semibold text-sm transition-[border-color,box-shadow] duration-200 ease-soft hover:border-ink-muted data-popup-open:border-sky md:w-52 md:flex-none";
const POPUP =
  "min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-lg bg-surface p-1.5 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0";
const ITEM =
  "flex items-center gap-2.5 rounded-md py-2 pr-3 pl-2.5 font-semibold text-sm outline-none select-none data-highlighted:bg-sky-soft";

/** Selected means hidden: shown gostos keep the blue fill, hidden ones fade. */
const HIDE_ITEM =
  "group flex items-center gap-2.5 rounded-md py-2 pr-3 pl-2.5 font-semibold text-sm outline-none select-none not-data-selected:bg-sky-soft data-selected:text-ink-muted data-highlighted:ring-2 data-highlighted:ring-sky/30 data-highlighted:ring-inset";

interface FilterOption {
  value: string;
  label: string;
  icon: ReactNode;
}

/** A filter as a select, as tall as the search beside it. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Select.Root
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
    >
      <Select.Trigger aria-label={label} className={TRIGGER}>
        <span className="flex shrink-0 text-ink-muted max-sm:hidden">
          {current.icon}
        </span>
        <Select.Value className="min-w-0 flex-1 truncate">
          {() => current.label}
        </Select.Value>
        <Select.Icon className="text-ink-muted">
          <ChevronDown className="size-4" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          align="end"
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <Select.Popup className={POPUP}>
            <Select.List>
              {options.map((o) => (
                <Select.Item key={o.value} value={o.value} className={ITEM}>
                  <span className="flex shrink-0 text-ink-muted">{o.icon}</span>
                  <Select.ItemText className="flex-1 whitespace-nowrap">
                    {o.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className="text-sky">
                    <Check className="size-4" strokeWidth={2.25} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

/**
 * The host's languages, several at once. "All languages" clears the picks;
 * dropping the last pick, or picking every language, comes back to it.
 */
function LangSelect({
  value,
  onChange,
}: {
  value: Lang[] | null;
  onChange: (langs: Lang[] | null) => void;
}) {
  const t = useTranslations("home.roomsPage");
  const tc = useTranslations("common");
  const items = [
    { value: ALL_LANGS, label: t("allLangs") },
    ...LANGS.map((l) => ({ value: l, label: tc(`languages.${l}`) })),
  ];
  const picked: string[] = value ?? [ALL_LANGS];
  return (
    <Select.Root
      multiple
      items={items}
      value={picked}
      onValueChange={(next) => {
        const langs = LANGS.filter((l) => next.includes(l));
        const all =
          (next.includes(ALL_LANGS) && !picked.includes(ALL_LANGS)) ||
          langs.length === 0 ||
          langs.length === LANGS.length;
        onChange(all ? null : langs);
      }}
    >
      <Select.Trigger aria-label={t("lang")} className={TRIGGER}>
        <span className="flex shrink-0 text-ink-muted max-sm:hidden">
          {value?.length === 1 ? (
            <Flag lang={value[0]} className="size-4" />
          ) : (
            <Languages className="size-4" strokeWidth={1.75} />
          )}
        </span>
        <Select.Value className="min-w-0 flex-1 truncate">
          {() =>
            value
              ? value.map((l) => tc(`languages.${l}`)).join(", ")
              : t("allLangs")
          }
        </Select.Value>
        <Select.Icon className="text-ink-muted">
          <ChevronDown className="size-4" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          align="end"
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <Select.Popup className={POPUP}>
            <Select.List>
              {items.map((o) => (
                <Select.Item key={o.value} value={o.value} className={ITEM}>
                  <span className="flex shrink-0 text-ink-muted">
                    {o.value === ALL_LANGS ? (
                      <Languages className="size-4" strokeWidth={1.75} />
                    ) : (
                      <Flag lang={o.value as Lang} className="size-4" />
                    )}
                  </span>
                  <Select.ItemText className="flex-1 whitespace-nowrap">
                    {o.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className="text-sky">
                    <Check className="size-4" strokeWidth={2.25} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

/** Gostos whose rooms stay out of the list, several at once; none: every room. */
function HideSelect({
  value,
  onChange,
}: {
  value: Gosto[];
  onChange: (hide: Gosto[]) => void;
}) {
  const t = useTranslations("home.roomsPage");
  const tg = useTranslations("common.gostos");
  return (
    <Select.Root
      multiple
      items={GOSTOS.map((g) => ({ value: g.key, label: tg(`${g.key}.name`) }))}
      value={value}
      onValueChange={(next) =>
        // one stays shown: hiding every gosto would hide every room
        onChange(
          next.length === GOSTO_KEYS.length
            ? value
            : GOSTO_KEYS.filter((g) => next.includes(g)),
        )
      }
    >
      <Select.Trigger aria-label={t("hide")} className={TRIGGER}>
        <span className="flex shrink-0 text-ink-muted max-sm:hidden">
          <EyeOff className="size-4" strokeWidth={1.75} />
        </span>
        <Select.Value className="min-w-0 flex-1 truncate">
          {() =>
            value.length
              ? t("hiding", {
                  gostos: GOSTOS.filter((g) => value.includes(g.key))
                    .map((g) => g.emoji)
                    .join(" "),
                })
              : t("hideNone")
          }
        </Select.Value>
        <Select.Icon className="text-ink-muted">
          <ChevronDown className="size-4" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          align="end"
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <Select.Popup className={POPUP}>
            <span className="block px-2.5 pt-1 pb-1.5 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.08em]">
              {t("hide")}
            </span>
            <Select.List className="flex flex-col gap-0.5">
              {GOSTOS.map((g) => (
                <Select.Item key={g.key} value={g.key} className={HIDE_ITEM}>
                  <span
                    aria-hidden
                    className="flex w-4 shrink-0 justify-center group-data-selected:opacity-40 group-data-selected:grayscale"
                  >
                    {g.emoji}
                  </span>
                  <Select.ItemText className="flex-1 whitespace-nowrap">
                    {tg(`${g.key}.name`)}
                  </Select.ItemText>
                  {value.includes(g.key) ? (
                    <EyeOff aria-hidden className="size-4" strokeWidth={2} />
                  ) : (
                    <Eye
                      aria-hidden
                      className="size-4 text-sky"
                      strokeWidth={2}
                    />
                  )}
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
