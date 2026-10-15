// What a lab moment is made of, kept whole so a link brings it back exactly.
import type { RoomState } from "@/game/types";
import type { LabInput, LabKit, LabSettings } from "./sim";

export type LabDevice = "phone" | "desktop";

export interface LabScene {
  settings: LabSettings;
  /** What the server dealt for this match. */
  kit: LabKit;
  /** Moves made by hand. */
  inputs: LabInput[];
  /** The moment on screen (ms after the match's first state). */
  at: number;
  /** Whose screen it is. */
  seat: number;
  /** The seat on screen is played by hand (the bots leave it alone). */
  hand: boolean;
  device: LabDevice;
  theme: "light" | "dark";
  speed: number;
  /** A real room's state it started from (loaded from the rooms list). */
  from?: RoomState;
}

/** The speeds the lab plays at. */
export const LAB_SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

/** The screen sizes the frames take. */
export const DEVICES: Record<LabDevice, { w: number; h: number }> = {
  phone: { w: 390, h: 844 },
  desktop: { w: 1366, h: 820 },
};
