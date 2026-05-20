// frontend/js/data/matinee/extraSystems.js
import { EXTRA_MOVIE_UNLOCK_RULES } from "./extraMovies.js";
import { EXTRA_MOVIE_SET_DEFS } from "./extraDefined.js";
import { movies } from "../movies.js";
import { playerArchetypes } from "../playerArchetypes.js";
import {
  ensureMatineeState,
  isMatineeMovieUnlocked,
  unlockMatineeMovie,
  saveMatineeState
} from "./storage.js";

function isArchUnlocked(GameState, id) {
  return !!GameState?.unlocks?.archetypes?.[String(id || "")];
}

function testCond(GameState, cond) {
  const c = GameState?.matinee?.counters;
  const pf = GameState?.matinee?.progressFlags || {};
  if (!c || !cond) return false;

  switch (cond.type) {
    case "runs_with_movie": return (Number(c.byMovieRuns?.[cond.movieId]) || 0) >= Number(cond.count || 1);
    case "wins_with_movie": return (Number(c.byMovieWins?.[cond.movieId]) || 0) >= Number(cond.count || 1);
    case "runs_with_genre": return (Number(c.byGenreRuns?.[String(cond.genre || "").toUpperCase()]) || 0) >= Number(cond.count || 1);
    case "wins_with_genre": return (Number(c.byGenreWins?.[String(cond.genre || "").toUpperCase()]) || 0) >= Number(cond.count || 1);
    case "runs_with_franchise": return (Number(c.byFranchiseRuns?.[cond.franchise]) || 0) >= Number(cond.count || 1);
    case "wins_with_franchise": return (Number(c.byFranchiseWins?.[cond.franchise]) || 0) >= Number(cond.count || 1);
    case "runs_with_archetype": return (Number(c.byArchetypeRuns?.[cond.archetypeId]) || 0) >= Number(cond.count || 1);
    case "wins_with_archetype": return (Number(c.byArchetypeWins?.[cond.archetypeId]) || 0) >= Number(cond.count || 1);
    case "wins_with_set": return (Number(c.bySetWins?.[cond.setId]) || 0) >= Number(cond.count || 1);
    case "win_streak_with_franchise": return (Number(c.campaignWinStreak) || 0) >= Number(cond.count || 1) && (Number(c.byFranchiseWins?.[cond.franchise]) || 0) > 0;
    case "runs_with_exact_lineup": {
      const key = `lineup:${(cond.movieIds || []).join("|")}`;
      return (Number(c.byMovieRuns?.[key]) || 0) >= Number(cond.count || 1);
    }
    case "set_unlocked": return !!GameState?.matinee?.unlockedSets?.[cond.setId];
    case "flag": return !!pf?.[cond.key];
    default: return false;
  }
}

function rulePasses(GameState, rule) {
  if (rule.requiresArchetype && !isArchUnlocked(GameState, rule.requiresArchetype)) return false;
  const all = Array.isArray(rule.all) ? rule.all : [];
  const any = Array.isArray(rule.any) ? rule.any : [];
  if (all.length && !all.every((cond) => testCond(GameState, cond))) return false;
  if (any.length && !any.some((cond) => testCond(GameState, cond))) return false;
  return all.length > 0 || any.length > 0;
}

function ensureUIEventQueue(GameState) {
  if (!GameState) return;
  if (!GameState.ui || typeof GameState.ui !== "object") GameState.ui = {};
  if (!Array.isArray(GameState.ui.events)) GameState.ui.events = [];
}

function findMovieById(id) {
  const key = String(id || "");
  return (movies || []).find((m) => String(m?.id || "") === key) || null;
}

function findArchetypeById(id) {
  const key = String(id || "");
  return (playerArchetypes || []).find((a) => String(a?.id || "") === key) || null;
}

function findSetById(id) {
  const key = String(id || "");
  return (EXTRA_MOVIE_SET_DEFS || []).find((s) => String(s?.id || "") === key) || null;
}

function titleCaseToken(raw) {
  return String(raw || "")
    .toLowerCase()
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatCount(n, singular, plural) {
  const count = Math.max(1, Number(n || 1));
  return `${count} ${count === 1 ? singular : plural}`;
}

function getCondProgress(GameState, cond) {
  const c = GameState?.matinee?.counters;
  const target = Math.max(1, Number(cond?.count || 1));
  if (!c || !cond) return { current: 0, target };

  let current = 0;
  switch (cond.type) {
    case "runs_with_movie": current = Number(c.byMovieRuns?.[cond.movieId]) || 0; break;
    case "wins_with_movie": current = Number(c.byMovieWins?.[cond.movieId]) || 0; break;
    case "runs_with_genre": current = Number(c.byGenreRuns?.[String(cond.genre || "").toUpperCase()]) || 0; break;
    case "wins_with_genre": current = Number(c.byGenreWins?.[String(cond.genre || "").toUpperCase()]) || 0; break;
    case "runs_with_franchise": current = Number(c.byFranchiseRuns?.[cond.franchise]) || 0; break;
    case "wins_with_franchise": current = Number(c.byFranchiseWins?.[cond.franchise]) || 0; break;
    case "runs_with_archetype": current = Number(c.byArchetypeRuns?.[cond.archetypeId]) || 0; break;
    case "wins_with_archetype": current = Number(c.byArchetypeWins?.[cond.archetypeId]) || 0; break;
    case "wins_with_set": current = Number(c.bySetWins?.[cond.setId]) || 0; break;
    case "win_streak_with_franchise": current = Number(c.campaignWinStreak) || 0; break;
    case "runs_with_exact_lineup": {
      const key = `lineup:${(cond.movieIds || []).join("|")}`;
      current = Number(c.byMovieRuns?.[key]) || 0;
      break;
    }
    case "set_unlocked": current = testCond(GameState, cond) ? 1 : 0; break;
    case "flag": current = testCond(GameState, cond) ? 1 : 0; break;
    default: current = 0; break;
  }

  return { current: Math.max(0, Math.floor(current)), target };
}

function formatProgress(GameState, cond) {
  const p = getCondProgress(GameState, cond);
  const capped = Math.min(p.current, p.target);
  return `[${capped}/${p.target}]`;
}

function formatCondReason(GameState, cond) {
  if (!cond || typeof cond !== "object") return "";

  const count = Math.max(1, Number(cond.count || 1));
  const progress = formatProgress(GameState, cond);

  switch (cond.type) {
    case "runs_with_movie": {
      const movie = findMovieById(cond.movieId);
      return `${progress} Play ${formatCount(count, "run", "runs")} with ${movie?.title || cond.movieId}.`;
    }
    case "wins_with_movie": {
      const movie = findMovieById(cond.movieId);
      return `${progress} Win ${formatCount(count, "run", "runs")} with ${movie?.title || cond.movieId}.`;
    }
    case "runs_with_genre":
      return `${progress} Play ${formatCount(count, "run", "runs")} with ${titleCaseToken(cond.genre)} movies.`;
    case "wins_with_genre":
      return `${progress} Win ${formatCount(count, "run", "runs")} with ${titleCaseToken(cond.genre)} movies.`;
    case "runs_with_franchise":
      return `${progress} Play ${formatCount(count, "run", "runs")} with ${String(cond.franchise || "that franchise")}.`;
    case "wins_with_franchise":
      return `${progress} Win ${formatCount(count, "run", "runs")} with ${String(cond.franchise || "that franchise")}.`;
    case "runs_with_archetype": {
      const a = findArchetypeById(cond.archetypeId);
      return `${progress} Play ${formatCount(count, "run", "runs")} with ${a?.name || cond.archetypeId}.`;
    }
    case "wins_with_archetype": {
      const a = findArchetypeById(cond.archetypeId);
      return `${progress} Win ${formatCount(count, "run", "runs")} with ${a?.name || cond.archetypeId}.`;
    }
    case "wins_with_set": {
      const s = findSetById(cond.setId);
      return `${progress} Win ${formatCount(count, "run", "runs")} using the ${s?.name || cond.setId} set.`;
    }
    case "win_streak_with_franchise":
      return `${progress} Reach a ${formatCount(count, "win", "wins")} streak with ${String(cond.franchise || "that franchise")}.`;
    case "runs_with_exact_lineup": {
      const names = (cond.movieIds || [])
        .map((id) => findMovieById(id)?.title || id)
        .filter(Boolean)
        .join(", ");
      return `${progress} Play ${formatCount(count, "run", "runs")} with this lineup: ${names}.`;
    }
    case "set_unlocked": {
      const s = findSetById(cond.setId);
      return `${progress} Unlock the ${s?.name || cond.setId} set.`;
    }
    case "flag":
      return `${progress} Trigger requirement: ${String(cond.key || "special condition")}.`;
    default:
      return "Meet the unlock requirement.";
  }
}

function getRuleReason(GameState, rule) {
  const all = Array.isArray(rule?.all) ? rule.all : [];
  const any = Array.isArray(rule?.any) ? rule.any : [];
  const requiresArchetype = String(rule?.requiresArchetype || "");

  const parts = [];

  if (requiresArchetype) {
    const a = findArchetypeById(requiresArchetype);
    parts.push(`Requires ${a?.name || requiresArchetype} unlocked.`);
  }

  if (any.length) {
    const firstMatched = any.find((cond) => testCond(GameState, cond));
    if (firstMatched) parts.push(formatCondReason(GameState, firstMatched));
  }

  if (all.length) {
    const allParts = all.map((cond) => formatCondReason(GameState, cond)).filter(Boolean);
    if (allParts.length) parts.push(...allParts);
  }

  return parts.filter(Boolean).join(" ");
}

function emitMovieUnlockEvent(GameState, movieId, reason = "") {
  ensureUIEventQueue(GameState);
  const m = findMovieById(movieId);
  GameState.ui.events.push({
    type: "MOVIE_UNLOCKED",
    movieId: String(movieId || ""),
    movieName: String(m?.title || movieId || "Unknown"),
    archetypeName: String(m?.title || movieId || "Unknown"),
    movieIds: [String(movieId || "")],
    showOverlay: false,
    codeLabel: reason || "New movie unlocked.",
    presentation: "screen"
  });
}

export function evaluateExtraMovieUnlocks(GameState) {
  ensureMatineeState(GameState);
  const unlockedNow = [];

  for (const rule of EXTRA_MOVIE_UNLOCK_RULES) {
    if (!rule?.movieId) continue;
    if (isMatineeMovieUnlocked(GameState, rule.movieId)) continue;
    if (!rulePasses(GameState, rule)) continue;
    if (unlockMatineeMovie(GameState, rule.movieId)) {
      unlockedNow.push(rule.movieId);
      const specialOn = !!rule.showSpecialLine;
      const special = String(rule.specialLine || "").trim();
      const reason = specialOn && special ? `"${special}"` : getRuleReason(GameState, rule);
      emitMovieUnlockEvent(GameState, rule.movieId, reason);
    }
  }

  if (unlockedNow.length) saveMatineeState(GameState);
  return unlockedNow;
}

export function recordExactLineupRun(GameState, rosterMovieIds = []) {
  ensureMatineeState(GameState);
  const target = ["ace_ventura_pet_detective", "the_mask", "dumb_and_dumber", "batman_forever"].slice().sort();
  const got = [...(rosterMovieIds || [])].map(String).sort();
  if (target.length !== got.length) return;
  for (let i = 0; i < target.length; i++) if (target[i] !== got[i]) return;
  const key = `lineup:${target.join("|")}`;
  const c = GameState.matinee.counters;
  c.byMovieRuns[key] = (Number(c.byMovieRuns[key]) || 0) + 1;
}
