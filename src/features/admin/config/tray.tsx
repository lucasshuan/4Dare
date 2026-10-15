"use client";

import { useState } from "react";
import { entryOf } from "@/game/tunables";
import { showValue, useDraft } from "./draft";

/** The unsaved changes at the bottom of every page: the list, discard, and save as a new version. */
export function Tray() {
  const d = useDraft();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const keys = Object.keys(d.edits);
  if (!keys.length) return null;
  return (
    <section className="tray" aria-label="Alterações não salvas">
      <div className="tb">
        <b>Alterações não salvas</b>
        <span className="n">{keys.length}</span>
        <span className="spacer" />
        <button
          type="button"
          className="btn sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Ocultar" : "Ver"}
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={d.discard}
          disabled={d.saving}
        >
          Descartar
        </button>
        <button
          type="button"
          className="btn sm save"
          disabled={d.saving}
          onClick={async () => {
            if (await d.save(note)) {
              setNote("");
              setOpen(false);
            }
          }}
        >
          {d.saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {open ? (
        <>
          <ul>
            {keys.map((k) => {
              const e = entryOf(k);
              const pair = k.endsWith(".first")
                ? " · primeira"
                : k.endsWith(".later")
                  ? " · revanche"
                  : "";
              return (
                <li key={k}>
                  <span>
                    {e?.label ?? k}
                    {pair}
                    <small>{k}</small>
                  </span>
                  <span className="d">
                    <s>{showValue(k, d.live(k))}</s> →{" "}
                    <b>{showValue(k, d.edits[k])}</b>
                  </span>
                </li>
              );
            })}
          </ul>
          <label className="tray-note">
            <span>Nota da versão</span>
            <input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="O que mudou e por quê (opcional)"
            />
          </label>
        </>
      ) : null}
      {d.error ? <p className="tray-err">{d.error}</p> : null}
    </section>
  );
}
