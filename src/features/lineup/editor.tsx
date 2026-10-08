"use client";

// Your board, to defend your team: the photos come as the grid left them,
// and from there it is free. Drag a photo to move it; its bottom knob sizes
// it, its top one turns it (near straight it settles straight); two fingers
// do both. A tap on an empty spot writes there in chalk; a tap on chalk words
// edits them; dragged off the slate, they go. It saves itself as you go.
import { RotateCw, Scaling } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { keyClass } from "@/components/ui/button";
import { useStepStarted } from "@/features/room/match-frame";
import {
  MAX_TEAM_NAME,
  MAX_TEXT,
  MAX_TEXT_LINES,
  MAX_TEXTS,
  SLATE,
  STICKER_W,
  TEXT_SIZE,
  TILT_MAX,
} from "@/game/lineup/rules";
import type { LuBoard, LuSticker, LuText } from "@/game/lineup/types";
import { cn } from "@/lib/cn";
import { markDone } from "@/server/actions";
import { BOARD, BoardShell, stickerBox, useFitScale } from "./board";
import { Sticker } from "./card";
import { useBoardSave } from "./use-board-save";
import { useLineup, useLuAction } from "./use-lineup";

type Pick = { kind: "s" | "t"; i: number };
type Mode = "move" | "size" | "turn";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
/** Near straight settles straight. */
const SNAP_DEG = 6;
const tilt = (r: number) => {
  const c = clamp(Math.round(r), -TILT_MAX, TILT_MAX);
  return Math.abs(c) < SNAP_DEG ? 0 : c;
};
/** A photo's middle stays on the slate. */
function keepOn(s: LuSticker): LuSticker {
  const w = clamp(Math.round(s.w), STICKER_W.min, STICKER_W.max);
  const h = w * 1.25;
  return {
    ...s,
    w,
    x: Math.round(clamp(s.x, w / 2, SLATE.w - w / 2)),
    y: Math.round(clamp(s.y, h / 2, SLATE.h - h / 2)),
  };
}
const offSlate = (t: LuText) =>
  t.x < -10 || t.y < -10 || t.x > SLATE.w + 10 || t.y > SLATE.h + 10;

/** A knob on a picked item, the same size on screen whatever the board's scale. */
function Knob({
  handle,
  corner,
  scale,
  label,
}: {
  handle: Mode;
  corner: "top" | "bottom";
  scale: number;
  label: string;
}) {
  const size = 30 / (scale || 1);
  return (
    <span
      data-handle={handle}
      role="presentation"
      aria-label={label}
      className="absolute z-[3] grid touch-none place-items-center rounded-pill bg-chalk text-board-deep shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
      style={{
        width: size,
        height: size,
        right: -size / 2,
        ...(corner === "top" ? { top: -size / 2 } : { bottom: -size / 2 }),
        cursor: handle === "size" ? "nwse-resize" : "grab",
      }}
    >
      {handle === "size" ? (
        <Scaling
          style={{ width: size / 2, height: size / 2 }}
          strokeWidth={2.6}
          className="pointer-events-none"
        />
      ) : (
        <RotateCw
          style={{ width: size / 2, height: size / 2 }}
          strokeWidth={2.6}
          className="pointer-events-none"
        />
      )}
    </span>
  );
}

export function BoardEditor() {
  const t = useTranslations("lineup.defend");
  const { lu, me, code, view } = useLineup();
  const { run, pending } = useLuAction();
  const started = useStepStarted();
  const inPlay = lu.dealtIds.includes(me.id) && !me.away;
  const saved = lu.boards[me.id];
  const [board, setBoard] = useState<LuBoard>(
    () => saved ?? { name: "", stickers: [], texts: [] },
  );
  const [picked, setPicked] = useState<Pick | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const { save } = useBoardSave(code);
  const frame = useRef<HTMLDivElement>(null);
  const scale = useFitScale(frame, BOARD.w);
  const slate = useRef<HTMLDivElement>(null);
  const done = lu.doneIds.includes(me.id);
  const open = started && inPlay && view.deadline !== null;

  // a card that arrived late (none do now, but a saved board may miss one) keeps its grid spot
  useEffect(() => {
    if (!saved) return;
    setBoard((b) =>
      b.stickers.length === saved.stickers.length
        ? b
        : { ...b, stickers: saved.stickers },
    );
  }, [saved]);

  const change = useCallback(
    (next: LuBoard) => {
      setBoard(next);
      save(next);
    },
    [save],
  );

  // --- pointers: one drags, two pinch and turn the picked item ---------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    mode: Mode | "pinch" | "tap";
    pick: Pick | null;
    from: { x: number; y: number };
    item: LuSticker | LuText | null;
    moved: boolean;
    dist?: number;
    angle?: number;
    at: number;
  } | null>(null);

  /** A pointer's place on the slate, in slate units. */
  const toSlate = (e: { clientX: number; clientY: number }) => {
    const r = slate.current?.getBoundingClientRect();
    if (!r || !scale) return { x: 0, y: 0 };
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };
  const itemOf = (b: LuBoard, p: Pick) =>
    p.kind === "s" ? b.stickers[p.i] : b.texts[p.i];
  const centre = (it: LuSticker | LuText) => ({ x: it.x, y: it.y });

  /** The picked one comes to the front. */
  const toFront = (b: LuBoard, p: Pick): [LuBoard, Pick] => {
    if (p.kind === "s") {
      const s = b.stickers[p.i];
      const stickers = [...b.stickers.filter((_, k) => k !== p.i), s];
      return [
        { ...b, stickers },
        { kind: "s", i: stickers.length - 1 },
      ];
    }
    const x = b.texts[p.i];
    const texts = [...b.texts.filter((_, k) => k !== p.i), x];
    return [
      { ...b, texts },
      { kind: "t", i: texts.length - 1 },
    ];
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!open || editing !== null) return;
    const pt = toSlate(e);
    pointers.current.set(e.pointerId, pt);
    slate.current?.setPointerCapture(e.pointerId);
    // a second finger on a picked item: pinch it
    if (pointers.current.size === 2 && picked) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        mode: "pinch",
        pick: picked,
        from: pt,
        item: itemOf(board, picked) ?? null,
        moved: true,
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        at: Date.now(),
      };
      return;
    }
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-kind],[data-handle]",
    );
    const handle = el?.dataset.handle as Mode | undefined;
    if (handle && picked) {
      gesture.current = {
        mode: handle,
        pick: picked,
        from: pt,
        item: itemOf(board, picked) ?? null,
        moved: false,
        at: Date.now(),
      };
      return;
    }
    if (el?.dataset.kind) {
      const p: Pick = {
        kind: el.dataset.kind as "s" | "t",
        i: Number(el.dataset.index),
      };
      const [b, front] = toFront(board, p);
      setBoard(b);
      // a tap on chalk already picked opens it for editing
      const again = picked?.kind === "t" && p.kind === "t" && picked.i === p.i;
      setPicked(front);
      gesture.current = {
        mode: "move",
        pick: front,
        from: pt,
        item: itemOf(b, front) ?? null,
        moved: false,
        at: Date.now(),
        ...(again ? { dist: -1 } : {}),
      };
      return;
    }
    gesture.current = {
      mode: "tap",
      pick: null,
      from: pt,
      item: null,
      moved: false,
      at: Date.now(),
    };
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    const pt = toSlate(e);
    pointers.current.set(e.pointerId, pt);
    if (Math.hypot(pt.x - g.from.x, pt.y - g.from.y) > 4) g.moved = true;
    if (!g.pick || !g.item) return;
    const it = g.item;
    const p = g.pick;
    let next: LuSticker | LuText = it;
    if (g.mode === "move") {
      next = { ...it, x: it.x + pt.x - g.from.x, y: it.y + pt.y - g.from.y };
    } else if (g.mode === "size") {
      const c = centre(it);
      const d0 = Math.hypot(g.from.x - c.x, g.from.y - c.y) || 1;
      const d1 = Math.hypot(pt.x - c.x, pt.y - c.y);
      next =
        p.kind === "s"
          ? { ...(it as LuSticker), w: (it as LuSticker).w * (d1 / d0) }
          : {
              ...(it as LuText),
              s: clamp(
                Math.round((it as LuText).s * (d1 / d0)),
                TEXT_SIZE.min,
                TEXT_SIZE.max,
              ),
            };
    } else if (g.mode === "turn") {
      const c = centre(it);
      const a0 = Math.atan2(g.from.y - c.y, g.from.x - c.x);
      const a1 = Math.atan2(pt.y - c.y, pt.x - c.x);
      next = { ...it, r: tilt(it.r + ((a1 - a0) * 180) / Math.PI) };
    } else if (g.mode === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const k = Math.hypot(b.x - a.x, b.y - a.y) / (g.dist || 1);
      const turn =
        ((Math.atan2(b.y - a.y, b.x - a.x) - (g.angle ?? 0)) * 180) / Math.PI;
      next =
        p.kind === "s"
          ? {
              ...(it as LuSticker),
              w: (it as LuSticker).w * k,
              r: tilt(it.r + turn),
            }
          : {
              ...(it as LuText),
              s: clamp(
                Math.round((it as LuText).s * k),
                TEXT_SIZE.min,
                TEXT_SIZE.max,
              ),
              r: tilt(it.r + turn),
            };
    }
    setBoard((b) =>
      p.kind === "s"
        ? {
            ...b,
            stickers: b.stickers.map((s, k) =>
              k === p.i ? keepOn(next as LuSticker) : s,
            ),
          }
        : {
            ...b,
            texts: b.texts.map((x, k) =>
              k === p.i
                ? {
                    ...(next as LuText),
                    x: Math.round(next.x),
                    y: Math.round(next.y),
                  }
                : x,
            ),
          },
    );
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // one finger left after a pinch: carry on dragging with it
      if (g?.mode === "pinch" && g.pick) {
        const [pt] = [...pointers.current.values()];
        gesture.current = {
          mode: "move",
          pick: g.pick,
          from: pt,
          item: itemOf(board, g.pick) ?? null,
          moved: true,
          at: Date.now(),
        };
      }
      return;
    }
    gesture.current = null;
    if (!g) return;
    if (g.mode === "tap" && !g.moved) {
      // a tap on an empty spot: chalk words there, or just put down what was picked
      if (picked) {
        setPicked(null);
        return;
      }
      if (board.texts.length >= MAX_TEXTS) return;
      const text: LuText = {
        t: "",
        x: Math.round(g.from.x),
        y: Math.round(g.from.y),
        s: 22,
        r: 0,
      };
      const b = { ...board, texts: [...board.texts, text] };
      setBoard(b);
      setPicked({ kind: "t", i: b.texts.length - 1 });
      setEditing(b.texts.length - 1);
      return;
    }
    if (g.pick?.kind === "t" && g.mode === "move") {
      const it = board.texts[g.pick.i];
      // words dragged off the slate are wiped
      if (it && offSlate(it)) {
        const b = {
          ...board,
          texts: board.texts.filter((_, k) => k !== g.pick?.i),
        };
        setPicked(null);
        return change(b);
      }
      if (!g.moved && g.dist === -1) {
        setEditing(g.pick.i);
        return;
      }
    }
    if (g.moved) change(board);
  };

  /** Ends editing words: empty ones go. */
  const commit = (i: number, text: string) => {
    const words = text
      .split("\n")
      .slice(0, MAX_TEXT_LINES)
      .join("\n")
      .slice(0, MAX_TEXT)
      .trim();
    setEditing(null);
    const b = words
      ? {
          ...board,
          texts: board.texts.map((x, k) => (k === i ? { ...x, t: words } : x)),
        }
      : { ...board, texts: board.texts.filter((_, k) => k !== i) };
    if (!words) setPicked(null);
    change(b);
  };

  // arrows nudge the picked item, Delete wipes picked words, Escape puts it down
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!picked || editing !== null) return;
      const el = e.target as HTMLElement | null;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      const d = {
        ArrowLeft: [-4, 0],
        ArrowRight: [4, 0],
        ArrowUp: [0, -4],
        ArrowDown: [0, 4],
      }[e.key];
      if (d) {
        e.preventDefault();
        const b =
          picked.kind === "s"
            ? {
                ...board,
                stickers: board.stickers.map((s, k) =>
                  k === picked.i
                    ? keepOn({ ...s, x: s.x + d[0], y: s.y + d[1] })
                    : s,
                ),
              }
            : {
                ...board,
                texts: board.texts.map((x, k) =>
                  k === picked.i ? { ...x, x: x.x + d[0], y: x.y + d[1] } : x,
                ),
              };
        change(b);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        picked.kind === "t"
      ) {
        setPicked(null);
        change({
          ...board,
          texts: board.texts.filter((_, k) => k !== picked.i),
        });
      } else if (e.key === "Escape") setPicked(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, editing, board, change]);

  return (
    <div className="flex w-full flex-col items-center gap-3 max-sm:gap-2.5">
      <h2 className="m-0 text-balance text-center font-display font-extrabold text-[clamp(18px,3.4vw,28px)] leading-tight">
        {t("title")}
      </h2>
      <input
        value={board.name}
        maxLength={MAX_TEAM_NAME}
        disabled={!open}
        placeholder={t("teamName")}
        aria-label={t("teamName")}
        onChange={(e) => change({ ...board, name: e.target.value })}
        className="h-11 w-[min(86vw,360px)] rounded-pill border-[1.5px] border-line-strong bg-surface px-5 text-center font-bold font-chalk text-[20px] text-ink outline-none focus:border-ink"
      />
      <div
        ref={frame}
        className="relative w-[min(92vw,calc((100dvh-var(--dock,0px)-320px)*0.6667),440px)] min-w-[220px] max-sm:w-[min(88vw,calc((100dvh-var(--dock,0px)-390px)*0.6667))]"
        style={{ aspectRatio: "2 / 3" }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: BOARD.w,
            height: BOARD.h,
            transform: `scale(${scale})`,
            visibility: scale ? "visible" : "hidden",
          }}
        >
          <BoardShell>
            <div
              ref={slate}
              className="absolute inset-0 touch-none select-none"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {board.stickers.map((s, k) => {
                const card = lu.cards[s.c];
                if (!card) return null;
                const on = picked?.kind === "s" && picked.i === k;
                return (
                  <div
                    key={s.c}
                    data-kind="s"
                    data-index={k}
                    className="absolute cursor-grab"
                    style={{ ...stickerBox(s.x, s.y, s.w), width: s.w + 12 }}
                  >
                    <Sticker
                      card={card}
                      width={s.w}
                      tilt={s.r}
                      price={lu.tags[s.c]?.price}
                    />
                    {on ? (
                      <>
                        <span
                          className="pointer-events-none absolute inset-[-6px] rounded-[6px] outline-2 outline-chalk outline-dashed"
                          style={{ transform: `rotate(${s.r}deg)` }}
                        />
                        <Knob
                          handle="turn"
                          corner="top"
                          scale={scale}
                          label={t("turn")}
                        />
                        <Knob
                          handle="size"
                          corner="bottom"
                          scale={scale}
                          label={t("size")}
                        />
                      </>
                    ) : null}
                  </div>
                );
              })}
              {board.texts.map((x, k) => {
                const on = picked?.kind === "t" && picked.i === k;
                const out = offSlate(x);
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: words keep their place in the list
                    key={k}
                    className="absolute size-0"
                    style={{ left: x.x, top: x.y }}
                  >
                    <div
                      data-kind="t"
                      data-index={k}
                      className={cn(
                        "absolute top-0 left-0 cursor-grab",
                        out && "opacity-35",
                      )}
                      style={{
                        transform: `translate(-50%, -50%) rotate(${x.r}deg)`,
                      }}
                    >
                      {editing === k ? (
                        <ChalkInput
                          value={x.t}
                          size={x.s}
                          onDone={(v) => commit(k, v)}
                          placeholder={t("write")}
                        />
                      ) : (
                        <span
                          className={cn(
                            "block min-w-6 whitespace-pre text-center font-bold font-hand text-chalk leading-[1.02]",
                            on &&
                              "outline-2 outline-chalk outline-dashed outline-offset-[6px]",
                          )}
                          style={{ fontSize: x.s }}
                        >
                          {x.t || " "}
                        </span>
                      )}
                      {on && editing === null ? (
                        <>
                          <Knob
                            handle="turn"
                            corner="top"
                            scale={scale}
                            label={t("turn")}
                          />
                          <Knob
                            handle="size"
                            corner="bottom"
                            scale={scale}
                            label={t("size")}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </BoardShell>
        </div>
      </div>
      <p className="m-0 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-center font-semibold text-[12px] text-ink-muted sm:text-sm">
        <span>{t("hintMove")}</span>
        <span>{t("hintKnobs")}</span>
        <span>{t("hintWrite")}</span>
      </p>
      {inPlay ? (
        <div className="sticky bottom-[calc(1rem+var(--dock))] z-10 flex justify-center">
          <button
            type="button"
            disabled={pending || !started}
            onClick={() => run(() => markDone(code, !done))}
            className={keyClass(done ? "sky" : "yes", {
              pressed: done,
              className: "h-14 px-8 text-lg",
            })}
          >
            {done
              ? t("waiting", { n: lu.doneIds.length, of: lu.dealtIds.length })
              : t("done")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Chalk words being written: grows with them, up to three lines. */
function ChalkInput({
  value,
  size,
  placeholder,
  onDone,
}: {
  value: string;
  size: number;
  placeholder: string;
  onDone: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const lines = text.split("\n");
  const cols = Math.max(4, ...lines.map((l) => l.length + 1));
  return (
    <textarea
      ref={ref}
      value={text}
      rows={Math.min(MAX_TEXT_LINES, lines.length)}
      cols={cols}
      maxLength={MAX_TEXT}
      placeholder={placeholder}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        const v = e.target.value
          .split("\n")
          .slice(0, MAX_TEXT_LINES)
          .join("\n");
        setText(v);
      }}
      onBlur={() => onDone(text)}
      onKeyDown={(e) => {
        if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
      }}
      className="block resize-none overflow-hidden rounded-[4px] bg-board-deep/60 text-center font-bold font-hand text-chalk leading-[1.02] outline-2 outline-butter placeholder:text-chalk/50"
      style={{ fontSize: size }}
    />
  );
}
