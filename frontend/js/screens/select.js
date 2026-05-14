// frontend/js/screens/select.js
//
// Modularized Select:
// - Option 1: domain logic -> select/selectLogic.js
// - Option 2: persistence -> select/selectPersistence.js
// - Option 3: geometry -> select/selectLayout.js
// - Option 4: render helpers -> select/selectRenderHelpers.js
// - Option 5: input dispatcher -> select/selectInputHandlers.js
//
// + Search (movies.js only) -> select/selectDefaultSearch.js
//   - type-to-suggest dropdown
//   - pick a suggestion -> enter “pick slot” mode
//   - click a slot -> place movie, exit mode

import { movies, getAvailableMovies } from "../data/movies.js";
import { enemies } from "../data/enemies.js";
import { playerArchetypes } from "../data/playerArchetypes.js";
import { calculateMovieStats } from "../combat/stats.js";
import { GameState, changeScreen } from "../game.js";
import { SCREEN, SELECT_LAYOUT as L } from "../layout.js";
import { Input } from "../ui.js";

import { ensureStatsState, incRandomizeClicks } from "../systems/statsSystem.js";
import { ensureUnlockState, isArchetypeUnlocked, evaluateUnlockRules } from "../systems/unlockSystem.js";
import { playUIBackBlip, playUIConfirmBlip, playUIMoveBlip } from "../sfx/uiSfx.js";

import { MenuLayers, NAV_MIX } from "../systems/menuLayeredMusic.js";
import { syncOptionsAudioNow } from "../systems/optionsAudioSync.js";

import { ImageCache } from "../core/ImageCache.js";
import { movieMeta } from "../data/movieMeta.js";

import { renderUnlockArcOverlay } from "./unlockArcOverlay.js";
import { peekUnlockEvents, popNextUnlockEventMatching } from "../systems/unlockTriggers.js";
import { ensureMatineeState, recordCampaignRunStart } from "../data/matinee/storage.js";
import { discoverSetsFromRoster, getActiveUnlockedSetIdsForRoster } from "../data/matinee/extraDiscovery.js";
import { getMatineeSetArchetypes } from "../data/matinee/bonusSelectSets.js";
import { evaluateExtraMovieUnlocks, recordExactLineupRun } from "../data/matinee/extraSystems.js";

// Search (new)
import {
  ensureSearchState,
  bindSearchKeyboard,
  updateSearchFromQueue,
  handleSearchPointer,
  handleSearchHover,
  isMouseOverSearchDropdown,
  closeSearchDropdown,
  renderSearchDropdown,
  enterPickSlotMode,
  exitPickSlotMode,
  getSearchMode,
  setSearchMode
} from "./select/selectDefaultSearch.js";

import {
  ensureSelectTextInput,
  syncSelectTextInput,
  focusSelectTextInput,
  blurSelectTextInput
} from "./select/selectTextInputBridge.js";

// Option 3 (layout)
import {
  getSelectAccessors,
  slotCardRect,
  topArrowRect,
  posterRect,
  nameplateRect,
  bottomArrowRect,
  slotBounds,
  pointInRect,
  searchRects,
  homeCornerRect,
  battleCornerRect,
  archetypeBarRects,
  confirmBoxRect
} from "./select/selectLayout.js";

// Option 1 (logic)
import {
  SLOT_TOKEN_BLANK,
  SLOT_TOKEN_RANDOM,
  GENRE_TOKEN_TO_DEF,
  clampIndex,
  normalizeSlotsToBaseLength,
  hasBlankSlot,
  cycleSlotWithOptionalFilter,
  randomizeSlots,
  randomizeSlotsCommonGenre,
  resolvePartyFromSlots,
  isSpecialSlotValue,
  specialSlotLabel
} from "./select/selectLogic.js";

// Option 2 (persistence)
import {
  setLastScreen,
  applyBootForceDefaultsIfNeeded,
  persistSelectStateByBase,
  restoreFromPersistIfPossible,
  readPersistedSelectSettings,
  persistSelectSettings
} from "./select/selectPersistence.js";

// Option 4 (render helpers)
import {
  wrapText,
  fitTextByShrinking,
  getNameplateTitle,
  getLocalPosterPath,
  drawSpecialPoster
} from "./select/selectRenderHelpers.js";

// Option 5 (input)
import {
  detectKeyboardInput,
  shouldResetStreakThisFrame,
  handleUnlockOverlayMode,
  handleConfirmPending,
  handleGlobalHotkeys,
  handleToggleFocus,
  handleRandomizeActions,
  handleConfirmPressed,
  handleKeyboardNavigation,
  handlePointerInput,
  handlePointerHover
} from "./select/selectInputHandlers.js";

const SLOT_COUNT = 4;
const DEFAULT_START_IDS = ["shawshank", "godfather", "taxi_driver", "pulp_fiction"];

// Ratatouille trial constants
const RATATOUILLE_ARCHETYPE_ID = "ratatouille_only";
const LS_RATA_TRIAL = "rpg_ratatouille_trial_v1";
const LS_SELECT_EXPANDED_CACHE = "rpg_select_expanded_cache_v1";
const LS_SELECT_EXPANDED_OVERRIDES = "rpg_select_expanded_overrides_v1";

// Apply boot-time defaults rule exactly once on module load
applyBootForceDefaultsIfNeeded();

// -----------------------
// runtime state
// -----------------------
const state = {
  SLOT_COUNT,
  movieMeta,

  slots: null, // number (base index) OR token string
  activeSlot: 0,
  inputMode: "keyboard",
  focus: "movies",

  archetypeIndex: 0,
  archetypeConfirmed: false,
  confirmedArchetypeIndex: 0,
  hoverCorner: null,

  // legacy filter text (kept, but search system will also use it)
  searchQuery: "",

  confirmPending: false,
  enterArmed: false,

  uiMode: "select",
  overlayPayload: null
  ,
  selectedArchetypeId: "custom",
  settingsOpen: false,
  settingsRow: 0,
  listViewMode: "default",
  expandedSlotOverrides: [null, null, null, null]

  // Search module will attach its own sub-state via ensureSearchState(state)
};

// -----------------------
// Layered music boot state
// -----------------------
let layeredReady = false;
let layeredLoading = false;

// Secret quick-fill code on Select: 7 -> 1 -> 1
let selectDevCodeStep = 0;
let selectDevCodeTimerMs = 0;
const SELECT_DEV_CODE_TIMEOUT_MS = 1200;

function resetSelectDevCode() {
  selectDevCodeStep = 0;
  selectDevCodeTimerMs = 0;
}

function apply711MoviePreset() {
  const targetIds = ["purple_rain", "office_space", "tron", "harry_potter_2001"];
  const baseVisible = getVisibleMoviesBase();
  const byId = new Map();
  for (let i = 0; i < baseVisible.length; i++) byId.set(String(baseVisible[i]?.id || ""), i);

  const filled = new Array(SLOT_COUNT).fill(0);
  const overrides = new Array(SLOT_COUNT).fill(null);

  for (let i = 0; i < SLOT_COUNT; i++) {
    const id = String(targetIds[i] || "");
    if (id && byId.has(id)) {
      filled[i] = byId.get(id);
      continue;
    }
    if (id && GameState?.catalog?.byId?.[id]) {
      filled[i] = 0;
      overrides[i] = id;
    }
  }

  state.slots = filled;
  state.expandedSlotOverrides = overrides;
  state.activeSlot = 0;
  state.focus = "movies";
  state.confirmPending = false;
  state.selectedArchetypeId = "custom";
  state.archetypeIndex = 0;
  state.archetypeConfirmed = false;
  state.confirmedArchetypeIndex = 0;

  try {
    closeSearchDropdown(state);
    exitPickSlotMode(state);
  } catch {}

  persist();
  playUIConfirmBlip();
}

function updateSelectDevCode(dtMs = 16.67) {
  if (state.uiMode !== "select") {
    resetSelectDevCode();
    return false;
  }

  if (selectDevCodeStep > 0) {
    selectDevCodeTimerMs += dtMs;
    if (selectDevCodeTimerMs > SELECT_DEV_CODE_TIMEOUT_MS) resetSelectDevCode();
  }

  if (Input.pressed("7")) {
    Input.consume("7");
    selectDevCodeStep = 1;
    selectDevCodeTimerMs = 0;
    return false;
  }

  if (Input.pressed("1")) {
    Input.consume("1");

    if (selectDevCodeStep === 1) {
      selectDevCodeStep = 2;
      selectDevCodeTimerMs = 0;
      return false;
    }

    if (selectDevCodeStep === 2) {
      resetSelectDevCode();
      apply711MoviePreset();
      return true;
    }

    resetSelectDevCode();
  }

  return false;
}

async function bootNavLayersFromGestureIfNeeded() {
  if (layeredReady) return true;
  if (layeredLoading) return false;

  layeredLoading = true;
  try {
    await MenuLayers.ensureStarted();
    layeredReady = true;

    try {
      syncOptionsAudioNow();
    } catch {}

    MenuLayers.setMix(NAV_MIX, 140);
    return true;
  } catch {
    return false;
  } finally {
    layeredLoading = false;
  }
}

// -----------------------
// Ratatouille trial state
// -----------------------
function safeGetJSON(key) {
  try {
    const raw = window?.localStorage?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function safeSetJSON(key, obj) {
  try {
    window?.localStorage?.setItem(key, JSON.stringify(obj));
  } catch {}
}

function safeGetLS(key) {
  try {
    return window?.localStorage?.getItem(key);
  } catch {
    return null;
  }
}

function safeRemoveLS(key) {
  try {
    window?.localStorage?.removeItem(key);
  } catch {}
}

function getRatatouilleTrialState() {
  const st = safeGetJSON(LS_RATA_TRIAL);
  if (st && typeof st === "object") {
    return { started: !!st.started, completed: !!st.completed, forcedUsed: !!st.forcedUsed };
  }
  return { started: false, completed: false, forcedUsed: false };
}

function setRatatouilleTrialState(next) {
  const cur = getRatatouilleTrialState();
  const merged = { ...cur, ...(next || {}) };
  safeSetJSON(LS_RATA_TRIAL, merged);

  if (!GameState.flags) GameState.flags = {};
  if (!GameState.flags.secrets) GameState.flags.secrets = {};
  GameState.flags.secrets.ratatouilleTrial = merged;
}

function mirrorRatatouilleTrialToGameState() {
  const st = getRatatouilleTrialState();
  if (!GameState.flags) GameState.flags = {};
  if (!GameState.flags.secrets) GameState.flags.secrets = {};
  if (!GameState.flags.secrets.ratatouilleTrial) GameState.flags.secrets.ratatouilleTrial = st;
}

// Consecutive-R logic
function ensureRataStreak() {
  if (!GameState.flags) GameState.flags = {};
  if (!GameState.flags.secrets) GameState.flags.secrets = {};
  if (typeof GameState.flags.secrets.rataStreak !== "number") GameState.flags.secrets.rataStreak = 0;
}
function resetRandomizeStreak() {
  ensureRataStreak();
  GameState.flags.secrets.rataStreak = 0;
}

function getMovieById(id) {
  return (
    movies.find((m) => m.id === id) || {
      id,
      title: "Unknown",
      runtime: 120,
      imdb: 7.0
    }
  );
}

function findEnemyById(id) {
  const key = String(id || "");
  return enemies.find((e) => String(e?.id || "") === key) || null;
}

function buildEggBattleProgressForMovie(movie, targetLevel = 15) {
  const base = calculateMovieStats(movie || {});
  let maxHp = Math.max(1, Math.round(Number(base.maxHp || 1)));
  let atk = Math.max(1, Math.round(Number(base.atk || 1)));
  let def = Math.max(1, Math.round(Number(base.def || 1)));
  const level = Math.max(1, Math.floor(Number(targetLevel || 1)));

  // Mirror xpSystem level growth so stats reflect the target actor level.
  for (let l = 1; l < level; l++) {
    const hpGain = Math.max(1, Math.round(maxHp * 0.31));
    maxHp = Math.max(1, maxHp + hpGain);
    atk = Math.max(1, Math.max(atk + 1, Math.round(atk * (1 + 0.22))));
    def = Math.max(1, Math.max(def + 1, Math.round(def * (1 + 0.25))));
  }

  return {
    level,
    xp: 0,
    maxHp,
    atk,
    def
  };
}

function getArchetypeById(id) {
  return playerArchetypes.find((a) => a?.id === id) || null;
}

function startLevelIntroWithArchetype(archetypeId, opts = {}) {
  const skipOneFour = !!opts.skipOneFour;
  const a = getArchetypeById(archetypeId);
  if (!a) return false;

  GameState.party.movies = (a.movieIds || []).slice(0, 4).map(getMovieById);

  GameState.runMode = null;
  GameState.currentLevel = 1;
  GameState.enemyTemplate = null;
  GameState.enemy = null;

  GameState.campaign = {
    onefourShown: skipOneFour ? true : false,
    firstPickApplied: null,
    fourthPickApplied: null,
    effects: { first: null, fourth: null },
    _onefourAppliedThisBattle: false,
    flavor: {},
    runtime: {}
  };

  setLastScreen("levelIntro");
  playUIConfirmBlip();

  try {
    MenuLayers.stop({ fadeMs: 180 });
  } catch {}
  changeScreen("levelIntro");
  return true;
}

function onPressRandomizeMaybeStartTrial() {
  ensureStatsState(GameState);
  ensureUnlockState(GameState);
  mirrorRatatouilleTrialToGameState();
  ensureRataStreak();

  incRandomizeClicks(GameState, 1);
  GameState.flags.secrets.rataStreak += 1;

  const streak = GameState.flags.secrets.rataStreak;
  const trial = getRatatouilleTrialState();
  const alreadyUnlocked = isArchetypeUnlocked(GameState, RATATOUILLE_ARCHETYPE_ID);

  if (alreadyUnlocked || trial.forcedUsed) {
    evaluateUnlockRules(GameState);
    return;
  }

  if (streak === 30) {
    setRatatouilleTrialState({ started: true, completed: false, forcedUsed: true });

    const ok = startLevelIntroWithArchetype(RATATOUILLE_ARCHETYPE_ID, { skipOneFour: true });

    if (!ok) {
      setRatatouilleTrialState({ started: false, completed: false, forcedUsed: false });
      resetRandomizeStreak();
    }
    return;
  }

  evaluateUnlockRules(GameState);
}

// -----------------------
// screen-specific helpers
// -----------------------
const { C, S, bottom } = getSelectAccessors(L);

function resetSelectUIState() {
  state.confirmPending = false;
  state.uiMode = "select";
  state.overlayPayload = null;

  // search state (if any) should return to neutral
  try {
    exitPickSlotMode(state);
    closeSearchDropdown(state);
  } catch {}
}

function closeOverlay() {
  state.uiMode = "select";
  state.overlayPayload = null;
}

function settingsButtonRect() {
  const sr = searchRects({ SCREEN, L });
  return { x: sr.right.x + sr.right.w + 6, y: sr.right.y, w: 20, h: sr.right.h };
}

function settingsOverlayRect() {
  const w = 250;
  const h = 128;
  const x = Math.floor((SCREEN.W - w) / 2);
  const y = 78;
  return { x, y, w, h };
}

function maybeOpenOverlayFromGlobalEvents() {
  if (state.uiMode !== "select") return;

  const events = peekUnlockEvents(GameState);
  if (!events || !events.length) return;

  const next = events.find((e) => {
    if (!e?.showOverlay) return false;
    if (e?.type === "MOVIE_UNLOCKED") return true;
    return e?.type === "ARCHETYPE_UNLOCKED" && e?.archetypeId !== RATATOUILLE_ARCHETYPE_ID;
  });
  if (!next) return;

  state.overlayPayload = popNextUnlockEventMatching(GameState, (e) => {
    if (!e?.showOverlay) return false;
    if (e?.type === "MOVIE_UNLOCKED") return true;
    return e?.type === "ARCHETYPE_UNLOCKED" && e?.archetypeId !== RATATOUILLE_ARCHETYPE_ID;
  });
  if (state.overlayPayload) {
    state.uiMode = "unlock";
    state.confirmPending = false;

    try {
      exitPickSlotMode(state);
      closeSearchDropdown(state);
    } catch {}

    persist();
  }
}

function getVisibleMoviesBase() {
  ensureUnlockState(GameState);
  ensureMatineeState(GameState);
  const visible = getAvailableMovies(GameState.unlocks, GameState.matinee);
  const localVisible = Array.isArray(visible) && visible.length > 0 ? visible : movies;
  const expanded = Array.isArray(GameState?.catalog?.expandedMovies) ? GameState.catalog.expandedMovies : [];
  return localVisible.concat(expanded);
}

function normalizeListViewMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (m === "alphabetical" || m === "genre" || m === "year") return m;
  return "default";
}

function inferMovieYear(movie) {
  const direct = Number(movie?.year ?? movie?.releaseYear ?? movie?.release_date?.slice?.(0, 4));
  if (Number.isFinite(direct) && direct > 1800) return direct;
  const metaY = Number(state.movieMeta?.[String(movie?.id || "")]?.year);
  return Number.isFinite(metaY) && metaY > 1800 ? metaY : 0;
}

function inferMovieGenre(movie) {
  const meta = state.movieMeta?.[String(movie?.id || "")];
  const g = String(meta?.primaryGenre || meta?.secondaryGenre || movie?.primaryGenre || movie?.genre || "");
  return g || "UNKNOWN";
}

function compareByTitle(a, b) {
  const ta = String(a?.title || "");
  const tb = String(b?.title || "");
  return ta.localeCompare(tb);
}

function getSortedBaseByListView(base) {
  const mode = normalizeListViewMode(state.listViewMode);
  if (!Array.isArray(base) || base.length <= 1 || mode === "default") return base;
  const curated = [];
  const expanded = [];
  for (const m of base) {
    const id = String(m?.id || "");
    const isExpanded = !!m?.isExpanded || id.startsWith("tmdb_");
    if (isExpanded) expanded.push(m);
    else curated.push(m);
  }
  const out = curated.slice();
  if (mode === "alphabetical") {
    out.sort(compareByTitle);
    return out.concat(expanded);
  }
  if (mode === "genre") {
    out.sort((a, b) => {
      const ga = inferMovieGenre(a);
      const gb = inferMovieGenre(b);
      const gcmp = ga.localeCompare(gb);
      if (gcmp !== 0) return gcmp;
      return compareByTitle(a, b);
    });
    return out.concat(expanded);
  }
  if (mode === "year") {
    out.sort((a, b) => {
      const ya = inferMovieYear(a);
      const yb = inferMovieYear(b);
      if (ya !== yb) return ya - yb;
      return compareByTitle(a, b);
    });
  }
  return out.concat(expanded);
}

function ensureCatalogCacheState() {
  if (!GameState.catalog || typeof GameState.catalog !== "object") {
    GameState.catalog = { expandedMovies: [], byId: {} };
  }
  if (!Array.isArray(GameState.catalog.expandedMovies)) GameState.catalog.expandedMovies = [];
  if (!GameState.catalog.byId || typeof GameState.catalog.byId !== "object") GameState.catalog.byId = {};
}

function normalizeExpandedId(rawId, providerId = null, title = "") {
  let id = String(rawId || "").trim();
  if (id.startsWith("tmdb_tmdb_")) id = id.slice("tmdb_".length);
  if (id.startsWith("tmdb_")) return id;
  const pid = Number(providerId);
  if (Number.isFinite(pid)) return `tmdb_${pid}`;
  if (id) return `tmdb_${id}`;
  const fallback = String(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return fallback ? `tmdb_${fallback}` : "";
}

function loadExpandedCatalogCache() {
  ensureCatalogCacheState();
  const raw = safeGetLS(LS_SELECT_EXPANDED_CACHE);
  if (!raw) return;
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const arr = Array.isArray(parsed?.expandedMovies) ? parsed.expandedMovies : [];
  if (!arr.length) return;

  const nextExpanded = [];
  const nextById = {};
  for (const rec of arr) {
    if (!rec || typeof rec !== "object") continue;
    const id = normalizeExpandedId(rec.id, rec.providerId, rec.title);
    if (!id) continue;
    const normalized = {
      id,
      title: String(rec.title || "Unknown"),
      shortTitle: String(rec.shortTitle || rec.title || "Unknown"),
      runtime: Number.isFinite(Number(rec.runtime)) ? Number(rec.runtime) : 110,
      imdb: Number.isFinite(Number(rec.imdb)) ? Number(rec.imdb) : 7.0,
      genres: Array.isArray(rec.genres) ? rec.genres.slice(0, 8).map((g) => String(g)) : [],
      primaryGenre: String(rec.primaryGenre || "").toUpperCase() || null,
      secondaryGenre: String(rec.secondaryGenre || "").toUpperCase() || null,
      year: Number.isFinite(Number(rec.year)) ? Number(rec.year) : 0,
      release_date: String(rec.release_date || ""),
      posterUrl: String(rec.posterUrl || ""),
      provider: "tmdb",
      providerId: Number.isFinite(Number(rec.providerId)) ? Number(rec.providerId) : null,
      isExpanded: true
    };
    if (nextById[id]) continue;
    nextById[id] = normalized;
    nextExpanded.push(normalized);
    if (nextExpanded.length >= 500) break;
  }
  GameState.catalog.byId = nextById;
  GameState.catalog.expandedMovies = nextExpanded;
}

function saveExpandedCatalogCache() {
  ensureCatalogCacheState();
  const out = {
    expandedMovies: (GameState.catalog.expandedMovies || []).slice(0, 500)
  };
  safeSetJSON(LS_SELECT_EXPANDED_CACHE, out);
}

function clearExpandedCatalogCache() {
  ensureCatalogCacheState();
  const prevBase = getDisplayMovies().base;
  const prevExpandedIds = new Set(
    (GameState.catalog.expandedMovies || []).map((m) => String(m?.id || "")).filter(Boolean)
  );

  GameState.catalog.byId = {};
  GameState.catalog.expandedMovies = [];
  safeRemoveLS(LS_SELECT_EXPANDED_CACHE);

  // Any slot currently pointing at an expanded entry is reset to first movie.
  if (Array.isArray(state.slots)) {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const v = state.slots[i];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= prevBase.length) continue;
      const id = String(prevBase[v]?.id || "");
      if (id && prevExpandedIds.has(id)) state.slots[i] = 0;
    }
  }
  state.expandedSlotOverrides = [null, null, null, null];
  safeRemoveLS(LS_SELECT_EXPANDED_OVERRIDES);
}

function rememberExpandedMovie(movieLike) {
  ensureCatalogCacheState();
  if (!movieLike || typeof movieLike !== "object") return null;
  const providerId = Number(movieLike.providerId);
  const id = normalizeExpandedId(movieLike.id, providerId, movieLike.title);
  if (!id) return null;

  const normalized = {
    id,
    title: String(movieLike.title || "Unknown"),
    shortTitle: String(movieLike.shortTitle || movieLike.title || "Unknown"),
    runtime: Number.isFinite(Number(movieLike.runtime)) ? Number(movieLike.runtime) : 110,
    imdb: Number.isFinite(Number(movieLike.imdb)) ? Number(movieLike.imdb) : 7.0,
    genres: Array.isArray(movieLike.genres) ? movieLike.genres.slice(0, 8).map((g) => String(g)) : [],
    primaryGenre: String(movieLike.primaryGenre || "").toUpperCase() || null,
    secondaryGenre: String(movieLike.secondaryGenre || "").toUpperCase() || null,
    year: inferMovieYear(movieLike),
    release_date: String(movieLike.release_date || ""),
    posterUrl: String(movieLike.posterUrl || ""),
    provider: "tmdb",
    providerId: Number.isFinite(providerId) ? providerId : null,
    isExpanded: true
  };

  const prev = GameState.catalog.byId[id];
  GameState.catalog.byId[id] = { ...(prev || {}), ...normalized };
  if (!GameState.catalog.expandedMovies.some((m) => String(m?.id || "") === id)) {
    GameState.catalog.expandedMovies.push(GameState.catalog.byId[id]);
    saveExpandedCatalogCache();
  } else {
    saveExpandedCatalogCache();
  }
  return id;
}

// Kept for existing slot cycling + randomize behavior.
// (Search system does its own suggestions list.)
function getDisplayMovies() {
  const base = getSortedBaseByListView(getVisibleMoviesBase());
  const q = String(state.searchQuery || "").trim().toLowerCase();
  if (!q) return { base, display: base, displayToBase: null };

  const display = [];
  const displayToBase = [];
  for (let i = 0; i < base.length; i++) {
    const t = String(base[i]?.title || "").toLowerCase();
    if (t.includes(q)) {
      display.push(base[i]);
      displayToBase.push(i);
    }
  }

  if (display.length === 0) return { base, display: base, displayToBase: null };
  return { base, display, displayToBase };
}

function reconcileExpandedSlotOverrides(baseVisible) {
  if (!Array.isArray(state.expandedSlotOverrides)) {
    state.expandedSlotOverrides = [null, null, null, null];
  }
  const base = Array.isArray(baseVisible) ? baseVisible : [];
  if (!base.length) return;
  const byId = new Map();
  for (let i = 0; i < base.length; i++) byId.set(String(base[i]?.id || ""), i);

  for (let i = 0; i < SLOT_COUNT; i++) {
    const overrideId = String(state.expandedSlotOverrides[i] || "");
    if (!overrideId) continue;
    if (!byId.has(overrideId)) {
      // Keep override when catalog still knows this movie; base list can lag/order-shift.
      if (GameState?.catalog?.byId?.[overrideId]) continue;
      state.expandedSlotOverrides[i] = null;
      continue;
    }
    const idx = byId.get(overrideId);
    if (typeof state.slots[i] !== "string") state.slots[i] = idx;
  }
}

function getSelectableArchetypes() {
  ensureUnlockState(GameState);
  ensureMatineeState(GameState);

  const list = [{ id: "custom", name: "Custom", movieIds: [] }];

  for (const a of playerArchetypes) {
    if (!a) continue;
    if (!a.hidden) list.push(a);
    else if (isArchetypeUnlocked(GameState, a.id)) list.push(a);
  }

  // Keep test_test pinned to the end when unlocked.
  const idx = list.findIndex((a) => a?.id === "test_test");
  if (idx > -1) {
    const [pinned] = list.splice(idx, 1);
    list.push(pinned);
  }

  // Campaign-only discovered matinee sets are appended in unlock order.
  for (const setArch of getMatineeSetArchetypes(GameState)) {
    list.push(setArch);
  }

  return list;
}

function setArchetypeByIndex(nextIndex) {
  const baseVisible = getVisibleMoviesBase();
  const archetypes = getSelectableArchetypes();

  state.archetypeIndex = clampIndex(nextIndex, archetypes.length);

  const chosen = archetypes[state.archetypeIndex];
  if (!chosen || chosen.id === "custom") {
    state.selectedArchetypeId = "custom";
    return;
  }
  state.selectedArchetypeId = String(chosen.id || "custom");

  const byId = new Map();
  for (let i = 0; i < baseVisible.length; i++) byId.set(baseVisible[i].id, i);

  const filled = new Array(SLOT_COUNT).fill(0);
  const overrides = new Array(SLOT_COUNT).fill(null);
  const ids = Array.isArray(chosen.movieIds) ? chosen.movieIds : [];

  for (let i = 0; i < SLOT_COUNT; i++) {
    const id = String(ids[i] || "");
    if (id && byId.has(id)) {
      filled[i] = byId.get(id);
      continue;
    }
    // If archetype points to a valid catalog movie that isn't currently visible,
    // keep it via slot override instead of collapsing to base index 0.
    if (id && GameState?.catalog?.byId?.[id]) {
      filled[i] = 0;
      overrides[i] = id;
      continue;
    }
    filled[i] = 0;
  }

  state.slots = filled;
  state.expandedSlotOverrides = overrides;
  state.confirmPending = false;

  // choosing an archetype should exit search dropdown + pick-slot mode
  try {
    exitPickSlotMode(state);
    closeSearchDropdown(state);
  } catch {}

  persist();
}

function isSpecialTokenValue(v) {
  if (typeof v !== "string") return false;
  if (v === SLOT_TOKEN_BLANK) return true;
  if (v === SLOT_TOKEN_RANDOM) return true;
  if (GENRE_TOKEN_TO_DEF.has(v)) return true;
  return false;
}

function computeDefaultIds() {
  return DEFAULT_START_IDS.slice(0, SLOT_COUNT);
}

function applyDefaults(baseVisible) {
  // map ids -> base indices
  const byId = new Map();
  for (let i = 0; i < baseVisible.length; i++) byId.set(baseVisible[i]?.id, i);

  const ids = computeDefaultIds();
  state.slots = new Array(SLOT_COUNT).fill(0).map((_, i) => (byId.has(ids[i]) ? byId.get(ids[i]) : 0));

  state.activeSlot = 0;
  state.inputMode = "keyboard";
  state.focus = "movies";

  state.archetypeIndex = 0;
  state.archetypeConfirmed = false;
  state.confirmedArchetypeIndex = 0;

  state.searchQuery = "";
  state.confirmPending = false;
  state.selectedArchetypeId = "custom";
  state.expandedSlotOverrides = [null, null, null, null];

  state.uiMode = "select";
  state.overlayPayload = null;

  try {
    exitPickSlotMode(state);
    closeSearchDropdown(state);
  } catch {}

  resetRandomizeStreak();
  persist();
}

function persist() {
  const baseVisible = getVisibleMoviesBase();
  persistSelectStateByBase({ SLOT_COUNT, state, baseVisible });
  safeSetJSON(LS_SELECT_EXPANDED_OVERRIDES, {
    slotOverrides: Array.isArray(state.expandedSlotOverrides)
      ? state.expandedSlotOverrides.slice(0, SLOT_COUNT)
      : [null, null, null, null]
  });
}

function currentSearchEngineMode() {
  try {
    return getSearchMode(state) === "expanded" ? "expanded" : "curated";
  } catch {
    return "curated";
  }
}

function applySearchEngineMode(nextMode) {
  const m = String(nextMode || "") === "expanded" ? "expanded" : "curated";
  try {
    setSearchMode(state, m === "expanded" ? "expanded" : "local");
  } catch {}
}

function persistSelectSettingsNow() {
  persistSelectSettings({
    listViewMode: normalizeListViewMode(state.listViewMode),
    searchEngineMode: currentSearchEngineMode()
  });
}

function remapSlotsBetweenBaseOrders(prevBase, nextBase) {
  if (!Array.isArray(state.slots) || state.slots.length !== SLOT_COUNT) return;
  const prev = Array.isArray(prevBase) ? prevBase : [];
  const next = Array.isArray(nextBase) ? nextBase : [];
  if (!prev.length || !next.length) return;

  const nextById = new Map();
  for (let i = 0; i < next.length; i++) nextById.set(String(next[i]?.id || ""), i);

  for (let i = 0; i < SLOT_COUNT; i++) {
    const v = state.slots[i];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= prev.length) continue;
    const id = String(prev[v]?.id || "");
    if (!id) continue;
    if (nextById.has(id)) state.slots[i] = nextById.get(id);
  }
}

function applyListViewMode(nextMode) {
  const next = normalizeListViewMode(nextMode);
  if (state.listViewMode === next) return;
  const prevBase = getDisplayMovies().base;
  state.listViewMode = next;
  const nextBase = getDisplayMovies().base;
  remapSlotsBetweenBaseOrders(prevBase, nextBase);
  persist();
  persistSelectSettingsNow();
}

function loadSelectSettings() {
  const persisted = readPersistedSelectSettings() || {};
  state.listViewMode = normalizeListViewMode(persisted.listViewMode);
  applySearchEngineMode(persisted.searchEngineMode);
}

function restoreOrDefault() {
  // Keep base ordering consistent with placement/persist paths.
  const baseVisible = getDisplayMovies().base;
  ensureStatsState(GameState);
  mirrorRatatouilleTrialToGameState();
  ensureRataStreak();

  // ensure search sub-state exists before anyone tries to use it
  try {
    ensureSearchState(state);
  } catch {}

  try {
    const ov = safeGetJSON(LS_SELECT_EXPANDED_OVERRIDES);
    const arr = Array.isArray(ov?.slotOverrides) ? ov.slotOverrides : null;
    if (arr) {
      state.expandedSlotOverrides = new Array(SLOT_COUNT).fill(null).map((_, i) => {
        const v = String(arr[i] || "").trim();
        return v || null;
      });
    } else if (!Array.isArray(state.expandedSlotOverrides)) {
      state.expandedSlotOverrides = [null, null, null, null];
    }
  } catch {}

  if (Array.isArray(state.slots) && state.slots.length === SLOT_COUNT) {
    normalizeSlotsToBaseLength(state.slots, SLOT_COUNT, baseVisible.length);
    reconcileExpandedSlotOverrides(baseVisible);
    const archetypes = getSelectableArchetypes();
    state.archetypeIndex = clampIndex(state.archetypeIndex, archetypes.length);
    state.confirmedArchetypeIndex = clampIndex(state.confirmedArchetypeIndex, archetypes.length);
    return;
  }

  const ok = restoreFromPersistIfPossible({
    SLOT_COUNT,
    state,
    baseVisible,
    clampIndex,
    isSpecialTokenFn: isSpecialTokenValue
  });

  if (!ok) applyDefaults(baseVisible);
  reconcileExpandedSlotOverrides(baseVisible);

  const archetypes = getSelectableArchetypes();
  state.archetypeIndex = clampIndex(state.archetypeIndex, archetypes.length);
  state.confirmedArchetypeIndex = clampIndex(state.confirmedArchetypeIndex, archetypes.length);
}

function clearAllSlotsToBlank() {
  state.slots = new Array(SLOT_COUNT).fill(SLOT_TOKEN_BLANK);

  state.activeSlot = 0;
  state.inputMode = "keyboard";
  state.focus = "movies";

  state.archetypeIndex = 0;
  state.archetypeConfirmed = false;
  state.confirmedArchetypeIndex = 0;

  state.searchQuery = "";
  state.confirmPending = false;
  state.expandedSlotOverrides = [null, null, null, null];

  state.uiMode = "select";
  state.overlayPayload = null;

  try {
    exitPickSlotMode(state);
    closeSearchDropdown(state);
  } catch {}

  persist();
}

function goHome() {
  resetRandomizeStreak();
  if (String(GameState?.specialFlow?.type || "") === "eggBattle") {
    GameState.specialFlow = null;
  }

  try {
    exitPickSlotMode(state);
    closeSearchDropdown(state);
  } catch {}

  persist();
  setLastScreen("menu");

  playUIBackBlip();
  changeScreen("menu");
}

function confirmPicks(baseVisible) {
  resetRandomizeStreak();

  if (hasBlankSlot(state.slots, SLOT_COUNT)) {
    playUIBackBlip();
    state.confirmPending = false;
    persist();
    return;
  }

  const fallback = getMovieById("unknown");

  const resolved = resolvePartyFromSlots({
    SLOT_COUNT,
    movieMeta,
    slots: state.slots,
    baseVisible,
    fallbackMovie: fallback
  });
  for (let i = 0; i < SLOT_COUNT; i++) {
    const overrideId = String(state.expandedSlotOverrides?.[i] || "");
    if (!overrideId) continue;
    const overrideMovie = GameState?.catalog?.byId?.[overrideId] || null;
    if (overrideMovie) resolved[i] = overrideMovie;
  }
  GameState.party.movies = resolved;

  const rosterIds = (GameState.party.movies || []).map((m) => String(m?.id || "")).filter(Boolean);
  if (!GameState.flags) GameState.flags = {};
  GameState.flags.activeArchetypeId = String(state.selectedArchetypeId || "custom");

  persist();
  const specialType = String(GameState?.specialFlow?.type || "");
  const isEggBattle = specialType === "eggBattle";
  setLastScreen(isEggBattle ? "startingItemsPick" : "levelIntro");

  GameState.currentLevel = isEggBattle ? 32 : 1;
  GameState.enemyTemplate = null;
  GameState.enemy = null;
  GameState.campaign = {
    onefourShown: isEggBattle ? true : false,
    effects: { first: null, fourth: null },
    _onefourAppliedThisBattle: false,
    flavor: {},
    runtime: {}
  };

  if (isEggBattle) {
    GameState.runMode = "campaign";
    GameState.enemyTemplate = findEnemyById("film_professor");
    // Egg battle flow: force all selected actors to spawn with level-15 stats.
    const progressMap = {};
    for (const movie of (GameState.party.movies || [])) {
      const id = String(movie?.id || "");
      if (!id) continue;
      progressMap[id] = buildEggBattleProgressForMovie(movie, 15);
    }
    GameState.party.progress = progressMap;
    if (!GameState.specialFlow || typeof GameState.specialFlow !== "object") {
      GameState.specialFlow = {};
    }
    GameState.specialFlow.type = "eggBattle";
    GameState.specialFlow.hideEnemyLevel = true;
  } else {
    // Campaign run bookkeeping for hidden-movie/set logic.
    recordCampaignRunStart(GameState, rosterIds, GameState.flags.activeArchetypeId);
    recordExactLineupRun(GameState, rosterIds);
    discoverSetsFromRoster(GameState, rosterIds);
    const setIds = getActiveUnlockedSetIdsForRoster(GameState, rosterIds);
    if (!GameState.campaign) GameState.campaign = {};
    GameState.campaign.activeMatineeSetIds = Array.isArray(setIds) && setIds.length ? setIds : [];
    evaluateExtraMovieUnlocks(GameState);
    GameState.party.progress = {};
  }

  playUIConfirmBlip();

  try {
    MenuLayers.stop({ fadeMs: 180 });
  } catch {}
  changeScreen(isEggBattle ? "startingItemsPick" : "levelIntro");
}

// -----------------------
// Screen
// -----------------------
export const SelectScreen = {
  enter() {
    try {
      resetSelectUIState();
    } catch {}
    state.enterArmed = false;

    ensureSelectTextInput();

    try {
      ensureSearchState(state);
      bindSearchKeyboard(Input, state);
    } catch {}
    try {
      ensureCatalogCacheState();
      loadExpandedCatalogCache();
      loadSelectSettings();
    } catch {}

    try {
      syncOptionsAudioNow();
    } catch {}
    try {
      MenuLayers.setMix(NAV_MIX, 0);
    } catch {}
    resetSelectDevCode();
  },

  update(mouse) {
    // Gesture-gated boot for audio
    if (
      Input.pressed("Confirm") ||
      Input.pressed("Left") ||
      Input.pressed("Right") ||
      Input.pressed("Up") ||
      Input.pressed("Down") ||
      Input.pressed("Back") ||
      Input.pressed("Toggle") ||
      Input.pressed("Randomize") ||
      Input.pressed("GenreRandomize") ||
      Input.pressed("Clear") ||
      mouse?.pressed ||
      mouse?.clicked ||
      mouse?.tapped
    ) {
      bootNavLayersFromGestureIfNeeded();
    }

    try {
      MenuLayers.setMix(NAV_MIX, 0);
    } catch {}
    try {
      syncOptionsAudioNow();
    } catch {}

    maybeOpenOverlayFromGlobalEvents();
    restoreOrDefault();

    // Arm confirm only after Confirm is released once
    if (!Input.isDown("Confirm")) state.enterArmed = true;

    const { base: baseVisible, displayToBase } = getDisplayMovies();
    reconcileExpandedSlotOverrides(baseVisible);
    const archetypes = getSelectableArchetypes();

    syncSelectTextInput({
      state,
      SCREEN,
      L,
      searchRects
    });

    // ensure search exists and consume any queued typing into it
    try {
      ensureSearchState(state);
      updateSearchFromQueue(state, baseVisible, { SCREEN, L, Input });
    } catch {}

    state.inputMode = detectKeyboardInput(Input, mouse, state.inputMode);

    // -----------------------
    // Search lock:
    // - while search owns focus, prevent gameplay/navigation hotkeys from firing
    // - keep settings overlay exempt so its own keyboard controls still work
    // -----------------------
    ensureSearchState(state);
    const searchActive =
      state.focus === "search" ||
      (state.search?.suggestions && state.search.suggestions.length > 0) ||
      !!state.search?.pickSlotMode;

    if (searchActive && !state.settingsOpen) {
      // Hard override: Backspace must never behave like "Back" while search is active.
      // Search engine handles Backspace for text editing directly.
      if (Input.pressedCode?.("Backspace")) {
        Input.consumeCode?.("Backspace");
      }
      if (Input.pressed("Back")) Input.consume("Back");
      if (Input.pressed("Confirm")) Input.consume("Confirm");
      if (Input.pressed("Toggle")) Input.consume("Toggle");
      if (Input.pressed("Randomize")) Input.consume("Randomize");
      if (Input.pressed("GenreRandomize")) Input.consume("GenreRandomize");
      if (Input.pressed("Clear")) Input.consume("Clear");
      if (Input.pressed("Left")) Input.consume("Left");
      if (Input.pressed("Right")) Input.consume("Right");
      if (Input.pressed("Up")) Input.consume("Up");
      if (Input.pressed("Down")) Input.consume("Down");
    }

    if (state.settingsOpen) {
      const listModes = ["default", "alphabetical", "genre", "year"];
      const searchModes = ["curated", "expanded"];

      if (Input.pressed("Back") || Input.pressed("Toggle")) {
        state.settingsOpen = false;
        persistSelectSettingsNow();
        playUIBackBlip();
        return;
      }
      if (Input.pressed("Up")) {
        state.settingsRow = (state.settingsRow + 2) % 3;
        playUIMoveBlip();
        return;
      }
      if (Input.pressed("Down")) {
        state.settingsRow = (state.settingsRow + 1) % 3;
        playUIMoveBlip();
        return;
      }
      if ((Input.pressed("Left") || Input.pressed("Right")) && state.settingsRow <= 1) {
        const dir = Input.pressed("Left") ? -1 : +1;
        if (state.settingsRow === 0) {
          const idx = Math.max(0, listModes.indexOf(normalizeListViewMode(state.listViewMode)));
          applyListViewMode(listModes[(idx + dir + listModes.length) % listModes.length]);
        } else {
          const now = currentSearchEngineMode();
          const idx = Math.max(0, searchModes.indexOf(now));
          const next = searchModes[(idx + dir + searchModes.length) % searchModes.length];
          applySearchEngineMode(next);
          persistSelectSettingsNow();
        }
        playUIMoveBlip();
        return;
      }
      if (Input.pressed("Confirm") && state.settingsRow === 2) {
        clearExpandedCatalogCache();
        persist();
        playUIConfirmBlip();
        return;
      }
      if (mouse?.clicked) {
        const r = settingsOverlayRect();
        if (!pointInRect(mouse.x, mouse.y, r)) {
          state.settingsOpen = false;
          persistSelectSettingsNow();
          playUIBackBlip();
          return;
        }
        const row1Y = r.y + 30;
        const row2Y = r.y + 62;
        const row3Y = r.y + 94;
        const row = Math.abs(mouse.y - row1Y) < 12 ? 0 : (Math.abs(mouse.y - row2Y) < 12 ? 1 : (Math.abs(mouse.y - row3Y) < 12 ? 2 : -1));
        if (row >= 0) {
          state.settingsRow = row;
          const dir = mouse.x < (r.x + r.w / 2) ? -1 : +1;
          if (row === 0) {
            const listModes = ["default", "alphabetical", "genre", "year"];
            const idx = Math.max(0, listModes.indexOf(normalizeListViewMode(state.listViewMode)));
            applyListViewMode(listModes[(idx + dir + listModes.length) % listModes.length]);
          } else if (row === 1) {
            const searchModes = ["curated", "expanded"];
            const now = currentSearchEngineMode();
            const idx = Math.max(0, searchModes.indexOf(now));
            const next = searchModes[(idx + dir + searchModes.length) % searchModes.length];
            applySearchEngineMode(next);
            persistSelectSettingsNow();
          } else {
            clearExpandedCatalogCache();
            persist();
          }
          playUIMoveBlip();
        }
      }
      return;
    }

    if (!Input.pressed("Randomize") && shouldResetStreakThisFrame(Input, mouse, state.confirmPending)) {
      resetRandomizeStreak();
    }

    // 1) Overlay mode handler (highest priority)
    if (
      handleUnlockOverlayMode({
        Input,
        state,
        closeOverlay,
        ensureInitialized: restoreOrDefault,
        clearAllSlotsToBlank,
        playUIConfirmBlip,
        playUIBackBlip
      })
    ) {
      return;
    }

    setLastScreen("select");

    // Secret quick-fill: 7 -> 1 -> 1
    if (updateSelectDevCode(16.67)) return;

    // 2) Confirm pending handler
    if (
      handleConfirmPending({
        Input,
        mouse,
        state,
        pointInRect,
        homeCornerRect: () => homeCornerRect({ SCREEN, L }),
        battleCornerRect: () => battleCornerRect({ SCREEN, L }),
        baseVisible,
        persist,
        confirmPicks,
        playUIBackBlip,
        playUIConfirmBlip
      })
    ) {
      return;
    }

    // 2.25) Dropdown hover-follow + block slot hover while mouse is over dropdown
    let dropdownHoverBlocking = false;
    try {
      dropdownHoverBlocking = handleSearchHover({ mouse, state, SCREEN, L });
    } catch {}

    // In pick-slot mode, track which slot the pointer is over for visual targeting.
    try {
      ensureSearchState(state);
      let hoverSlot = -1;
      if (state.search?.pickSlotMode && mouse) {
        const mx = mouse.x;
        const my = mouse.y;
        for (let i = 0; i < SLOT_COUNT; i++) {
          if (pointInRect(mx, my, slotBounds({ i, SLOT_COUNT, SCREEN, L }))) {
            hoverSlot = i;
            break;
          }
        }
      }
      if (state.search) state.search.hoveredSlotIndex = hoverSlot;
    } catch {}

    // 2.5) Search pointer (dropdown clicks + pick-slot placement clicks)
    try {
      const handledSearch = handleSearchPointer({
        mouse,
        state,
        SCREEN,
        L,
        pointInRect,
        searchRects: () => searchRects({ SCREEN, L }),
        slotBounds: (i) => slotBounds({ i, SLOT_COUNT, SCREEN, L }),
        baseVisible,
        onPlaceMovie: (slotIndex, baseMovieIndex, suggestion) => {
          let chosenIndex = baseMovieIndex;
          let overrideId = null;
          if (!(Number.isFinite(chosenIndex) && chosenIndex >= 0)) {
            const srcMovie = suggestion?.movie || null;
            let rememberedId = rememberExpandedMovie(srcMovie);
            if (!rememberedId) {
              const fallbackId = normalizeExpandedId(
                srcMovie?.id,
                suggestion?.tmdbId ?? srcMovie?.providerId,
                srcMovie?.title || suggestion?.title || ""
              );
              if (fallbackId) {
                const fallbackMovie = {
                  id: fallbackId,
                  title: String(srcMovie?.title || suggestion?.title || "Unknown"),
                  shortTitle: String(srcMovie?.shortTitle || srcMovie?.title || suggestion?.title || "Unknown"),
                  runtime: Number.isFinite(Number(srcMovie?.runtime)) ? Number(srcMovie.runtime) : 110,
                  imdb: Number.isFinite(Number(srcMovie?.imdb)) ? Number(srcMovie.imdb) : 7.0,
                  year: inferMovieYear(srcMovie || suggestion || {}),
                  release_date: String(srcMovie?.release_date || ""),
                  posterUrl: String(srcMovie?.posterUrl || ""),
                  provider: "tmdb",
                  providerId: Number.isFinite(Number(suggestion?.tmdbId ?? srcMovie?.providerId))
                    ? Number(suggestion?.tmdbId ?? srcMovie?.providerId)
                    : null,
                  isExpanded: true
                };
                rememberedId = rememberExpandedMovie(fallbackMovie);
              }
            }
            // Important: slots are indexed against the currently displayed base
            // (which may be list-view sorted), so resolve index from that same base.
            const displayBase = getDisplayMovies().base;
            let idx = displayBase.findIndex((m) => String(m?.id || "") === String(rememberedId || ""));
            if (idx < 0) {
              const fallbackBase = getSortedBaseByListView(getVisibleMoviesBase());
              idx = fallbackBase.findIndex((m) => String(m?.id || "") === String(rememberedId || ""));
            }
            const prev = state.slots?.[slotIndex];
            const prevIndex = (typeof prev === "number" && Number.isFinite(prev)) ? prev : 0;
            chosenIndex = idx >= 0 ? idx : prevIndex;
            overrideId = String(rememberedId || "");
          } else {
            const movie = baseVisible[chosenIndex] || null;
            if (String(movie?.id || "").startsWith("tmdb_")) {
              overrideId = String(movie.id);
            }
          }
          state.slots[slotIndex] = chosenIndex;
          state.expandedSlotOverrides[slotIndex] = overrideId || null;
          state.focus = "movies";
          state.activeSlot = slotIndex;
          state.confirmPending = false;

          // picking a slot cancels archetype lock
          state.archetypeIndex = 0;
          state.archetypeConfirmed = false;

          // ✅ reset search UI after placing
          state.searchQuery = "";
          try {
            closeSearchDropdown(state);
          } catch {}

          persist();
          playUIConfirmBlip();
        },
        onCancelPickMode: () => {
          try {
            exitPickSlotMode(state);
            closeSearchDropdown(state);
          } catch {}
          persist();
          playUIBackBlip();
        },
        onEnterPickMode: () => {
          try {
            closeSearchDropdown(state);
          } catch {}
          persist();
          playUIConfirmBlip();
        },
        playUIMoveBlip,
        persist
      });

      if (handledSearch) return;
    } catch {}

    if (mouse?.clicked && pointInRect(mouse.x, mouse.y, settingsButtonRect())) {
      state.settingsOpen = !state.settingsOpen;
      if (state.settingsOpen) {
        state.focus = "movies";
        try {
          closeSearchDropdown(state);
          exitPickSlotMode(state);
        } catch {}
      }
      if (!state.settingsOpen) persistSelectSettingsNow();
      playUIConfirmBlip();
      return;
    }

    // 3) Global hotkeys (Clear/Back)
    if (
      handleGlobalHotkeys({
        Input,
        state,
        persist,
        goHome,
        clearAllSlotsToBlank,
        playUIBackBlip,
        playUIConfirmBlip
      })
    ) {
      return;
    }

    // --- Focus change should close dropdown immediately ---
    const prevFocus = state.focus;

    // 4) Toggle focus
    if (
      handleToggleFocus({
        Input,
        state,
        persist,
        playUIMoveBlip
      })
    ) {
      try {
        closeSearchDropdown(state);
      } catch {}
      return;
    }

    // 5) Randomize actions
    if (
      handleRandomizeActions({
        Input,
        state,
        baseVisible,
        displayToBase,
        onPressRandomizeMaybeStartTrial,
        randomizeSlots,
        randomizeSlotsCommonGenre,
        persist,
        playUIMoveBlip
      })
    ) {
      try {
        closeSearchDropdown(state);
      } catch {}
      if (GameState.currentScreen !== "select") return;
      return;
    }

    // 6) Confirm pressed (enter)
    if (
      handleConfirmPressed({
        Input,
        state,
        archetypes,
        setArchetypeByIndex,
        persist,
        playUIConfirmBlip,
        playUIBackBlip
      })
    ) {
      try {
        closeSearchDropdown(state);
      } catch {}
      return;
    }

    // 7) Keyboard navigation (slots/archetypes)
    if (
      handleKeyboardNavigation({
        Input,
        state,
        baseVisibleLen: baseVisible.length,
        displayToBase,
        archetypesLen: archetypes.length,
        setArchetypeByIndex,
        cycleSlotWithOptionalFilter,
        clampIndex,
        persist,
        playUIMoveBlip
      })
    ) {
      // continue
    }

    // If focus changed this frame, close dropdown immediately.
    if (state.focus !== prevFocus) {
      try {
        closeSearchDropdown(state);
      } catch {}
    }

    const mouseOverDropdown = (() => {
      try {
        return !!isMouseOverSearchDropdown({ mouse, state });
      } catch {
        return false;
      }
    })();

    // Hover (mouse sets focus + corner hover highlight)
    if (!dropdownHoverBlocking && !mouseOverDropdown) {
      handlePointerHover({
        mouse,
        state,
        pointInRect,
        homeCornerRect: () => homeCornerRect({ SCREEN, L }),
        battleCornerRect: () => battleCornerRect({ SCREEN, L }),
        searchRects: () => searchRects({ SCREEN, L }),
        topArrowRect: (i) => topArrowRect({ i, SLOT_COUNT, SCREEN, L }),
        bottomArrowRect: (i) => bottomArrowRect({ i, SLOT_COUNT, SCREEN, L }),
        slotBounds: (i) => slotBounds({ i, SLOT_COUNT, SCREEN, L }),
        archetypeBarRects: () => archetypeBarRects({ SCREEN, L }),
        persist,
        playUIMoveBlip
      });
    }

    // ✅ Whole-slot click cycles up/down (unless dropdown blocks it)
    if (state.inputMode === "mouse" && mouse?.clicked && !state.confirmPending) {
      if (!mouseOverDropdown) {
        const mx = mouse.x;
        const my = mouse.y;

        const inPickSlotMode = !!state.search?.pickSlotMode;
        if (!inPickSlotMode) {
          for (let i = 0; i < SLOT_COUNT; i++) {
            const card = slotCardRect({ i, SLOT_COUNT, SCREEN, L });
            if (pointInRect(mx, my, card)) {
              const dir = my < card.y + card.h / 2 ? -1 : +1;

              state.focus = "movies";
              state.activeSlot = i;
              state.archetypeIndex = 0;
              state.archetypeConfirmed = false;
              state.confirmPending = false;

              cycleSlotWithOptionalFilter({
                slots: state.slots,
                slotIdx: i,
                dir,
                displayToBase,
                baseLen: baseVisible.length
              });

              persist();
              playUIMoveBlip();
              return;
            }
          }
        }
      }
    }

    // Pointer input (normal select interactions) — skip if dropdown blocks
    if (!mouseOverDropdown) {
      handlePointerInput({
        mouse,
        state,
        pointInRect,
        homeCornerRect: () => homeCornerRect({ SCREEN, L }),
        battleCornerRect: () => battleCornerRect({ SCREEN, L }),
        searchRects: () => searchRects({ SCREEN, L }),
        topArrowRect: (i) => topArrowRect({ i, SLOT_COUNT, SCREEN, L }),
        bottomArrowRect: (i) => bottomArrowRect({ i, SLOT_COUNT, SCREEN, L }),
        slotBounds: (i) => slotBounds({ i, SLOT_COUNT, SCREEN, L }),
        archetypeBarRects: () => archetypeBarRects({ SCREEN, L }),
        baseVisible,
        displayToBase,
        archetypes,
        clampIndex,
        cycleSlotWithOptionalFilter,
        setArchetypeByIndex,
        persist,
        goHome,
        confirmPicks,
        playUIBackBlip,
        playUIConfirmBlip,
        playUIMoveBlip
      });
    }

    // ✅ Mobile keyboard: focus hidden input when search is focused; blur otherwise
    ensureSearchState(state);

    const searchWantsKeyboard =
      state.focus === "search" &&
      !state.confirmPending &&
      state.uiMode === "select" &&
      !state.search?.pickSlotMode;

    if (searchWantsKeyboard) {
      focusSelectTextInput(state);
    } else {
      blurSelectTextInput();
    }
  },

  render(ctx) {
    setLastScreen("select");
    restoreOrDefault();

    const { base: baseVisible } = getDisplayMovies();
    reconcileExpandedSlotOverrides(baseVisible);
    const getPosterPathForRender = (movie) => String(movie?.posterUrl || "") || getLocalPosterPath(movie);
    const archetypes = getSelectableArchetypes();

    const chosenIndex = state.archetypeConfirmed
      ? clampIndex(state.confirmedArchetypeIndex, archetypes.length)
      : clampIndex(state.archetypeIndex, archetypes.length);

    const chosenArchetype = archetypes[chosenIndex] || archetypes[0];

    // Search state (optional)
    let pickSlotMode = false;
    let pickSlotHoverIndex = -1;
    try {
      ensureSearchState(state);
      pickSlotMode = !!state.search?.pickSlotMode;
      pickSlotHoverIndex = Number.isFinite(Number(state.search?.hoveredSlotIndex))
        ? Number(state.search.hoveredSlotIndex)
        : -1;
    } catch {}

    // BG
    ctx.fillStyle = C().bg || "#000";
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);

    // Title
    ctx.fillStyle = L?.title?.color || "#fff";
    ctx.font = L?.title?.font || "15px monospace";
    ctx.fillText(L?.title?.text || "Pick Your Movies", Number(L?.title?.x ?? 12), Number(L?.title?.y ?? 24));

    // Help / subtitle
    ctx.fillStyle = L?.help?.color || "#777";
    ctx.font = L?.help?.font || "9px monospace";
    const helpX = Number(L?.help?.x ?? 12);
    const helpY = Number(L?.help?.y ?? 40);

    if (state.confirmPending) {
      ctx.fillText("Press Enter to Start Battle  Press Esc/Bksp to cancel.", helpX, helpY);
    } else if (pickSlotMode) {
      ctx.fillText("Pick a Slot For This Movie", helpX, helpY);
    } else {
      const toggleHint = state.focus === "archetypes" ? "Toggle: Cycle Movies" : "Toggle: Cycle Archetypes";
      ctx.fillText(`R: Random  B: Clear  ${toggleHint}`, helpX, helpY);
    }

    // Search row
    const sr = searchRects({ SCREEN, L });
    const s = L?.search || {};

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(sr.left.x, sr.left.y, sr.left.w, sr.left.h);
    ctx.strokeStyle = state.focus === "search" ? C().highlight || "#ff0" : C().stroke || "#555";
    ctx.strokeRect(sr.left.x, sr.left.y, sr.left.w, sr.left.h);
    ctx.fillStyle = C().text || "#fff";
    ctx.font = s.iconFont || "13px monospace";
    ctx.fillText("✕", sr.left.x + 5, sr.left.y + 15);

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(sr.mid.x, sr.mid.y, sr.mid.w, sr.mid.h);
    ctx.strokeStyle = state.focus === "search" ? (C().highlight || "#ff0") : (C().stroke || "#555");
    ctx.strokeRect(sr.mid.x, sr.mid.y, sr.mid.w, sr.mid.h);

    const isSearchFocused = state.focus === "search";
    const queryText = String(state.searchQuery || "");
    const placeholder = String(s.placeholder || "search");

    ctx.font = s.font || "11px monospace";

    if (!isSearchFocused && !queryText) {
      ctx.fillStyle = C().textDim || "#aaa";
      ctx.fillText(placeholder, sr.mid.x + 10, sr.mid.y + 15);
    } else {
      ctx.fillStyle = C().text || "#fff";
      ctx.fillText(queryText, sr.mid.x + 10, sr.mid.y + 15);

      if (isSearchFocused) {
        const blinkOn = Math.floor(Date.now() / 450) % 2 === 0;
        if (blinkOn) {
          const w = ctx.measureText(queryText).width;
          const cx = sr.mid.x + 10 + w + 2;
          const top = sr.mid.y + 5;
          const bottom = sr.mid.y + sr.mid.h - 5;

          ctx.beginPath();
          ctx.moveTo(cx, top);
          ctx.lineTo(cx, bottom);
          ctx.strokeStyle = C().text || "#fff";
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(sr.right.x, sr.right.y, sr.right.w, sr.right.h);
    ctx.strokeStyle = state.focus === "search" ? C().highlight || "#ff0" : C().stroke || "#555";
    ctx.strokeRect(sr.right.x, sr.right.y, sr.right.w, sr.right.h);
    ctx.fillStyle = C().text || "#fff";
    ctx.font = s.iconFont || "13px monospace";
    ctx.fillText("⌕", sr.right.x + 5, sr.right.y + 15);

    const sb = settingsButtonRect();
    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
    ctx.strokeStyle = state.settingsOpen ? (C().highlight || "#ff0") : (C().stroke || "#555");
    ctx.strokeRect(sb.x, sb.y, sb.w, sb.h);
    ctx.fillStyle = C().text || "#fff";
    ctx.font = "11px monospace";
    ctx.fillText("S", sb.x + 6, sb.y + 14);

    // Slots
    const arrowFont = S()?.arrowFont || "13px monospace";
    const upChar = S()?.arrowUpChar || "▲";
    const downChar = S()?.arrowDownChar || "▼";
    const np = S()?.nameplate || {};

    for (let i = 0; i < SLOT_COUNT; i++) {
      const v = state.slots[i];
      const isSpecial = isSpecialSlotValue(v);
      let movie = !isSpecial ? baseVisible[v] : null;
      if (!isSpecial) {
        const overrideId = String(state.expandedSlotOverrides?.[i] || "");
        if (overrideId && GameState?.catalog?.byId?.[overrideId]) {
          movie = GameState.catalog.byId[overrideId];
        }
      }

      const isActiveMovieSlot = state.focus === "movies" && i === state.activeSlot;

      const card = slotCardRect({ i, SLOT_COUNT, SCREEN, L });
      const upR = topArrowRect({ i, SLOT_COUNT, SCREEN, L });
      const pr = posterRect({ i, SLOT_COUNT, SCREEN, L });
      const nameR = nameplateRect({ i, SLOT_COUNT, SCREEN, L });
      const downR = bottomArrowRect({ i, SLOT_COUNT, SCREEN, L });

      // Card outline
      ctx.strokeStyle = isActiveMovieSlot ? C().highlight || "#ff0" : C().stroke || "#555";
      ctx.strokeRect(card.x, card.y, card.w, card.h);

      // Top arrow box
      ctx.fillStyle = C().panel || "#111";
      ctx.fillRect(upR.x, upR.y, upR.w, upR.h);
      ctx.strokeStyle = isActiveMovieSlot ? C().highlight || "#ff0" : C().stroke || "#555";
      ctx.strokeRect(upR.x, upR.y, upR.w, upR.h);

      ctx.fillStyle = C().text || "#fff";
      ctx.font = arrowFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(upChar, upR.x + upR.w / 2, upR.y + upR.h / 2);

      // Poster background
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = C().panel || "#111";
      ctx.fillRect(pr.x, pr.y, pr.w, pr.h);

      if (isSpecial) {
        drawSpecialPoster(ctx, pr, v, { C, SLOT_TOKEN_BLANK, SLOT_TOKEN_RANDOM, GENRE_TOKEN_TO_DEF });
      } else {
        const posterPath = getPosterPathForRender(movie);
        if (posterPath) {
          ImageCache.load(posterPath);
          const img = ImageCache.get(posterPath);

          if (img && img.width && img.height) {
            try {
              ctx.drawImage(img, pr.x, pr.y, pr.w, pr.h);
            } catch {}
          } else {
            ctx.fillStyle = C().posterLoading || "#666";
            ctx.font = "9px monospace";
            ctx.fillText("loading...", pr.x + 6, pr.y + 14);
          }
        } else {
          ctx.fillStyle = C().posterLoading || "#666";
          ctx.font = "9px monospace";
          ctx.fillText("no poster", pr.x + 6, pr.y + 14);
        }
      }

      // Nameplate
      ctx.fillStyle = np.bg || (C().panel || "#111");
      ctx.fillRect(nameR.x, nameR.y, nameR.w, nameR.h);
      ctx.strokeStyle = isActiveMovieSlot ? C().highlight || "#ff0" : C().stroke || "#555";
      ctx.strokeRect(nameR.x, nameR.y, nameR.w, nameR.h);

      ctx.fillStyle = "#ddd";
      ctx.font = np.font || "10px monospace";

      const padX = Number(np.padX ?? 4);
      const lineH = Number(np.lineH ?? 10);
      const nameText = isSpecial ? specialSlotLabel(v) : getNameplateTitle(movie);
      wrapText(ctx, nameText, nameR.x + padX, nameR.y + 10, nameR.w - padX * 2, lineH);

      // Bottom arrow box
      ctx.fillStyle = C().panel || "#111";
      ctx.fillRect(downR.x, downR.y, downR.w, downR.h);
      ctx.strokeStyle = isActiveMovieSlot ? C().highlight || "#ff0" : C().stroke || "#555";
      ctx.strokeRect(downR.x, downR.y, downR.w, downR.h);

      ctx.fillStyle = C().text || "#fff";
      ctx.font = arrowFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(downChar, downR.x + downR.w / 2, downR.y + downR.h / 2);

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Pick-slot mode overlay (greys out slots)
      if (pickSlotMode) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(card.x + 1, card.y + 1, card.w - 2, card.h - 2);

        if (i === pickSlotHoverIndex) {
          const prevLW = ctx.lineWidth;
          ctx.strokeStyle = C().highlight || "#ff0";
          ctx.lineWidth = 2;
          ctx.strokeRect(card.x + 2, card.y + 2, card.w - 4, card.h - 4);
          ctx.lineWidth = prevLW;
        }
      }
    }

    // corner buttons
    const home = homeCornerRect({ SCREEN, L });
    const battle = battleCornerRect({ SCREEN, L });

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(home.x, home.y, home.w, home.h);
    ctx.strokeStyle = state.confirmPending || state.hoverCorner === "home" ? C().highlight || "#ff0" : C().stroke || "#555";
    ctx.strokeRect(home.x, home.y, home.w, home.h);
    ctx.fillStyle = C().text || "#fff";
    ctx.font = "15px monospace";
    ctx.fillText("↩", home.x + 4, home.y + 17);

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(battle.x, battle.y, battle.w, battle.h);
    ctx.strokeStyle = state.confirmPending || state.hoverCorner === "battle" ? C().highlight || "#ff0" : C().stroke || "#555";
    ctx.strokeRect(battle.x, battle.y, battle.w, battle.h);
    ctx.fillStyle = C().text || "#fff";
    ctx.font = "15px monospace";
    ctx.fillText("⚔", battle.x + 4, battle.y + 17);

    // archetype bar
    const A = archetypeBarRects({ SCREEN, L });
    const ac = bottom()?.archetype || {};

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(A.left.x, A.left.y, A.left.w, A.left.h);
    ctx.strokeStyle = state.focus === "archetypes" ? C().highlight || "#ff0" : C().stroke || "#555";
    ctx.strokeRect(A.left.x, A.left.y, A.left.w, A.left.h);
    ctx.fillStyle = C().text || "#fff";
    ctx.font = ac.iconFont || "15px monospace";
    ctx.fillText(ac.leftChar || "◀", A.left.x + 4, A.left.y + 17);

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(A.right.x, A.right.y, A.right.w, A.right.h);
    ctx.strokeStyle = state.focus === "archetypes" ? C().highlight || "#ff0" : C().stroke || "#555";
    ctx.strokeRect(A.right.x, A.right.y, A.right.w, A.right.h);
    ctx.fillStyle = C().text || "#fff";
    ctx.font = ac.iconFont || "15px monospace";
    ctx.fillText(ac.rightChar || "▶", A.right.x + 4, A.right.y + 17);

    ctx.fillStyle = C().panel || "#111";
    ctx.fillRect(A.center.x, A.center.y, A.center.w, A.center.h);
    ctx.strokeStyle = state.focus === "archetypes" ? C().highlight || "#ff0" : C().stroke || "#555";
    ctx.strokeRect(A.center.x, A.center.y, A.center.w, A.center.h);

    const lockTag = state.archetypeConfirmed && chosenArchetype?.id !== "custom" ? " ✓" : "";
    const label = `${chosenArchetype?.name || "Custom"}${lockTag}`;

    const fitted = fitTextByShrinking(
      ctx,
      label,
      A.center.w - 12,
      Number(ac.fontStart ?? 11),
      Number(ac.fontMin ?? 8)
    );

    ctx.fillStyle = C().text || "#fff";
    ctx.font = `${fitted.px}px monospace`;
    ctx.fillText(fitted.text, A.center.x + 8, A.center.y + 16);

    // ✅ Search dropdown (draw AFTER slots so it is superimposed on top)
    try {
      renderSearchDropdown(ctx, {
        state,
        SCREEN,
        L,
        colors: C(),
        baseVisible,
        movieMeta: state.movieMeta,
        getLocalPosterPath: getPosterPathForRender,
        ImageCache
      });
    } catch {}

    if (state.settingsOpen) {
      const r = settingsOverlayRect();
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
      ctx.fillStyle = C().panel || "#111";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = C().highlight || "#ff0";
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      const listLabel = normalizeListViewMode(state.listViewMode);
      const listPretty = listLabel.charAt(0).toUpperCase() + listLabel.slice(1);
      const searchPretty = currentSearchEngineMode() === "expanded" ? "Expanded" : "Curated";
      const rowY1 = r.y + 30;
      const rowY2 = r.y + 62;
      const rowY3 = r.y + 94;

      ctx.fillStyle = state.settingsRow === 0 ? (C().highlight || "#ff0") : (C().text || "#fff");
      ctx.font = "11px monospace";
      ctx.fillText(`list view:   < ${listPretty} >`, r.x + 12, rowY1);
      ctx.fillStyle = state.settingsRow === 1 ? (C().highlight || "#ff0") : (C().text || "#fff");
      ctx.fillText(`search engine: < ${searchPretty} >`, r.x + 12, rowY2);
      ctx.fillStyle = state.settingsRow === 2 ? (C().highlight || "#ff0") : (C().text || "#fff");
      ctx.fillText("clear expanded cache", r.x + 12, rowY3);
    }
    // confirm banner
    if (state.confirmPending) {
      const r = confirmBoxRect({ L });

      ctx.fillStyle = "#000";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      const blank = hasBlankSlot(state.slots, SLOT_COUNT);
      const text = blank ? "BLANK slot selected — cannot start." : L?.confirm?.text || "Ready to start battle.";

      ctx.fillStyle = blank ? "#f66" : L?.confirm?.color || "#ff0";
      ctx.font = L?.confirm?.font || "9px monospace";

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    // Unlock overlay
    if (state.uiMode === "unlock") {
      const payload = state.overlayPayload || {};
      const party = (payload.movieIds || []).slice(0, 4).map(getMovieById);

      renderUnlockArcOverlay(ctx, {
        width: 400,
        height: 300,
        archetypeName: payload.archetypeName || "Unknown",
        party,
        codeLabel: payload.codeLabel || ""
      });
    }
  }
};
