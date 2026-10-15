"use client";

import type { GameKey } from "@/game/games";
import {
  leavesOf,
  TUNABLES,
  type Tunable,
  type TuneTab,
} from "@/game/tunables";
import { showValue, useDraft } from "../config/draft";
import {
  DefaultValue,
  Locked,
  ResetEdits,
  TuneChoice,
  TuneNumber,
  TuneSwitch,
} from "../config/fields";

/** A tab's entries for a game (its own and the shared ones), by group in the registry's order. */
function groupsOf(tab: TuneTab, game: GameKey) {
  const groups = new Map<
    string,
    { name: string; shared: boolean; rows: Tunable[] }
  >();
  for (const e of TUNABLES) {
    if (e.tab !== tab || (e.game !== "shared" && e.game !== game)) continue;
    const shared = e.game === "shared";
    const id = `${e.group}|${shared}`;
    const g = groups.get(id) ?? { name: e.group, shared, rows: [] };
    g.rows.push(e);
    groups.set(id, g);
  }
  return [...groups.values()];
}

/** The scenes' lengths and the clocks rooms can't set: first match and rematch. */
export function TimingTab({ game }: { game: GameKey }) {
  const d = useDraft();
  return (
    <>
      {groupsOf("timing", game).map((g) => (
        <div
          key={`${g.name}${g.shared}`}
          className="card"
          style={{ marginBottom: 16 }}
        >
          <header>
            <h2>{g.name}</h2>
            {g.shared ? (
              <span className="chip">vale para todos os jogos</span>
            ) : null}
          </header>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>O que controla</th>
                  <th className="r">Primeira</th>
                  <th className="r">Revanche</th>
                  <th>Padrão</th>
                  <th>Onde está</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {g.rows.map((e) => {
                  const leaves = leavesOf(e);
                  const pair = leaves.length === 2;
                  const dirty = leaves.some((k) => k in d.edits);
                  const [first, later] = pair ? leaves : [leaves[0], null];
                  return (
                    <tr key={e.key} className={dirty ? "dirty" : undefined}>
                      <td>
                        <b>{e.label}</b>
                        {e.locked ? <Locked why={e.locked} /> : null}
                      </td>
                      <td className="r">
                        <TuneNumber
                          k={first}
                          label={
                            pair ? `${e.label}, primeira partida` : e.label
                          }
                        />
                      </td>
                      <td className="r">
                        {later ? (
                          <TuneNumber
                            k={later}
                            label={`${e.label}, revanche`}
                          />
                        ) : e.firstOnly ? (
                          <span className="muted">—</span>
                        ) : (
                          <span className="muted">igual</span>
                        )}
                      </td>
                      <td className="mono muted">
                        {leaves.map((k, i) => (
                          <span key={k}>
                            {i ? " / " : ""}
                            <DefaultValue k={k} />
                          </span>
                        ))}
                      </td>
                      <td className="ref">{e.src}</td>
                      <td className="r">
                        <ResetEdits keys={leaves} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}

/** One row of a settings list: the label, the field, the default and a way back. */
export function TuneRow({ e, k }: { e: Tunable; k: string }) {
  const d = useDraft();
  const dirty = k in d.edits;
  const field =
    e.unit === "bool" ? (
      <TuneSwitch k={k} label={e.label} />
    ) : e.unit === "choice" ? (
      <TuneChoice k={k} label={e.label} size="sm" />
    ) : (
      <TuneNumber k={k} label={e.label} />
    );
  return (
    <div
      className={dirty ? "slot dirty" : "slot"}
      style={{ gridTemplateColumns: "minmax(0,1fr) auto auto" }}
    >
      <span className="lbl">
        <b>{e.label}</b>
        <small>
          padrão <DefaultValue k={k} />
          {e.min !== undefined &&
          e.max !== undefined &&
          e.unit !== "bool" &&
          e.unit !== "choice"
            ? ` · ${showValue(k, e.min)}–${showValue(k, e.max)}`
            : ""}
        </small>
      </span>
      {field}
      <ResetEdits keys={[k]} />
    </div>
  );
}

/** What a new room starts with and the ranges its host can pick from; then what rooms don't show. */
export function DefaultsTab({ game }: { game: GameKey }) {
  const d = useDraft();
  const groups = groupsOf("defaults", game);
  const clocks = TUNABLES.filter(
    (e) =>
      e.tab === "defaults" &&
      e.unit === "s" &&
      e.group === "Padrões da sala" &&
      e.key.endsWith("Seconds") &&
      (e.game === game || e.game === "shared"),
  );
  return (
    <div className="grid g2">
      <div className="stack">
        {groups.map((g) => (
          <div key={`${g.name}${g.shared}`} className="card">
            <header>
              <h2>{g.name}</h2>
              {g.shared ? (
                <span className="chip">vale para todos os jogos</span>
              ) : null}
            </header>
            {g.rows.map((e) => (
              <TuneRow key={e.key} e={e} k={e.key} />
            ))}
          </div>
        ))}
      </div>
      <div className="stack">
        <div className="card">
          <header>
            <h2>Como aparece ao criar sala</h2>
          </header>
          <div
            style={{
              background: "var(--canvas)",
              borderRadius: 16,
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            {clocks.map((e) => (
              <div
                key={e.key}
                className="row"
                style={{ justifyContent: "space-between" }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>{e.label}</span>
                <span
                  className="mono"
                  style={{
                    background: "var(--surface)",
                    borderRadius: 999,
                    padding: "3px 12px",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {showValue(e.key, d.value(e.key))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** What a match gives: the same base for every game, then the game's own feats. */
export function XpTab({ game }: { game: GameKey }) {
  return (
    <div className="grid g2">
      {groupsOf("xp", game).map((g) => (
        <div key={`${g.name}${g.shared}`} className="card">
          <header>
            <h2>{g.shared ? "Todos os jogos" : "Deste jogo"}</h2>
            <span className="chip">{g.name}</span>
          </header>
          {g.rows.map((e) => (
            <TuneRow key={e.key} e={e} k={e.key} />
          ))}
        </div>
      ))}
    </div>
  );
}
