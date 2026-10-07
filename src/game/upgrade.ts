// Rooms written before a settings field existed, brought up to date when read.
import { DEFAULT_SETTINGS, type RoomSettings, type RoomState } from "./types";

type Saved = Partial<RoomSettings> & { themeSets?: unknown };

/**
 * A room saved before a setting existed takes its default: before gostos it
 * kept theme sets (they go, and every gosto and theme starts on), before the
 * Impostor it had none of that game's clocks.
 */
export function upgradeRoom(state: RoomState): RoomState {
  const saved = state.settings as Saved;
  const missing = (
    Object.keys(DEFAULT_SETTINGS) as (keyof RoomSettings)[]
  ).some((k) => !(k in saved));
  if (!missing && !("themeSets" in saved)) return state;
  const { themeSets: _sets, ...settings } = saved;
  return {
    ...state,
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      offGostos: Array.isArray(saved.offGostos) ? saved.offGostos : [],
      offThemes: Array.isArray(saved.offThemes) ? saved.offThemes : [],
    },
  };
}
