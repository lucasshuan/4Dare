import "server-only";
import type { Notifier } from "../types";
import { serviceClient } from "./clients";

/** Broadcast "changed" on a channel over REST. Best effort: a missed ping is covered by polling. */
async function ping(topic: string, payload: Record<string, unknown>) {
  const client = serviceClient();
  const channel = client.channel(topic);
  try {
    await channel.httpSend("changed", payload, { timeout: 1500 });
  } catch {
    // ignore: the browsers also poll
  } finally {
    await client.removeChannel(channel);
  }
}

export function supabaseNotify(): Notifier {
  return {
    roomChanged: (code, version) => ping(`room:${code}`, { version }),
    lobbyChanged: () => ping("lobby", {}),
  };
}
