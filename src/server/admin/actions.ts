"use server";
import type { LabScene } from "@/features/lab/scene";
import type { LabKit, LabSettings } from "@/features/lab/sim";
import type { RoomState } from "@/game/types";
// The control panel's changes. Every one checks the admin first (adminOnly),
// whatever page it came from.
import { GameError } from "@/game/types";
import type { BankKind } from "../backend/admin-types";
import { fail, ok, type Result } from "../contract";
import { restoreVersion, saveTunes } from "./config";
import { setBankLive } from "./games";
import { deleteLabScene, labKit, labRoom, saveLabScene } from "./lab";

async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await work());
  } catch (e) {
    if (e instanceof GameError) return fail(e.code);
    console.error("[admin]", e);
    return fail("unknown");
  }
}

/** Saves the tunable values as a new config version. */
export async function saveConfigAction(
  tunes: Record<string, unknown>,
  note: string,
): Promise<Result<number>> {
  return run(() => saveTunes(tunes, note));
}

/** Publishes an old config version again. */
export async function restoreConfigAction(v: number): Promise<Result<number>> {
  return run(() => restoreVersion(v));
}

/** Puts a theme, question, mission or extra on or off (never deletes it). */
export async function setBankLiveAction(
  kind: BankKind,
  id: string,
  live: boolean,
): Promise<Result<void>> {
  return run(() => setBankLive(kind, id, live));
}

/** What a real start would deal for a lab match. */
export async function labKitAction(s: LabSettings): Promise<Result<LabKit>> {
  return run(() => labKit(s));
}

/** A real room's state, to play on from in the lab. */
export async function labRoomAction(code: string): Promise<Result<RoomState>> {
  return run(() => labRoom(code));
}

/** Saves the lab's moment as a scene; its id. */
export async function saveLabSceneAction(
  scene: LabScene,
  name: string,
  note: string,
): Promise<Result<string>> {
  return run(() => saveLabScene(scene, name, note));
}

export async function deleteLabSceneAction(id: string): Promise<Result<void>> {
  return run(() => deleteLabScene(id));
}
