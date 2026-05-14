// frontend/js/data/matinee/extraSystems.js
import { EXTRA_MOVIE_UNLOCK_RULES } from "./extraMovies.js";
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

export function evaluateExtraMovieUnlocks(GameState) {
  ensureMatineeState(GameState);
  const unlockedNow = [];

  for (const rule of EXTRA_MOVIE_UNLOCK_RULES) {
    if (!rule?.movieId) continue;
    if (isMatineeMovieUnlocked(GameState, rule.movieId)) continue;
    if (!rulePasses(GameState, rule)) continue;
    if (unlockMatineeMovie(GameState, rule.movieId)) unlockedNow.push(rule.movieId);
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
