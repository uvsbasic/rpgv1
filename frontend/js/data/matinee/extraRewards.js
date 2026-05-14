// frontend/js/data/matinee/extraRewards.js

export const EXTRA_SET_REWARDS = {
  classic_oscar_sweep: { universal: { awardsChanceBoost: 0.1 }, active: { consecutiveStatBoostPct: 0.04 } },
  slasher_icons: { universal: { horrorAttackBoostPct: 0.03 }, active: { flatAttackBoostPct: 0.15 } },
  absurdist_comedy_essentials: { universal: { randomEffectChance: 0.05 }, active: { randomEffectChance: 0.2 } },
  two_thousands_comedies: { universal: { debuffPowerPct: 0.04 }, active: { debuffPowerPct: 1.0 } },
  classic_adventures: { universal: { buffPowerPct: 0.04 }, active: { teamStrikeChance: 0.1 } },
  broadway_big_screen: { universal: { musicalRepeatMoveChance: 0.2 }, active: { teamAttackChance: 0.2 } },
  land_of_oz: { universal: { ozStatBoostPct: 0.1 }, active: { round1BoostPct: 1.0, round2BoostPct: 0.4 } },
  heros_fanfare: { universal: { adventureStatBoostPct: 0.08 }, active: { bonusTeamAttackChance: 0.2 } },
  true_avatar_apologist: { universal: {}, active: { betweenBattleHpBoostPct: 0.1, specialScalingPerBattlePct: 0.1 } },
  pta_fanboy: { universal: { lateRoundStatGrowth: true }, active: { defenseScalingPerBattle: true } },
  spielberg_touch: { universal: { critBuffProcChance: 0.4 }, active: { roundHeal: true, teamAttackChance: 0.2 } },
  lynchian: { universal: { effectPowerPct: 0.1, effectDurationPct: 0.2 }, active: { invertNegativeChance: 0.2 } },
  prince_of_darkness_set: { universal: {}, active: { lifeSiphonChance: 0.3, critChanceBoost: 0.08 } },
  the_studio: { universal: { animationStatBoostPct: 0.08 }, active: { scaleDamageAcrossRun: true, scaleHealingAcrossRun: true } },
  king_of_the_hill: { universal: { comedyDefenseBoostPct: 0.5 }, active: { damageVariance: 0.05, damageBoostPct: 0.25 } }
};
