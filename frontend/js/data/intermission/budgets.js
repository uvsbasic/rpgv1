// frontend/js/data/intermission/budgets.js
// Budget badges that persist as unlocked options during a campaign.

export const BUDGETS = [
  // Tier 1 - Standard Budgets (Common)
  { id: "increased_production_budget", name: "Increased Production Budget", atkPct: 0.08, maxHpPct: 0.08 },
  { id: "expanded_marketing_campaign", name: "Expanded Marketing Campaign", critChanceFlat: 0.02, defPct: 0.04 },
  { id: "awards_season_push", name: "Awards Season Push", atkPct: 0.05, defPct: 0.05 },
  { id: "international_distribution", name: "International Distribution", maxHpPct: 0.1 },
  { id: "streaming_deal", name: "Streaming Deal", defPct: 0.07 },

  // Tier 2 - Department Budgets (Uncommon)
  { id: "costume_department_budget", name: "Costume Department Budget", tier: 2, evasionPct: 0.08, statusResistPct: 0.1 },
  { id: "props_department_budget", name: "Props Department Budget", tier: 2, atkPct: 0.06, critChanceFlat: 0.03 },
  { id: "sound_department_budget", name: "Sound Department Budget", tier: 2, speedPct: 0.1, turnPriorityBonus: 1 },
  { id: "lighting_department_budget", name: "Lighting Department Budget", tier: 2, accuracyPct: 0.08, critChanceFlat: 0.03 },
  { id: "camera_department_budget", name: "Camera Department Budget", tier: 2, targetingPrecisionPct: 0.1, comboBonusPct: 0.1 },
  { id: "editing_department_budget", name: "Editing Department Budget", tier: 2, cooldownReductionPct: 0.12, speedPct: 0.06 },

  // Tier 3 - Premium Budgets (Rare)
  { id: "directors_cut_funding", name: "Director's Cut Funding", tier: 3, specialDamagePct: 0.18 },
  { id: "festival_circuit_budget", name: "Festival Circuit Budget", tier: 3, xpGainPct: 0.15, awardChanceBonusPct: 0.1 },
  { id: "reshoot_allocation", name: "Reshoot Allocation", tier: 3, rerollOneActionPerBattle: true },
  { id: "test_screening_budget", name: "Test Screening Budget", tier: 3, previewEnemyAction: true },
  { id: "composer_upgrade", name: "Composer Upgrade", tier: 3, buffDurationBonusTurns: 1, teamAuraPct: 0.05 }
];
