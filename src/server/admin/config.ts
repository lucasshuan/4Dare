import "server-only";
import { updateTag } from "next/cache";
import { cleanTunes } from "@/game/tunables";
import { GameError } from "@/game/types";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "../backend";
import type { ConfigVersion } from "../backend/admin-types";
import { CONFIG_TAG, loadConfig } from "../config";

/** The config in force and the versions before it (admin only). */
export async function configState(): Promise<{
  current: ConfigVersion;
  versions: ConfigVersion[];
}> {
  await adminOnly();
  const [current, versions] = await Promise.all([
    loadConfig(),
    getBackend().admin.versions(30),
  ]);
  return { current, versions };
}

const NOTE_MAX = 300;

/**
 * Saves the values the panel sent as a new version, kept to what the
 * registry allows. Matches being played keep theirs; the next ones take these.
 */
export async function saveTunes(
  rawTunes: unknown,
  rawNote: unknown,
): Promise<number> {
  const me = await adminOnly();
  const { admin } = getBackend();
  const before = await admin.config();
  const tunes = cleanTunes(rawTunes);
  const note =
    typeof rawNote === "string" && rawNote.trim()
      ? rawNote.trim().slice(0, NOTE_MAX)
      : null;
  if (JSON.stringify(tunes) === JSON.stringify(cleanTunes(before.values.tunes)))
    throw new GameError("already_done");
  const v = await admin.saveConfig({ ...before.values, tunes }, note, me.id);
  await admin.audit({
    actor: me.id,
    action: "config.save",
    target: `game_config:${v}`,
    before: before.values.tunes,
    after: tunes,
    note,
  });
  updateTag(CONFIG_TAG);
  return v;
}

/** Publishes an old version's values as a new version. */
export async function restoreVersion(v: number): Promise<number> {
  const me = await adminOnly();
  const { admin } = getBackend();
  const all = await admin.versions(200);
  const old = all.find((x) => x.v === v);
  if (!old) throw new GameError("not_found");
  const before = all[0];
  const n = await admin.saveConfig(old.values, `Volta à versão ${v}`, me.id);
  await admin.audit({
    actor: me.id,
    action: "config.restore",
    target: `game_config:${n}`,
    before: before?.values.tunes ?? null,
    after: old.values.tunes,
    note: `versão ${v}`,
  });
  updateTag(CONFIG_TAG);
  return n;
}
