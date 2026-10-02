"use server";
// Every mutation the UI can make. Reads go through route handlers under /api (see README of this folder's code).
// CONTRACT FILE: the signatures below are what the UI is written against. Bodies are implemented by the backend.

import type { AnswerValue, RoomSettings } from "@/game/types";
import type { CharacterDTO, CreateRoomInput, Me, Result } from "./contract";

const todo = (): never => {
  throw new Error("not implemented");
};

// --- rooms ------------------------------------------------------------------
export async function createRoom(
  _input: CreateRoomInput,
): Promise<Result<{ code: string }>> {
  return todo();
}
/** Idempotent: joining a room you are already in succeeds. */
export async function joinRoom(
  _code: string,
): Promise<Result<{ code: string }>> {
  return todo();
}
export async function leaveRoom(_code: string): Promise<Result> {
  return todo();
}
/** Host only, lobby only. */
export async function updateSettings(
  _code: string,
  _settings: Partial<RoomSettings>,
): Promise<Result> {
  return todo();
}
export async function setReady(
  _code: string,
  _ready: boolean,
): Promise<Result> {
  return todo();
}
/** Host only, 2+ players. Draws the theme (AI, or the theme bank) and the picking ring. */
export async function startGame(_code: string): Promise<Result> {
  return todo();
}

// --- match ------------------------------------------------------------------
export async function confirmPick(
  _code: string,
  _characterId: string,
): Promise<Result> {
  return todo();
}
export async function askQuestion(
  _code: string,
  _text: string,
): Promise<Result> {
  return todo();
}
export async function answerQuestion(
  _code: string,
  _value: AnswerValue,
  _note: string | null,
): Promise<Result> {
  return todo();
}
/** "hit" = matched the name closely, no validation needed. */
export async function submitGuess(
  _code: string,
  _text: string,
): Promise<Result<{ outcome: "hit" | "validating" }>> {
  return todo();
}
export async function passTurn(_code: string): Promise<Result> {
  return todo();
}
/** Only the player who picked the character under guess. */
export async function validateGuess(
  _code: string,
  _correct: boolean,
): Promise<Result> {
  return todo();
}
export async function giveUp(_code: string): Promise<Result> {
  return todo();
}
/** Host only, from the result screen: same room, new theme. */
export async function rematch(_code: string): Promise<Result> {
  return todo();
}

// --- character library --------------------------------------------------------
/** FormData: name, origin (optional), lang, image (File, already cropped 4:5 by the browser). */
export async function createCharacter(
  _form: FormData,
): Promise<Result<CharacterDTO>> {
  return todo();
}
/** FormData: id, image (File). The new image becomes the library's image for that character. */
export async function replaceCharacterImage(
  _form: FormData,
): Promise<Result<CharacterDTO>> {
  return todo();
}

// --- identity -----------------------------------------------------------------
/** FormData: name, color, avatar ("color" | "provider" | "upload"), image (File when avatar = upload). Accounts only. */
export async function updateProfile(_form: FormData): Promise<Result<Me>> {
  return todo();
}
export async function signOut(): Promise<Result> {
  return todo();
}
/** Local mode only: flips the current guest into a fake account so the profile screen can be used without Supabase. */
export async function useTestAccount(): Promise<Result<Me>> {
  return todo();
}
