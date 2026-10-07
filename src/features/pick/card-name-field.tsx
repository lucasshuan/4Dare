"use client";

import { AnimatePresence, m } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Portrait } from "@/components/ui/portrait";
import {
  type CardContent,
  type CardEvent,
  type CardField,
  cardStep,
  cardText,
  closedField,
  exactMatch,
  matchRange,
  type SearchItem,
  searchMatches,
  thumbUrl,
  toSearchItem,
} from "@/game/character-search";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { gs } from "@/lib/motion";
import type { CharacterSearchResponse } from "@/server/contract";
import { useCharacterIndex } from "./use-character-index";

/** Rows in the list (spec B §4.2: "up to ~5"). */
const ROWS = 5;
/** The longest name a card takes. */
export const NAME_MAX = 60;

/** The list's open state, remembered for one content (any other content shows it closed). */
interface ListState {
  for: CardContent;
  rows: SearchItem[];
  highlight: number;
  open: boolean;
}

/** The name with the typed part in a <mark>. */
function Marked({ name, query }: { name: string; query: string }) {
  const range = matchRange(name, query);
  if (!range) return name;
  return (
    <>
      {name.slice(0, range[0])}
      <mark className="bg-transparent font-extrabold text-sky">
        {name.slice(range[0], range[1])}
      </mark>
      {name.slice(range[1])}
    </>
  );
}

/**
 * The card's name field, a combobox: every keystroke searches the in-browser
 * index (the server's search until it loads) and the list hangs from the
 * field. The card's content follows the typing (see `cardStep`).
 */
export function CardNameField({
  value,
  onChange,
  lang,
  label,
  readOnly,
  autoFocus,
  onFocusChange,
  notFound,
}: {
  value: CardContent;
  onChange: (next: CardContent) => void;
  lang: Lang;
  /** The field's accessible name ("Character for Leo"). */
  label: string;
  readOnly: boolean;
  autoFocus?: boolean;
  onFocusChange?: (focused: boolean) => void;
  /** The row for a name the library lacks; by default, that it becomes a new character. */
  notFound?: string;
}) {
  const t = useTranslations("pickCard");
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const index = useCharacterIndex(lang, !readOnly);
  const items = index.data;
  const [list, setList] = useState<ListState>(() => ({
    ...closedField(value),
    for: value,
  }));
  const field: CardField =
    list.for === value && !readOnly
      ? {
          content: value,
          rows: list.rows,
          highlight: list.highlight,
          open: list.open,
        }
      : closedField(value);
  const text = cardText(value);

  // Events read the latest field and callbacks, also from async results.
  const latest = useRef({ field, onChange });
  useEffect(() => {
    latest.current = { field, onChange };
  });
  const dispatch = (event: CardEvent) => {
    const { field: current, onChange: emit } = latest.current;
    const next = cardStep(current, event);
    latest.current.field = next;
    setList({
      for: next.content,
      rows: next.rows,
      highlight: next.highlight,
      open: next.open,
    });
    if (next.content !== current.content) emit(next.content);
    return next;
  };
  const search = (q: string) =>
    items ? searchMatches(items, q, ROWS) : latest.current.field.rows;
  const exact = () =>
    exactMatch(
      items ?? latest.current.field.rows,
      cardText(latest.current.field.content),
    );

  // The index arrived while typing: the rows were the server's (or none).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the index arrives; dispatch reads refs
  useEffect(() => {
    const { field: current } = latest.current;
    if (!items || !current.open) return;
    dispatch({
      type: "rows",
      rows: searchMatches(items, cardText(current.content), ROWS),
    });
  }, [items]);

  // Until the index loads, the server searches (the same as the old pick screen).
  const remoteQuery = !items && field.open ? text.trim() : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: dispatch reads refs
  useEffect(() => {
    if (!remoteQuery) return;
    const abort = new AbortController();
    const id = window.setTimeout(() => {
      fetch(
        `/api/characters?lang=${lang}&q=${encodeURIComponent(remoteQuery)}`,
        { signal: abort.signal },
      )
        .then((res) =>
          res.ok ? (res.json() as Promise<CharacterSearchResponse>) : null,
        )
        .then((body) => {
          if (!body) return;
          const rows = body.results
            .slice(0, ROWS)
            .map((c) => toSearchItem({ ...c, aliases: [] }));
          dispatch({ type: "rows", rows });
        })
        .catch(() => {});
    }, 120);
    return () => {
      abort.abort();
      window.clearTimeout(id);
    };
  }, [remoteQuery, lang]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: on mount only
  useEffect(() => {
    if (autoFocus && !readOnly) input.current?.focus({ preventScroll: true });
  }, []);

  const showList = field.open && !readOnly && text.trim() !== "";
  const active =
    showList && field.highlight >= 0 && field.rows[field.highlight]
      ? `${listId}-${field.highlight}`
      : undefined;

  return (
    <div className="relative">
      <div
        className={cn(
          "relative flex h-12 items-center rounded-[14px] border-[1.5px] border-line-strong bg-surface px-3.5 font-bold font-display text-[19px] tracking-[-0.01em] transition-[border-color,box-shadow] duration-200 sm:h-[52px] sm:text-[22px]",
          !readOnly &&
            "focus-within:border-sky focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--sky)_22%,transparent)]",
        )}
      >
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active}
          aria-readonly={readOnly || undefined}
          readOnly={readOnly}
          maxLength={NAME_MAX}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="done"
          placeholder={t("placeholder")}
          value={text}
          // the field's own border is the focus ring (the global outline is unlayered)
          style={{ outline: "none" }}
          onChange={(e) =>
            dispatch({
              type: "input",
              text: e.target.value,
              rows: search(e.target.value),
            })
          }
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => {
            onFocusChange?.(false);
            if (!readOnly) dispatch({ type: "blur", exact: exact() });
          }}
          onKeyDown={(e) => {
            if (readOnly || e.nativeEvent.isComposing) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              dispatch({ type: "move", by: e.key === "ArrowDown" ? 1 : -1 });
            } else if (e.key === "Enter") {
              e.preventDefault();
              const next = dispatch({ type: "enter", exact: exact() });
              if (next.content.kind === "picked") input.current?.blur();
            } else if (e.key === "Escape" && field.open) {
              e.preventDefault();
              e.stopPropagation();
              dispatch({ type: "escape" });
            }
          }}
          className={cn(
            "h-full w-full min-w-0 truncate bg-transparent caret-sky outline-none",
            "placeholder:font-semibold placeholder:text-ink-muted/60",
            readOnly && "cursor-default",
          )}
        />
      </div>
      <AnimatePresence>
        {showList ? (
          <m.div
            key="list"
            initial={{ opacity: 0, y: -8 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                opacity: { duration: 0.2, ease: gs.p1Out },
                y: { duration: 0.3, ease: gs.p3Out },
              },
            }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: gs.p1Out } }}
            className="absolute inset-x-0 top-[calc(100%+8px)] z-[6] rounded-[18px] bg-surface p-1.5 shadow-pop"
          >
            <div
              id={listId}
              role="listbox"
              aria-label={label}
              className="flex flex-col gap-0.5"
            >
              {field.rows.length ? (
                field.rows.map((item, i) => (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the field handles the keys
                  <div
                    key={item[0]}
                    id={`${listId}-${i}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={i === field.highlight}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() =>
                      i !== field.highlight &&
                      dispatch({ type: "hover", index: i })
                    }
                    onClick={() => {
                      dispatch({ type: "choose", index: i });
                      input.current?.blur();
                    }}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-[12px] p-1.5 text-left",
                      i === field.highlight && "bg-sky-soft",
                    )}
                  >
                    <Portrait
                      src={thumbUrl(item[3], 96)}
                      className="w-[38px] flex-none rounded-[8px] text-line"
                    />
                    <span className="flex min-w-0 flex-col">
                      <b className="truncate font-bold text-base leading-[1.2]">
                        <Marked name={item[1]} query={text} />
                      </b>
                      {item[2] ? (
                        <small className="truncate font-medium text-[12.5px] text-ink-muted">
                          {item[2]}
                        </small>
                      ) : null}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  role="option"
                  tabIndex={-1}
                  aria-selected={false}
                  aria-disabled="true"
                  className="px-3 py-2.5 font-semibold text-ink-muted text-sm"
                >
                  {notFound ?? t("notFound")}
                </div>
              )}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
