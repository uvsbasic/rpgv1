// frontend/js/data/matinee/extraDiscovery.js
import { EXTRA_MOVIE_SET_DEFS } from "./extraDefined.js";
import { ensureMatineeState, unlockMatineeSet } from "./storage.js";

function includesAllWithEither(rosterSet, def) {
  const eitherBySlot = new Map();
  for (const e of def.eitherSlots || []) eitherBySlot.set(Number(e.slotIndex), new Set((e.options || []).map(String)));

  for (let i = 0; i < def.movieIds.length; i++) {
    const required = String(def.movieIds[i]);
    const either = eitherBySlot.get(i);
    if (either) {
      let ok = false;
      for (const id of either) if (rosterSet.has(id)) { ok = true; break; }
      if (!ok) return false;
    } else if (!rosterSet.has(required)) {
      return false;
    }
  }

  for (const group of def.anyOfGroups || []) {
    if (!group.some((id) => rosterSet.has(String(id)))) return false;
  }

  return true;
}

function getMatchedSetIds(rosterMovieIds = []) {
  const rosterSet = new Set((rosterMovieIds || []).map(String));
  const matched = [];
  for (const def of EXTRA_MOVIE_SET_DEFS) {
    if (includesAllWithEither(rosterSet, def)) matched.push(def.id);
  }
  return matched;
}

export function discoverSetsFromRoster(GameState, rosterMovieIds = []) {
  ensureMatineeState(GameState);
  const unlockedNow = [];
  const matched = getMatchedSetIds(rosterMovieIds);

  for (const id of matched) {
    if (GameState.matinee.unlockedSets?.[id]) continue;
    if (unlockMatineeSet(GameState, id)) unlockedNow.push(id);
  }

  return unlockedNow;
}

export function getActiveUnlockedSetIdsForRoster(GameState, rosterMovieIds = []) {
  ensureMatineeState(GameState);
  const matched = getMatchedSetIds(rosterMovieIds);
  return matched.filter((id) => !!GameState.matinee?.unlockedSets?.[id]);
}

export function getUnlockedSetDefs(GameState) {
  ensureMatineeState(GameState);
  const order = GameState.matinee.setUnlockOrder || [];
  const byId = new Map(EXTRA_MOVIE_SET_DEFS.map((d) => [d.id, d]));
  const out = [];
  for (const id of order) {
    const def = byId.get(id);
    if (def) out.push(def);
  }
  return out;
}
