"use client";

import {
  DoorOpen,
  FlaskConical,
  Gamepad2,
  LayoutGrid,
  Power,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { GameThumb } from "@/features/create/game-info";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { closeIdleAction } from "@/server/admin/actions";
import type { AdminRoom } from "@/server/admin/rooms";
import { ago } from "../format";
import { useAdminHref } from "../shell/base";
import { usePaged } from "../ui/pager";
import { AdminSelect } from "../ui/select";

type Status = "all" | "lobby" | "playing";

/** The open rooms: lobby or playing, for how long, and how to look into one. */
export function RoomsScreen({
  rooms,
  names,
}: {
  rooms: AdminRoom[];
  names: Record<GameKey, string>;
}) {
  const router = useRouter();
  const href = useAdminHref();
  const [status, setStatus] = useState<Status>("all");
  const [game, setGame] = useState("all");
  const [fresh, setFresh] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rows = useMemo(() => {
    const now = Date.now();
    return rooms.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (game === "all" || r.game === game) &&
        (!fresh || now - r.updatedAt < 3600e3),
    );
  }, [rooms, status, game, fresh]);
  const { rows: shown, pager } = usePaged(
    rows,
    20,
    JSON.stringify([status, game, fresh]),
  );
  const idle = rooms.filter((r) => Date.now() - r.updatedAt > 30 * 60e3).length;
  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">Operação</p>
          <h1>Salas</h1>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={!idle}
            onClick={async () => {
              const r = await closeIdleAction();
              if (r.ok) {
                setToast(
                  `${r.data} ${r.data === 1 ? "sala encerrada" : "salas encerradas"}`,
                );
                window.setTimeout(() => setToast(null), 2600);
                router.refresh();
              }
            }}
          >
            <Power className="i" />
            Encerrar paradas há 30 min{idle ? ` (${idle})` : ""}
          </button>
        </div>
      </div>
      <div className="filters">
        <fieldset className="seg" aria-label="Status">
          {(
            [
              ["all", "Todas", LayoutGrid],
              ["lobby", "Lobby", DoorOpen],
              ["playing", "Jogando", Gamepad2],
            ] as const
          ).map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={status === k}
              onClick={() => setStatus(k)}
            >
              <Icon className="i" />
              {l}{" "}
              <span className="mono muted">
                {rooms.filter((r) => k === "all" || r.status === k).length}
              </span>
            </button>
          ))}
        </fieldset>
        <AdminSelect
          label="Jogo"
          value={game}
          onChange={setGame}
          options={[
            { value: "all", label: "Todos os jogos" },
            ...GAME_KEYS.map((g) => ({
              value: g,
              label: names[g],
              icon: <GameThumb game={g} size="tiny" />,
            })),
          ]}
        />
        <span
          className="row"
          style={{ gap: 8, fontSize: 13.5, fontWeight: 600 }}
        >
          <Switch
            checked={fresh}
            onCheckedChange={setFresh}
            aria-label="Só ativas"
          />
          Só com atividade na última hora
        </span>
      </div>
      {rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Código</th>
                <th>Sala</th>
                <th>Jogo</th>
                <th>Status</th>
                <th className="r">Jogadores</th>
                <th>Última atividade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.code}>
                  <td className="mono">
                    <b>{r.code}</b>
                  </td>
                  <td>{r.name || <span className="muted">—</span>}</td>
                  <td>
                    <span className="nm">
                      <GameThumb game={r.game} size="tiny" />
                      {names[r.game]}
                    </span>
                  </td>
                  <td>
                    <span className={`rstat ${r.status}`}>
                      {r.status === "playing" ? (
                        <Gamepad2 className="i" />
                      ) : (
                        <DoorOpen className="i" />
                      )}
                      {r.status === "playing" ? "Jogando" : "Lobby"}{" "}
                      <span className="muted">{ago(r.since)}</span>
                    </span>
                  </td>
                  <td className="r mono">{r.players}</td>
                  <td>{ago(r.updatedAt)}</td>
                  <td className="r">
                    <Link className="btn sm" href={href(`/lab?room=${r.code}`)}>
                      <FlaskConical className="i" />
                      Abrir no laboratório
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">Nenhuma sala com esses filtros.</div>
      )}
      {pager}
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
