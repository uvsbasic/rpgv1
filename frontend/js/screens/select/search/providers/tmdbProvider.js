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
  minQueryLength = 2
} = {}) {
  return {
    mode: "tmdb",
    async search({ query, baseVisible, limit = 6 }) {
      const q = String(query || "").trim();
      if (!q || q.length < minQueryLength) return [];
      if (!Array.isArray(baseVisible)) baseVisible = [];

      const searchPath = `/api/catalog/search?query=${encodeURIComponent(q)}&page=1`;
      const host = (typeof window !== "undefined" && window?.location?.hostname)
        ? String(window.location.hostname)
        : "localhost";
      const port = (typeof window !== "undefined" && window?.location?.port)
        ? String(window.location.port)
        : "";
      const useSameOriginApi = !(port === "5500");
      const urls = [
        // Preferred: same-origin proxy when available.
        ...(useSameOriginApi ? [searchPath] : []),
        // Fallbacks: direct local catalog server for setups without a dev proxy.
        `http://localhost:8787${searchPath}`,
        `http://127.0.0.1:8787${searchPath}`,
        `http://${host}:8787${searchPath}`
      ];

      let res = null;
      for (const url of urls) {
        try {
          const candidate = await fetchImpl(url, { method: "GET" });
          if (candidate?.ok) {
            res = candidate;
            break;
          }
        } catch {
          // try next URL
        }
      }
      if (!res?.ok) {
        try {
          console.warn("[expanded-search] catalog backend unreachable", { mode: "expanded", query: q });
        } catch {}
        return [];
      }

      const data = await res.json().catch(() => null);
      const results = Array.isArray(data?.results)
        ? data.results
        : (Array.isArray(data?.items) ? data.items : []);
      if (!results.length) return [];

      const localIndex = buildLocalIndex(baseVisible);
      const out = [];
      const seen = new Set();
      const detailCache = new Map();

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
        let details = null;
        if ((!hasGenrePair || !hasRuntime || !hasRating) && providerId != null) {
          if (detailCache.has(providerId)) details = detailCache.get(providerId);
          else {
            details = await fetchDetailsForProviderId(providerId, fetchImpl);
            detailCache.set(providerId, details);
          }
        }

        const rawGenres = Array.isArray(details?.genres)
          ? details.genres
          : (Array.isArray(r?.genres) ? r.genres : []);
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
            release_date: String(details?.release_date || r?.release_date || ""),
            year: yearFromAny(details || r),
            runtime: Number.isFinite(Number(details?.runtime))
              ? Number(details.runtime)
              : (Number.isFinite(Number(r?.runtime)) ? Number(r.runtime) : null),
            imdb: Number.isFinite(Number(details?.imdb))
              ? Number(details.imdb)
              : (Number.isFinite(Number(details?.rating))
                ? Number(details.rating)
                : (Number.isFinite(Number(r?.imdb))
                  ? Number(r.imdb)
                  : (Number.isFinite(Number(r?.rating))
                    ? Number(r.rating)
                    : (Number.isFinite(Number(r?.vote_average)) ? Number(r.vote_average) : null)))),
            genres: rawGenres.slice(0, 8).map((g) => String(g)),
            primaryGenre: String(
              details?.primaryGenre || r?.primaryGenre || normGenres[0] || ""
            ).toUpperCase() || null,
            secondaryGenre: String(
              details?.secondaryGenre || r?.secondaryGenre || normGenres[1] || ""
            ).toUpperCase() || null,
            posterUrl: String(details?.posterUrl || r?.posterUrl || ""),
            provider: "tmdb",
            providerId
          }
        });

        if (out.length >= limit) break;
      }

      return out;
    }
  };
}
