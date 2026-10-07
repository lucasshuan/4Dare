// Rooms written before a settings field existed, brought up to date when read.
import type { RoomSettings, RoomState } from "./types";

type Saved = RoomSettings & { themeSets?: unknown };

/**
 * A room saved before gostos keeps its old theme sets and lacks the lists
 * that replaced them: the sets go and every gosto and theme starts on.
 */
export function upgradeRoom(state: RoomState): RoomState {
  const saved = state.settings as Saved;
  if (
    Array.isArray(saved.offGostos) &&
    Array.isArray(saved.offThemes) &&
    !("themeSets" in saved)
  )
    return state;
  const { themeSets: _sets, ...settings } = saved;
  return {
    ...state,
    settings: {
      ...settings,
      offGostos: Array.isArray(saved.offGostos) ? saved.offGostos : [],
      offThemes: Array.isArray(saved.offThemes) ? saved.offThemes : [],
    },
  };
}
