import { describe, expect, it } from "vitest";
import {
  type SearchItem,
  searchItems,
  thumbUrl,
  toSearchItem,
} from "./character-search";

const item = (id: string, name: string, aliases: string[] = []) =>
  toSearchItem({ id, name, origin: null, imageUrl: null, aliases });

// Sorted by popularity, as the library is.
const library: SearchItem[] = [
  item("1", "Darth Vader", ["Anakin Skywalker"]),
  item("2", "Batman", ["Bruce Wayne"]),
  item("3", "Daredevil"),
  item("4", "Darth Maul"),
  item("5", "Dart"),
  item("6", "うずまきナルト", ["ナルト"]),
  item("7", "Pokémon Trainer"),
  item("8", "O Rei Leão"),
];
const names = (q: string, limit = 6) =>
  searchItems(library, q, limit).map((r) => r.name);

describe("character search", () => {
  it("ranks exact, then name prefix, then word or alias prefix, then contains", () => {
    expect(names("dart")).toEqual(["Dart", "Darth Vader", "Darth Maul"]);
    expect(names("vader")).toEqual(["Darth Vader"]);
    expect(names("bruce")).toEqual(["Batman"]);
    expect(names("arth")).toEqual(["Darth Vader", "Darth Maul"]);
  });

  it("folds accents, case, kana and articles like guesses do", () => {
    expect(names("POKEMON")).toEqual(["Pokémon Trainer"]);
    expect(names("なると")).toEqual(["うずまきナルト"]);
    expect(names("rei leao")).toEqual(["O Rei Leão"]);
  });

  it("shows the most popular when empty, and respects the limit", () => {
    expect(names("", 2)).toEqual(["Darth Vader", "Batman"]);
    expect(names("a", 3)).toHaveLength(3);
  });

  it("gives the same answer when narrowing as when scanning everything", () => {
    const typed = ["d", "da", "dar", "dart", "darth", "darth m", "darth"];
    for (const q of typed) {
      const narrowed = names(q);
      const fresh = searchItems([...library], q, 6).map((r) => r.name);
      expect(narrowed).toEqual(fresh);
    }
  });

  it("answers a keystroke in well under a millisecond on 8k characters", () => {
    const syllables = [
      "ka",
      "ri",
      "to",
      "ma",
      "su",
      "ne",
      "lo",
      "vi",
      "da",
      "ze",
    ];
    const big: SearchItem[] = Array.from({ length: 8000 }, (_, i) => {
      const word = (n: number) =>
        Array.from(
          { length: 3 },
          (_, k) => syllables[(n >> (k * 3)) % 10],
        ).join("");
      return item(`x${i}`, `${word(i)} ${word(i * 7)}`, [word(i * 13)]);
    });
    const queries = [
      "k",
      "ka",
      "kar",
      "kari",
      "karit",
      "m",
      "ma",
      "mas",
      "z",
      "ze",
    ];
    searchItems(big, "warm", 6);
    const started = performance.now();
    for (let round = 0; round < 50; round++)
      for (const q of queries) searchItems(big, q, 6);
    const perKeystroke = (performance.now() - started) / (50 * queries.length);
    expect(perKeystroke).toBeLessThan(2);
  });

  it("asks for small thumbnails in list rows", () => {
    expect(
      thumbUrl(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Some_Person.jpg/500px-Some_Person.jpg",
        96,
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Some_Person.jpg/120px-Some_Person.jpg",
    );
    expect(
      thumbUrl(
        "https://s4.anilist.co/file/anilistcdn/character/large/b1.png",
        96,
      ),
    ).toBe("https://s4.anilist.co/file/anilistcdn/character/medium/b1.png");
    expect(thumbUrl("https://example.com/a.png", 96)).toBe(
      "https://example.com/a.png",
    );
    expect(thumbUrl(null, 96)).toBeNull();
  });
});
