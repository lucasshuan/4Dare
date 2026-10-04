"use client";

import type { RealtimeChannel, RealtimeClient } from "@supabase/realtime-js";
import { BACKEND, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";

// Tells the browser when a room (or the public room list) changed, so it refetches at once.
// Local mode has no push channel: the screens poll instead.

type Unsubscribe = () => void;

type OnChange = (payload: { version?: number; at?: number }) => void;

/** Whether pings can arrive: called on every join, drop and rejoin, and at once if already joined. */
type OnStatus = (connected: boolean) => void;

let client: Promise<RealtimeClient> | null = null;

/**
 * Only the realtime client, not all of supabase-js, and fetched the first time
 * a screen listens, so no page waits on it. The channels are public: the
 * publishable key is enough. If it fails to load, the screens keep polling
 * and the next listener tries again.
 */
function connect(): Promise<RealtimeClient> {
  client ??= import("@supabase/realtime-js")
    .then(({ RealtimeClient }) => {
      const url = new URL("realtime/v1", `${SUPABASE_URL.replace(/\/$/, "")}/`);
      url.protocol = url.protocol.replace("http", "ws");
      // what supabase-js sends for a visitor with no session: the key, twice
      return new RealtimeClient(url.href, {
        params: { apikey: SUPABASE_PUBLISHABLE_KEY },
        accessToken: async () => SUPABASE_PUBLISHABLE_KEY,
      });
    })
    .catch((error: unknown) => {
      client = null;
      throw error;
    });
  return client;
}

// The client hands back the same channel for the same topic, and removing it
// stops it for everyone, so each topic is one channel shared by its listeners.
// It is left a moment after the last one goes: the next screen (or React
// running an effect twice) may want it again, and a channel still leaving
// can't be joined.
interface Topic {
  /** null until the client has loaded. */
  channel: RealtimeChannel | null;
  listeners: Set<OnChange>;
  watchers: Set<OnStatus>;
  connected: boolean;
  closing?: number;
}

const topics = new Map<string, Topic>();

const LINGER_MS = 5000;

function open(name: string): Topic {
  const topic: Topic = {
    channel: null,
    listeners: new Set(),
    watchers: new Set(),
    connected: false,
  };
  topics.set(name, topic);
  connect()
    .then((realtime) => {
      // everyone left while it loaded
      if (topics.get(name) !== topic) return;
      topic.channel = realtime
        .channel(name)
        .on("broadcast", { event: "changed" }, (message) => {
          const payload = (message.payload ?? {}) as {
            version?: number;
            at?: number;
          };
          for (const listener of topic.listeners) listener(payload);
        })
        .subscribe((status) => {
          topic.connected = status === "SUBSCRIBED";
          // closed for good (by the server, or by us): the next listener opens a new one
          if (status === "CLOSED" && topics.get(name) === topic)
            topics.delete(name);
          for (const watcher of topic.watchers) watcher(topic.connected);
        });
    })
    .catch(() => {
      if (topics.get(name) === topic) topics.delete(name);
    });
  return topic;
}

function listen(
  name: string,
  onChange: OnChange,
  onStatus?: OnStatus,
): Unsubscribe {
  if (BACKEND !== "supabase") return () => {};
  const topic = topics.get(name) ?? open(name);
  window.clearTimeout(topic.closing);
  topic.listeners.add(onChange);
  if (onStatus) {
    topic.watchers.add(onStatus);
    if (topic.connected) onStatus(true);
  }
  return () => {
    topic.listeners.delete(onChange);
    if (onStatus) topic.watchers.delete(onStatus);
    if (topic.listeners.size) return;
    window.clearTimeout(topic.closing);
    topic.closing = window.setTimeout(() => {
      if (topic.listeners.size || topics.get(name) !== topic) return;
      topics.delete(name);
      const { channel } = topic;
      if (channel)
        void connect().then((realtime) => realtime.removeChannel(channel));
    }, LINGER_MS);
  };
}

export const subscribeRoom = (
  code: string,
  onChange: OnChange,
  onStatus?: OnStatus,
) => listen(`room:${code}`, onChange, onStatus);

export const subscribeLobby = (onChange: OnChange) => listen("lobby", onChange);
