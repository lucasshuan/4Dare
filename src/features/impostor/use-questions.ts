"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { BankQuestion, QuestionLabel } from "@/game/impostor/questions";
import type { Lang } from "@/game/types";

/** The question bank by id: the match carries ids, the words come from here (cached). */
export function useQuestionBank(): Map<string, BankQuestion> | undefined {
  const { data } = useQuery({
    queryKey: ["impostor-questions"],
    queryFn: async () => {
      const res = await fetch("/api/impostor/questions");
      if (!res.ok) throw new Error(`impostor questions: ${res.status}`);
      const { questions } = (await res.json()) as {
        questions: BankQuestion[];
      };
      return new Map(questions.map((q) => [q.id, q]));
    },
    staleTime: 10 * 60_000,
  });
  return data;
}

/** One question of the bank, null until the bank arrives (or when it is gone from it). */
export function useQuestion(id: string | null | undefined) {
  const bank = useQuestionBank();
  return id ? (bank?.get(id) ?? null) : null;
}

/** A question's text and labels in the page's language. */
export function useWords() {
  const lang = useLocale() as Lang;
  return {
    text: (q: BankQuestion | null) => q?.text[lang] ?? "",
    label: (l: QuestionLabel) => l.text[lang],
  };
}
