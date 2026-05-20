// server/server.js
//
// Express proxy for a "living catalog" provider.
// Currently implemented for TMDB, but the response is normalized
// so your frontend doesn't care which provider is used later.
//
// Run:
//   cd server
//   npm i
//   cp .env.example .env
//   npm run dev
//
// Then ensure your frontend dev server proxies /api/* to this server,
// OR run your frontend from the same origin in production.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.warn("⚠️  Missing TMDB_API_KEY in environment. Proxy endpoints will fail.");
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (no origin) and allow all if not configured
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0) return cb(null, true);
      return cb(null, allowedOrigins.includes(origin));
    },
  })
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const POSTER_SIZE = "w342"; // good balance for your 400x300 scaled UI

function clampInt(n, a, b, fallback) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(a, Math.min(b, Math.round(x)));
}

function buildPosterUrl(posterPath) {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${POSTER_SIZE}${posterPath}`;
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

function classifyFetchFailure(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  const causeCode = String(err?.cause?.code || "").toUpperCase();
  const causeName = String(err?.cause?.name || "").toLowerCase();
  const causeMsg = String(err?.cause?.message || "").toLowerCase();
  const all = `${msg} ${causeCode} ${causeName} ${causeMsg}`.trim();

  if (!all) return "unknown";
  if (all.includes("enotfound") || all.includes("eai_again") || all.includes("getaddrinfo")) return "dns_resolution_failed";
  if (all.includes("etimedout") || all.includes("timeout")) return "network_timeout";
  if (all.includes("econnrefused")) return "connection_refused";
  if (all.includes("econnreset")) return "connection_reset";
  if (all.includes("certificate") || all.includes("self signed") || all.includes("tls")) return "tls_error";
  if (all.includes("blocked") || all.includes("forbidden")) return "network_blocked";
  if (all.includes("invalid url")) return "invalid_url";
  return "network_fetch_failed";
}

async function tmdbGet(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  let resp;
  try {
    resp = await fetch(url.toString(), { method: "GET" });
  } catch (err) {
    const wrapped = new Error(`TMDB network request failed: ${err?.message || "fetch failed"}`);
    wrapped.code = "TMDB_NETWORK_FETCH_FAILED";
    wrapped.path = path;
    wrapped.url = url.toString();
    wrapped.diagnostic = {
      category: classifyFetchFailure(err),
      message: String(err?.message || ""),
      causeCode: err?.cause?.code ? String(err.cause.code) : null,
      causeName: err?.cause?.name ? String(err.cause.name) : null,
      causeMessage: err?.cause?.message ? String(err.cause.message) : null
    };
    throw wrapped;
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const wrapped = new Error(`TMDB ${resp.status}: ${text || "Request failed"}`);
    wrapped.code = "TMDB_HTTP_ERROR";
    wrapped.path = path;
    wrapped.url = url.toString();
    wrapped.status = resp.status;
    wrapped.responseBody = text ? String(text).slice(0, 400) : "";
    throw wrapped;
  }
  return await resp.json();
}

// DISCOVER (browse-first)
// Example:
//   /api/catalog/discover?page=1&minRuntime=80&sort=popularity.desc
app.get("/api/catalog/discover", async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 500, 1);
    const minRuntime = clampInt(req.query.minRuntime, 40, 240, 80);
    const sort = typeof req.query.sort === "string" ? req.query.sort : "popularity.desc";

    // TMDB "discover/movie" supports with_runtime.gte and sort_by.
    // We also add a vote_count gate to reduce missing posters / ultra-obscure titles.
    const data = await tmdbGet("/discover/movie", {
      page,
      sort_by: sort,
      "with_runtime.gte": minRuntime,
      "vote_count.gte": 50,
      include_adult: "false",
      include_video: "false",
      language: "en-US",
    });

    const results = Array.isArray(data.results) ? data.results : [];
    const items = results.map((m) => {
      const title = m.title || m.original_title || "Untitled";
      const year = m.release_date ? Number(String(m.release_date).slice(0, 4)) : null;

      return {
        // stable game id (namespace avoids collisions if you add other providers later)
        id: `tmdb_${m.id}`,
        provider: "tmdb",
        providerId: m.id,

        title,
        shortTitle: title,
        year: Number.isFinite(year) ? year : null,

        // TMDB discover does not include runtime, so leave null for now.
        // If/when you need runtime, call /api/catalog/details?providerId=...
        runtime: null,

        rating: typeof m.vote_average === "number" ? m.vote_average : null,
        posterUrl: buildPosterUrl(m.poster_path),
        backdropUrl: m.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${m.backdrop_path}` : null,
      };
    });

    res.json({
      page: data.page || page,
      totalPages: data.total_pages || 1,
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Discover failed" });
  }
});

// SEARCH (query-first)
// Example:
//   /api/catalog/search?query=dune&page=1
app.get("/api/catalog/search", async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(500).json({
        error: "TMDB API key missing",
        diagnostic: {
          code: "TMDB_KEY_MISSING",
          hint: "Set TMDB_API_KEY in server/.env and restart the server."
        }
      });
    }
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    if (!query) return res.json({ page: 1, totalPages: 1, results: [] });

    const page = clampInt(req.query.page, 1, 500, 1);
    const data = await tmdbGet("/search/movie", {
      query,
      page,
      include_adult: "false",
      language: "en-US"
    });

    const raw = Array.isArray(data.results) ? data.results : [];

    const results = raw.map((m) => {
      const title = m.title || m.original_title || "Untitled";
      const year = m.release_date ? Number(String(m.release_date).slice(0, 4)) : null;
      const listGenres = Array.isArray(m?.genre_ids) ? m.genre_ids : [];
      const genreIdToName = {
        28: "Action",
        12: "Adventure",
        16: "Animation",
        35: "Comedy",
        80: "Crime",
        99: "Documentary",
        18: "Drama",
        10751: "Family",
        14: "Fantasy",
        36: "History",
        27: "Horror",
        10402: "Music",
        9648: "Mystery",
        10749: "Romance",
        878: "Science Fiction",
        53: "Thriller",
        10752: "War",
        37: "Western",
        10770: "TV Movie"
      };
      const genres = listGenres.map((id) => genreIdToName[id]).filter(Boolean);
      const normalizedGenres = genres
        .map((g) => normalizeCatalogGenreName(g))
        .filter(Boolean);
      const uniqueNormGenres = Array.from(new Set(normalizedGenres));
      return {
        id: `tmdb_${m.id}`,
        provider: "tmdb",
        providerId: m.id,
        title,
        shortTitle: title,
        year: Number.isFinite(year) ? year : null,
        runtime: null,
        imdb: Number.isFinite(Number(m?.vote_average)) ? Number(m.vote_average) : null,
        rating: Number.isFinite(Number(m?.vote_average)) ? Number(m.vote_average) : null,
        genres,
        primaryGenre: uniqueNormGenres[0] || null,
        secondaryGenre: uniqueNormGenres[1] || null,
        release_date: m.release_date || "",
        posterUrl: buildPosterUrl(m.poster_path),
        backdropUrl: m.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${m.backdrop_path}` : null
      };
    });

    res.json({
      page: data.page || page,
      totalPages: data.total_pages || 1,
      results
    });
  } catch (err) {
    const diagnostic = {
      code: String(err?.code || "CATALOG_SEARCH_FAILED"),
      path: err?.path ? String(err.path) : "/search/movie",
      category: err?.diagnostic?.category || null,
      status: Number.isFinite(Number(err?.status)) ? Number(err.status) : null,
      message: err?.diagnostic?.message || String(err?.message || "Search failed"),
      causeCode: err?.diagnostic?.causeCode || null,
      causeName: err?.diagnostic?.causeName || null,
      causeMessage: err?.diagnostic?.causeMessage || null
    };
    res.status(500).json({ error: err?.message || "Search failed", diagnostic });
  }
});

// DETAILS (optional now, but useful later)
// Example:
//   /api/catalog/details?providerId=603
app.get("/api/catalog/details", async (req, res) => {
  try {
    const providerId = clampInt(req.query.providerId, 1, 999999999, null);
    if (!providerId) return res.status(400).json({ error: "Missing providerId" });

    const m = await tmdbGet(`/movie/${providerId}`, { language: "en-US" });

    const title = m.title || m.original_title || "Untitled";
    const year = m.release_date ? Number(String(m.release_date).slice(0, 4)) : null;

    res.json({
      id: `tmdb_${m.id}`,
      provider: "tmdb",
      providerId: m.id,

      title,
      shortTitle: title,
      year: Number.isFinite(year) ? year : null,
      runtime: typeof m.runtime === "number" ? m.runtime : null,

      rating: typeof m.vote_average === "number" ? m.vote_average : null,
      posterUrl: buildPosterUrl(m.poster_path),
      backdropUrl: m.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${m.backdrop_path}` : null,

      // optional extras you might use later
      genres: Array.isArray(m.genres) ? m.genres.map((g) => g.name) : [],
      overview: m.overview || "",
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Details failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Catalog proxy listening on http://localhost:${PORT}`);
});
