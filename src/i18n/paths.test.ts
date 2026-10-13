import { describe, expect, it } from "vitest";
import { localePath, localizePath, routePath, wordLanguage } from "./paths";

describe("localizePath", () => {
  it("translates the first segment and keeps the rest", () => {
    expect(localizePath("pt", "/who-am-i")).toBe("/quem-sou-eu");
    expect(localizePath("es", "/rooms?game=impostor")).toBe(
      "/salas?game=impostor",
    );
    expect(localizePath("pt", "/characters/wd-Q302/jesus-cristo")).toBe(
      "/personagens/wd-Q302/jesus-cristo",
    );
  });

  it("leaves English, Japanese and untranslated pages alone", () => {
    expect(localizePath("en", "/who-am-i")).toBe("/who-am-i");
    expect(localizePath("ja", "/who-am-i")).toBe("/who-am-i");
    expect(localizePath("pt", "/impostor")).toBe("/impostor");
    expect(localizePath("pt", "/")).toBe("/");
    expect(localizePath("pt", "/r/ABCD")).toBe("/r/ABCD");
  });
});

describe("routePath", () => {
  it("brings any language's word back to the route", () => {
    expect(routePath("/quem-sou-eu")).toBe("/who-am-i");
    expect(routePath("/personajes/wd-Q302/x")).toBe("/characters/wd-Q302/x");
    expect(routePath("/salas?q=pizza")).toBe("/rooms?q=pizza");
  });

  it("keeps route paths as they are", () => {
    expect(routePath("/who-am-i")).toBe("/who-am-i");
    expect(routePath("/")).toBe("/");
  });
});

describe("localePath", () => {
  it("leaves English at the root and prefixes the other languages", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("en", "/who-am-i")).toBe("/who-am-i");
    expect(localePath("pt", "/")).toBe("/pt");
    expect(localePath("pt", "/who-am-i")).toBe("/pt/quem-sou-eu");
    expect(localePath("ja", "/rooms?game=x")).toBe("/ja/rooms?game=x");
  });
});

describe("wordLanguage", () => {
  it("names the language of a translated word, the first listed when shared", () => {
    expect(wordLanguage("/quem-sou-eu")).toBe("pt");
    expect(wordLanguage("/quien-soy/x")).toBe("es");
    expect(wordLanguage("/salas")).toBe("pt");
  });

  it("is null for a route's own name", () => {
    expect(wordLanguage("/who-am-i")).toBeNull();
    expect(wordLanguage("/")).toBeNull();
  });
});
