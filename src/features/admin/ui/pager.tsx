"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { fmt } from "../format";

/**
 * One page of a list. A list whose filters change (`sig`) starts again at
 * page 1; the page stays in range when the list shrinks.
 */
export function usePaged<T>(list: readonly T[], size: number, sig = "") {
  const [state, setState] = useState({ page: 1, sig });
  const pages = Math.max(1, Math.ceil(list.length / size));
  const page = state.sig === sig ? Math.min(Math.max(1, state.page), pages) : 1;
  const offset = (page - 1) * size;
  return {
    rows: list.slice(offset, offset + size),
    offset,
    pager: (
      <Pager
        total={list.length}
        page={page}
        size={size}
        onPage={(p) => setState({ page: p, sig })}
      />
    ),
  };
}

/** "21–40 de 351" and the page numbers, with the ends and the neighbours of the current one. */
export function Pager({
  total,
  page,
  size,
  onPage,
}: {
  total: number;
  page: number;
  size: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;
  const a = total ? (page - 1) * size + 1 : 0;
  const b = Math.min(total, page * size);
  const nums: (number | "gap")[] = [];
  for (let i = 1; i <= pages; i++)
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums.at(-1) !== "gap") nums.push("gap");
  return (
    <nav className="pager" aria-label="Páginas">
      <span className="pg-range">
        {fmt(a)}–{fmt(b)} de {fmt(total)}
      </span>
      <span className="pg-btns">
        <button
          type="button"
          className="pg-n arrow"
          disabled={page <= 1}
          aria-label="Página anterior"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="i" />
        </button>
        {nums.map((n, i) =>
          n === "gap" ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity
            <span key={`gap-${i}`} className="pg-gap">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className="pg-n"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className="pg-n arrow"
          disabled={page >= pages}
          aria-label="Próxima página"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight className="i" />
        </button>
      </span>
    </nav>
  );
}
