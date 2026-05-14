// frontend/js/data/intermission/awards.js
// Award badges unlocked as pending opportunities and assigned at intermission.

export const AWARDS = [
  // Tier 1 - Minor Awards (Common)
  { id: "festival_buzz", name: "Festival Buzz", tier: 1, atkPct: 0.05 },
  { id: "critics_nod", name: "Critics' Nod", tier: 1, critChanceFlat: 0.05 },
  { id: "soft_spotlight", name: "Soft Spotlight", tier: 1, defPct: 0.05 },
  { id: "tight_cut", name: "Tight Cut", tier: 1, cooldownReductionPct: 0.08 },
  { id: "underground_praise", name: "Underground Praise", tier: 1, speedPct: 0.05 },
  { id: "word_of_mouth", name: "Word of Mouth", tier: 1, regenPctPerTurn: 0.03 },

  // Tier 2 - Notable Awards (Uncommon)
  { id: "breakout_performance", name: "Breakout Performance", tier: 2, critChanceFlat: 0.08, atkPct: 0.04 },
  { id: "audience_favorite", name: "Audience Favorite", tier: 2, maxHpPct: 0.1 },
  { id: "best_stunts", name: "Best Stunts", tier: 2, firstBigHitReductionPct: 0.45 },
  { id: "best_makeup", name: "Best Makeup", tier: 2, negateFirstDebuff: true },
  { id: "best_editing", name: "Best Editing", tier: 2, cooldownReductionPct: 0.16 },
  { id: "best_supporting_cast", name: "Best Supporting Cast", tier: 2, defPct: 0.1 },
  { id: "scene_stealer", name: "Scene Stealer", tier: 2, firstActionBonusDmgPct: 0.35 },

  // Tier 3 - Major Awards (Rare)
  { id: "best_picture", name: "Best Picture", tier: 3, atkPct: 0.1, defPct: 0.1, maxHpPct: 0.1 },
  { id: "best_director", name: "Best Director", tier: 3, atkPct: 0.14 },
  { id: "career_defining_role", name: "Career-Defining Role", tier: 3, maxHpPct: 0.16, defPct: 0.08 },
  { id: "cult_classic", name: "Cult Classic", tier: 3, powerPerBattleSurvivedPct: 0.04 },
  { id: "festival_legend", name: "Festival Legend", tier: 3, atkPct: 0.08, defPct: 0.08, maxHpPct: 0.08, immuneFirstStatus: true },
  { id: "oscar_sweep", name: "Oscar Sweep", tier: 3, atkPct: 0.18, defPct: 0.1, maxHpPct: 0.14, drawbackTakenDamagePct: 0.06 }
];
