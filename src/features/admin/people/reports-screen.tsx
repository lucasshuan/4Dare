"use client";

import { Ban, Check, Flag, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReportGroup } from "@/server/admin/people";
import type { ReportKind } from "@/server/backend/people-types";
import { ago } from "../format";
import { usePaged } from "../ui/pager";
import { AdminSelect } from "../ui/select";
import {
  KIND,
  KindChip,
  nameOf,
  OpenChip,
  PersonChip,
  ReasonChip,
  SanctionChip,
} from "./bits";
import { usePersonDrawer } from "./person-drawer";

type Status = "open" | "sanctioned" | "done" | "all";
const STATUS: [Status, string, typeof Flag | null][] = [
  ["open", "Abertas", Flag],
  ["sanctioned", "Com punição", Ban],
  ["done", "Resolvidas", Check],
  ["all", "Todas", null],
];

const fits = (g: ReportGroup, s: Status) =>
  s === "open"
    ? g.open > 0
    : s === "sanctioned"
      ? !!g.standing.active
      : s === "done"
        ? g.open === 0
        : true;

/** People reported, by person: how many, where, why, and what was done. */
export function ReportsScreen({ groups }: { groups: ReportGroup[] }) {
  const { open } = usePersonDrawer();
  const [status, setStatus] = useState<Status>(
    groups.some((g) => g.open) ? "open" : "all",
  );
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | ReportKind>("all");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^@/, "");
    return groups.filter(
      (g) =>
        fits(g, status) &&
        (kind === "all" || g.reports.some((r) => r.kind === kind)) &&
        (!needle ||
          `${nameOf(g.person)} ${g.person.handle ?? ""}`
            .toLowerCase()
            .includes(needle)),
    );
  }, [groups, status, q, kind]);
  const { rows: shown, pager } = usePaged(
    rows,
    20,
    JSON.stringify([status, q, kind]),
  );
  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Denúncias</h1>
        </div>
      </div>
      <div className="filters">
        <fieldset className="seg" aria-label="Status">
          {STATUS.map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={status === k}
              onClick={() => setStatus(k)}
            >
              {Icon ? <Icon className="i" /> : null}
              {l}{" "}
              <span className="mono muted">
                {groups.filter((g) => fits(g, k)).length}
              </span>
            </button>
          ))}
        </fieldset>
        <label className="field">
          <Search className="i" />
          <input
            type="search"
            placeholder="Nome ou @"
            value={q}
            aria-label="Buscar"
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <AdminSelect
          label="Onde"
          value={kind}
          onChange={(v) => setKind(v as "all" | ReportKind)}
          options={[
            {
              value: "all",
              label: "Qualquer lugar",
              icon: <Flag className="size-4" />,
            },
            ...(Object.keys(KIND) as ReportKind[]).map((k) => {
              const [l, Icon] = KIND[k];
              return { value: k, label: l, icon: <Icon className="size-4" /> };
            }),
          ]}
        />
      </div>
      {rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th className="r">Denúncias</th>
                <th>Onde</th>
                <th>Motivos</th>
                <th>Última</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((g) => {
                const kinds = (Object.keys(KIND) as ReportKind[]).filter((k) =>
                  g.reports.some((r) => r.kind === k),
                );
                const reasons = [
                  ...new Set(
                    g.reports.flatMap((r) => (r.reason ? [r.reason] : [])),
                  ),
                ];
                return (
                  <tr
                    key={g.person.id}
                    className="click"
                    onClick={() => open(g.person.id, "mod")}
                  >
                    <td>
                      <PersonChip p={g.person} size={30} />
                    </td>
                    <td className="r">
                      <b className="mono">{g.reports.length}</b>
                    </td>
                    <td>
                      <span className="row" style={{ gap: 4 }}>
                        {kinds.map((k) => (
                          <KindChip
                            key={k}
                            kind={k}
                            n={g.reports.filter((r) => r.kind === k).length}
                          />
                        ))}
                      </span>
                    </td>
                    <td>
                      <span className="row" style={{ gap: 4 }}>
                        {reasons.length ? (
                          reasons.map((r) => <ReasonChip key={r} reason={r} />)
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </span>
                    </td>
                    <td>{ago(g.last)}</td>
                    <td>
                      <span className="row" style={{ gap: 4 }}>
                        {g.standing.active ? (
                          <SanctionChip s={g.standing.active} />
                        ) : null}
                        {g.open || !g.standing.active ? (
                          <OpenChip n={g.open} />
                        ) : null}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nenhuma denúncia com esses filtros.</div>
      )}
      {pager}
    </>
  );
}
