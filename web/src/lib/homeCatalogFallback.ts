import type { CatalogAnime, CuratedHome } from "../api";

const HOME_CACHE_KEY = "anistream:curated-home:v1";
const HOME_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function offlineAnime(input: {
  anilistId: number;
  malId: number;
  title: string;
  poster: string;
  score: number;
  episodes: number;
  status: string;
  synopsis: string;
}): CatalogAnime {
  return {
    anilist_id: input.anilistId,
    mal_id: input.malId,
    title: input.title,
    title_english: input.title,
    images: {
      jpg: { large_image_url: input.poster },
    },
    banner_image: input.poster,
    score: input.score,
    synopsis: input.synopsis,
    episodes: input.episodes,
    status: input.status,
    genres: [],
  };
}

const offlinePicks: CatalogAnime[] = [
  offlineAnime({
    anilistId: 212888,
    malId: 64340,
    title: "Overgeared",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx212888-NhyvqPt5aIuJ.jpg",
    score: 7.6,
    episodes: 12,
    status: "RELEASING",
    synopsis: "An unlucky gamer discovers a legendary class and begins a new adventure.",
  }),
  offlineAnime({
    anilistId: 21,
    malId: 21,
    title: "ONE PIECE",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-ELSYx3yMPcKM.jpg",
    score: 8.7,
    episodes: 0,
    status: "RELEASING",
    synopsis: "Monkey D. Luffy sets sail with his crew in search of the legendary One Piece.",
  }),
  offlineAnime({
    anilistId: 16498,
    malId: 16498,
    title: "Attack on Titan",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg",
    score: 8.5,
    episodes: 25,
    status: "FINISHED",
    synopsis: "Humanity fights for survival behind enormous walls.",
  }),
  offlineAnime({
    anilistId: 101922,
    malId: 38000,
    title: "Demon Slayer: Kimetsu no Yaiba",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WBsBl0ClmgYLJ.jpg",
    score: 8.2,
    episodes: 26,
    status: "FINISHED",
    synopsis: "Tanjiro joins the Demon Slayer Corps after tragedy strikes his family.",
  }),
  offlineAnime({
    anilistId: 97940,
    malId: 34572,
    title: "Black Clover",
    poster: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx97940-fyh8o7gNbha0.png",
    score: 7.9,
    episodes: 170,
    status: "FINISHED",
    synopsis: "Asta, born without magic, strives to become the Wizard King.",
  }),
];

export const OFFLINE_HOME_CATALOG: CuratedHome = {
  spotlight: offlinePicks.slice(0, 1),
  trending: offlinePicks,
  popular: offlinePicks.slice(1),
  recent: [],
  upcoming: [],
  season: [],
  top: offlinePicks.slice(1),
  genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance"],
};

function isCuratedHome(value: unknown): value is CuratedHome {
  if (!value || typeof value !== "object") return false;
  const home = value as Partial<CuratedHome>;
  return (
    Array.isArray(home.spotlight) &&
    Array.isArray(home.trending) &&
    Array.isArray(home.popular) &&
    Array.isArray(home.recent) &&
    Array.isArray(home.upcoming) &&
    Array.isArray(home.season) &&
    Array.isArray(home.top) &&
    Array.isArray(home.genres)
  );
}

export function getInitialHomeCatalog(): CuratedHome {
  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return OFFLINE_HOME_CATALOG;
    const entry = JSON.parse(raw) as { savedAt?: number; data?: unknown };
    if (
      typeof entry.savedAt !== "number" ||
      Date.now() - entry.savedAt > HOME_CACHE_TTL_MS ||
      !isCuratedHome(entry.data)
    ) {
      localStorage.removeItem(HOME_CACHE_KEY);
      return OFFLINE_HOME_CATALOG;
    }
    return entry.data;
  } catch {
    return OFFLINE_HOME_CATALOG;
  }
}

export function cacheHomeCatalog(data: CuratedHome): void {
  try {
    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // The live catalog remains usable when local storage is unavailable or full.
  }
}
