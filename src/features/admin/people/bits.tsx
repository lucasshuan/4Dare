"use client";

import {
  BadgeCheck,
  Ban,
  Check,
  Crown,
  Eye,
  Flag,
  Gamepad2,
  Image as ImageIcon,
  Info,
  Link2,
  MessageSquare,
  Pencil,
  Tags,
  TriangleAlert,
  VolumeX,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { guestAvatar, guestName } from "@/game/guest-names";
import type {
  PersonRef,
  ReportKind,
  Sanction,
} from "@/server/backend/people-types";
import type { Role } from "@/server/contract";

export const ROLE_PT: Record<Role, string> = {
  admin: "Admin",
  curator: "Curador",
  player: "Jogador",
};
export const ROLE_ICON = {
  admin: Crown,
  curator: BadgeCheck,
  player: Gamepad2,
};

export function RoleChip({ of }: { of: Role }) {
  const Icon = ROLE_ICON[of];
  return (
    <span className={`role ${of}`}>
      <Icon className="i" />
      {ROLE_PT[of]}
    </span>
  );
}

/** A person's name: an account's, else their guest name (a number names a guest). */
export function nameOf(p: Pick<PersonRef, "name" | "guestNumber">) {
  if (p.name) return p.name;
  if (p.guestNumber !== null) return guestName(p.guestNumber, "pt");
  return "Convidado";
}

export function faceOf(p: Pick<PersonRef, "avatar" | "guestNumber">) {
  return p.avatar ?? guestAvatar(p.guestNumber ?? 0);
}

/** A person with their face, opening their drawer. */
export function PersonChip({
  p,
  size = 26,
  onOpen,
}: {
  p: PersonRef;
  size?: 24 | 26 | 30 | 32;
  onOpen?: (id: string) => void;
}) {
  const body = (
    <>
      <Avatar avatar={faceOf(p)} size={size} />
      <span>
        {nameOf(p)}
        <small>
          {p.account ? (p.handle ? `@${p.handle}` : "conta") : "sem conta"}
        </small>
      </span>
    </>
  );
  return onOpen ? (
    <button
      type="button"
      className="ulink"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(p.id);
      }}
    >
      {body}
    </button>
  ) : (
    <span className="ulink">{body}</span>
  );
}

export const REASON: Record<string, [string, typeof Link2]> = {
  spam: ["Spam ou links", Link2],
  offensive: ["Ofensivo ou abusivo", TriangleAlert],
  cheating: ["Trapaça ou spoiler", Eye],
  other: ["Outro motivo", Info],
};

export function ReasonChip({ reason }: { reason: string }) {
  const [label, Icon] = REASON[reason] ?? REASON.other;
  return (
    <span className={`rchip ${reason}`}>
      <Icon className="i" />
      {label}
    </span>
  );
}

export const KIND: Record<ReportKind, [string, typeof Link2]> = {
  room: ["Na sala", MessageSquare],
  mural: ["No mural", Pencil],
  pic: ["Foto", ImageIcon],
  alias: ["Apelido", Tags],
};

export function KindChip({ kind, n = 1 }: { kind: ReportKind; n?: number }) {
  const [label, Icon] = KIND[kind];
  return (
    <span className="kchip2">
      <Icon className="i" />
      {label}
      {n > 1 ? <b className="mono"> {n}</b> : null}
    </span>
  );
}

export const SANCTION: Record<Sanction["kind"], [string, typeof Ban]> = {
  warn: ["Advertido", TriangleAlert],
  mute: ["Silenciado", VolumeX],
  ban: ["Banido", Ban],
  none: ["Arquivado", Check],
};

export const untilText = (s: Pick<Sanction, "until">) =>
  s.until
    ? `até ${new Date(s.until).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    : "para sempre";

export function SanctionChip({ s }: { s: Sanction }) {
  const [label, Icon] = SANCTION[s.kind];
  return (
    <span className={`schip ${s.kind === "ban" ? "refused" : "review"}`}>
      <Icon className="i" />
      {label}
      {s.kind === "warn" || s.kind === "none" ? "" : ` ${untilText(s)}`}
    </span>
  );
}

export function OpenChip({ n }: { n: number }) {
  return n ? (
    <span className="schip refused">
      <Flag className="i" />
      {n} {n === 1 ? "aberta" : "abertas"}
    </span>
  ) : (
    <span className="schip live">
      <Check className="i" />
      Resolvida
    </span>
  );
}
