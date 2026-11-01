import { config } from "../config.js";
import { fetchJson } from "../fetch.js";

export interface MovieBoxSearchItem {
  id: string;
  detailPath: string;
  title: string;
  poster?: string;
  year?: number;
  releaseDate?: string;
  type?: string;
  [key: string]: unknown;
}

interface MovieBoxSearchPayload {
  query?: string;
  count?: number;
  results?: Record<string, unknown>[];
  data?: { items?: Record<string, unknown>[] };
  warning?: string;
}

function apiBase(): string {
  const base = config.movieboxUrl.replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

function endpoint(path: string, params: URLSearchParams): string {
  return `${apiBase()}/${path}?${params.toString()}`;
}

function requestOptions(): RequestInit {
  return {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "AniStream-Gateway/1.0" },
  };
}

export async function movieboxSearch(query: string) {
  const params = new URLSearchParams({ q: query, page: "1", perPage: "20" });
  const payload = await fetchJson<MovieBoxSearchPayload>(endpoint("search", params), requestOptions());
  const rawResults = payload.results ?? payload.data?.items ?? [];
  const results = rawResults.flatMap((item): MovieBoxSearchItem[] => {
    const id = String(item.id ?? item.subjectId ?? "");
    const detailPath = String(item.detailPath ?? "");
    const title = String(item.title ?? "");
    if (!id || !detailPath || !title) return [];
    const cover = item.cover;
    const poster =
      typeof item.poster === "string"
        ? item.poster
        : cover && typeof cover === "object" && typeof (cover as Record<string, unknown>).url === "string"
          ? String((cover as Record<string, unknown>).url)
          : undefined;
    const year = typeof item.year === "number" ? item.year : undefined;
    return [{ ...item, id, detailPath, title, poster, year } as MovieBoxSearchItem];
  });
  return {
    query: payload.query ?? query,
    count: payload.count ?? results.length,
    results,
    provider: "moviebox" as const,
    available: true,
    ...(payload.warning ? { warning: payload.warning } : {}),
  };
}

export async function movieboxDetail(subjectId: string, detailPath: string) {
  const params = new URLSearchParams({ subjectId, detailPath });
  return fetchJson<unknown>(endpoint("detail", params), requestOptions());
}

export async function movieboxEpisodeSources(
  subjectId: string,
  detailPath: string,
  season: number,
  episode: number
) {
  const params = new URLSearchParams({
    subjectId,
    detailPath,
    se: String(season),
    ep: String(episode),
    "supportCodecs[h264]": "1",
    "supportCodecs[hevc]": "1",
  });
  return fetchJson<unknown>(endpoint("download", params), requestOptions());
}
