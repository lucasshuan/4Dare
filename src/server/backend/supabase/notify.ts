import "server-only";
import type { Notifier } from "../types";
import { serviceClient } from "./clients";

/**
 * Broadcasts `event` on a topic over REST. Best effort: a missed ping is
 * covered by polling. Topics are public, so a payload never carries more than
 * a version, a time or an id.
 */
async function ping(
  topic: string,
  event: "changed" | "chat" | "react" | "watchers",
  payload: Record<string, unknown>,
) {
  const client = serviceClient();
  const channel = client.channel(topic);
  try {
    await channel.httpSend(event, payload, { timeout: 1500 });
  } catch {
    // ignore: the browsers also poll
  } finally {
    await client.removeChannel(channel);
  }
}

export function supabaseNotify(): Notifier {
  return {
    roomChanged: (code, version) =>
      ping(`room:${code}`, "changed", { version }),
    // `at` names this version of the list, so browsers ask the CDN for it by name
    lobbyChanged: () => ping("lobby", "changed", { at: Date.now() }),
    // the newest line's id only: the text is read through the room's route
    chatChanged: (code, id) => ping(`room:${code}`, "chat", { id }),
    // a time only: who watches is read through the room's route
    watchersChanged: (code) =>
      ping(`room:${code}`, "watchers", { at: Date.now() }),
    // reactions hide nothing: everyone on stage sees them anyway
    reacted: (code, payload) => ping(`room:${code}`, "react", payload),
  };
}
