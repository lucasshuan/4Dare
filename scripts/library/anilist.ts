// AniList GraphQL: anime/manga characters by favourites, with native names.
import { cachedJson, HttpError } from "./http";
import type { AniListCharacter } from "./types";

const ENDPOINT = "https://graphql.anilist.co";
const PER_PAGE = 50;

const QUERY = `query ($page: Int) {
  Page(page: $page, perPage: ${PER_PAGE}) {
    pageInfo { hasNextPage }
    characters(sort: FAVOURITES_DESC) {
      id
      name { full native alternative }
      image { large }
      favourites
      gender
      media(sort: POPULARITY_DESC, perPage: 4) {
        nodes { id isAdult title { romaji english native } }
      }
    }
  }
}`;

interface ApiCharacter {
  id: number;
  name: {
    full: string | null;
    native: string | null;
    alternative: (string | null)[] | null;
  };
  image: { large: string | null } | null;
  favourites: number | null;
  gender: string | null;
  media: {
    nodes: {
      id: number;
      isAdult: boolean | null;
      title: {
        romaji: string | null;
        english: string | null;
        native: string | null;
      };
    }[];
  } | null;
}

interface ApiResponse {
  data?: {
    Page: { pageInfo: { hasNextPage: boolean }; characters: ApiCharacter[] };
  };
}

const PLACEHOLDER = /\/default\.(jpg|png)$/;

/** Top `limit` characters by favourites; skips characters from adult media. */
export async function fetchAniListCharacters(
  limit: number,
): Promise<AniListCharacter[]> {
  const out: AniListCharacter[] = [];
  const pages = Math.ceil(limit / PER_PAGE);
  for (let page = 1; page <= pages; page++) {
    let json: ApiResponse;
    try {
      json = await cachedJson<ApiResponse>("anilist", ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: QUERY, variables: { page } }),
      });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      console.warn(
        `  ! AniList stopped at page ${page}: ${error.message.slice(0, 120)}`,
      );
      break;
    }
    const data = json.data?.Page;
    if (!data) break;
    for (const character of data.characters) {
      const nodes = character.media?.nodes ?? [];
      if (nodes.length > 0 && nodes.every((node) => node.isAdult)) continue;
      if (nodes.some((node) => node.isAdult) && nodes[0]?.isAdult) continue;
      const node = nodes.find((node) => !node.isAdult);
      const media = node ? { id: node.id, ...node.title } : null;
      const image = character.image?.large ?? null;
      out.push({
        id: character.id,
        full: character.name.full?.trim() || null,
        native: character.name.native?.trim() || null,
        alternative: (character.name.alternative ?? [])
          .filter((name): name is string => !!name?.trim())
          .map((name) => name.trim()),
        image: image && !PLACEHOLDER.test(image) ? image : null,
        favourites: character.favourites ?? 0,
        gender: character.gender,
        media,
      });
    }
    if (page % 10 === 0)
      console.log(`  anilist: page ${page}/${pages}, ${out.length} characters`);
    if (!data.pageInfo.hasNextPage) break;
  }
  return out;
}
