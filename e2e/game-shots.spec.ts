import { mkdirSync, readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { joinRoom, newPlayer, startMatch, viewOf } from "./helpers";

// Photos of real matches for each game's page (public/game-shots/<game>/
// <moment>-<lang>.jpg). Players play a whole match from English pages, which
// the steps below read; each also has a second tab, a camera, showing the
// same room in the shot's language, and the photos are taken from it.
// Off in normal runs:
//   GAME_SHOTS=1 pnpm exec playwright test e2e/game-shots.spec.ts --workers=1
// Options: GAME_SHOTS_LANGS=pt,en (default all four), GAME_SHOTS_GAMES=impostor.

const LANGS = (process.env.GAME_SHOTS_LANGS ?? "en,pt,es,ja").split(",");
const GAMES = (process.env.GAME_SHOTS_GAMES ?? "who-am-i,impostor,lineup")
  .split(",")
  .filter(Boolean);
const DIR = "public/game-shots";

test.skip(!process.env.GAME_SHOTS, "photos only on demand (GAME_SHOTS=1)");

/** What the players type, in the shot's language. */
const WORDS: Record<
  string,
  { lobby: string[]; match: string[]; ask: string; brave: string; calm: string }
> = {
  en: {
    lobby: ["here!! 👋", "tonight I win", "😂"],
    match: ["good question 👀", "getting close", "nooo 😭"],
    ask: "Am I a hero?",
    brave: "Brave",
    calm: "Calm",
  },
  pt: {
    lobby: ["cheguei!! 👋", "bora que hoje eu ganho", "😂"],
    match: ["pergunta boa 👀", "tá chegando perto", "nãooo 😭"],
    ask: "Eu sou um herói?",
    brave: "Corajoso",
    calm: "Tranquilo",
  },
  es: {
    lobby: ["¡¡llegué!! 👋", "hoy gano yo", "😂"],
    match: ["buena pregunta 👀", "te estás acercando", "noooo 😭"],
    ask: "¿Soy un héroe?",
    brave: "Valiente",
    calm: "Tranquilo",
  },
  ja: {
    lobby: ["来たよ！！👋", "今日は勝つ", "😂"],
    match: ["いい質問 👀", "近づいてる", "うそーー 😭"],
    ask: "ぼくはヒーロー？",
    brave: "勇敢",
    calm: "のんびり",
  },
};

const button = (page: Page, name: RegExp) => page.getByRole("button", { name });

/** Says `text` in the room's chat from this player's (English) page. */
async function say(page: Page, text: string) {
  const head = page
    .locator("[data-chat]")
    .getByRole("button", { name: /^(open|fold) chat/i });
  if ((await head.getAttribute("aria-expanded")) !== "true") await head.click();
  const field = page.getByRole("textbox", { name: /^message$/i });
  await field.fill(text);
  await field.press("Enter");
  await head.click();
}

/** The player's second tab: the same room, in the shot's language. */
async function camera(player: Page, code: string, lang: string) {
  const page = await player.context().newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/${lang}/r/${code}`);
  await page.waitForLoadState("networkidle");
  // the dev server's badge stays out of the picture
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  return page;
}

/** A photo from a camera; `chat` opens the chat for it and folds it after. */
async function snap(
  cam: Page,
  game: string,
  moment: string,
  lang: string,
  { chat = false, settle = 800 } = {},
) {
  mkdirSync(`${DIR}/${game}`, { recursive: true });
  await cam.bringToFront();
  const head = cam.locator("[data-chat] button").first();
  if (chat) {
    await head.click();
    await cam.waitForTimeout(700);
  }
  await cam.waitForTimeout(settle);
  await cam.screenshot({
    path: `${DIR}/${game}/${moment}-${lang}.jpg`,
    type: "jpeg",
    quality: 80,
  });
  if (chat) await head.click();
}

async function room(players: Page[], game: string) {
  const [host, ...guests] = players;
  await host.goto(`/en/new?game=${game}`);
  await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
  const code = host.url().split("/").pop() as string;
  for (const page of guests) await joinRoom(page, code);
  return code;
}

/** Everyone votes for the first theme, once the opening (full length here) is over. */
async function voteAll(players: Page[]) {
  await Promise.all(
    players.map(async (page) => {
      const themes = page
        .getByRole("group", { name: /vote for the theme/i })
        .getByRole("button");
      await expect(themes).toHaveCount(4, { timeout: 90_000 });
      // a vote the others already settled is no loss
      await expect(themes.first())
        .toBeEnabled({ timeout: 30_000 })
        .then(() => themes.first().click({ timeout: 5_000 }))
        .catch(() => {});
    }),
  );
}

for (const lang of LANGS) {
  const words = WORDS[lang] ?? WORDS.en;

  if (GAMES.includes("who-am-i"))
    test(`who am I? in ${lang}`, async ({ browser }) => {
      test.setTimeout(400_000);
      const players = [
        await newPlayer(browser),
        await newPlayer(browser),
        await newPlayer(browser),
      ];
      const code = await room(players, "who-am-i");
      const cams = await Promise.all(players.map((p) => camera(p, code, lang)));
      for (const [i, line] of words.lobby.entries())
        await say(players[i], line);
      await startMatch(players[0]);
      await voteAll(players);

      // well-known characters, so the cards have faces
      const names = ["Batman", "Shrek", "Pikachu"];
      // the second player picks from the camera, so the photo shows the card filled in
      const confirmIn = JSON.parse(
        readFileSync(`messages/${lang}/games/whoAmI.json`, "utf8"),
      ).pickCard.confirmCard as string;
      await Promise.all(
        players.map(async (player, i) => {
          const page = i === 1 ? cams[1] : player;
          const field = page.getByRole("combobox").first();
          await expect(field).toBeEditable({ timeout: 90_000 });
          await field.fill(names[i]);
          const row = page.getByRole("option").first();
          await row.waitFor({ timeout: 8_000 }).catch(() => {});
          if (await row.isVisible()) await row.click();
          if (i === 1)
            await snap(cams[1], "who-am-i", "pick", lang, { settle: 1500 });
          const confirm = page.getByRole("button", {
            name: i === 1 ? confirmIn : /^confirm$/i,
            exact: i === 1,
          });
          await expect(confirm).toBeEnabled({ timeout: 10_000 });
          await confirm.click();
        }),
      );

      // one turn: a question, the others answer, the asker guesses right
      let asker = -1;
      for (let i = 0; i < 240 && asker < 0; i++) {
        for (const [j, page] of players.entries())
          if (await button(page, /send question/i).isVisible()) asker = j;
        if (asker < 0) await players[0].waitForTimeout(250);
      }
      if (asker < 0) throw new Error("nobody got to ask");
      const me = players[asker];
      const view = await viewOf(me, code);
      const wait = (view.stepStartsAt ?? 0) - view.serverNow;
      if (wait > 0) await me.waitForTimeout(wait + 100);
      const others = players.filter((p) => p !== me);
      await me
        .getByRole("textbox", { name: /yes-or-no question/i })
        .fill(words.ask);
      await button(me, /send question/i).click();
      for (const [i, page] of others.entries()) {
        const send = button(page, /send answer/i);
        await send.waitFor({ timeout: 30_000 });
        await button(page, i === 0 ? /^yes$/i : /^probably$/i).click();
        await send.click();
      }
      await say(others[0], words.match[0]);
      await expect(button(me, /take a guess/i)).toBeVisible({
        timeout: 60_000,
      });
      await snap(cams[asker], "who-am-i", "turn", lang, {
        chat: true,
        settle: 1500,
      });

      const id = (await viewOf(me, code)).youId;
      const name = (await viewOf(others[0], code)).players.find(
        (p) => p.id === id,
      )?.card?.name as string;
      await me.getByRole("textbox", { name: /your guess/i }).fill(name);
      await button(me, /take a guess/i).click();
      await snap(cams[asker], "who-am-i", "found", lang, { settle: 1600 });
    });

  if (GAMES.includes("impostor"))
    test(`impostor in ${lang}`, async ({ browser }) => {
      test.setTimeout(400_000);
      const players = [
        await newPlayer(browser),
        await newPlayer(browser),
        await newPlayer(browser),
        await newPlayer(browser),
      ];
      const code = await room(players, "impostor");
      for (const [i, line] of words.lobby.entries())
        await say(players[i], line);
      await startMatch(players[0]);
      await voteAll(players);

      await expect
        .poll(async () => (await viewOf(players[0], code)).imp?.card?.name, {
          timeout: 60_000,
        })
        .toBeTruthy();
      const views = await Promise.all(players.map((p) => viewOf(p, code)));
      const cards = views.map((v) => v.imp?.card?.name);
      const odd = cards.findIndex(
        (n) => cards.filter((m) => m === n).length === 1,
      );
      const impostor = players[odd];
      const crew = players.filter((p) => p !== impostor);
      const cam = await camera(crew[0], code, lang);

      for (let q = 0; q < 2; q++) {
        await expect
          .poll(
            async () => (await viewOf(players[0], code)).imp?.asked.length,
            {
              timeout: 60_000,
            },
          )
          .toBe(q + 1);
        const kind = (await viewOf(players[0], code)).imp?.asked[q].question
          .kind;
        for (const page of players) {
          await expect(
            page.getByText(new RegExp(`question ${q + 1} of 2`, "i")),
          ).toBeVisible({ timeout: 60_000 });
          const send = page.getByRole("button", { name: /^answer$/i });
          if (kind === "word") {
            const field = page.getByRole("textbox", { name: /your answer/i });
            await expect(field).toBeEditable({ timeout: 60_000 });
            await field.fill(page === impostor ? words.calm : words.brave);
          }
          const key =
            kind === "scale" || kind === "word"
              ? send
              : page
                  .locator("div.grid button[aria-pressed]")
                  .nth(page === impostor ? 1 : 0);
          await expect(key).toBeEnabled({ timeout: 60_000 });
          if (q === 0 && page === crew[0])
            await snap(cam, "impostor", "question", lang, { settle: 1200 });
          await key.click();
        }
      }
      await say(crew[1], words.match[0]);

      const nameOf = (page: Page) =>
        views[players.indexOf(page)].players.find((p) => p.isYou)?.name ?? "";
      for (const page of players) {
        await expect(page.getByText(/who's the impostor/i)).toBeVisible({
          timeout: 60_000,
        });
        const tile = page
          .getByRole("listitem")
          .filter({ hasText: nameOf(page === impostor ? crew[0] : impostor) })
          .getByRole("button")
          .first();
        await expect(tile).toBeEnabled({ timeout: 60_000 });
        await tile.click();
        await button(page, /^vote for/i).click();
        if (page === players.at(-2))
          await snap(cam, "impostor", "vote", lang, { chat: true });
      }

      await expect(impostor.getByText(/you were the impostor/i)).toBeVisible({
        timeout: 60_000,
      });
      const field = impostor.getByRole("combobox");
      await expect(field).toBeEditable({ timeout: 30_000 });
      await field.fill("Batman");
      await button(impostor, /send guess/i).click();
      await say(impostor, words.match[2]);
      await expect(crew[0].getByText(/the crew won/i)).toBeVisible({
        timeout: 60_000,
      });
      await snap(cam, "impostor", "caught", lang, { settle: 2500 });
    });

  if (GAMES.includes("lineup"))
    test(`build the team in ${lang}`, async ({ browser }) => {
      test.setTimeout(900_000);
      const players = [
        await newPlayer(browser),
        await newPlayer(browser),
        await newPlayer(browser),
      ];
      const [host] = players;
      await host.goto("/en/new?game=lineup");
      await host.waitForURL(/\/r\/[A-Z0-9]{5}$/);
      const code = host.url().split("/").pop() as string;
      // one round, no break, no trades (in the lobby's settings tab)
      await host.getByRole("tab", { name: /^settings/i }).click();
      await button(host, /change the auction/i).click();
      await host
        .getByRole("group", { name: /^rounds$/i })
        .getByRole("button", { name: "1" })
        .click();
      await host.getByRole("switch", { name: /break halfway/i }).click();
      await host.getByRole("switch", { name: /trades after/i }).click();
      await button(host, /^save$/i).click();
      await host.getByRole("tab").first().click();
      for (const page of players.slice(1)) await joinRoom(page, code);
      const cam = await camera(players[1], code, lang);
      for (const [i, line] of words.lobby.entries())
        await say(players[i], line);
      await startMatch(host);

      /** Clicks `name` wherever it is enabled until the room leaves `phase`; `shot` once on the way. */
      const until = async (
        phase: string,
        name: RegExp,
        shot?: () => Promise<void>,
      ) => {
        let shotTaken = !shot;
        await expect
          .poll(
            async () => {
              const view = await viewOf(host, code);
              if (view.phase !== phase) return view.phase;
              if (!shotTaken && shot) {
                shotTaken = true;
                await shot();
              }
              for (const page of players) {
                const key = page.getByRole("button", { name }).first();
                if (await key.isEnabled().catch(() => false))
                  await key.click({ timeout: 2_000 }).catch(() => {});
              }
              return view.phase;
            },
            { timeout: 600_000, intervals: [600] },
          )
          .not.toBe(phase);
      };

      // a coin on the first lot from the camera's player, then everyone passes
      const bid = players[1]
        .getByRole("button", { name: /^bid \d+$/i })
        .first();
      await expect(bid).toBeEnabled({ timeout: 90_000 });
      await snap(cam, "lineup", "auction", lang, { settle: 1200 });
      await bid.click();
      await until("bidding", /^pass$/i);
      await say(players[2], words.match[0]);
      await until("defending", /^done$/i, () =>
        snap(cam, "lineup", "boards", lang, { chat: true, settle: 2500 }),
      );
      await until("presenting", /^done talking$/i);

      await expect
        .poll(async () => (await viewOf(host, code)).phase, { timeout: 60_000 })
        .toBe("judging");
      for (const page of players) {
        const middle = page.locator('button[aria-current="true"]');
        await expect(middle).toBeVisible({ timeout: 60_000 });
        await middle.click();
      }
      await say(players[2], words.match[2]);
      await until("scoring", /^see the final score$/i);
      await expect(players[1].getByText(/^final score$/i)).toBeVisible({
        timeout: 60_000,
      });
      await snap(cam, "lineup", "score", lang, { settle: 2500 });
    });
}
