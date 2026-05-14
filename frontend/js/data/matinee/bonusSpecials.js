import { EXTRA_MOVIE_SET_DEFS } from "./extraDefined.js";
import { movieMeta } from "../movieMeta.js";

function buildDefaultBonusSpecial(movieId) {
  const genre = String(movieMeta?.[movieId]?.primaryGenre || "").toUpperCase();
  const pretty = String(movieId || "movie").replaceAll("_", " ");
  const name = pretty
    .split(" ")
    .map((w) => (w ? `${w[0].toUpperCase()}${w.slice(1)}` : w))
    .join(" ");

  if (genre === "HORROR" || genre === "THRILLER") {
    return {
      id: `${movieId}_bonus_dread_mark`,
      name: `${name}: Dread Mark`,
      kind: "ENEMY_DEBUFF",
      atkPct: 0.12,
      defPct: 0.12,
      turns: 2,
      target: ["enemy"]
    };
  }
  if (genre === "COMEDY" || genre === "MUSICAL") {
    return {
      id: `${movieId}_bonus_ensemble`,
      name: `${name}: Ensemble Pop`,
      kind: "buffParty",
      atkPct: 0.12,
      defPct: 0.08,
      turns: 2,
      target: ["team"]
    };
  }
  if (genre === "ANIMATION" || genre === "FANTASY") {
    return {
      id: `${movieId}_bonus_guardlight`,
      name: `${name}: Guardlight`,
      kind: "SELF_BUFF",
      defPct: 0.2,
      shieldPct: 0.12,
      turns: 2,
      target: ["self"]
    };
  }
  if (genre === "DRAMA" || genre === "ROMANCE") {
    return {
      id: `${movieId}_bonus_rebound`,
      name: `${name}: Rebound`,
      kind: "healSelfMissingPct",
      missingHealPct: 0.35,
      target: ["self"]
    };
  }
  return {
    id: `${movieId}_bonus_finisher`,
    name: `${name}: Finisher`,
    kind: "damageEnemy",
    powerMultiplier: 1.85,
    target: ["enemy"]
  };
}

const explicit = {
  the_wiz: [{ id: "wiz_rhythm_surge", name: "Rhythm Surge", kind: "buffParty", atkPct: 0.15, defPct: 0.08, turns: 2, target: ["team"] }],
  paprika: [{ id: "dream_bleed", name: "Dream Bleed", kind: "ENEMY_DEBUFF", atkPct: 0.12, defPct: 0.12, turns: 2, target: ["enemy"] }],
  iron_man_3: [{ id: "house_party", name: "House Party Protocol", kind: "damageEnemy", powerMultiplier: 1.9, target: ["enemy"] }],
  prince_of_darkness: [{ id: "darkness_siphon", name: "Darkness Siphon", kind: "healSelfMissingPct", missingHealPct: 0.35, target: ["self"] }]
};

function getSetMovieIds() {
  const out = new Set();
  for (const def of EXTRA_MOVIE_SET_DEFS) {
    for (const id of def.movieIds || []) out.add(String(id));
    for (const either of def.eitherSlots || []) {
      for (const id of either.options || []) out.add(String(id));
    }
    for (const anyGroup of def.anyOfGroups || []) {
      for (const id of anyGroup || []) out.add(String(id));
    }
  }
  return out;
}

function buildBonusRegistry() {
  const out = { ...explicit };
  for (const id of getSetMovieIds()) {
    if (!id) continue;
    if (!out[id]) out[id] = [buildDefaultBonusSpecial(id)];
  }
  return out;
}

// Secondary/bonus specials keyed by movie id.
// This is additive to existing signature specials in data/specials.js.
export const BONUS_SPECIALS_BY_MOVIE = buildBonusRegistry();
