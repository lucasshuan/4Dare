"use client";

import {
  ClipboardCheck,
  HelpCircle,
  Lightbulb,
  Radio,
  Tags,
  Vote,
  X,
} from "lucide-react";

export const KIND = {
  theme: ["Tema", Tags],
  question: ["Pergunta", HelpCircle],
  mission: ["Missão", Lightbulb],
} as const;
export const STATE = {
  voting: ["Em votação", Vote],
  review: ["Em verificação", ClipboardCheck],
  live: ["No ar", Radio],
  refused: ["De fora", X],
} as const;

export function KindChip({ kind }: { kind: keyof typeof KIND }) {
  const [l, Icon] = KIND[kind];
  return (
    <span className={`kchip ${kind}`}>
      <Icon className="i" />
      {l}
    </span>
  );
}

export function StateChip({ status }: { status: keyof typeof STATE }) {
  const [l, Icon] = STATE[status];
  return (
    <span className={`schip ${status}`}>
      <Icon className="i" />
      {l}
    </span>
  );
}
