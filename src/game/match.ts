// Deciding whether a typed guess is the character's name.
// CONTRACT: these signatures are fixed; the bodies are the engine's job.

/** Lowercase, no accents, no punctuation or spaces, katakana folded to hiragana. */
export function normalizeName(_text: string): string {
  throw new Error("not implemented");
}

/** Exact after normalising, or a typo away, from any of the names. */
export function isCloseMatch(_guess: string, _names: string[]): boolean {
  throw new Error("not implemented");
}
