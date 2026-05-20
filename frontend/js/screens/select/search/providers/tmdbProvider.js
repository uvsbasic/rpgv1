// frontend/js/screens/select/search/providers/tmdbProvider.js
//
// TMDB-backed suggestions. Results are mapped to local movies when possible
// so pick-slot flow can still place into local party slots.

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function safeGetLS(key) {
  try {
    return window?.localStorage?.getItem(key);
  } catch {
    return null;
  }
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeCatalogMovieLike(rec) {
  if (!rec || typeof rec !== "object") return null;
  const title = String(rec.title || rec.shortTitle || "").trim();
  if (!title) return null;
  const providerId = Number.isFinite(Number(rec.providerId)) ? Number(rec.providerId) : null;
  const id = normalizeTmdbMovieId(rec.id, providerId, title);
  return {
    id,
    title,
    shortTitle: String(rec.shortTitle || title),
    year: yearFromAny(rec),
    release_date: String(rec.release_date || ""),
    runtime: Number.isFinite(Number(rec.runtime)) ? Number(rec.runtime) : null,
    imdb: Number.isFinite(Number(rec.imdb))
      ? Number(rec.imdb)
      : (Number.isFinite(Number(rec.rating)) ? Number(rec.rating) : null),
    genres: Array.isArray(rec.genres) ? rec.genres.slice(0, 8).map((g) => String(g)) : [],
    primaryGenre: String(rec.primaryGenre || "").toUpperCase() || null,
    secondaryGenre: String(rec.secondaryGenre || "").toUpperCase() || null,
    posterUrl: String(rec.posterUrl || ""),
    provider: "tmdb",
    providerId,
    isExpanded: true
  };
}

function loadExpandedFallbackPool() {
  const pool = [];
  const byId = new Set();

  const expandedRaw = safeGetLS("rpg_select_expanded_cache_v1");
  const expandedParsed = safeJsonParse(expandedRaw, null);
  const expandedMovies = Array.isArray(expandedParsed?.expandedMovies) ? expandedParsed.expandedMovies : [];
  for (const rec of expandedMovies) {
    const m = normalizeCatalogMovieLike(rec);
    if (!m) continue;
    if (byId.has(m.id)) continue;
    byId.add(m.id);
    pool.push(m);
  }

  const livingRaw = safeGetLS("livingCatalog:v1");
  const livingParsed = safeJsonParse(livingRaw, null);
  const pages = livingParsed?.cache?.pages && typeof livingParsed.cache.pages === "object"
    ? Object.values(livingParsed.cache.pages)
    : [];
  for (const entry of pages) {
    const items = Array.isArray(entry?.payload?.items) ? entry.payload.items : [];
    for (const rec of items) {
      const m = normalizeCatalogMovieLike(rec);
      if (!m) continue;
      if (byId.has(m.id)) continue;
      byId.add(m.id);
      pool.push(m);
      if (pool.length >= 1200) return pool;
    }
  }
  return pool;
}

function fallbackExpandedSearch({ query, baseVisible, limit }) {
  const q = norm(query);
  if (!q) return [];
  const base = Array.isArray(baseVisible) ? baseVisible : [];
  const localIndex = buildLocalIndex(base);
  const pool = loadExpandedFallbackPool();
  if (!pool.length) return [];

  const out = [];
  const seen = new Set();
  for (const movie of pool) {
    const titleKey = norm(movie?.title || "");
    if (!titleKey || !titleKey.includes(q)) continue;
    const match = resolveLocalMatch(movie, localIndex);
    const baseIndex = Number.isFinite(Number(match?.baseIndex)) ? Number(match.baseIndex) : null;
    const dedupeKey = baseIndex != null ? `base:${baseIndex}` : `id:${String(movie.id || "")}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    out.push({
      source: "tmdb-fallback",
      baseIndex,
      tmdbId: Number.isFinite(Number(movie?.providerId)) ? Number(movie.providerId) : null,
      movie: match?.movie || movie
    });
    if (out.length >= limit) break;
  }
  return out;
}

function normalizeSearchResultsPayload(data) {
  return Array.isArray(data?.results)
    ? data.results
    : (Array.isArray(data?.items) ? data.items : []);
}

function scoreResultForQuery(result, rawQuery) {
  const q = norm(rawQuery);
  const title = String(result?.title || result?.name || "");
  const t = norm(title);
  if (!q || !t) return 0;
  if (t === q) return 400;
  if (t.startsWith(q)) return 300;
  if (t.includes(q)) return 200;
  // very weak fuzzy: all query tokens appear in title
  const tokens = String(rawQuery || "").toLowerCase().split(/\s+/g).filter(Boolean);
  const tokenHits = tokens.filter((tok) => t.includes(norm(tok))).length;
  return tokenHits > 0 ? (100 + tokenHits) : 0;
}

function normalizeCatalogGenreName(name) {
  const s = String(name || "").trim().toLowerCase();
  if (!s) return null;
  const map = {
    action: "ACTION",
    adventure: "ADVENTURE",
    animation: "ANIMATION",
    comedy: "COMEDY",
    crime: "CRIME",
    documentary: "DRAMA",
    drama: "DRAMA",
    family: "FANTASY",
    fantasy: "FANTASY",
    history: "DRAMA",
    horror: "HORROR",
    music: "MUSICAL",
    musical: "MUSICAL",
    mystery: "MYSTERY",
    romance: "ROMANCE",
    "science fiction": "SCIFI",
    "sci-fi": "SCIFI",
    thriller: "THRILLER",
    war: "ACTION",
    western: "ADVENTURE",
    tv: "DRAMA",
    "tv movie": "DRAMA"
  };
  return map[s] || null;
}

function yearFromAny(movieLike) {
  const y =
    movieLike?.year ??
    movieLike?.releaseYear ??
    movieLike?.release_date?.slice?.(0, 4) ??
    movieLike?.date?.slice?.(0, 4);
  const yn = Number(y);
  return Number.isFinite(yn) && yn > 1800 ? yn : null;
}

async function fetchDetailsForProviderId(providerId, fetchImpl) {
  const pid = Number(providerId);
  if (!Number.isFinite(pid)) return null;
  const detailsPath = `/api/catalog/details?providerId=${encodeURIComponent(String(pid))}`;
  const host = (typeof window !== "undefined" && window?.location?.hostname)
    ? String(window.location.hostname)
    : "localhost";
  const port = (typeof window !== "undefined" && window?.location?.port)
    ? String(window.location.port)
    : "";
  const useSameOriginApi = !(port === "5500");
  const urls = [
    ...(useSameOriginApi ? [detailsPath] : []),
    `http://localhost:8787${detailsPath}`,
    `http://127.0.0.1:8787${detailsPath}`,
    `http://${host}:8787${detailsPath}`
  ];

  for (const url of urls) {
    try {
      const res = await fetchImpl(url, { method: "GET" });
      if (!res?.ok) continue;
      const data = await res.json().catch(() => null);
      if (data && typeof data === "object") return data;
    } catch {
      // continue
    }
  }
  return null;
}

function buildLocalIndex(baseVisible) {
  const byTitle = new Map();
  for (let i = 0; i < baseVisible.length; i++) {
    const m = baseVisible[i];
    const k = norm(m?.title || "");
    if (!k) continue;
    if (!byTitle.has(k)) byTitle.set(k, []);
    byTitle.get(k).push({ baseIndex: i, movie: m, year: yearFromAny(m) });
  }
  return { byTitle };
}

function resolveLocalMatch(tmdbResult, localIndex) {
  const title = String(tmdbResult?.title || tmdbResult?.name || "");
  const key = norm(title);
  if (!key) return null;

  const candidates = localIndex.byTitle.get(key) || [];
  if (!candidates.length) return null;

  const tmdbYear = yearFromAny(tmdbResult);
  if (tmdbYear != null) {
    const exactYear = candidates.find((c) => c.year === tmdbYear);
    if (exactYear) return exactYear;
  }
  return candidates[0];
}

function normalizeTmdbMovieId(rawId, fallbackProviderId, fallbackTitle) {
  const rid = String(rawId || "").trim();
  if (rid.startsWith("tmdb_")) return rid;
  if (rid) return `tmdb_${rid}`;
  const pid = Number(fallbackProviderId);
  if (Number.isFinite(pid)) return `tmdb_${pid}`;
  return `tmdb_${norm(fallbackTitle || "unknown")}`;
}

export function createTmdbSearchProvider({
  getApiKey,
  fetchImpl = (...args) => fetch(...args),
  minQueryLength = 2,
  maxSearchPages = 1
} = {}) {
  return {
    mode: "tmdb",
    async search({ query, baseVisible, limit = 6 }) {
      const q = String(query || "").trim();
      if (!q || q.length < minQueryLength) return [];
      if (!Array.isArray(baseVisible)) baseVisible = [];

      const maxPages = Math.max(1, Number(maxSearchPages) || 1);
      const host = (typeof window !== "undefined" && window?.location?.hostname)
        ? String(window.location.hostname)
        : "localhost";
      const port = (typeof window !== "undefined" && window?.location?.port)
        ? String(window.location.port)
        : "";
      const useSameOriginApi = !(port === "5500");
      const aggregated = [];
      const loadedIds = new Set();
      let anyBackendReachable = false;
      let totalPages = 1;

      for (let page = 1; page <= maxPages; page++) {
        if (page > totalPages) break;
        const searchPath = `/api/catalog/search?query=${encodeURIComponent(q)}&page=${page}`;
        const urls = [
          ...(useSameOriginApi ? [searchPath] : []),
          `http://localhost:8787${searchPath}`,
          `http://127.0.0.1:8787${searchPath}`,
          `http://${host}:8787${searchPath}`
        ];

        let pageData = null;
        for (const url of urls) {
          try {
            const candidate = await fetchImpl(url, { method: "GET" });
            if (!candidate?.ok) continue;
            const parsed = await candidate.json().catch(() => null);
            if (parsed && typeof parsed === "object") {
              pageData = parsed;
              anyBackendReachable = true;
              break;
            }
          } catch {
            // try next URL
          }
        }
        if (!pageData) {
          if (!anyBackendReachable) {
            try {
              console.warn("[expanded-search] catalog backend unreachable", { mode: "expanded", query: q });
            } catch {}
            return fallbackExpandedSearch({ query: q, baseVisible, limit });
          }
          break;
        }

        const pageTotal = Number(pageData?.totalPages);
        if (Number.isFinite(pageTotal) && pageTotal > 0) totalPages = Math.min(500, Math.floor(pageTotal));

        const pageResults = normalizeSearchResultsPayload(pageData);
        for (const r of pageResults) {
          const rid = String(r?.id || r?.providerId || "");
          const dedupe = rid ? rid : `${norm(r?.title || r?.name || "")}:${yearFromAny(r) || ""}`;
          if (loadedIds.has(dedupe)) continue;
          loadedIds.add(dedupe);
          aggregated.push(r);
        }

        // Stop early once we have enough fuzzy matches to fill dropdown comfortably.
        const quickMatches = aggregated.filter((r) => scoreResultForQuery(r, q) >= 200).length;
        if (quickMatches >= Math.max(limit * 2, 20)) break;
      }

      if (!aggregated.length) return fallbackExpandedSearch({ query: q, baseVisible, limit });
      const results = aggregated
        .map((r, idx) => ({ r, idx, score: scoreResultForQuery(r, q) }))
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.idx - b.idx;
        })
        .map((x) => x.r);
      if (!results.length) return fallbackExpandedSearch({ query: q, baseVisible, limit });

      const localIndex = buildLocalIndex(baseVisible);
      const out = [];
      const seen = new Set();
      // Important for responsiveness:
      // avoid per-suggestion details fetches here. The search backend already
      // enriches core fields, and extra round-trips make dropdown feel laggy.

      for (const r of results) {
        const match = resolveLocalMatch(r, localIndex);

        const baseIndex = Number.isFinite(Number(match?.baseIndex))
          ? Number(match.baseIndex)
          : null;

        const dedupeKey = baseIndex != null
          ? `base:${baseIndex}`
          : `tmdb:${String(r?.id || "")}:${norm(r?.title || r?.name || "")}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const providerId = Number.isFinite(Number(r?.id))
          ? Number(r.id)
          : (Number.isFinite(Number(r?.providerId)) ? Number(r.providerId) : null);

        const hasGenrePair = !!String(r?.primaryGenre || "").trim() || !!String(r?.secondaryGenre || "").trim();
        const hasRuntime = Number.isFinite(Number(r?.runtime));
        const hasRating = Number.isFinite(Number(r?.imdb)) || Number.isFinite(Number(r?.rating)) || Number.isFinite(Number(r?.vote_average));
        const details = null;

        const rawGenres = Array.isArray(r?.genres) ? r.genres : [];
        const normGenres = Array.from(
          new Set(rawGenres.map((g) => normalizeCatalogGenreName(g)).filter(Boolean))
        );

        out.push({
          source: "tmdb",
          baseIndex,
          tmdbId: providerId,
          movie: match?.movie || {
            id: normalizeTmdbMovieId(r?.id, r?.providerId, r?.title || r?.name || ""),
            title: String(r?.title || r?.name || "Unknown"),
            shortTitle: String(r?.title || r?.name || "Unknown"),
            release_date: String(r?.release_date || ""),
            year: yearFromAny(r),
            runtime: Number.isFinite(Number(r?.runtime)) ? Number(r.runtime) : null,
            imdb: Number.isFinite(Number(r?.imdb))
              ? Number(r.imdb)
              : (Number.isFinite(Number(r?.rating))
                ? Number(r.rating)
                : (Number.isFinite(Number(r?.vote_average)) ? Number(r.vote_average) : null)),
            genres: rawGenres.slice(0, 8).map((g) => String(g)),
            primaryGenre: String(
              r?.primaryGenre || normGenres[0] || ""
            ).toUpperCase() || null,
            secondaryGenre: String(
              r?.secondaryGenre || normGenres[1] || ""
            ).toUpperCase() || null,
            posterUrl: String(r?.posterUrl || ""),
            provider: "tmdb",
            providerId
          }
        });

        if (out.length >= limit) break;
      }

      if (!out.length) return fallbackExpandedSearch({ query: q, baseVisible, limit });
      return out;
    }
  };
}
