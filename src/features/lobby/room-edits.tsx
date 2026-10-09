"use client";

import { Popover } from "@base-ui/react/popover";
import {
  ChevronDown,
  Clock,
  Gavel,
  Globe,
  Heart,
  Lock,
  type LucideIcon,
  Mail,
  PenLine,
  Tv,
  UsersRound,
  VenetianMask,
  Vote,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useLineupCount } from "@/features/create/lineup-catalog";
import {
  AuctionFields,
  type AuctionRules,
  HeavySwitch,
  MissionCountLine,
} from "@/features/create/lineup-fields";
import { SecondsField, Segmented } from "@/features/create/settings-fields";
import { TasteGrid, ThemeCountLine } from "@/features/create/taste-fields";
import { useThemeCount } from "@/features/create/theme-catalog";
import { ImpostorsPicker } from "@/features/impostor/impostors-picker";
import { GAME_SEATS, type GameKey } from "@/game/games";
import { impostorsFor } from "@/game/impostor/engine";
import { HOST_MIN_PEOPLE, lotsFor, roundsFor } from "@/game/lineup/rules";
import { TASTES, type Taste } from "@/game/tastes";
import {
  GAME_STEP_TIMES,
  ROOM_NAME_MAX,
  ROOM_PASSWORD_MAX,
  type RoomSettings,
  type StepTime,
} from "@/game/types";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/names";

/**
 * The room's name as the page's title. The host gets a quiet pencil beside it:
 * the title turns into a field in place, Enter or leaving it saves, Esc puts
 * it back. An empty name is not kept.
 */
export function RoomTitle({
  title,
  name,
  editable,
  className,
  onRename,
}: {
  /** What the page shows: the name, or "<host>'s room" when there is none. */
  title: string;
  name: string;
  editable: boolean;
  className: string;
  onRename: (name: string) => void;
}) {
  const t = useTranslations("lobby");
  const tc = useTranslations("home.createRoom");
  const [draft, setDraft] = useState<string | null>(null);
  const done = () => {
    const next = draft?.trim() ?? "";
    setDraft(null);
    if (next && next !== (name || title)) onRename(next);
  };

  if (draft !== null)
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          done();
        }}
      >
        <input
          // biome-ignore lint/a11y/noAutofocus: it opens on the host's own click
          autoFocus
          aria-label={tc("roomName")}
          value={draft}
          maxLength={ROOM_NAME_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={done}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDraft(null);
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            className,
            "-mx-1 w-full rounded-sm bg-transparent px-1 shadow-[inset_0_-3px_0_var(--sky)] outline-none!",
          )}
        />
      </form>
    );

  return (
    <h1 className={cn(className, "wrap-break-word")}>
      {title}
      {editable ? (
        <button
          type="button"
          aria-label={t("rename")}
          onClick={() => setDraft(name || title)}
          className="ml-2 inline-flex size-10 translate-y-[-0.1em] items-center justify-center rounded-pill align-middle text-ink-muted transition-colors duration-200 ease-soft hover:bg-surface hover:text-ink"
        >
          <PenLine className="size-5" strokeWidth={2} />
        </button>
      ) : null}
    </h1>
  );
}

/**
 * A settings row of the lobby's card: its icon and what it says. The host's
 * row opens a dropdown with a small form under it; Save keeps the draft,
 * Cancel or closing drops it.
 */
function EditRow({
  icon,
  text,
  label,
  editable,
  pending,
  width = "380px",
  canSave = true,
  onOpen,
  onSave,
  children,
}: {
  icon: ReactNode;
  text: ReactNode;
  /** What opening the row does, for screen readers ("Change who can join"). */
  label: string;
  editable: boolean;
  pending: boolean;
  width?: string;
  canSave?: boolean;
  /** Puts the draft back to the room's settings. */
  onOpen: () => void;
  onSave: () => Promise<boolean>;
  children: ReactNode;
}) {
  const t = useTranslations("lobby");
  const [open, setOpen] = useState(false);
  if (!editable)
    return (
      <li className="flex items-center gap-3 px-2 py-2.5">
        {icon}
        <span className="min-w-0">{text}</span>
      </li>
    );
  return (
    <li>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) onOpen();
        }}
      >
        <Popover.Trigger
          aria-label={label}
          className={cn(
            // the whole row, top to bottom, with a hair of space so its highlight sits just inside the lines around it
            "group/row flex w-full items-center gap-3 self-stretch px-2 py-2.5 text-left transition-colors duration-200 ease-soft hover:bg-sunken",
            open && "bg-sunken",
          )}
        >
          {icon}
          <span className="min-w-0 flex-1">{text}</span>
          <ChevronDown
            className={cn(
              "size-4.5 shrink-0 text-ink-muted transition-transform duration-200 ease-soft",
              open && "rotate-180",
            )}
            strokeWidth={2.25}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            className="z-50"
          >
            <Popover.Popup
              style={{ width: `min(${width}, calc(100vw - 2rem))` }}
              className="origin-(--transform-origin) rounded-md bg-surface p-4 shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0"
            >
              <form
                className="flex flex-col gap-4"
                onSubmit={async (e: FormEvent) => {
                  e.preventDefault();
                  if (canSave && (await onSave())) setOpen(false);
                }}
              >
                {children}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!canSave || pending}
                  >
                    {t("saveSettings")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </li>
  );
}

const rowIcon = (Icon: LucideIcon) => (
  <Icon className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
);

/**
 * Who can join; the host's row makes the room public or private (with its
 * password).
 */
export function VisibilityRow({
  settings,
  editable,
  pending,
  onSave,
}: {
  settings: Pick<RoomSettings, "visibility" | "password">;
  editable: boolean;
  pending: boolean;
  onSave: (
    v: Pick<RoomSettings, "visibility" | "password">,
  ) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const tc = useTranslations("home.createRoom");
  const [draft, setDraft] = useState(settings);
  const isPublic = settings.visibility === "public";
  const missing = draft.visibility === "private" && !draft.password.trim();
  return (
    <EditRow
      icon={rowIcon(isPublic ? Globe : Lock)}
      text={
        <>
          {/* the password itself is never shown, not even to the host */}
          {t(isPublic ? "public" : "private")}
        </>
      }
      label={t("editVisibility")}
      editable={editable}
      pending={pending}
      width="320px"
      canSave={!missing}
      onOpen={() => setDraft(settings)}
      onSave={() =>
        onSave({
          visibility: draft.visibility,
          password: draft.visibility === "private" ? draft.password.trim() : "",
        })
      }
    >
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">{tc("visibility")}</span>
        <Segmented
          label={tc("visibility")}
          options={["public", "private"] as const}
          value={draft.visibility}
          onChange={(visibility) => setDraft((d) => ({ ...d, visibility }))}
          render={(v) => tc(v)}
        />
      </div>
      {draft.visibility === "private" ? (
        <TextField
          secret
          label={tc("password")}
          placeholder={tc("passwordPlaceholder")}
          value={draft.password}
          max={ROOM_PASSWORD_MAX}
          autoComplete="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          aria-invalid={missing}
          onChange={(e) =>
            setDraft((d) => ({ ...d, password: e.target.value }))
          }
        />
      ) : null}
    </EditRow>
  );
}

/**
 * How many can sit: the host picks it among what the game allows, never
 * under the people already seated.
 */
export function SeatsRow({
  game,
  seats,
  seated,
  editable,
  pending,
  onSave,
}: {
  game: GameKey;
  seats: number;
  seated: number;
  editable: boolean;
  pending: boolean;
  onSave: (seats: number) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const [draft, setDraft] = useState(seats);
  const { min, max } = GAME_SEATS[game];
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <EditRow
      icon={rowIcon(UsersRound)}
      text={t("seats", { seats })}
      label={t("editSeats")}
      editable={editable}
      pending={pending}
      width="340px"
      onOpen={() => setDraft(seats)}
      onSave={() => onSave(draft)}
    >
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">{t("seatsTitle")}</span>
        <Segmented
          label={t("seatsTitle")}
          options={options}
          value={draft}
          onChange={setDraft}
          render={String}
          disabled={(n) => n < seated}
          className="self-stretch [&>button]:flex-1 [&>button]:px-0"
        />
        {/* the table: who sits now, and the seats left */}
        <span className="flex flex-wrap gap-1 pt-1" aria-hidden>
          {Array.from({ length: draft }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: one per seat
              key={i}
              className={cn(
                "size-3.5 rounded-pill",
                i < seated
                  ? "bg-sky"
                  : "border-[1.5px] border-line-strong border-dashed",
              )}
            />
          ))}
        </span>
        <span className="text-[13px] text-ink-muted">
          {t("seatsNow", { n: seated })}
        </span>
      </div>
    </EditRow>
  );
}

/** The match's clocks, step by step; the host's row sets each one. */
export function TimesRow({
  settings,
  editable,
  pending,
  onSave,
}: {
  settings: Pick<RoomSettings, "game" | StepTime>;
  editable: boolean;
  pending: boolean;
  onSave: (times: Partial<Pick<RoomSettings, StepTime>>) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const steps = GAME_STEP_TIMES[settings.game];
  const pick = () =>
    Object.fromEntries(steps.map((s) => [s, settings[s]])) as Partial<
      Pick<RoomSettings, StepTime>
    >;
  const [draft, setDraft] = useState(pick);
  return (
    <EditRow
      icon={rowIcon(Clock)}
      text={
        <>
          <span className="sr-only">{t("timesLabel")}: </span>
          {/* the match's steps in order, each with its clock */}
          <span className="flex flex-wrap gap-1.5">
            {steps.map((step) => (
              <span
                key={step}
                className="inline-flex items-baseline gap-1.5 rounded-sm bg-sunken px-2 py-0.5 text-sm transition-colors duration-200 ease-soft group-hover/row:bg-surface group-aria-expanded/row:bg-surface"
              >
                {t(`times.${step}`)}
                <span className="font-medium font-mono text-[13px] tabular-nums">
                  {formatClock(settings[step])}
                </span>
              </span>
            ))}
          </span>
        </>
      }
      label={t("editTimes")}
      editable={editable}
      pending={pending}
      width="460px"
      onOpen={() => setDraft(pick())}
      onSave={() => onSave(draft)}
    >
      <span className="font-semibold text-sm">{t("timesLabel")}</span>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {steps.map((step) => (
          <SecondsField
            key={step}
            step={step}
            value={draft[step] ?? settings[step]}
            onChange={(n) => setDraft((d) => ({ ...d, [step]: n }))}
          />
        ))}
      </div>
    </EditRow>
  );
}

/** "Who am I?": everyone votes the theme, or the host types it. */
export function ThemeModeRow({
  value,
  editable,
  pending,
  onSave,
}: {
  value: RoomSettings["themeMode"];
  editable: boolean;
  pending: boolean;
  onSave: (themeMode: RoomSettings["themeMode"]) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const tc = useTranslations("home.createRoom");
  const [draft, setDraft] = useState(value);
  return (
    <EditRow
      icon={rowIcon(value === "host" ? PenLine : Vote)}
      text={t(value === "host" ? "themeHost" : "themeVote")}
      label={t("editThemeMode")}
      editable={editable}
      pending={pending}
      width="340px"
      onOpen={() => setDraft(value)}
      onSave={() => onSave(draft)}
    >
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">{tc("themeMode")}</span>
        <Segmented
          label={tc("themeMode")}
          options={["vote", "host"] as const}
          value={draft}
          onChange={setDraft}
          render={(v) => tc(v === "host" ? "themeHost" : "themeVote")}
        />
      </div>
    </EditRow>
  );
}

/**
 * The room's tastes: every emoji, the ones switched off faded, and how many
 * themes they leave; the host's row switches them.
 */
export function TastesRow({
  settings,
  editable,
  pending,
  onSave,
}: {
  settings: Pick<RoomSettings, "game" | "offTastes" | "offThemes">;
  editable: boolean;
  pending: boolean;
  onSave: (v: Pick<RoomSettings, "offTastes">) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const tc = useTranslations("home.createRoom");
  const tg = useTranslations("common.tastes");
  const [draft, setDraft] = useState<Taste[]>(settings.offTastes);
  const themes = useThemeCount(settings);
  const draftThemes = useThemeCount({ ...settings, offTastes: draft });
  // What for? counts the characters its auction draws from instead
  const cards = useLineupCount(settings);
  const draftCards = useLineupCount({ ...settings, offTastes: draft });
  const count = cards
    ? { tooFew: cards.tooFew, text: t("cardsCount", { count: cards.cards }) }
    : themes
      ? { tooFew: themes.tooFew, text: t("themeCount", { count: themes.on }) }
      : null;
  const on = TASTES.filter((g) => !settings.offTastes.includes(g.key));
  return (
    <EditRow
      icon={rowIcon(Heart)}
      text={
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="sr-only">
            {`${tc("tastes")}: ${on.map((g) => tg(`${g.key}.name`)).join(", ")}`}
          </span>
          <span aria-hidden className="flex gap-0.5 text-[17px] leading-none">
            {TASTES.map((g) => (
              <span
                key={g.key}
                className={cn(
                  "transition-[filter,opacity] duration-200",
                  settings.offTastes.includes(g.key) && "opacity-30 grayscale",
                )}
              >
                {g.emoji}
              </span>
            ))}
          </span>
          {count ? (
            <span
              className={cn(
                "text-sm tabular-nums",
                count.tooFew ? "text-no" : "text-ink-muted",
              )}
            >
              {count.text}
            </span>
          ) : null}
        </span>
      }
      label={t("editTastes")}
      editable={editable}
      pending={pending}
      canSave={!(draftThemes?.tooFew || draftCards?.tooFew)}
      onOpen={() => setDraft(settings.offTastes)}
      onSave={() => onSave({ offTastes: draft })}
    >
      <span className="font-semibold text-sm">{tc("tastes")}</span>
      <TasteGrid off={draft} onChange={setDraft} compact />
      <ThemeCountLine room={{ ...settings, offTastes: draft }} />
    </EditRow>
  );
}

/**
 * The Impostor's impostors: how many (or "automatic", with how far it goes
 * for the room's seats); the host's row opens the picker.
 */
export function ImpostorsRow({
  value,
  seats,
  players,
  editable,
  pending,
  onSave,
}: {
  value: number | null;
  seats: number;
  players: number;
  editable: boolean;
  pending: boolean;
  onSave: (impostors: number | null) => Promise<boolean>;
}) {
  const t = useTranslations("impostor.picker");
  const [draft, setDraft] = useState(value);
  const most = impostorsFor(Math.max(GAME_SEATS.impostor.min, seats), value);
  return (
    <EditRow
      icon={rowIcon(VenetianMask)}
      text={
        <span>
          {value === null
            ? t("upTo", { count: most })
            : t("row", { count: most })}
          {value === null ? (
            <span className="text-ink-muted"> · {t("autoShort")}</span>
          ) : null}
        </span>
      }
      label={t("edit")}
      editable={editable}
      pending={pending}
      onOpen={() => setDraft(value)}
      onSave={() => onSave(draft)}
    >
      <ImpostorsPicker
        value={draft}
        seats={seats}
        players={players}
        onChange={setDraft}
      />
    </EditRow>
  );
}

/**
 * What for?'s auction: coins, lots and rounds for the table as it sits now;
 * the host's row sets them, the break and trades.
 */
export function AuctionRow({
  settings,
  players,
  editable,
  pending,
  onSave,
}: {
  settings: AuctionRules & Pick<RoomSettings, "seats">;
  /** People seated now: the lots and the automatic rounds follow them. */
  players: number;
  editable: boolean;
  pending: boolean;
  onSave: (v: AuctionRules) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const pick = (): AuctionRules => ({
    coins: settings.coins,
    lotsPerSeat: settings.lotsPerSeat,
    rounds: settings.rounds,
    interval: settings.interval,
    trades: settings.trades,
  });
  const [draft, setDraft] = useState(pick);
  const table = Math.max(GAME_SEATS.lineup.min, players);
  return (
    <EditRow
      icon={rowIcon(Gavel)}
      text={t("auctionRow", {
        coins: settings.coins,
        lots: lotsFor(table, settings.lotsPerSeat),
        rounds: roundsFor(table, settings.rounds),
      })}
      label={t("editAuction")}
      editable={editable}
      pending={pending}
      width="400px"
      onOpen={() => setDraft(pick())}
      onSave={() => onSave(draft)}
    >
      <AuctionFields value={draft} onChange={setDraft} compact />
    </EditRow>
  );
}

/**
 * What for?'s missions: how many the rounds draw from, and whether heavy ones
 * are in; the host's row switches those (each mission is in the advanced
 * settings).
 */
export function MissionsRow({
  settings,
  editable,
  pending,
  onSave,
}: {
  settings: Pick<RoomSettings, "heavy" | "offMissions">;
  editable: boolean;
  pending: boolean;
  onSave: (v: Pick<RoomSettings, "heavy">) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const [heavy, setHeavy] = useState(settings.heavy);
  const count = useLineupCount({ game: "lineup", offTastes: [], ...settings });
  return (
    <EditRow
      icon={rowIcon(Mail)}
      text={
        <span>
          {count ? t("missionsRow", { count: count.missions }) : "…"}
          {settings.heavy ? null : (
            <span className="text-ink-muted"> · {t("noHeavy")}</span>
          )}
        </span>
      }
      label={t("editMissions")}
      editable={editable}
      pending={pending}
      width="340px"
      onOpen={() => setHeavy(settings.heavy)}
      onSave={() => onSave({ heavy })}
    >
      <HeavySwitch value={heavy} onChange={setHeavy} />
      <MissionCountLine room={{ heavy, offMissions: settings.offMissions }} />
    </EditRow>
  );
}

/**
 * What for?'s mode: everyone plays, or one presents (picks the mission and
 * the lots, gives the verdict) and the others play. A presenter needs three
 * seats or more.
 */
export function ModeRow({
  value,
  seats,
  editable,
  pending,
  onSave,
}: {
  value: RoomSettings["mode"];
  seats: number;
  editable: boolean;
  pending: boolean;
  onSave: (mode: RoomSettings["mode"]) => Promise<boolean>;
}) {
  const t = useTranslations("lobby");
  const [draft, setDraft] = useState(value);
  const few = seats < HOST_MIN_PEOPLE;
  return (
    <EditRow
      icon={rowIcon(Tv)}
      text={t(value === "host" ? "modeHost" : "modeAll")}
      label={t("editMode")}
      editable={editable}
      pending={pending}
      width="360px"
      onOpen={() => setDraft(value)}
      onSave={() => onSave(draft)}
    >
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">{t("modeTitle")}</span>
        <Segmented
          label={t("modeTitle")}
          options={["classic", "host"] as const}
          value={draft}
          onChange={setDraft}
          render={(v) => t(v === "host" ? "modeHost" : "modeAll")}
          disabled={(v) => v === "host" && few}
        />
        <p className="m-0 text-[13px] text-ink-muted">
          {few ? t("modeNeeds3") : t("modeHint")}
        </p>
      </div>
    </EditRow>
  );
}
