"use client";

import { BACKEND } from "@/config";
import { browserClient } from "./supabase-browser";

// Tells the browser when a room (or the public room list) changed, so it refetches at once.
// Local mode has no push channel: the screens poll instead.

type Unsubscribe = () => void;

type OnChange = (payload: { version?: number }) => void;

function listen(topic: string, onChange: OnChange): Unsubscribe {
  if (BACKEND !== "supabase") return () => {};
  const supabase = browserClient();
  const channel = supabase
    .channel(topic)
    .on("broadcast", { event: "changed" }, (message) =>
      onChange((message.payload ?? {}) as { version?: number }),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export const subscribeRoom = (code: string, onChange: OnChange) =>
  listen(`room:${code}`, onChange);

export const subscribeLobby = (onChange: OnChange) => listen("lobby", onChange);
