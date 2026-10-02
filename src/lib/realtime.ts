"use client";

import { BACKEND } from "@/config";
import { browserClient } from "./supabase-browser";

// Tells the browser when a room (or the public room list) changed, so it refetches at once.
// Local mode has no push channel: the screens poll instead.

type Unsubscribe = () => void;

function listen(topic: string, onChange: () => void): Unsubscribe {
  if (BACKEND !== "supabase") return () => {};
  const supabase = browserClient();
  const channel = supabase
    .channel(topic)
    .on("broadcast", { event: "changed" }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export const subscribeRoom = (code: string, onChange: () => void) =>
  listen(`room:${code}`, onChange);

export const subscribeLobby = (onChange: () => void) =>
  listen("lobby", onChange);
