// frontend/js/data/matinee/bonusSpecialsLoadout.js
import { BONUS_SPECIALS_BY_MOVIE } from "./bonusSpecials.js";

export function getBonusSpecialsForMovieId(movieId) {
  const id = String(movieId || "");
  return Array.isArray(BONUS_SPECIALS_BY_MOVIE[id]) ? BONUS_SPECIALS_BY_MOVIE[id] : [];
}
