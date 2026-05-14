// frontend/js/systems/intermissionSystem.js

import { items } from "../data/items.js";
import { ITEM_COMBOS } from "../data/intermission/itemCombos.js";
import { BUDGETS } from "../data/intermission/budgets.js";
import { AWARDS } from "../data/intermission/awards.js";

const DEFAULT_BUDGET_ID = String(BUDGETS?.[0]?.id || "increased_production_budget");

function warnDuplicateIds(label, entries) {
  const list = Array.isArray(entries) ? entries : [];
  const seen = new Set();
  const dupes = new Set();
  for (const entry of list) {
    const id = String(entry?.id || "").trim();
    if (!id) continue;
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  if (dupes.size > 0) {
    // Data warning only; never throws so gameplay continues.
    console.warn(`[intermission] Duplicate ${label} id(s): ${Array.from(dupes).join(", ")}`);
  }
}

function runIntermissionDataValidation() {
  warnDuplicateIds("award", AWARDS);
  warnDuplicateIds("budget", BUDGETS);
  warnDuplicateIds("itemCombo", ITEM_COMBOS);
}

runIntermissionDataValidation();

function pickOne(arr) {
  if (!Array.isArray(arr) || arr.length <= 0) return null;
  return arr[Math.floor(Math.random() * arr.length)] || null;
}

function normalizeInventoryEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const counts = new Map();
  for (const entry of entries) {
    const id = String(entry?.id || "");
    const count = Math.max(0, Math.floor(Number(entry?.count || 0)));
    if (!id || count <= 0 || !items[id]) continue;
    counts.set(id, (counts.get(id) || 0) + count);
  }
  return Array.from(counts.entries()).map(([id, count]) => ({ id, count }));
}

export function ensureCampaignIntermissionState(GameState) {
  if (!GameState.campaign) GameState.campaign = {};
  const c = GameState.campaign;
  if (!c.effects) c.effects = { first: null, fourth: null };
  if (!c.flavor) c.flavor = {};
  if (!c.runtime) c.runtime = {};
  if (!c.intermission) c.intermission = {};
  if (!Array.isArray(c.inventory)) c.inventory = [];
  if (!Number.isFinite(c.tickets)) c.tickets = 0;
  if (!Array.isArray(c.pendingAwardOpportunities)) c.pendingAwardOpportunities = [];
  if (!Array.isArray(c.unlockedBudgets) || c.unlockedBudgets.length <= 0) {
    c.unlockedBudgets = [DEFAULT_BUDGET_ID];
  }
  if (!c.badges || typeof c.badges !== "object") c.badges = {};
  if (!c.badges.awards) c.badges.awards = {};
  if (!c.badges.budgets) c.badges.budgets = {};
  if (!Array.isArray(c.pendingBattleRewards)) c.pendingBattleRewards = [];
  if (!Number.isFinite(c.intermission.spentCount)) c.intermission.spentCount = 0;
}

export function addInventoryEntries(GameState, newEntries) {
  ensureCampaignIntermissionState(GameState);
  const merged = normalizeInventoryEntries([...(GameState.campaign.inventory || []), ...(newEntries || [])]);
  GameState.campaign.inventory = merged;
}

export function getItemCombosForLevel(level) {
  const lv = Math.max(1, Math.floor(Number(level || 1)));
  return ITEM_COMBOS.filter((c) => lv >= c.minLevel);
}

function rollTier(level) {
  if (level >= 7) {
    const r = Math.random();
    if (r < 0.18) return 3;
    if (r < 0.56) return 2;
    return 1;
  }
  if (level >= 4) {
    return Math.random() < 0.3 ? 2 : 1;
  }
  return 1;
}

function getAwardsByTier(tier) {
  return AWARDS.filter((a) => a.tier === tier);
}

export function rollBattleRewards(GameState, completedLevel) {
  ensureCampaignIntermissionState(GameState);
  const level = Math.max(1, Math.floor(Number(completedLevel || 1)));
  const rewards = [];

  const itemChance = Math.min(0.65, 0.22 + (level * 0.04));
  const budgetChance = Math.min(0.4, 0.1 + (level * 0.02));
  const awardChance = Math.min(0.5, 0.12 + (level * 0.03));

  if (Math.random() < itemChance) {
    const combos = getItemCombosForLevel(level);
    const combo = pickOne(combos);
    if (combo) {
      addInventoryEntries(GameState, combo.items);
      rewards.push({ type: "item_combo", comboId: combo.id, name: combo.name });
    }
  }

  if (Math.random() < budgetChance) {
    const locked = BUDGETS.filter((b) => !(GameState.campaign.unlockedBudgets || []).includes(b.id));
    const unlocked = pickOne(locked);
    if (unlocked) {
      GameState.campaign.unlockedBudgets.push(unlocked.id);
      rewards.push({ type: "budget_unlock", budgetId: unlocked.id, name: unlocked.name });
    }
  }

  if (Math.random() < awardChance) {
    const tier = rollTier(level);
    const award = pickOne(getAwardsByTier(tier));
    if (award) {
      GameState.campaign.pendingAwardOpportunities.push(award.id);
      rewards.push({ type: "award_opportunity", awardId: award.id, name: award.name, tier });
    }
  }

  GameState.campaign.pendingBattleRewards = rewards;
  return rewards;
}

export function grantIntermissionTickets(GameState, completedLevel) {
  ensureCampaignIntermissionState(GameState);
  const level = Math.max(1, Math.floor(Number(completedLevel || 1)));
  GameState.campaign.tickets += (level * 2);
  GameState.campaign.intermission.spentCount = 0;
}

export function getBudgetById(id) {
  return BUDGETS.find((b) => b.id === id) || null;
}

export function getAwardById(id) {
  return AWARDS.find((a) => a.id === id) || null;
}

export function getBadgeName(type, id) {
  if (!id) return "None";
  return type === "award" ? (getAwardById(id)?.name || "Unknown Award") : (getBudgetById(id)?.name || "Unknown Budget");
}

export function applyCampaignBadgesToParty(GameState, party) {
  ensureCampaignIntermissionState(GameState);
  const awardsMap = GameState.campaign.badges.awards || {};
  const budgetsMap = GameState.campaign.badges.budgets || {};
  const members = Array.isArray(party) ? party : [];

  for (const actor of members) {
    const movieId = String(actor?.movie?.id || "");
    if (!movieId || !actor) continue;

    const award = getAwardById(awardsMap[movieId]);
    const budget = getBudgetById(budgetsMap[movieId]);
    const effects = [award, budget].filter(Boolean);

    for (const eff of effects) {
      if (Number.isFinite(eff.atkPct)) actor.atk = Math.max(1, Math.round(actor.atk * (1 + eff.atkPct)));
      if (Number.isFinite(eff.defPct)) actor.def = Math.max(1, Math.round(actor.def * (1 + eff.defPct)));
      if (Number.isFinite(eff.maxHpPct)) {
        const hpBefore = Number(actor.maxHp || 1);
        actor.maxHp = Math.max(1, Math.round(actor.maxHp * (1 + eff.maxHpPct)));
        actor.hp = Math.max(1, Math.round(Number(actor.hp || hpBefore) + (actor.maxHp - hpBefore)));
      }
      if (Number.isFinite(eff.critChanceFlat)) {
        actor.critChance = Math.max(0, Math.min(0.8, Number(actor.critChance || 0) + eff.critChanceFlat));
      }
    }
  }
}

export function consumeTickets(GameState, amount) {
  ensureCampaignIntermissionState(GameState);
  const cost = Math.max(0, Math.floor(Number(amount || 0)));
  if (GameState.campaign.tickets < cost) return false;
  GameState.campaign.tickets -= cost;
  GameState.campaign.intermission.spentCount = Math.max(0, Math.floor(Number(GameState.campaign.intermission.spentCount || 0))) + 1;
  return true;
}

export function getIntermissionSpendCount(GameState) {
  ensureCampaignIntermissionState(GameState);
  return Math.max(0, Math.floor(Number(GameState.campaign.intermission.spentCount || 0)));
}

export function assignBudgetToMovie(GameState, movieId, budgetId) {
  ensureCampaignIntermissionState(GameState);
  if (!movieId || !budgetId) return false;
  if (!(GameState.campaign.unlockedBudgets || []).includes(budgetId)) return false;
  GameState.campaign.badges.budgets[String(movieId)] = String(budgetId);
  return true;
}

export function assignAwardToMovie(GameState, movieId, awardId) {
  ensureCampaignIntermissionState(GameState);
  if (!movieId || !awardId) return false;
  const idx = GameState.campaign.pendingAwardOpportunities.findIndex((id) => String(id) === String(awardId));
  if (idx < 0) return false;
  GameState.campaign.pendingAwardOpportunities.splice(idx, 1);
  GameState.campaign.badges.awards[String(movieId)] = String(awardId);
  return true;
}

export function expirePendingAwards(GameState) {
  ensureCampaignIntermissionState(GameState);
  GameState.campaign.pendingAwardOpportunities = [];
}

export function clearPendingBattleRewards(GameState) {
  ensureCampaignIntermissionState(GameState);
  GameState.campaign.pendingBattleRewards = [];
}
