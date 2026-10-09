import "server-only";
import { GameError, LANGS, type Lang, type PlayerId } from "@/game/types";
import { workshopPath } from "@/lib/routes";
import { getBackend } from "./backend";
import {
  NEWS_REACTIONS,
  type NewsReaction,
  type StoredNews,
  type StoredSuggestion,
} from "./backend/community-types";
import { peopleOf } from "./catalog";
import type { NewsItem, NewsPage, ThemeDraft } from "./community-contract";

type Texts = Record<Lang, string>;

const GAME_NAMES = {
  "who-am-i": {
    en: "Who am I?",
    es: "¿Quién soy?",
    ja: "だれ？",
    pt: "Quem sou eu?",
  },
  impostor: {
    en: "Impostor",
    es: "Impostor",
    ja: "インポスター",
    pt: "Impostor",
  },
  lineup: {
    en: "What for?",
    es: "¿Para qué?",
    ja: "何のため？",
    pt: "Pra quê?",
  },
} as const satisfies Record<string, Texts>;

const AND: Texts = { en: " and ", es: " y ", ja: "と", pt: " e " };

const TITLE = {
  theme: {
    en: "“{x}” is live",
    es: "“{x}” ya está en juego",
    ja: "「{x}」が登場",
    pt: "“{x}” entrou no ar",
  },
  question: {
    en: "A new question in Impostor",
    es: "Una pregunta nueva en Impostor",
    ja: "インポスターに新しい質問",
    pt: "Pergunta nova no Impostor",
  },
  mission: {
    en: "A new mission in What for?",
    es: "Una misión nueva en ¿Para qué?",
    ja: "「何のため？」に新しいミッション",
    pt: "Missão nova no Pra quê?",
  },
} as const satisfies Record<string, Texts>;

const BODY = {
  theme: {
    en: "Suggested by {by} in the Workshop, voted on and checked. It's in {games} now.",
    es: "Sugerido por {by} en el Taller, votado y revisado. Ya sale en {games}.",
    ja: "{by}さんが工房で提案し、投票と確認を経て、{games}に登場しました。",
    pt: "Sugerido por {by} na Oficina, votado e verificado. Já sai no {games}.",
  },
  question: {
    en: "“{x}”: suggested by {by} in the Workshop, voted on and checked.",
    es: "“{x}”: sugerida por {by} en el Taller, votada y revisada.",
    ja: "「{x}」：{by}さんが工房で提案し、投票と確認を経て登場しました。",
    pt: "“{x}”: sugerida por {by} na Oficina, votada e verificada.",
  },
  mission: {
    en: "“{x}”: suggested by {by} in the Workshop, voted on and checked.",
    es: "“{x}”: sugerida por {by} en el Taller, votada y revisada.",
    ja: "「{x}」：{by}さんが工房で提案し、投票と確認を経て登場しました。",
    pt: "“{x}”: sugerida por {by} na Oficina, votada e verificada.",
  },
} as const satisfies Record<string, Texts>;

const ACTION: Texts = {
  en: "See it in the Workshop",
  es: "Verlo en el Taller",
  ja: "工房で見る",
  pt: "Ver na Oficina",
};

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (m, k: string) =>
    k === "by" ? m : (values[k] ?? m),
  );

/**
 * When a suggestion goes live, the news say so in every language, crediting
 * who suggested it ("{by}" stays in the text: the page shows them with their
 * face).
 */
export async function publishWorkshopNews(live: {
  suggestion: StoredSuggestion;
  bankId: string;
  texts: Record<Lang, Record<string, string>>;
}) {
  const s = live.suggestion;
  const games =
    s.kind === "theme"
      ? (s.payload as ThemeDraft).games
      : s.kind === "question"
        ? (["impostor"] as const)
        : (["lineup"] as const);
  const title = {} as Texts;
  const body = {} as Texts;
  for (const lang of LANGS) {
    const x = live.texts[lang].name ?? live.texts[lang].text ?? "";
    const names = games.map((g) => GAME_NAMES[g][lang]).join(AND[lang]);
    title[lang] = fill(TITLE[s.kind][lang], { x });
    body[lang] = fill(BODY[s.kind][lang], { x, games: names });
  }
  await getBackend().news.insert({
    id: `workshop-${s.id}`,
    publishedAt: Date.now(),
    kind: "workshop",
    game: games[0],
    featured: false,
    title,
    body,
    action: { href: workshopPath(s.id), label: ACTION },
    suggestionId: s.id,
  });
  newsCache = null;
}

let newsCache: { at: number; posts: Promise<StoredNews[]> } | null = null;

function posts(): Promise<StoredNews[]> {
  if (newsCache && Date.now() - newsCache.at < 60_000) return newsCache.posts;
  const p = getBackend().news.list();
  newsCache = { at: Date.now(), posts: p };
  p.catch(() => {
    newsCache = null;
  });
  return p;
}

const pick = (texts: Partial<Record<Lang, string>>, lang: Lang) =>
  texts[lang] ?? texts.en ?? Object.values(texts)[0] ?? "";

/** The news as `viewer` reads them in `lang`: every post, its reactions, theirs. */
export async function newsPage(lang: Lang): Promise<NewsPage> {
  const { auth, news, workshop } = getBackend();
  const me = await auth.identity(lang);
  const [list, counts, mine] = await Promise.all([
    posts(),
    news.counts(),
    me.isGuest
      ? Promise.resolve(new Map<string, NewsReaction[]>())
      : news.mine(me.id),
  ]);
  const credits = new Map<string, string | null>();
  for (const p of list)
    if (p.suggestionId) {
      const s = await workshop.suggestion(p.suggestionId);
      credits.set(p.id, s?.createdBy ?? null);
    }
  const people = await peopleOf([...credits.values()], lang);
  const items = list.map(
    (p): NewsItem => ({
      id: p.id,
      at: p.publishedAt,
      kind: p.kind,
      game: p.game,
      featured: p.featured,
      title: pick(p.title, lang) || null,
      body: pick(p.body, lang),
      action: p.action
        ? { href: p.action.href, label: pick(p.action.label, lang) }
        : null,
      by: people.get(credits.get(p.id) ?? "") ?? null,
      reactions: counts.get(p.id) ?? {},
      mine: mine.get(p.id) ?? [],
    }),
  );
  return { items, signedIn: !me.isGuest };
}

/** The newest post's time: the menu's dot compares it with the last one seen. */
export async function latestNews(): Promise<number | null> {
  return (await posts())[0]?.publishedAt ?? null;
}

/** Puts or takes back a reaction; the post's counts after it. */
export async function react(
  postId: string,
  reaction: string,
  viewer: PlayerId,
) {
  if (!(NEWS_REACTIONS as readonly string[]).includes(reaction))
    throw new GameError("invalid_input");
  if (!(await posts()).some((p) => p.id === postId))
    throw new GameError("not_found");
  return getBackend().news.toggle(postId, viewer, reaction as NewsReaction);
}
