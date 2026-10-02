// A question always ends with a question mark. The input shows it as a fixed
// suffix the player can't delete, and the server adds one if it is missing.
import type { Lang } from "./types";

/** One or more question marks at the end, Latin or full-width (Japanese). */
const TRAILING_MARKS = /[?？]+$/;

/** The mark the suffix shows and the question gets: full-width in Japanese. */
export const questionMark = (lang: Lang) => (lang === "ja" ? "？" : "?");

/** What the player typed, minus the marks at the end: the suffix stands in for them. */
export const withoutQuestionMark = (text: string) =>
  text.replace(TRAILING_MARKS, "");

/** The question as sent: trimmed, its own trailing marks swapped for one `mark`. */
export const withQuestionMark = (text: string, mark: string) =>
  `${withoutQuestionMark(text.trim()).trimEnd()}${mark}`;

/** True when the text already ends with a question mark. */
export const endsWithQuestionMark = (text: string) => TRAILING_MARKS.test(text);
