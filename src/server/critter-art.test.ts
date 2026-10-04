import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/critter/[seed]/[bg]/route";
import { critterUri } from "@/components/ui/critter";
import { critterDataUri, critterSvg } from "./critter-art";

const get = (seed: string, bg: string) =>
  GET(new Request("http://x"), { params: Promise.resolve({ seed, bg }) });

describe("critters", () => {
  it("live at an address made of the seed and the pastel", () => {
    expect(critterUri("a1b2c3", "#BFE3EA")).toBe("/api/critter/a1b2c3/bfe3ea");
    expect(critterUri("a b/c", "pink")).toBe("/api/critter/a%20b%2Fc/ffffff");
  });

  it("are drawn the same every time, as SVG the CDN may keep", async () => {
    expect(critterSvg("27", "#BFE3EA")).toBe(critterSvg("27", "#BFE3EA"));
    const res = await get("27", "bfe3ea");
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
    expect(res.headers.get("cache-control")).toContain("s-maxage=31536000");
    expect(await res.text()).toBe(critterSvg("27", "#bfe3ea"));
    expect(critterDataUri("27", "#BFE3EA")).toMatch(
      /^data:image\/svg\+xml;base64,/,
    );
  });

  it("refuses odd addresses", async () => {
    expect((await get("27", "BFE3EA")).status).toBe(404);
    expect((await get("27", "zzzzzz")).status).toBe(404);
    expect((await get("x".repeat(65), "bfe3ea")).status).toBe(404);
  });
});
