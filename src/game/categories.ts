// What kind of character someone is, as a fixed list: a filter and a hint that
// any language can translate (labels live in messages/<lang>/common.json).
// Fiction and real people share the list: "literature" holds Sherlock Holmes
// and Machado de Assis alike.
export const CATEGORIES = [
  "anime",
  "games",
  "comics",
  "cartoons",
  "film_tv",
  "literature",
  "mythology",
  "religion",
  "folklore",
  "sports",
  "music",
  "entertainment",
  "internet",
  "politics",
  "royalty",
  "history",
  "science",
  "art",
  "business",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];
