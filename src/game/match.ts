// Deciding whether a typed guess is the character's name.

const ARTICLES = new Set(["the", "a", "an", "o", "os", "as", "um", "uma"]);

// Built from code points so the source stays readable (no invisible combining marks).
const range = (from: number, to: number) =>
  new RegExp(`[${String.fromCharCode(from)}-${String.fromCharCode(to)}]`, "g");
/** Latin combining accents only: NFD also splits Japanese voiced marks (が → か + ゙), which stay. */
const LATIN_ACCENTS = range(0x300, 0x36f);
/** Katakana ァ..ヶ (U+30A1–30F6), folded onto hiragana 0x60 below. */
const KATAKANA = range(0x30a1, 0x30f6);
const NOT_WORD = /[^\p{L}\p{N}]/gu;
const toHiragana = (c: string) => String.fromCharCode(c.charCodeAt(0) - 0x60);

/** Lowercase, no accents, no punctuation or spaces, katakana folded to hiragana, no leading article. */
export function normalizeName(text: string): string {
  const folded = text
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(LATIN_ACCENTS, "")
    .normalize("NFC")
    .replace(KATAKANA, toHiragana);
  const words = folded.trim().split(/\s+/);
  if (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join("").replace(NOT_WORD, "");
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Exact after normalising, or a typo away (1 from 5 letters, 2 from 10), from any of the names. */
export function isCloseMatch(guess: string, names: string[]): boolean {
  const g = normalizeName(guess);
  if (!g) return false;
  return names.some((name) => {
    const n = normalizeName(name);
    if (!n) return false;
    if (n === g) return true;
    const allowed = n.length >= 10 ? 2 : n.length >= 5 ? 1 : 0;
    return allowed > 0 && editDistance(g, n, allowed) <= allowed;
  });
}
