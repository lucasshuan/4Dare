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
    // `at` names this version of the list, so browsers ask the CDN for it by name
    lobbyChanged: () => ping("lobby", { at: Date.now() }),
  };
}
