// frontend/js/data/enemies/enemyMoves.js
//
// Registry of enemy moves.
// Each move is a small definition with an effect key + some numbers.
// Keep moves data-driven so enemies can share them.

export const enemyMoves = {
  basic_attack: {
    id: "basic_attack",
    name: "Attack",
    kind: "attack",
    powerMultiplier: 1.0,
    weight: 70
  },

  heavy_attack: {
    id: "heavy_attack",
    name: "Heavy Attack",
    kind: "attack",
    powerMultiplier: 1.35,
    weight: 25,
    lines: {
      attackNormal: "{enemyName} winds up a {moveName} and smashes {targetName} for {totalDmg}.",
      attackCrit: "{enemyName}'s {moveName} crashes down! CRITICAL on {targetName} for {totalDmg}!"
    }
  },

  wild_swing: {
    id: "wild_swing",
    name: "Wild Swing",
    kind: "attack",
    powerMultiplier: 0.85,
    weight: 35,
    lines: {
      attackNormal: "{enemyName} flails with {moveName} and clips {targetName} for {totalDmg}.",
      confusedWildMiss: "{enemyName} goes for a {moveName}... and wildly whiffs."
    }
  },

  choice: {
    id: "choice",
    name: "That Was a Choice...",
    kind: "attack",
    powerMultiplier: 5.0,
    weight: 20,
    lines: {
      attackNormal:{ 
        lines: [
          "{enemyName} looks over your work.", "\"That was certainly a choice...\"", 
          "{targetName} is deeply affected.", "{totalDmg} damage is dealt!" ],
        effectLineIndex: 2},
      attackCrit:{ 
        lines: [
          "{enemyName} looks over your work.", "\"That was a BOLD choice...\"", 
          "\"Is it supposed to look like that\"", "{targetName} is DEEPLY affected.", "{totalDmg} damage is dealt!" ],
        effectLineIndex: 3},
      attackMortal:{ 
        lines: [
          "{enemyName} looks over your work.", "\"That was certainly a choice...\"", 
          "\"Is it supposed to look like that\"", "{targetName} is DEEPLY affected", "{totalDmg} of MORTAL damage is dealt!" ],
        effectLineIndex: 3},
      missDazed: "{enemyName} attempts to critique... but loses the thread and misses.",
      confusedMisfire: "{enemyName} tries to critique, then second-guesses everything.",
      confusedWildMiss: "{enemyName} overcommits to his critiques and misses by a mile.",
      confusedLowAccHit: "{enemyName} mutters \"interesting choice\"."
    }
  }
};
