import { mkdirSync } from "node:fs";
import { type Browser, test } from "@playwright/test";
import { PHONE } from "./helpers";

// Screenshots of the stage lab (/dev/stage), for checking scenes by eye. Off in normal runs:
//   STAGE_SHOTS=1 pnpm exec playwright test e2e/stage-shots.spec.ts
// Shots land in .data/shots/stage/ (STAGE_SHOTS_DIR to change it), never under test-results/,
// which every e2e run empties. Each moment is shot on desktop (1280×800) and phone (390×844),
// light and dark. Options:
//   STAGE_SHOTS_SET="show=theme&at=1.5;pt:show=cast&at=2&players=2"  moments of your own (lab URL
//                                queries; a "pt:" or "ja:" prefix shoots that one in that language only)
//   STAGE_SHOTS_LANGS=en,pt,ja   languages of the moments without a prefix (default en)
//   STAGE_SHOTS_REDUCED=1        also with reduced motion

/** The default matrix: every part of a match, the shows at three moments each. */
const MATRIX = [
  "show=lobby&at=2",
  "show=opening&at=0.3",
  "show=opening&at=2",
  "show=opening&at=9",
  "show=vote&at=1",
  "show=theme&at=1",
  "show=theme&at=5",
  "show=theme&at=12",
  "show=pick&at=1",
  "show=cast&at=0.5",
  "show=cast&at=2.5",
  "show=cast&at=7",
  "show=turn&at=6",
  "show=result&at=1",
  // long guest names are a Portuguese problem (16 characters)
  "pt:show=theme&at=1&names=long",
  "pt:show=cast&at=2.5&names=long",
  "pt:show=turn&at=6&names=long",
];

const DEVICES = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: PHONE,
} as const;

const dir = process.env.STAGE_SHOTS_DIR ?? ".data/shots/stage";
const moments = process.env.STAGE_SHOTS_SET
  ? process.env.STAGE_SHOTS_SET.split(";").filter(Boolean)
  : MATRIX;
const langs = (process.env.STAGE_SHOTS_LANGS ?? "en").split(",");
const motions = process.env.STAGE_SHOTS_REDUCED
  ? (["no-preference", "reduce"] as const)
  : (["no-preference"] as const);

const slug = (query: string) =>
  query
    .replace(/(^|&)show=/, "$1")
    .replace(/&?at=/, "@")
    .replace(/[&=]/g, "-");

async function shoot(
  browser: Browser,
  lang: string,
  query: string,
  motion: (typeof motions)[number],
) {
  for (const [device, options] of Object.entries(DEVICES))
    for (const theme of ["light", "dark"]) {
      const ctx = await browser.newContext({
        ...options,
        reducedMotion: motion,
      });
      const page = await ctx.newPage();
      await page.goto(`/${lang}/dev/stage?${query}&theme=${theme}&ui=0`);
      await page.locator("[data-lab-ready]").waitFor({ state: "attached" });
      // the dev overlay's button would sit in every shot
      await page.addStyleTag({
        content: "nextjs-portal { display: none !important; }",
      });
      await page.evaluate(() => document.fonts.ready);
      // screens enter with a short fade; the clock is stopped, so this is the frame
      await page.waitForTimeout(1200);
      const name = [
        slug(query),
        lang,
        device,
        theme,
        ...(motion === "reduce" ? ["reduced"] : []),
      ].join("-");
      await page.screenshot({ path: `${dir}/${name}.png` });
      await ctx.close();
    }
}

test.describe("stage shots", () => {
  test.skip(!process.env.STAGE_SHOTS, "set STAGE_SHOTS=1 to take them");
  test.beforeAll(() => mkdirSync(dir, { recursive: true }));

  for (const moment of moments) {
    const [, only, query] = moment.match(/^(?:(en|pt|ja):)?(.*)$/) ?? [];
    for (const lang of only ? [only] : langs)
      for (const motion of motions)
        test(`${lang} ${query}${motion === "reduce" ? " (reduced)" : ""}`, async ({
          browser,
        }) => {
          await shoot(browser, lang, query, motion);
        });
  }
});
