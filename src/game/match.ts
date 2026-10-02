// Deciding whether a typed guess is the character's name.

const ARTICLES = new Set(["the", "a", "an", "o", "os", "as", "um", "uma"]);

const inRange = (c: string, from: number, to: number) => {
  const code = c.charCodeAt(0);
  return code >= from && code <= to;
};

/** Lowercase, no accents, no punctuation or spaces, katakana folded to hiragana, no leading article. */
export function normalizeName(text: string): string {
  // Only Latin combining accents (U+0300–036F) go: NFD also splits Japanese voiced marks (が → か + ゙).
  const noAccents = [...text.normalize("NFKC").toLowerCase().normalize("NFD")]
    .filter((c) => !inRange(c, 0x300, 0x36f))
    .join("")
    .normalize("NFC");
  // Katakana ァ..ヶ (U+30A1–30F6) map onto hiragana 0x60 below.
  const hiragana = [...noAccents]
    .map((c) =>
      inRange(c, 0x30a1, 0x30f6)
        ? String.fromCharCode(c.charCodeAt(0) - 0x60)
        : c,
    )
    .join("");
  const words = hiragana.trim().split(/\s+/);
  if (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join("").replace(/[^\p{L}\p{N}]/gu, "");
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
