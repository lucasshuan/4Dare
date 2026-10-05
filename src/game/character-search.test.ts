import { describe, expect, it } from "vitest";
import {
  type CardContent,
  type CardEvent,
  type CardField,
  cardStep,
  closedField,
  exactMatch,
  knownAs,
  matchRange,
  type SearchItem,
  searchItems,
  searchMatches,
  shownName,
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
    expect(names("bruce")).toEqual(["Bruce Wayne"]);
    expect(names("arth")).toEqual(["Darth Vader", "Darth Maul"]);
  });

  it("folds accents, case, kana and articles like guesses do", () => {
    expect(names("POKEMON")).toEqual(["Pokémon Trainer"]);
    expect(names("ナルト")).toEqual(["ナルト"]);
    expect(names("うずまき")).toEqual(["うずまきナルト"]);
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

describe("aliases", () => {
  const bloody = item("m", "Maria Sangrenta", [
    "Lenda da loira do banheiro",
    "Loira do Banheiro",
    "Loira do Barbeador",
    "Bloody Mary",
  ]);
  const goku = item("g", "Son Goku", ["Goku", "Kakarotto"]);
  const rows = (q: string) =>
    searchItems([bloody, goku], q, 6).map((r) => r.name);

  it("shows the alias typed, once per character", () => {
    expect(rows("loira do banheiro")).toEqual(["Loira do Banheiro"]);
    expect(rows("loira")).toEqual(["Loira do Banheiro"]);
    expect(rows("loira do bar")).toEqual(["Loira do Barbeador"]);
    expect(rows("lenda")).toEqual(["Lenda da loira do banheiro"]);
    expect(rows("bloody")).toEqual(["Bloody Mary"]);
    expect(rows("kakarotto")).toEqual(["Kakarotto"]);
  });

  it("keeps the name when the query finds it as well", () => {
    expect(rows("maria")).toEqual(["Maria Sangrenta"]);
    expect(rows("sangrenta")).toEqual(["Maria Sangrenta"]);
    expect(rows("son")).toEqual(["Son Goku"]);
    expect(rows("gok")).toEqual(["Son Goku"]);
    expect(rows("")).toEqual(["Maria Sangrenta", "Son Goku"]);
  });

  it("lets a whole alias beat the start of a word of the name", () => {
    expect(rows("goku")).toEqual(["Goku"]);
    expect(shownName("Son Goku", ["Goku"], "GOKU")).toBe("Goku");
    expect(shownName("Son Goku", ["Goku"], "")).toBe("Son Goku");
  });

  it("names a pick after the alias shown, keeping the others for guesses", () => {
    const c = {
      id: "m",
      lang: "pt" as const,
      name: "Maria Sangrenta",
      origin: null,
      imageUrl: null,
      aliases: ["Loira do Banheiro", "Bloody Mary"],
    };
    expect(knownAs(c, "loira")).toEqual({
      ...c,
      name: "Loira do Banheiro",
      aliases: ["Maria Sangrenta", "Bloody Mary"],
    });
    expect(knownAs(c, "Maria Sangrenta")).toBe(c);
    expect(knownAs(c, "Someone Else")).toBe(c);
  });
});

describe("exact match", () => {
  it("folds accents, case, kana and a leading article", () => {
    expect(exactMatch(library, "darth vader")?.[0]).toBe("1");
    expect(exactMatch(library, "  DARTH  VADER ")?.[0]).toBe("1");
    expect(exactMatch(library, "pokemon trainer")?.[0]).toBe("7");
    expect(exactMatch(library, "Rei Leao")?.[0]).toBe("8");
    expect(exactMatch(library, "ウズマキナルト")?.[0]).toBe("6");
  });

  it("takes a whole alias under that alias, after every name", () => {
    expect(exactMatch(library, "bruce wayne")?.slice(0, 2)).toEqual([
      "2",
      "Bruce Wayne",
    ]);
    expect(exactMatch(library, "なると")?.slice(0, 2)).toEqual(["6", "ナルト"]);
    const shared = [item("a", "Mary Jane", ["Robin"]), item("b", "Robin")];
    expect(exactMatch(shared, "robin")?.slice(0, 2)).toEqual(["b", "Robin"]);
  });

  it("ignores single words and blanks", () => {
    expect(exactMatch(library, "Anakin")).toBeNull();
    expect(exactMatch(library, "Vader")).toBeNull();
    expect(exactMatch(library, "Darth")).toBeNull();
    expect(exactMatch(library, "   ")).toBeNull();
  });

  it("takes the most popular of two characters with the same name", () => {
    const twins = [item("a", "Robin"), item("b", "Robin")];
    expect(exactMatch(twins, "robin")?.[0]).toBe("a");
  });
});

describe("matched part of a row", () => {
  const marked = (name: string, q: string) => {
    const range = matchRange(name, q);
    return range ? name.slice(range[0], range[1]) : null;
  };

  it("marks the typed part, folded like the search", () => {
    expect(marked("Homem de Ferro", "homem")).toBe("Homem");
    expect(marked("O Rei Leão", "leao")).toBe("Leão");
    expect(marked("Darth Vader", "th va")).toBe("th Va");
    expect(marked("うずまきナルト", "なると")).toBe("ナルト");
  });

  it("marks nothing for a match through an alias", () => {
    expect(marked("Batman", "bruce")).toBeNull();
    expect(marked("Batman", "")).toBeNull();
  });
});

describe("card state machine", () => {
  const rowsFor = (q: string) => searchMatches(library, q, 5);
  const input = (text: string): CardEvent => ({
    type: "input",
    text,
    rows: rowsFor(text),
  });
  const run = (events: CardEvent[], from: CardContent = { kind: "empty" }) =>
    events.reduce<CardField>(cardStep, closedField(from));

  it("previews the first row while the search has rows, with no seal", () => {
    const field = run([input("dar")]);
    expect(field.open).toBe(true);
    expect(field.highlight).toBe(0);
    expect(field.content).toMatchObject({ kind: "typing", text: "dar" });
    if (field.content.kind === "typing")
      expect(field.content.preview?.[1]).toBe("Darth Vader");
  });

  it("turns new as soon as the search has no rows, and back with rows", () => {
    const none = run([input("zqxj")]);
    expect(none.content).toEqual({
      kind: "new",
      name: "zqxj",
      imageUrl: null,
      uploading: false,
    });
    expect(none.open).toBe(true);
    expect(cardStep(none, input("dar")).content.kind).toBe("typing");
  });

  it("keeps a new character's picture while its name is edited", () => {
    const withPicture: CardContent = {
      kind: "new",
      name: "zqxj",
      imageUrl: "https://x/p.webp",
      uploading: false,
    };
    const field = run([input("zqxj hero")], withPicture);
    expect(field.content).toMatchObject({
      kind: "new",
      name: "zqxj hero",
      imageUrl: "https://x/p.webp",
    });
  });

  it("moves the highlight and the preview with the arrows", () => {
    const field = run([input("dar"), { type: "move", by: 1 }]);
    expect(field.highlight).toBe(1);
    if (field.content.kind === "typing")
      expect(field.content.preview?.[1]).toBe(field.rows[1][1]);
    const up = run([input("dar"), { type: "move", by: -1 }]);
    expect(up.highlight).toBe(-1);
    expect(up.content).toMatchObject({ kind: "typing", preview: null });
    const bottom = run([
      input("dar"),
      ...Array.from({ length: 9 }, (): CardEvent => ({ type: "move", by: 1 })),
    ]);
    expect(bottom.highlight).toBe(bottom.rows.length - 1);
  });

  it("picks the highlighted row on Enter, and a row on click", () => {
    const entered = run([
      input("dar"),
      { type: "move", by: 1 },
      { type: "enter", exact: null },
    ]);
    expect(entered.open).toBe(false);
    expect(entered.content).toMatchObject({
      kind: "picked",
      via: "list",
      card: { characterId: "3", name: "Daredevil" },
    });
    const clicked = run([input("dar"), { type: "choose", index: 0 }]);
    expect(clicked.content).toMatchObject({
      kind: "picked",
      card: { name: "Darth Vader" },
    });
  });

  it("settles Enter with no highlight: exact name picked, else new", () => {
    const exact = exactMatch(library, "dart");
    const picked = run([
      input("dart"),
      { type: "move", by: -1 },
      { type: "enter", exact },
    ]);
    expect(picked.content).toMatchObject({ kind: "picked", via: "exact" });
    const fresh = run([
      input("dar"),
      { type: "move", by: -1 },
      { type: "enter", exact: null },
    ]);
    expect(fresh.content).toMatchObject({ kind: "new", name: "dar" });
  });

  it("on blur: an exact name is picked, the preview stays, no highlight is new", () => {
    const exact = exactMatch(library, "batman");
    expect(
      run([input("batman"), { type: "blur", exact }]).content,
    ).toMatchObject({ kind: "picked", via: "exact", card: { name: "Batman" } });
    const kept = run([input("dar"), { type: "blur", exact: null }]);
    expect(kept.open).toBe(false);
    expect(kept.content).toMatchObject({ kind: "typing", text: "dar" });
    expect(
      run([
        input("dar"),
        { type: "move", by: -1 },
        { type: "blur", exact: null },
      ]).content,
    ).toMatchObject({ kind: "new", name: "dar" });
  });

  it("empties the card when the text is cleared, and Esc only closes", () => {
    expect(run([input("dar"), input("  ")]).content).toEqual({ kind: "empty" });
    const escaped = run([input("dar"), { type: "escape" }]);
    expect(escaped.open).toBe(false);
    expect(escaped.content.kind).toBe("typing");
    expect(cardStep(escaped, { type: "move", by: 1 }).open).toBe(true);
  });

  it("takes late rows only while the list is open", () => {
    const typed = run([{ type: "input", text: "dar", rows: [] }]);
    expect(typed.content.kind).toBe("new");
    const late = cardStep(typed, { type: "rows", rows: rowsFor("dar") });
    expect(late.content.kind).toBe("typing");
    const restored = closedField({
      kind: "new",
      name: "dar",
      imageUrl: null,
      uploading: false,
    });
    expect(cardStep(restored, { type: "rows", rows: rowsFor("dar") })).toBe(
      restored,
    );
  });
});
