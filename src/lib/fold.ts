/** Case- and accent-insensitive text for a search, so "joao" finds "João". */
export const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
