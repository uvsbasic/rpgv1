// frontend/js/data/matinee/storage.js
import { movieMeta } from "../movieMeta.js";

const STORAGE_KEY = "movie_rpg_matinee_v1";

function safeParse(v) { try { return JSON.parse(v); } catch { return null; } }
function safeGet(k) { try { return window?.localStorage?.getItem(k) ?? null; } catch { return null; } }
function safeSet(k, v) { try { window?.localStorage?.setItem(k, v); } catch {} }

function baseState() {
  return {
    version: 1,
    unlockedMovies: {},
    unlockedSets: {},
    movieUnlockOrder: [],
    setUnlockOrder: [],
    counters: {
      campaignRuns: 0,
      campaignWins: 0,
      campaignWinStreak: 0,
      byMovieRuns: {},
      byMovieWins: {},
      byGenreRuns: {},
      byGenreWins: {},
      byFranchiseRuns: {},
      byFranchiseWins: {},
      byArchetypeRuns: {},
      byArchetypeWins: {},
      bySetWins: {}
    },
    progressFlags: {
      ironMan3_ironManRun: false,
      ironMan3_avengersRun: false
    },
    __loaded: true
  };
}

function asMap(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out = {};
  for (const [k, val] of Object.entries(v)) out[String(k)] = Number(val) || (val === true ? true : 0);
  return out;
}

function normalize(raw) {
  const b = baseState();
  if (!raw || typeof raw !== "object") return b;
  b.unlockedMovies = asMap(raw.unlockedMovies);
  b.unlockedSets = asMap(raw.unlockedSets);
  b.movieUnlockOrder = Array.isArray(raw.movieUnlockOrder) ? raw.movieUnlockOrder.map(String) : [];
  b.setUnlockOrder = Array.isArray(raw.setUnlockOrder) ? raw.setUnlockOrder.map(String) : [];

  const c = raw.counters || {};
  b.counters.campaignRuns = Number(c.campaignRuns) || 0;
  b.counters.campaignWins = Number(c.campaignWins) || 0;
  b.counters.campaignWinStreak = Number(c.campaignWinStreak) || 0;
  b.counters.byMovieRuns = asMap(c.byMovieRuns);
  b.counters.byMovieWins = asMap(c.byMovieWins);
  b.counters.byGenreRuns = asMap(c.byGenreRuns);
  b.counters.byGenreWins = asMap(c.byGenreWins);
  b.counters.byFranchiseRuns = asMap(c.byFranchiseRuns);
  b.counters.byFranchiseWins = asMap(c.byFranchiseWins);
  b.counters.byArchetypeRuns = asMap(c.byArchetypeRuns);
  b.counters.byArchetypeWins = asMap(c.byArchetypeWins);
  b.counters.bySetWins = asMap(c.bySetWins);

  const pf = raw.progressFlags || {};
  b.progressFlags.ironMan3_ironManRun = !!pf.ironMan3_ironManRun;
  b.progressFlags.ironMan3_avengersRun = !!pf.ironMan3_avengersRun;

  return b;
}

export function ensureMatineeState(GameState) {
  if (!GameState) return;
  if (GameState.matinee?.__loaded) return;
  const loaded = normalize(safeParse(safeGet(STORAGE_KEY)));
  loaded.__loaded = true;
  GameState.matinee = loaded;
}

export function saveMatineeState(GameState) {
  ensureMatineeState(GameState);
  const clone = normalize(GameState.matinee || {});
  delete clone.__loaded;
  safeSet(STORAGE_KEY, JSON.stringify(clone));
  GameState.matinee = { ...clone, __loaded: true };
  return GameState.matinee;
}

export function resetMatineeState(GameState) {
  GameState.matinee = baseState();
  saveMatineeState(GameState);
}

function inc(map, key, by = 1) {
  const k = String(key || "").trim();
  if (!k) return;
  map[k] = (Number(map[k]) || 0) + by;
}

export function unlockMatineeMovie(GameState, movieId) {
  ensureMatineeState(GameState);
  const id = String(movieId || "").trim();
  if (!id || GameState.matinee.unlockedMovies[id]) return false;
  GameState.matinee.unlockedMovies[id] = true;
  if (!GameState.matinee.movieUnlockOrder.includes(id)) GameState.matinee.movieUnlockOrder.push(id);
  saveMatineeState(GameState);
  return true;
}

export function unlockMatineeSet(GameState, setId) {
  ensureMatineeState(GameState);
  const id = String(setId || "").trim();
  if (!id || GameState.matinee.unlockedSets[id]) return false;
  GameState.matinee.unlockedSets[id] = true;
  if (!GameState.matinee.setUnlockOrder.includes(id)) GameState.matinee.setUnlockOrder.push(id);
  saveMatineeState(GameState);
  return true;
}

export function isMatineeMovieUnlocked(GameState, movieId) {
  ensureMatineeState(GameState);
  return !!GameState.matinee.unlockedMovies?.[String(movieId || "")];
}

export function isMatineeSetUnlocked(GameState, setId) {
  ensureMatineeState(GameState);
  return !!GameState.matinee.unlockedSets?.[String(setId || "")];
}

export function recordCampaignRunStart(GameState, rosterMovieIds = [], archetypeId = null) {
  ensureMatineeState(GameState);
  const c = GameState.matinee.counters;
  c.campaignRuns += 1;
  for (const id of rosterMovieIds) inc(c.byMovieRuns, id, 1);
  if (archetypeId) inc(c.byArchetypeRuns, archetypeId, 1);

  const genres = new Set();
  const franchises = new Set();
  for (const id of rosterMovieIds) {
    const meta = movieMeta?.[id];
    if (!meta) continue;
    if (meta.primaryGenre) genres.add(String(meta.primaryGenre).toUpperCase());
    if (meta.secondaryGenre) genres.add(String(meta.secondaryGenre).toUpperCase());
    const f = meta.franchise;
    if (Array.isArray(f)) for (const x of f) franchises.add(String(x));
    else if (typeof f === "string" && f.trim()) franchises.add(f.trim());
  }
  for (const g of genres) inc(c.byGenreRuns, g, 1);
  for (const f of franchises) inc(c.byFranchiseRuns, f, 1);

  if (rosterMovieIds.includes("iron_man")) GameState.matinee.progressFlags.ironMan3_ironManRun = true;
  if (rosterMovieIds.includes("avengers")) GameState.matinee.progressFlags.ironMan3_avengersRun = true;

  saveMatineeState(GameState);
}

export function recordCampaignBattleResult(GameState, { won = false, rosterMovieIds = [], archetypeId = null, activeSetIds = [] } = {}) {
  ensureMatineeState(GameState);
  const c = GameState.matinee.counters;
  if (won) {
    c.campaignWins += 1;
    c.campaignWinStreak += 1;
    for (const id of rosterMovieIds) inc(c.byMovieWins, id, 1);
    if (archetypeId) inc(c.byArchetypeWins, archetypeId, 1);
    for (const setId of activeSetIds) inc(c.bySetWins, setId, 1);

    const genres = new Set();
    const franchises = new Set();
    for (const id of rosterMovieIds) {
      const meta = movieMeta?.[id];
      if (!meta) continue;
      if (meta.primaryGenre) genres.add(String(meta.primaryGenre).toUpperCase());
      if (meta.secondaryGenre) genres.add(String(meta.secondaryGenre).toUpperCase());
      const f = meta.franchise;
      if (Array.isArray(f)) for (const x of f) franchises.add(String(x));
      else if (typeof f === "string" && f.trim()) franchises.add(f.trim());
    }
    for (const g of genres) inc(c.byGenreWins, g, 1);
    for (const f of franchises) inc(c.byFranchiseWins, f, 1);
  } else {
    c.campaignWinStreak = 0;
  }

  saveMatineeState(GameState);
}
