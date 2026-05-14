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

async function tmdbGet(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const resp = await fetch(url.toString(), { method: "GET" });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`TMDB ${resp.status}: ${text || "Request failed"}`);
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

    // Enrich search hits with per-movie details so gameplay-critical fields
    // (runtime / rating / genre pair) are accurate at selection time.
    const detailById = new Map();
    await Promise.all(
      raw.map(async (m) => {
        const pid = Number(m?.id);
        if (!Number.isFinite(pid)) return;
        try {
          const d = await tmdbGet(`/movie/${pid}`, { language: "en-US" });
          detailById.set(pid, d);
        } catch {
          // Keep search resilient: fallback to list payload if details fails.
        }
      })
    );

    const results = raw.map((m) => {
      const pid = Number(m?.id);
      const d = Number.isFinite(pid) ? detailById.get(pid) : null;
      const title = m.title || m.original_title || "Untitled";
      const year = m.release_date ? Number(String(m.release_date).slice(0, 4)) : null;
      const detailGenres = Array.isArray(d?.genres) ? d.genres.map((g) => String(g?.name || "")).filter(Boolean) : [];
      const normalizedGenres = detailGenres
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
        runtime: Number.isFinite(Number(d?.runtime)) ? Number(d.runtime) : null,
        imdb: Number.isFinite(Number(d?.vote_average))
          ? Number(d.vote_average)
          : (Number.isFinite(Number(m?.vote_average)) ? Number(m.vote_average) : null),
        rating: Number.isFinite(Number(d?.vote_average))
          ? Number(d.vote_average)
          : (Number.isFinite(Number(m?.vote_average)) ? Number(m.vote_average) : null),
        genres: detailGenres,
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
    res.status(500).json({ error: err?.message || "Search failed" });
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
