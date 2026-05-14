# 🎬 Movie RPG – Campaign Progression & Badge System (v2)

---

## Overview

This system defines how players grow, make decisions, and customize their team during a campaign.

It is built around **four core layers**:

1. XP (Passive Growth)
2. Tickets (Intermission Currency)
3. Badges (Awards + Budget)
4. Item Combos (Consumables + Reusables)

All progression is **campaign-contained** and resets between runs.

---

# 1️⃣ XP System (Passive Growth) (Already Implemented so no need to touch)

## Purpose

Provides automatic stat scaling during a campaign.

## Rules

* Earned from battles
* No player interaction required
* Improves base stats (HP, ATK, etc.)
* Resets at campaign start

## Design Intent

XP represents **momentum**, not long-term progression.

---

# 2️⃣ Ticket System (Intermission Currency)

## Purpose

Drives player decisions between battles.

## Earning Tickets

* Completing Level N grants:

> **Tickets = Level × 2**

Examples:

* Level 1 → 2 Tickets
* Level 5 → 10 Tickets
* Level 10 → 20 Tickets

## Usage

Tickets are spent at **Intermission** to:

* Select items
* Change Budget
* Trigger special events (Awards, rerolls, etc.)

## Restrictions

* Limited spending per intermission (recommended: 1–2)
* Do not persist beyond campaign

---

# 3️⃣ Badge System (Equipment)

Each Movie has two slots:

```
[ 🎖️ Award ]   [ 💰 Budget ]
```

---

## 🎖️ Awards (Prestige Slot)

### Purpose

High-impact, risky power boosts tied to a specific Movie.

### Characteristics

* Attached to one Movie
* Lost on defeat
* Not persistent across campaigns
* Cannot be freely swapped
* Only modified at intermission or special events

---

## Award Prestige Tiers

### 🟢 Tier 1 – Minor Awards (Common)
* Festival Buzz → +5% ATK
* Critics’ Nod → +5% crit chance
* Soft Spotlight → 5% damage reduction
* Tight Cut → small cooldown reduction
* Underground Praise → +5% SPD
* Word of Mouth → small HP regen per turn
### 🟡 Tier 2 – Notable Awards (Uncommon)
* Breakout Performance → Crit chance + initiative boost
* Audience Favorite → Heal small amount each turn
* Best Stunts → First large hit reduced significantly
* Best Makeup → Negate first debuff each battle
* Best Editing → Moderate cooldown reduction
* Best Supporting Cast → 10% damage reduction
* Scene Stealer → First action deals bonus damage
### 🔴 Tier 3 – Major Awards (Rare)
* Best Picture → ATK + SPD + damage smoothing
* Best Director → Special moves deal increased damage
* Career-Defining Role → Revive once at low HP
* Cult Classic → Gains power each battle survived
* Festival Legend → Increased stats + immunity to first status
* Oscar Sweep → Massive stat boost, slight drawback

---

## Award Distribution (Option C System)

Awards are not immediately assigned.

Instead, they are stored as:

> 🎬 **Pending Award Opportunities**

### Sources

* Battle rewards (low chance, usually Tier 1)
* Boss fights (higher tiers)
* Intermission events
* Special triggers

### Behavior

* Stored until next Intermission
* Appear as an **extra selectable option**
* Player chooses whether to claim them

### Expiration

* If not selected at intermission → **discarded**

---

## Award Rules

* Only one Award per Movie
* No mid-battle changes
* Reassignment requires special actions (Tickets/events)

---

## 💰 Budget Slot (Support Slot)

### Purpose

Provides stable, campaign-long stat support.

### Characteristics

* Not lost on defeat
* Swappable at intermission
* Represents financial backing and production quality

---

## Budget Prestige Tiers

### 🟢 Tier 1 – Standard Budgets (Common)

* Increased Production Budget → +ATK +HP
* Expanded Marketing Campaign → +SPD + initiative
* Awards Season Push → small cooldown reduction
* International Distribution → status resistance
* Streaming Deal → small passive healing

### 🟡 Tier 2 – Department Budgets (Uncommon)

* Costume Department Budget → evasion + resistance
* Props Department Budget → ATK + crit chance
* Sound Department Budget → SPD + turn priority
* Lighting Department Budget → accuracy + crit chance
* Camera Department Budget → targeting precision + combo bonus
* Editing Department Budget → cooldown reduction + faster turns

### 🔴 Tier 3 – Premium Budgets (Rare)

* Director’s Cut Funding → specials significantly stronger
* Festival Circuit Budget → increased XP + Award chance
* Reshoot Allocation → reroll one action per battle
* Test Screening Budget → preview enemy actions
* Composer Upgrade → buffs last longer / passive team aura

---

## Budget Rules

* Budgets are **unlocked options**, not inventory
* Once unlocked → available for rest of campaign
* Only one Budget active per Movie

---

# 4️⃣ Item Combo System (Intermission Picks)

## Purpose

Provide short-term tactical tools. A combination of items that match the theme provided. Items that are used in-game are already incorporated and only need the combos to be made.

---

## 🍿 Combos


Examples:
 
* Family Popcorn Combo

  * 2 Jumbo Popcorns
  * 5 Small Soda

* Nacho Combo

  * 2 Nacho Bombs
  * 3 Large Sodas

* Broken Soda Machine

  * Soda Launcher
  * 5 Large Sodas
  * Combo unlocked upon Level 2 Completion

---

# 5️⃣ Intermission Flow

After each level:

1. Player receives Tickets
2. Player sees a **small set of options**:
   * Item Combos
   * Budget changes
   * Pending Award Opportunities
3. Player spends limited Tickets
4. Unused Award Opportunities expire
5. Next battle begins

---

# 6️⃣ Reward Structure Summary

### Battle Rewards

* Chance for:
  * Award unlock
  * Budget unlock
  * Items
* Chance for Items go up as the Levels progress. In addition, certain awards are only able to be included in the chance pool after a certain level threshold.

### Intermission

* Main decision hub

### Boss / Milestones

* Higher-tier Awards
* Rare Budgets

---

# 7️⃣ Design Principles

### Clarity

* Two slots only
* No inventory clutter

### Separation of Roles

* Items → immediate problems
* Awards → prevent disasters
* Budget → improve performance

### Flow Control

* Battles = fast
* Intermission = decisions

### Intermission System Flow

* Battle is Won (Still in Battle Screen)
* Battle Reward Screen (Depends on Chance)
    * Chance for Award/Budget Badge or Item Combo is obtained. If the RNG does not hit, then no screen is shown and immediately continue onto intermission screen.
* Intermission Screen
    * Choices are displayed on top half of the screen
    * Bottom Half of screen includes all 4 actors and what badges (Awards/Budgets) are assigned to each
* Once Intermission is finished and the player is ready, continue the flow into the Level Intro Screen

---

# Final Design Sentence

> **Battles introduce variation.**
> **Intermission defines direction.**

---
