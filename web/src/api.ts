const API = import.meta.env.VITE_API_URL ?? "";
const REQUEST_TIMEOUT_MS = 25_000;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { large_image_url: string } };
  score: number | null;
  synopsis: string | null;
  episodes: number | null;
  genres?: { name: string }[];
  status?: string;
  year?: number;
  studios?: { name: string }[];
}

export interface StreamAnime {
  id: string;
  name: string;
  poster: string;
  type?: string;
  provider?: string;
  malId?: number;
  episodes?: { sub?: number; dub?: number };
}

export interface Episode {
  episodeId: string;
  number: number;
  title: string;
  isFiller: boolean;
  isRecap?: boolean;
  airDate?: string;
  duration?: number;
  description?: string;
  image?: string;
  episodeType?: string;
  streamable?: boolean;
  metadataOnly?: boolean;
  score?: number | null;
  titleJapanese?: string | null;
  titleRomanji?: string | null;
  metadataSource?: "jikan" | "local-cache" | "local-placeholder";
}

export interface EpisodesResponse {
  episodes: Episode[];
  totalEpisodes: number;
  streamProvider?: string | null;
  category?: string | null;
  metadataProvider?: string;
  metadataOnly?: boolean;
  hasMore?: boolean;
  zenshin?: {
    planned: number;
    streamable?: number;
    mappings?: Record<string, string | number | null | undefined>;
  };
}

export interface CatalogAnime extends JikanAnime {
  anilist_id: number;
  banner_image: string | null;
  start_date?: string | null;
  next_airing_at?: string | null;
  next_airing_episode?: number | null;
}

export interface CuratedHome {
  spotlight: CatalogAnime[];
  trending: CatalogAnime[];
  popular: CatalogAnime[];
  recent: CatalogAnime[];
  upcoming: CatalogAnime[];
  season: CatalogAnime[];
  top: CatalogAnime[];
  genres: string[];
}

export interface CatalogSource {
  key: string;
  provider: string;
  label: string;
  animeId: string;
  type: "hls" | "embed";
  episodes: number;
  latestEpisode: number;
  checkedAt: string;
  malId?: number;
}

export interface SourceSnapshot {
  key: string;
  provider: string;
  animeId: string;
  episodes: number;
  latestEpisode: number;
  checkedAt: string;
}

export interface WatchSourceOption {
  key: string;
  provider: string;
  label: string;
  type: "hls" | "embed";
  status: "ok" | "blocked" | "unknown";
  episodeId: string;
  animeId?: string;
  server?: string;
  category?: "sub" | "dub";
  note?: string;
}

export const api = {
  curatedHome: () => get<CuratedHome>("/api/browse/curated"),
  browseSection: (section: string, genre?: string) => {
    const qs = genre ? `?genre=${encodeURIComponent(genre)}` : "";
    return get<{ data: CatalogAnime[] }>(`/api/browse/section/${section}${qs}`);
  },
  homeBrowse: () => get<{ season: JikanAnime[]; top: JikanAnime[] }>("/api/browse/home"),
  seasonNow: () => get<{ data: JikanAnime[] }>("/api/browse/season"),
  topAnime: () => get<{ data: JikanAnime[] }>("/api/browse/top"),
  metadataSearch: (q: string) =>
    get<{ data: JikanAnime[] }>(`/api/metadata/search?q=${encodeURIComponent(q)}`),
  metadataById: (malId: number) =>
    get<{ data: JikanAnime }>(`/api/metadata/${malId}`),
  metadataEpisodes: (malId: number) =>
    get<EpisodesResponse>(`/api/metadata/${malId}/episodes`),
  metadataRelations: (malId: number) =>
    get<{ data: { relation: string; mal_id: number; name: string }[] }>(
      `/api/metadata/${malId}/relations`
    ),
  streamSearch: async (q: string) => {
    try {
      return await get<{ animes: StreamAnime[] }>(
        `/api/anime/search?q=${encodeURIComponent(q)}`
      );
    } catch {
      return { animes: [] as StreamAnime[] };
    }
  },
  animeInfo: (id: string, provider?: string) => {
    const qs = provider ? `?provider=${provider}` : "";
    return get<{ anime: { info: Record<string, unknown> } }>(`/api/anime/${id}${qs}`);
  },
  episodes: (
    id: string,
    provider?: string,
    ids?: { malId?: number; anilistId?: number }
  ) => {
    const params = new URLSearchParams();
    if (provider) params.set("provider", provider);
    if (ids?.malId) params.set("mal", String(ids.malId));
    if (ids?.anilistId) params.set("anilist", String(ids.anilistId));
    const qs = params.toString() ? `?${params}` : "";
    return get<EpisodesResponse>(`/api/anime/${id}/episodes${qs}`);
  },
  catalogSources: (
    id: string,
    title: string,
    ids?: { malId?: number; anilistId?: number }
  ) => {
    const params = new URLSearchParams({ title });
    if (ids?.malId) params.set("mal", String(ids.malId));
    if (ids?.anilistId) params.set("anilist", String(ids.anilistId));
    return get<{ sources: CatalogSource[] }>(`/api/anime/${id}/sources?${params}`);
  },
  refreshCatalogSources: (body: {
    sources: { key: string; provider: string; animeId: string }[];
    title?: string;
    malId?: string;
    anilistId?: string;
  }) => post<{ snapshots: SourceSnapshot[] }>("/api/anime/sources/refresh", body),
  watchSources: (
    episodeId: string,
    opts: {
      ep: number;
      title: string;
      animeId?: string;
      malId?: string;
      anilistId?: string;
    }
  ) => {
    const params = new URLSearchParams({
      ep: String(opts.ep),
      title: opts.title,
    });
    if (opts.animeId) params.set("animeId", opts.animeId);
    if (opts.malId) params.set("mal", opts.malId);
    if (opts.anilistId) params.set("anilist", opts.anilistId);
    return get<{ sources: WatchSourceOption[] }>(`/api/watch/${episodeId}/sources?${params}`);
  },
  watch: (
    episodeId: string,
    server = "hd-1",
    category = "sub",
    provider?: string,
    animeId?: string,
    title?: string
  ) => {
    const params = new URLSearchParams({ server, category });
    if (provider) params.set("provider", provider);
    if (animeId) params.set("animeId", animeId);
    if (title) params.set("title", title);
    return get<{
      provider?: string;
      sources: { url: string; originalUrl?: string; isM3U8: boolean; type?: string }[];
      tracks: { file: string; label: string; kind: string; default?: boolean }[];
      intro?: { start: number; end: number };
      outro?: { start: number; end: number };
    }>(`/api/watch/${episodeId}?${params}`);
  },
  watchServers: (episodeId: string) =>
    get<{ sub: { serverName: string }[]; dub: { serverName: string }[] }>(
      `/api/watch/${episodeId}/servers`
    ),
  watchFallback: (episodeId: string, provider = "animepahe") =>
    get<{ sources: { url: string }[]; subtitles?: { url: string; lang: string }[] }>(
      `/api/watch/${episodeId}/fallback?provider=${provider}`
    ),
  downloadSearch: (q: string) =>
    get<{
      results?: { id: string; detailPath: string; title: string; poster?: string }[];
      available?: boolean;
    }>(`/api/downloads/search?q=${encodeURIComponent(q)}`),
  downloads: (id: string, ep: string, detailPath: string, season = 1) => {
    const params = new URLSearchParams({ detailPath, season: String(season) });
    return get<unknown>(
      `/api/downloads/${encodeURIComponent(id)}/${encodeURIComponent(ep)}?${params}`
    );
  },
};

const EPISODE_GUIDE_CACHE_PREFIX = "anistream:episode-guide:v1:";
const EPISODE_GUIDE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LOCAL_GUIDE_EPISODES = 500;

function episodeGuideStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function markGuideEpisodes(
  episodes: Episode[],
  metadataSource: NonNullable<Episode["metadataSource"]>
): Episode[] {
  return episodes.map((episode) => ({
    ...episode,
    metadataOnly: true,
    streamable: false,
    metadataSource,
  }));
}

export function cacheJikanEpisodeGuide(malId: number, response: EpisodesResponse): void {
  if (!Number.isSafeInteger(malId) || malId < 1 || response.metadataProvider !== "jikan") return;
  const storage = episodeGuideStorage();
  if (!storage) return;

  const episodes = response.episodes
    .filter((episode) => episode.metadataOnly)
    .slice(0, MAX_LOCAL_GUIDE_EPISODES)
    .map((episode) => ({
      ...episode,
      metadataOnly: true,
      streamable: false,
      metadataSource: "jikan" as const,
    }));
  if (episodes.length === 0) return;

  try {
    storage.setItem(
      `${EPISODE_GUIDE_CACHE_PREFIX}${malId}`,
      JSON.stringify({
        savedAt: Date.now(),
        totalEpisodes: response.totalEpisodes,
        hasMore: response.hasMore,
        episodes,
      })
    );
  } catch {
    // Storage can be unavailable or full; the live response still works.
  }
}

function readCachedJikanEpisodeGuide(malId: number): EpisodesResponse | null {
  if (!Number.isSafeInteger(malId) || malId < 1) return null;
  const storage = episodeGuideStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(`${EPISODE_GUIDE_CACHE_PREFIX}${malId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as {
      savedAt?: number;
      totalEpisodes?: number;
      hasMore?: boolean;
      episodes?: unknown[];
    };
    if (
      typeof cached.savedAt !== "number" ||
      Date.now() - cached.savedAt > EPISODE_GUIDE_CACHE_TTL_MS ||
      !Array.isArray(cached.episodes)
    ) {
      storage.removeItem(`${EPISODE_GUIDE_CACHE_PREFIX}${malId}`);
      return null;
    }

    const validEpisodes = cached.episodes.filter(
      (episode): episode is Episode =>
        typeof episode === "object" &&
        episode !== null &&
        typeof (episode as Episode).episodeId === "string" &&
        Number.isFinite((episode as Episode).number) &&
        typeof (episode as Episode).title === "string" &&
        typeof (episode as Episode).isFiller === "boolean"
    );
    const episodes = markGuideEpisodes(
      validEpisodes.slice(0, MAX_LOCAL_GUIDE_EPISODES),
      "local-cache"
    );
    if (episodes.length === 0) return null;

    const cachedTotal = Number(cached.totalEpisodes);
    return {
      episodes,
      totalEpisodes:
        Number.isFinite(cachedTotal) && cachedTotal > 0
          ? Math.max(episodes.length, cachedTotal)
          : episodes.length,
      hasMore: Boolean(cached.hasMore),
      metadataOnly: true,
      metadataProvider: "local-cache",
    };
  } catch {
    return null;
  }
}

export function getOfflineEpisodeGuide(
  malId: number,
  episodeCountHint = 0
): EpisodesResponse | null {
  const cached = readCachedJikanEpisodeGuide(malId);
  if (cached) return cached;
  if (!Number.isSafeInteger(malId) || malId < 1) return null;

  const numericCount = Number(episodeCountHint);
  const count = Number.isFinite(numericCount)
    ? Math.min(100_000, Math.max(0, Math.floor(numericCount)))
    : 0;
  if (count < 1) return null;
  const shownCount = Math.min(count, MAX_LOCAL_GUIDE_EPISODES);
  const episodes = Array.from({ length: shownCount }, (_, index): Episode => {
    const number = index + 1;
    return {
      episodeId: `offline-${malId}-${number}`,
      number,
      title: `Episode ${number}`,
      description: "Numbered offline placeholder only; verified episode details and playback are unavailable.",
      isFiller: false,
      streamable: false,
      metadataOnly: true,
      metadataSource: "local-placeholder",
    };
  });

  return {
    episodes,
    totalEpisodes: count,
    hasMore: count > shownCount,
    metadataOnly: true,
    metadataProvider: "local-placeholder",
  };
}

export async function metadataEpisodesWithLocalFallback(
  malId: number,
  episodeCountHint = 0
): Promise<EpisodesResponse> {
  try {
    const response = await api.metadataEpisodes(malId);
    const guide: EpisodesResponse = {
      ...response,
      metadataProvider: response.metadataProvider ?? "jikan",
      metadataOnly: true,
      episodes: markGuideEpisodes(response.episodes ?? [], "jikan"),
    };
    if (guide.episodes.length > 0) cacheJikanEpisodeGuide(malId, guide);
    if (guide.episodes.length > 0 || episodeCountHint <= 0) return guide;
  } catch {
    // Fall through to this device's saved guide or numbered placeholders.
  }

  return (
    getOfflineEpisodeGuide(malId, episodeCountHint) ?? {
      episodes: [],
      totalEpisodes: 0,
      metadataOnly: true,
      metadataProvider: "unavailable",
    }
  );
}
