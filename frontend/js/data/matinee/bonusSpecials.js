// frontend/js/data/matinee/bonusSpecials.js
//
// Bonus specials are ONLY non-page-0 signature pages.
// Base/default page-0 specials stay in data/specials.js.

export const BONUS_SPECIAL_PAGES_BY_MOVIE = {
  office_space: {
    pages: [
      [
        {
          id: "office_space_red_stapler",
          name: "Red Stapler",
          description: "An oddly comforting fixation heals you.",
          kind: "healSelf",
          target: "self",
          amount: 55,
          cooldownTurns: 3
        },
        {
          id: "office_space_passive_resistance",
          name: "Passive Resistance",
          description: "You simply stop caring. The enemy's attacks lose impact.",
          kind: "debuffEnemy",
          target: "enemy",
          defDebuffPct: 0.3,
          defDebuffTurns: 2,
          cooldownTurns: 4
        },
        {
          id: "office_space_corporate_restructuring",
          name: "Corporate Restructuring",
          description: "Slash inefficiencies-at a personal cost.",
          kind: "damageEnemy",
          target: "enemy",
          powerMultiplier: 4.2,
          selfDefDebuffPct: 0.15,
          selfDefDebuffTurns: 2,
          cooldownTurns: 5
        }
      ],
      [
        {
          id: "office_space_monday_morning",
          name: "Case of the Mondays",
          description: "Crushing dread slows the enemy's next move.",
          kind: "statusEnemy",
          target: "enemy",
          status: "dazed",
          chance: 1,
          turns: 1,
          nextHitVulnActive: true,
          nextHitVulnPct: 0.5,
          nextHitVulnTurns: 1,
          cooldownTurns: 4
        },
        {
          id: "office_space_flair_compliance",
          name: "Flair Compliance",
          description: "Mandatory positivity boosts team performance.",
          kind: "buffParty",
          target: "team",
          atkBuffPct: 0.2,
          atkBuffTurns: 2,
          cooldownTurns: 4
        },
        {
          id: "office_space__micromanage",
          name: "Yeeaaaaaaaaaahhhhhhhhhh...",
          description: "A soul-crushing remark hits the enemy hard.",
          kind: "damageEnemy",
          target: "enemy",
          powerMultiplier: 5,
          cooldownTurns: 4
        }
      ]
    ],
    pageMeta: [{ includeGenre: false }, { includeGenre: false }]
  },
  this_is_spinal_tap: {
    pages: [
      [
        {
          id: "stonehenge",
          name: "Stonehenge",
          description: "The stage spectacle goes hilariously wrong, throwing the enemy off-balance.",
          kind: "ENEMY_DEBUFF",
          target: "enemy",
          atkPct: 0.2,
          defPct: 0.15,
          turns: 2,
          cooldownTurns: 4
        },
        {
          id: "none_more_black",
          name: "None More Black",
          description: "An aggressively dark aesthetic boosts your presence and poise.",
          kind: "SELF_BUFF",
          target: "self",
          atkPct: 0.2,
          defPct: 0.2,
          turns: 2,
          cooldownTurns: 3
        },
        {
          id: "spinal_tap_combustion",
          name: "Spontaneous Combustion",
          description: "A drummer meets a tragic rock-and-roll fate.",
          kind: "damageEnemy",
          target: "enemy",
          powerMultiplier: 1.95,
          cooldownTurns: 4
        }
      ]
    ],
    pageMeta: [{ includeGenre: false }]
  },
  howls_moving_castle: {
    pages: [
      [
        {
          id: "calcifers_flare",
          name: "Calcifer's Flare",
          description: "Calcifer surges-hot enough to melt resolve.",
          kind: "damageEnemy",
          target: "enemy",
          powerMultiplier: 4.2,
          cooldownTurns: 4
        },
        {
          id: "howls_heart",
          name: "Howl's Heart",
          description: "A vow of warmth and magic restores what was lost.",
          kind: "healAllyMissingPct",
          target: "ally",
          missingHealPct: 0.8,
          revivePct: 0.8,
          cooldownTurns: 5
        },
        {
          id: "witch_of_the_waste",
          name: "Witch of the Waste",
          description: "A lingering curse saps the enemy's strength and guard.",
          kind: "ENEMY_DEBUFF",
          target: "enemy",
          atkPct: 0.2,
          defPct: 0.2,
          turns: 2,
          cooldownTurns: 2
        }
      ]
    ],
    pageMeta: [{ includeGenre: false }]
  },
  purple_rain: {
    pages: [
      [
        {
          id: "purple_rain_darling_nikki",
          name: "Darling Nikki",
          description: "A dangerous confession leaves enemies exposed!",
          kind: "dualEffect",
          cooldownTurns: 3,
          effects: [
            { kind: "damageEnemy", target: "enemy", powerMultiplier: 1.75 },
            { kind: "STATUS", target: "enemy", status: "stun", turns: 1, chance: 0.4 }
          ]
        },
        {
          id: "purple_rain_jungle_love",
          name: "Jungle Love",
          description: "Unfiltered funk and swagger overwhelm the enemy's senses.",
          kind: "dualEffect",
          cooldownTurns: 3,
          effects: [
            { kind: "damageEnemy", target: "enemy", powerMultiplier: 1.6 },
            {
              kind: "STATUS",
              target: "enemy",
              status: "confused",
              turns: 3,
              chance: 0.8,
              confuseProcChance: 0.35,
              confuseClearChance: 0.25,
              confuseRampProc: 0.1,
              confuseRampClear: 0.1
            }
          ]
        },
        {
          id: "purple_rain_lake_minnetonka",
          name: "The Waters of Lake Minnetonka",
          description: "A legendary ritual restores what was lost.",
          kind: "healAllyMissingPct",
          target: "ally",
          missingHealPct: 0.75,
          revivePct: 0.75,
          cooldownTurns: 4
        }
      ],
      [
        {
          id: "purple_rain_first_avenue",
          name: "First Avenue Showstopper",
          description: "A legendary First Avenue performance leaves the crowd breathless and the enemy stunned.",
          kind: "STATUS",
          target: ["enemy"],
          status: "stun",
          turns: 2,
          chance: 1,
          cooldownTurns: 5
        },
        {
          id: "purple_rain_sex_shooter",
          name: "Sex Shooter",
          description: "A provocative distraction throws the enemy completely off their game.",
          kind: "dualEffect",
          cooldownTurns: 3,
          effects: [
            { kind: "damageEnemy", target: "enemy", powerMultiplier: 2 },
            { kind: "STATUS", target: "enemy", status: "dazed", turns: 2, chance: 0.8 }
          ]
        },
        {
          id: "purple_rain_purple_rain",
          name: "Purple Rain",
          description: "A cathartic storm cleanses the mind and soul.",
          kind: "healTeamMissingPct",
          target: "team",
          missingHealPct: 0.75,
          cooldownTurns: 5
        }
      ]
    ],
    pageMeta: [{ includeGenre: false }, { includeGenre: false }]
  },
  harry_potter_2001: {
    pages: [
      [
        {
          id: "expelliarmus",
          name: "Expelliarmus",
          description: "Disarms the enemy, throwing off their rhythm and lowering their attack.",
          kind: "ENEMY_DEBUFF",
          target: "enemy",
          atkPct: 0.25,
          defPct: 0.0,
          turns: 2,
          cooldownTurns: 4
        },
        {
          id: "protego",
          name: "Protego",
          description: "A protective barrier that hardens your defenses for a few turns.",
          kind: "SELF_BUFF",
          target: "self",
          atkPct: 0.0,
          defPct: 0.3,
          turns: 2,
          cooldownTurns: 3
        },
        {
          id: "sorting_hat",
          name: "Sorting Hat",
          description: "Finds your house confidence-boosting both poise and presence.",
          kind: "SELF_BUFF",
          target: "self",
          atkPct: 0.15,
          defPct: 0.15,
          turns: 3,
          cooldownTurns: 4
        }
      ]
    ],
    pageMeta: [{ includeGenre: false }]
  },
  love_and_mercy: {
    pages: [
      [
        {
          id: "pet_sounds",
          name: "Pet Sounds",
          description: "Layer by layer, you build something perfect-boosting your offense.",
          kind: "SELF_BUFF",
          target: "self",
          atkPct: 0.25,
          defPct: 0.0,
          turns: 2,
          cooldownTurns: 3
        },
        {
          id: "god_only_knows",
          name: "God Only Knows",
          description: "It's a love song...AND a suicide note!",
          kind: "dualEffect",
          cooldownTurns: 4,
          effects: [
            { kind: "healAllyMissingPct", target: "ally", missingHealPct: 0.55, revivePct: 0.55 },
            { kind: "damageEnemy", target: "enemy", powerMultiplier: 1.45 }
          ]
        },
        {
          id: "surfs_up",
          name: "Surf's Up",
          description: "A children's song that flows into a spiritual awakening of the mind and soul, allowing you to give yourself to god.",
          kind: "healSelfMissingPct",
          target: "self",
          missingHealPct: 0.9,
          cooldownTurns: 5
        }
      ]
    ],
    pageMeta: [{ includeGenre: false }]
  },
  steve_jobs_2015: {
    pages: [
      [
        {
          id: "product_vision",
          name: "Product Vision",
          description: "Locks in the endgame-boosting your attack for the next exchange.",
          kind: "SELF_BUFF",
          target: "self",
          atkPct: 0.3,
          defPct: 0.0,
          turns: 2,
          cooldownTurns: 3
        },
        {
          id: "kill_your_darlings",
          name: "Kill Your Darlings",
          description: "You cut what doesn't matter. Momentum stalls, and only the essentials remain.",
          kind: "STATUS",
          target: ["enemy"],
          status: "cooldown_lock",
          turns: 2,
          chance: 1,
          nextHitVulnActive: true,
          nextHitVulnPct: 0.35,
          nextHitVulnTurns: 2,
          cooldownTurns: 5
        },
        {
          id: "the_orchestra",
          name: "Play The Orchestra",
          description: "You conduct the moment. Every part locks in at once-your entire team surges forward in perfect sync.",
          kind: "dualEffect",
          cooldownTurns: 5,
          effects: [
            { kind: "buffParty", target: "team", atkPct: 0.3, defPct: 0.25, turns: 2 },
            { kind: "teamStrike", target: "enemy", totalMinMult: 1.6, totalMaxMult: 2.6 }
          ]
        }
      ]
    ],
    pageMeta: [{ includeGenre: false }]
  }
};
