"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { BACKEND } from "@/config";
import { useRoomContext } from "@/features/data/room-context";
import {
  CHAT_OVERLAP_MS,
  chatOrder,
  cleanChatText,
  type ShownLine,
  shown,
} from "@/game/chat";
import { useClock } from "@/lib/hooks/use-server-clock";
import { subscribeChat } from "@/lib/realtime";
import { type ChatCache, chatKey, EMPTY, type Outgoing } from "./chat-cache";

/** A line as the chat draws it: saved, or one of yours still on its way (negative id) or refused. */
export interface ChatLine extends ShownLine {
  state: "sent" | "sending" | "failed";
}

export type ChatStatus = "loading" | "ready" | "error";

export { chatKey };

// Pings make polling a safety net on Supabase (quicker while the channel is
// down); local mode has no pings.
const pollMs = (connected: boolean) =>
  BACKEND === "local" ? 1500 : connected ? 20_000 : 5000;

/** Lines kept in the browser: the newest. */
const KEEP = 500;

/** Temporary ids of lines on their way: negative, never a server id. */
let lastTempId = 0;

/** Lines from `since` on (the last page without it), names in `lang`. */
async function fetchLines(
  code: string,
  since: number | null,
  lang: string,
): Promise<ShownLine[]> {
  const query = since === null ? "" : `&since=${Math.floor(since)}`;
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(code)}/messages?lang=${lang}${query}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`chat: ${res.status}`);
  return ((await res.json()) as { messages: ShownLine[] }).messages;
}

function merge(cache: ChatCache | undefined, lines: ShownLine[]): ChatCache {
  const byId = new Map(cache?.byId);
  for (const m of lines) byId.set(m.id, m);
  if (byId.size > KEEP)
    for (const id of [...byId.keys()]
      .sort((a, b) => a - b)
      .slice(0, byId.size - KEEP))
      byId.delete(id);
  return { byId, outbox: cache?.outbox ?? [] };
}

/**
 * The room's chat, under RoomProvider: `messages` are the lines that may show
 * now (a system line waits for its scene's `showAt`), in chat order (when
 * they show, then id), your lines on their way included. Fetched on mount,
 * then on every "chat" ping (debounced 100 ms) and on rejoining the channel,
 * on focus and by a poll (1.5 s in local mode, 20 s on Supabase). `send`
 * shows the line at once and returns false for an empty or too long text; a
 * refused line stays, marked failed, until `retry(id)`.
 */
export function useChat(code: string): {
  messages: ChatLine[];
  send: (text: string) => boolean;
  retry: (id: number) => void;
  status: ChatStatus;
} {
  const client = useQueryClient();
  const { serverTime, me } = useRoomContext();
  const lang = useLocale();
  const clock = useClock();
  const t = useTranslations("common.errors");
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const key = useMemo(() => chatKey(code), [code]);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let newest: number | null = null;
      for (const m of client.getQueryData<ChatCache>(key)?.byId.values() ?? [])
        if (newest === null || m.at > newest) newest = m.at;
      const lines = await fetchLines(
        code,
        newest === null ? null : newest - CHAT_OVERLAP_MS,
        lang,
      );
      // merged into what is there now: a send may have landed meanwhile
      return merge(client.getQueryData<ChatCache>(key), lines);
    },
    structuralSharing: false,
    refetchInterval: pollMs(connected),
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const update = useCallback(
    (change: (cache: ChatCache) => ChatCache) =>
      client.setQueryData<ChatCache>(key, (c) => change(c ?? EMPTY)),
    [client, key],
  );

  const refresh = useCallback(
    () => client.invalidateQueries({ queryKey: key }),
    [client, key],
  );

  // A ping for a line already here (usually your own) needs nothing; others
  // refetch, a burst of them once. Joining or rejoining refetches: pings sent
  // while away never arrive.
  useEffect(() => {
    let joined = false;
    let timer: number | undefined;
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 100);
    };
    const unsubscribe = subscribeChat(
      code,
      ({ id }) => {
        if (id && client.getQueryData<ChatCache>(key)?.byId.has(id)) return;
        soon();
      },
      (now) => {
        if (now && !joined) soon();
        joined = now;
        setConnected(now);
      },
    );
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      setConnected(false);
    };
  }, [client, code, key, refresh]);

  const post = useCallback(
    async (line: Outgoing) => {
      let error: string | null = null;
      try {
        const res = await fetch(
          `/api/rooms/${encodeURIComponent(code)}/messages?lang=${lang}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: line.text }),
          },
        );
        if (res.ok) {
          const saved = (await res.json()) as ShownLine;
          update((c) => {
            const byId = new Map(c.byId);
            byId.set(saved.id, saved);
            return { byId, outbox: c.outbox.filter((o) => o.id !== line.id) };
          });
          return;
        }
        error = res.status === 429 ? "rate_limited" : `${res.status}`;
      } catch {
        error = "network";
      }
      update((c) => ({
        ...c,
        outbox: c.outbox.map((o) =>
          o.id === line.id ? { ...o, failed: true } : o,
        ),
      }));
      if (error === "rate_limited") toast(t("rate_limited"));
    },
    [code, lang, update, toast, t],
  );

  const send = useCallback(
    (raw: string) => {
      const text = cleanChatText(raw);
      if (text === null) return false;
      const line: Outgoing = {
        id: --lastTempId,
        text,
        at: serverTime(),
        failed: false,
      };
      update((c) => ({ ...c, outbox: [...c.outbox, line] }));
      void post(line);
      return true;
    },
    [post, serverTime, update],
  );

  const retry = useCallback(
    (id: number) => {
      const line = client
        .getQueryData<ChatCache>(key)
        ?.outbox.find((o) => o.id === id && o.failed);
      if (!line) return;
      const again = { ...line, failed: false };
      update((c) => ({
        ...c,
        outbox: c.outbox.map((o) => (o.id === id ? again : o)),
      }));
      void post(again);
    },
    [client, key, post, update],
  );

  // Re-render when the next waiting line's moment comes.
  const cache = query.data ?? EMPTY;
  const [, setTick] = useState(0);
  const now = serverTime();
  useEffect(() => {
    if (clock.frozen) return;
    let next = Number.POSITIVE_INFINITY;
    for (const m of cache.byId.values())
      if (!shown(m, now) && m.showAt < next) next = m.showAt;
    if (next === Number.POSITIVE_INFINITY) return;
    const wait = (next - now) / (clock.rate || 1);
    const id = window.setTimeout(
      () => setTick((n) => n + 1),
      Math.min(wait + 20, 2 ** 31 - 1),
    );
    return () => window.clearTimeout(id);
  }, [cache, now, clock.frozen, clock.rate]);

  const author = useMemo(
    () => ({
      id: me.id,
      isGuest: me.isGuest,
      name: me.name,
      avatar: me.avatar,
    }),
    [me],
  );
  const messages = useMemo(() => {
    const lines: ChatLine[] = [];
    for (const m of cache.byId.values())
      if (shown(m, now)) lines.push({ ...m, state: "sent" });
    for (const o of cache.outbox)
      lines.push({
        id: o.id,
        at: o.at,
        showAt: o.at,
        by: author.id,
        author,
        text: o.text,
        system: null,
        state: o.failed ? "failed" : "sending",
      });
    return lines.sort(chatOrder);
  }, [cache, now, author]);

  const status: ChatStatus = query.data
    ? "ready"
    : query.isError
      ? "error"
      : "loading";

  return { messages, send, retry, status };
}
