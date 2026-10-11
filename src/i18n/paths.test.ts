import { describe, expect, it } from "vitest";
import { localizePath, routePath } from "./paths";

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
