// frontend/js/data/matinee/bonusSpecialsLoadout.js
import { BONUS_SPECIAL_PAGES_BY_MOVIE } from "./bonusSpecials.js";

function asPages(entry) {
  if (!entry || typeof entry !== "object") return [];
  if (Array.isArray(entry.pages)) return entry.pages.map((p) => (Array.isArray(p) ? [...p] : []));
  if (entry.id) return [[entry]];
  return [];
}

function asPageMeta(entry, pageCount) {
  if (entry && Array.isArray(entry.pageMeta) && entry.pageMeta.length > 0) {
    return entry.pageMeta.map((m) => (m && typeof m === "object" ? { ...m } : { includeGenre: true }));
  }
  return new Array(pageCount).fill(0).map(() => ({ includeGenre: true }));
}

export function buildSpecialsMapWithBonusPages(baseSpecials) {
  const merged = { ...(baseSpecials || {}) };
  const ids = Object.keys(BONUS_SPECIAL_PAGES_BY_MOVIE || {});
  for (const id of ids) {
    const bonus = BONUS_SPECIAL_PAGES_BY_MOVIE[id];
    if (!bonus) continue;

    const baseEntry = merged[id] || null;
    const basePages = asPages(baseEntry);
    const baseMeta = asPageMeta(baseEntry, basePages.length);

    const bonusPages = asPages(bonus);
    const bonusMeta = asPageMeta(bonus, bonusPages.length);

    merged[id] = {
      pages: [...basePages, ...bonusPages],
      pageMeta: [...baseMeta, ...bonusMeta]
    };
  }
  return merged;
}

// Kept for compatibility with specialSystem import path.
// Bonus specials are now page-based and merged through buildSpecialsMapWithBonusPages.
export function getBonusSpecialsForMovieId(_movieId) {
  return [];
}
