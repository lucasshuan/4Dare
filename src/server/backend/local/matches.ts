import "server-only";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { type PlayedMatch, totalsOf } from "@/game/profile/history";
import type { MatchRecord, PlayerRecord } from "@/game/record";
import type { Lang } from "@/game/types";
import { type PickStat, pickKey } from "../../theme-picks";
import type { MatchStore } from "../types";
import { dataPath, processSingleton, readJson, writeJson } from "./disk";

/** Fit votes: { "theme|character|voter": { lang, fits } }. */
const VOTES_FILE = "fit-votes.json";

/** One picker of a character for a theme, as table whoami_theme_pickers keeps them. */
interface Picker {
  id: string;
  lang: Lang;
  suggested: boolean;
}

/**
 * Each player once per theme and character, by theme ("character|picker"),
 * as record_match does: the clock's picks left out, a pick of their own
 * replacing one the hand or the dice offered.
 */
function tallyPickers(
  records: Iterable<MatchRecord>,
  into = new Map<string, Map<string, Picker>>(),
) {
  for (const m of records) {
    // A theme the host typed has no themeId.
    if (!m.themeId) continue;
    for (const p of m.players) {
      const id = p.autoPicked ? null : pickKey(p.characterId);
      if (!id || !p.pickedById) continue;
      const theme = into.get(m.themeId) ?? new Map<string, Picker>();
      const key = `${id}|${p.pickedById}`;
      const suggested = p.suggested ?? false;
      const known = theme.get(key);
      if (!known || (known.suggested && !suggested))
        theme.set(key, { id, lang: p.pickerLang ?? p.lang, suggested });
      into.set(m.themeId, theme);
    }
  }
  return into;
}

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** A player's part of a saved match, as player_matches reads it. */
function playedMatch(m: MatchRecord, p: PlayerRecord): PlayedMatch {
  const gave = m.players.find(
    (q) => q.pickedById === p.userId && !q.autoPicked,
  );
  return {
    matchId: m.id,
    // lines saved before there were other games
    game: m.game ?? "who-am-i",
    finishedAt: m.finishedAt,
    place: p.place,
    timeMs: p.timeMs,
    xp: p.xp ?? 0,
    others: m.players
      .filter((q) => q.userId !== p.userId)
      .map((q) => ({ id: q.userId, place: q.place, guest: q.wasGuest })),
    details: {
      themeId: m.themeId,
      theme: m.theme,
      result: p.result,
      questions: p.questions,
      guesses: p.guesses,
      discoveredAt: p.discoveredAt,
      characterId: p.characterId,
      characterName: p.characterName,
      pickedBy: p.pickedById,
      gave: gave
        ? {
            to: gave.userId,
            characterId: gave.characterId,
            characterName: gave.characterName,
            result: gave.result,
            questions: gave.questions,
          }
        : null,
    },
  };
}

/** Local mode: one JSON line per finished match, appended to .data/matches.jsonl. */
export function localMatches(): MatchStore {
  const path = dataPath("matches.jsonl");
  const read = (): MatchRecord[] => {
    try {
      return readFileSync(/* turbopackIgnore: true */ path, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as MatchRecord);
    } catch {
      return [];
    }
  };
  const saved = processSingleton(
    "saved-matches",
    () => new Set(read().map((m) => m.id)),
  );
  const pickers = processSingleton("theme-pickers", () => tallyPickers(read()));
  const votes = processSingleton(
    "fit-votes",
    () =>
      new Map(
        Object.entries(
          readJson<Record<string, { lang: Lang; fits: boolean }>>(
            VOTES_FILE,
            {},
          ),
        ),
      ),
  );

  const history = async (userId: string) =>
    read()
      .flatMap((m) =>
        m.players
          .filter((p) => p.userId === userId)
          .map((p) => playedMatch(m, p)),
      )
      .sort((a, b) => b.finishedAt - a.finishedAt);

  return {
    async record(match) {
      if (saved.has(match.id)) return;
      // The day's first match gives its bonus, as record_match does.
      const day = utcDay(match.finishedAt);
      const playedToday = new Set(
        read()
          .filter((m) => utcDay(m.finishedAt) === day)
          .flatMap((m) => m.players.map((p) => p.userId)),
      );
      const kept: MatchRecord = {
        ...match,
        players: match.players.map((p) => ({
          ...p,
          xp: p.xp + (playedToday.has(p.userId) ? 0 : match.dayBonus),
        })),
      };
      mkdirSync(/* turbopackIgnore: true */ dirname(path), { recursive: true });
      appendFileSync(
        /* turbopackIgnore: true */ path,
        `${JSON.stringify(kept)}\n`,
      );
      saved.add(match.id);
      tallyPickers([match], pickers);
    },
    async played(userIds) {
      const all = new Set(
        read().flatMap((m) => m.players.map((p) => p.userId)),
      );
      return new Set(userIds.filter((id) => all.has(id)));
    },
    async reassign(fromUserId, toUserId) {
      const all = read();
      let changed = false;
      for (const match of all) {
        // Never two rows for the same person in one match.
        const seated = match.players.some((p) => p.userId === toUserId);
        for (const p of match.players) {
          if (p.pickedById === fromUserId) {
            p.pickedById = toUserId;
            changed = true;
          }
          if (seated || p.userId !== fromUserId) continue;
          p.userId = toUserId;
          changed = true;
        }
      }
      if (!changed) return;
      const tmp = `${path}.tmp`;
      writeFileSync(
        /* turbopackIgnore: true */ tmp,
        all.map((m) => `${JSON.stringify(m)}\n`).join(""),
      );
      renameSync(/* turbopackIgnore: true */ tmp, path);
    },
    async themeStats(themeId, limit) {
      const out = new Map<string, PickStat>();
      const stat = (id: string, lang: Lang) => {
        const key = `${id}|${lang}`;
        const known = out.get(key);
        if (known) return known;
        const made = { id, lang, picks: 0, suggested: 0, fits: 0, misfits: 0 };
        out.set(key, made);
        return made;
      };
      for (const p of pickers.get(themeId)?.values() ?? []) {
        const s = stat(p.id, p.lang);
        if (p.suggested) s.suggested += 1;
        else s.picks += 1;
      }
      for (const [key, v] of votes) {
        const [theme, id] = key.split("|");
        if (theme !== themeId) continue;
        const s = stat(id, v.lang);
        if (v.fits) s.fits += 1;
        else s.misfits += 1;
      }
      const busy = (s: PickStat) => s.picks + s.suggested + s.fits;
      return [...out.values()]
        .sort(
          (a, b) =>
            busy(b) - busy(a) ||
            a.id.localeCompare(b.id) ||
            a.lang.localeCompare(b.lang),
        )
        .slice(0, limit);
    },
    async voteFit(v) {
      votes.set(`${v.themeId}|${v.characterId}|${v.voterId}`, {
        lang: v.lang,
        fits: v.fits,
      });
      writeJson(VOTES_FILE, Object.fromEntries(votes));
    },
    history,
    async playedTogether(a, b) {
      return (
        a !== b &&
        read().some(
          (m) =>
            m.players.some((p) => p.userId === a) &&
            m.players.some((p) => p.userId === b),
        )
      );
    },
    async totals(userId) {
      return totalsOf(await history(userId));
    },
  };
}
