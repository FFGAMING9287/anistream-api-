import * as anilist from "./anilist.js";
import * as jikan from "./jikan.js";

export type { JikanAnime } from "./jikan.js";
export type { CatalogAnime } from "./anilist.js";
export async function browseHome() {
  try {
    return await jikan.jikanHome();
  } catch {
    return await anilist.anilistHome();
  }
}

export async function browseSeason() {
  try {
    return await jikan.jikanSeasonNow();
  } catch {
    return await anilist.anilistSeasonNow();
  }
}

export async function browseTop() {
  try {
    return await jikan.jikanTop();
  } catch {
    return await anilist.anilistTop();
  }
}

export async function metadataSearch(q: string) {
  try {
    return await jikan.jikanSearch(q);
  } catch {
    return await anilist.anilistSearch(q);
  }
}

export async function metadataAnime(malId: string) {
  try {
    return await jikan.jikanAnime(malId);
  } catch {
    return await anilist.anilistAnime(malId);
  }
}

export interface EpisodeMetadata {
  episodeId: string;
  number: number;
  title: string;
  isFiller: boolean;
  isRecap: boolean;
  airDate?: string;
  score?: number | null;
  titleJapanese?: string | null;
  titleRomanji?: string | null;
  streamable: false;
  metadataOnly: true;
}

export async function metadataEpisodes(malId: string) {
  const response = await jikan.jikanEpisodes(malId);
  const seen = new Set<number>();
  const episodes: EpisodeMetadata[] = response.data
    .filter((episode) => Number.isInteger(episode.mal_id) && episode.mal_id > 0)
    .filter((episode) => {
      if (seen.has(episode.mal_id)) return false;
      seen.add(episode.mal_id);
      return true;
    })
    .map((episode) => ({
      episodeId: `jikan-${episode.mal_id}`,
      number: episode.mal_id,
      title: episode.title?.trim() || `Episode ${episode.mal_id}`,
      isFiller: Boolean(episode.filler),
      isRecap: Boolean(episode.recap),
      airDate: episode.aired ?? undefined,
      score: episode.score ?? null,
      titleJapanese: episode.title_japanese ?? null,
      titleRomanji: episode.title_romanji ?? null,
      streamable: false,
      metadataOnly: true,
    }));

  return {
    episodes,
    totalEpisodes: episodes.length,
    streamProvider: null,
    category: null,
    metadataProvider: "jikan" as const,
    metadataOnly: true as const,
    hasMore: response.pagination.has_next_page,
  };
}

export async function metadataRelations(malId: string) {
  try {
    return { data: await jikan.jikanRelations(malId) };
  } catch {
    return { data: [] as { relation: string; mal_id: number; name: string }[] };
  }
}

export async function browseCurated() {
  let anilistError: unknown;
  try {
    return await anilist.anilistCuratedHome();
  } catch (error) {
    anilistError = error;
  }

  try {
    const home = await jikan.jikanHome();
    const season = home.season.map((a) => ({
      ...a,
      anilist_id: 0,
      banner_image: null,
    }));
    const top = home.top.map((a) => ({
      ...a,
      anilist_id: 0,
      banner_image: null,
    }));
    return {
      spotlight: top.slice(0, 1),
      trending: top.slice(0, 18),
      popular: top,
      recent: season,
      upcoming: [],
      season,
      top,
      genres: [...anilist.BROWSE_GENRES],
    };
  } catch {
    throw anilistError ?? new Error("AniList and Jikan home catalogs are unavailable");
  }
}

export async function browseSection(section: string, genre?: string) {
  switch (section) {
    case "trending":
      return { data: await anilist.anilistTrending() };
    case "popular":
      return { data: await anilist.anilistPopular() };
    case "recent":
      return { data: await anilist.anilistRecent() };
    case "upcoming":
      return { data: await anilist.anilistUpcoming() };
    case "season":
      return { data: await anilist.anilistCatalogSeason() };
    case "top":
      return { data: await anilist.anilistCatalogTop() };
    case "genre":
      if (!genre) throw new Error("genre required");
      return { data: await anilist.anilistByGenre(genre) };
    default:
      throw new Error(`Unknown section: ${section}`);
  }
}
