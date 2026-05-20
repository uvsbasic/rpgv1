// frontend/js/screens/select/search/searchController.js
//
// Shared search controller for provider selection and async suggestion loading.

import { createLocalSearchProvider } from "./providers/localProvider.js";
import { createTmdbSearchProvider } from "./providers/tmdbProvider.js";

const MODE_LOCAL = "local";
const MODE_EXPANDED = "expanded";
const SEARCH_MODE_KEY = "rpg_select_search_mode_v1";

const localProvider = createLocalSearchProvider();

function safeGetLS(key) {
  try {
    return window?.localStorage?.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLS(key, value) {
  try {
    window?.localStorage?.setItem(key, value);
  } catch {}
}

function normalizeMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (m === MODE_EXPANDED || m === "tmdb") return MODE_EXPANDED;
  return MODE_LOCAL;
}

function getModeFromStateOrStorage(state) {
  const inState = String(state?.search?.mode || "").trim().toLowerCase();
  if (inState === MODE_LOCAL || inState === MODE_EXPANDED) return inState;
  const fromLs = String(safeGetLS(SEARCH_MODE_KEY) || "").trim().toLowerCase();
  if (fromLs === MODE_LOCAL || fromLs === MODE_EXPANDED) return fromLs;
  return MODE_LOCAL;
}

export function ensureSearchControllerState(state) {
  if (!state?.search || typeof state.search !== "object") return;

  if (typeof state.search.mode !== "string") {
    state.search.mode = getModeFromStateOrStorage(state);
  } else {
    state.search.mode = normalizeMode(state.search.mode);
  }

  if (!state.search.controller || typeof state.search.controller !== "object") {
    state.search.controller = {
      cache: Object.create(null),
      inFlightKey: null,
      requestSeq: 0,
      tmdbProvider: null,
      tmdbProviderApiKey: "",
      debounceTimer: null,
      debounceKey: null
    };
  } else {
    if (!state.search.controller.cache || typeof state.search.controller.cache !== "object") {
      state.search.controller.cache = Object.create(null);
    }
    if (typeof state.search.controller.inFlightKey !== "string" && state.search.controller.inFlightKey !== null) {
      state.search.controller.inFlightKey = null;
    }
    if (!Number.isFinite(Number(state.search.controller.requestSeq))) {
      state.search.controller.requestSeq = 0;
    }
    if (state.search.controller.debounceTimer !== null && typeof state.search.controller.debounceTimer !== "number") {
      state.search.controller.debounceTimer = null;
    }
    if (typeof state.search.controller.debounceKey !== "string" && state.search.controller.debounceKey !== null) {
      state.search.controller.debounceKey = null;
    }
  }
}

function getTmdbProvider(state) {
  ensureSearchControllerState(state);
  const ctl = state.search.controller;
  const key = "";

  if (!ctl.tmdbProvider || ctl.tmdbProviderApiKey !== key) {
    ctl.tmdbProviderApiKey = key;
    ctl.tmdbProvider = createTmdbSearchProvider({
      getApiKey: () => key
    });
  }
  return ctl.tmdbProvider;
}

function getProviderForMode(state) {
  const mode = normalizeMode(state?.search?.mode);
  if (mode === MODE_EXPANDED) return getTmdbProvider(state);
  return localProvider;
}

function cacheKey(mode, query, baseVisibleLen, limit) {
  return `${mode}|${String(query || "").trim().toLowerCase()}|${baseVisibleLen}|${limit}`;
}

function findBestPrefixCacheHit(cache, mode, query, baseVisibleLen, limit) {
  if (!cache || typeof cache !== "object") return null;
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  const parts = [];
  for (let i = q.length - 1; i >= 2; i--) parts.push(q.slice(0, i));
  for (const p of parts) {
    const k = cacheKey(mode, p, baseVisibleLen, limit);
    const hit = cache[k];
    if (Array.isArray(hit) && hit.length) return hit;
  }
  return null;
}

export function getSearchMode(state) {
  ensureSearchControllerState(state);
  return normalizeMode(state?.search?.mode);
}

export function setSearchMode(state, mode) {
  ensureSearchControllerState(state);
  const next = normalizeMode(mode);
  const prev = normalizeMode(state?.search?.mode);
  state.search.mode = next;
  safeSetLS(SEARCH_MODE_KEY, next);

  if (prev !== next) {
    try {
      if (state.search.controller.debounceTimer != null) {
        clearTimeout(state.search.controller.debounceTimer);
        state.search.controller.debounceTimer = null;
      }
    } catch {}
    state.search.controller.debounceKey = null;
    state.search.suggestions = [];
    state.search.selectedSuggestion = 0;
    state.search.dropdownBox = null;
    state.search.controller.cache = Object.create(null);
    state.search.controller.inFlightKey = null;
    state.search.controller.requestSeq += 1;
  }
}

export function requestSuggestions(state, { query, baseVisible, limit = 6, onResults } = {}) {
  ensureSearchControllerState(state);
  const mode = getSearchMode(state);
  const q = String(query || "").trim();
  const src = Array.isArray(baseVisible) ? baseVisible : [];
  const ctl = state.search.controller;

  if (!q) {
    if (typeof onResults === "function") onResults([]);
    return;
  }

  const key = cacheKey(mode, q, src.length, limit);
  const cached = ctl.cache[key];
  if (Array.isArray(cached)) {
    if (typeof onResults === "function") onResults(cached);
    return;
  }

  // Snappy UX: immediately show closest prefix cache while we fetch.
  // This avoids a blank/laggy dropdown during network round-trips.
  const prefixHit = findBestPrefixCacheHit(ctl.cache, mode, q, src.length, limit);
  if (prefixHit && typeof onResults === "function") {
    onResults(prefixHit);
  }

  if (ctl.inFlightKey === key) return;

  const runFetch = () => {
    ctl.debounceKey = null;
    ctl.inFlightKey = key;
    ctl.requestSeq += 1;
    const seq = ctl.requestSeq;

    const provider = getProviderForMode(state);
    Promise.resolve(provider.search({ query: q, baseVisible: src, limit }))
      .then((results) => {
        const out = Array.isArray(results) ? results : [];
        if (mode !== MODE_EXPANDED || out.length > 0) {
          ctl.cache[key] = out;
        }
        if (seq !== ctl.requestSeq) return;
        if (ctl.inFlightKey === key) ctl.inFlightKey = null;
        if (typeof onResults === "function") onResults(out);
      })
      .catch(() => {
        if (seq !== ctl.requestSeq) return;
        if (ctl.inFlightKey === key) ctl.inFlightKey = null;
        if (typeof onResults === "function") onResults([]);
      });
  };

  const debounceMs = 0;
  if (debounceMs <= 0) {
    runFetch();
    return;
  }

  try {
    if (ctl.debounceTimer != null && ctl.debounceKey !== key) {
      clearTimeout(ctl.debounceTimer);
      ctl.debounceTimer = null;
    }
  } catch {}
  if (ctl.debounceTimer != null && ctl.debounceKey === key) {
    // Already scheduled for this exact query; do not reset every frame.
    return;
  }
  ctl.debounceKey = key;
  ctl.debounceTimer = setTimeout(() => {
    ctl.debounceTimer = null;
    runFetch();
  }, debounceMs);
}
