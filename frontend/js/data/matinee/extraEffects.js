import { EXTRA_SET_REWARDS } from "./extraRewards.js";
import { movieMeta } from "../movieMeta.js";

function ensureRuntime(GameState) {
  if (!GameState?.campaign) return null;
  if (!GameState.campaign.runtime || typeof GameState.campaign.runtime !== "object") {
    GameState.campaign.runtime = {};
  }
  if (!GameState.campaign.runtime.matinee || typeof GameState.campaign.runtime.matinee !== "object") {
    GameState.campaign.runtime.matinee = {
      battleRound: 0,
      battlesCompleted: 0,
      noCasualtyStreak: 0,
      lastBattlePartySnapshot: null,
      setStacksApplied: {},
      statRampByActorId: {},
      slasherLastStandApplied2: false,
      slasherLastStandApplied1: false
    };
  }
  return GameState.campaign.runtime.matinee;
}

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function genreOfActor(actor) {
  const id = String(actor?.movie?.id || "");
  const meta = movieMeta?.[id];
  return String(meta?.primaryGenre || actor?.movie?.primaryGenre || "").toUpperCase();
}

function getActiveSetIds(GameState) {
  const ids = Array.isArray(GameState?.campaign?.activeMatineeSetIds) ? GameState.campaign.activeMatineeSetIds : [];
  return ids.map(String);
}

function setSuppressesUniversalWhenActive(setId) {
  return setId === "slasher_icons" || setId === "absurdist_comedy_essentials" || setId === "two_thousands_comedies";
}

function mergeRewards(activeSetIds) {
  const bundle = { universal: {}, active: {} };
  for (const id of activeSetIds) {
    const r = EXTRA_SET_REWARDS[id];
    if (!r) continue;

    const useUniversal = !setSuppressesUniversalWhenActive(id);
    if (useUniversal) {
      for (const [k, v] of Object.entries(r.universal || {})) {
        if (typeof v === "number") bundle.universal[k] = asNum(bundle.universal[k]) + asNum(v);
        else if (typeof v === "boolean") bundle.universal[k] = !!bundle.universal[k] || v;
        else bundle.universal[k] = v;
      }
    }

    for (const [k, v] of Object.entries(r.active || {})) {
      if (typeof v === "number") bundle.active[k] = asNum(bundle.active[k]) + asNum(v);
      else if (typeof v === "boolean") bundle.active[k] = !!bundle.active[k] || v;
      else bundle.active[k] = v;
    }
  }
  return bundle;
}

function aliveParty(party) {
  return (Array.isArray(party) ? party : []).filter((a) => a && Number(a.hp || 0) > 0);
}

function livingCount(party) {
  return aliveParty(party).length;
}

function addPctStats(actor, pct) {
  const p = asNum(pct);
  if (!actor || p === 0) return;
  actor.atk = Math.max(1, Math.round(asNum(actor.atk || 1) * (1 + p)));
  actor.def = Math.max(1, Math.round(asNum(actor.def || 1) * (1 + p)));
  actor.maxHp = Math.max(1, Math.round(asNum(actor.maxHp || 1) * (1 + p)));
  actor.hp = Math.min(actor.maxHp, Math.max(1, Math.round(asNum(actor.hp || 1) * (1 + p))));
}

function maybeApplyRandomEnemyEffect(target, magnitude = 1) {
  if (!target || Number(target.hp || 0) <= 0) return;
  if (!target.statuses || typeof target.statuses !== "object") target.statuses = {};
  const r = Math.random();
  if (r < 0.34) {
    const turns = Math.max(1, Math.round(2 * magnitude));
    target.statuses.defDebuffPct = Math.max(asNum(target.statuses.defDebuffPct), 0.15 * magnitude);
    target.statuses.defDebuffTurns = Math.max(asNum(target.statuses.defDebuffTurns), turns);
    return;
  }
  if (r < 0.68) {
    const turns = Math.max(1, Math.round(2 * magnitude));
    target.statuses.atkDebuffPct = Math.max(asNum(target.statuses.atkDebuffPct), 0.15 * magnitude);
    target.statuses.atkDebuffTurns = Math.max(asNum(target.statuses.atkDebuffTurns), turns);
    return;
  }
  const turns = Math.max(1, Math.round(1 * magnitude));
  target.statuses.dazedTurns = Math.max(asNum(target.statuses.dazedTurns), turns);
}

function applyTeamAttackFromActor(actor, target, mult = 4) {
  if (!actor || !target || Number(target.hp || 0) <= 0) return 0;
  const base = Math.max(1, Math.round(asNum(actor.atk || 1)));
  const dmg = Math.max(1, Math.round(base * mult));
  target.hp = Math.max(0, Math.round(asNum(target.hp || 0) - dmg));
  return dmg;
}

function applyConsecutiveBattleScaling(party, pctPerBattle, battlesCompleted) {
  if (!Array.isArray(party) || !party.length) return;
  const scale = Math.max(0, asNum(pctPerBattle)) * Math.max(0, Math.floor(battlesCompleted));
  if (scale <= 0) return;
  for (const actor of party) addPctStats(actor, scale);
}

export function getActiveMatineeRewardBundle(GameState) {
  const setIds = getActiveSetIds(GameState);
  return mergeRewards(setIds);
}

export function onMatineeCampaignStart(GameState) {
  ensureRuntime(GameState);
  return getActiveMatineeRewardBundle(GameState);
}

export function onMatineeBattleStart(GameState) {
  const rt = ensureRuntime(GameState);
  if (rt) {
    rt.battleRound = 0;
    rt.lastBattlePartySnapshot = null;
    rt.slasherLastStandApplied2 = false;
    rt.slasherLastStandApplied1 = false;
  }
  return getActiveMatineeRewardBundle(GameState);
}

export function onMatineeRoundStart(GameState) {
  const rt = ensureRuntime(GameState);
  if (rt) rt.battleRound += 1;
  return getActiveMatineeRewardBundle(GameState);
}

export function onMatineeBattleEnd(GameState, party = null) {
  const rt = ensureRuntime(GameState);
  const bundle = getActiveMatineeRewardBundle(GameState);
  if (!rt) return bundle;

  rt.battlesCompleted += 1;
  const finalParty = Array.isArray(party) ? party : null;
  if (finalParty && finalParty.length > 0 && aliveParty(finalParty).length === finalParty.length) rt.noCasualtyStreak += 1;
  else rt.noCasualtyStreak = 0;

  return bundle;
}

export function onMatineeCampaignEnd(GameState) {
  return getActiveMatineeRewardBundle(GameState);
}

export function onMatineeAttackResolved(GameState, ctx = {}) {
  const bundle = getActiveMatineeRewardBundle(GameState);
  const actor = ctx?.actor || null;
  const target = ctx?.target || null;
  const phase = String(ctx?.phase || "");
  const kind = String(ctx?.kind || "");
  const party = Array.isArray(ctx?.party) ? ctx.party : null;
  const rt = ensureRuntime(GameState);

  if (phase === "round_start" && actor) {
    if (bundle.active?.roundHeal) {
      const heal = Math.max(1, Math.round(asNum(actor.maxHp || 1) * 0.04));
      actor.hp = Math.min(asNum(actor.maxHp || actor.hp || heal), asNum(actor.hp || 0) + heal);
    }

    if (bundle.universal?.lateRoundStatGrowth && rt?.battleRound >= 7) {
      const id = String(actor?.movie?.id || actor?.name || "actor");
      if (!rt.statRampByActorId[id]) {
        const pick = Math.random() < 0.5 ? "atk" : "def";
        rt.statRampByActorId[id] = pick;
      }
      const key = rt.statRampByActorId[id];
      actor[key] = Math.max(1, Math.round(asNum(actor[key] || 1) * 1.03));
    }

    if (asNum(bundle.active?.round1BoostPct) > 0 && rt?.battleRound === 1) addPctStats(actor, asNum(bundle.active.round1BoostPct));
    if (asNum(bundle.active?.round2BoostPct) > 0 && rt?.battleRound === 2) addPctStats(actor, asNum(bundle.active.round2BoostPct));
  }

  if (bundle.active?.lifeSiphonChance && actor && phase === "player_attack") {
    if (Math.random() < asNum(bundle.active.lifeSiphonChance)) {
      const dealt = Math.max(0, asNum(ctx?.damage || 0));
      const heal = Math.max(1, Math.round(dealt * 0.3));
      actor.hp = Math.min(asNum(actor.maxHp || actor.hp || heal), asNum(actor.hp || 0) + heal);
    }
  }

  if (bundle.active?.invertNegativeChance && actor && phase === "enemy_attack") {
    if (Math.random() < asNum(bundle.active.invertNegativeChance)) {
      actor.atk = Math.max(1, Math.round(asNum(actor.atk || 1) * 1.1));
      actor.def = Math.max(1, Math.round(asNum(actor.def || 1) * 1.1));
    }
  }

  if (phase === "player_attack" && target && Number(target.hp || 0) > 0) {
    const randomChance = clamp(asNum(bundle.active?.randomEffectChance || 0) + asNum(bundle.universal?.randomEffectChance || 0), 0, 0.95);
    if (Math.random() < randomChance) maybeApplyRandomEnemyEffect(target, 1 + asNum(bundle.universal?.effectDurationPct || 0));

    if (asNum(bundle.active?.teamStrikeChance) > 0 && Math.random() < asNum(bundle.active.teamStrikeChance)) {
      const extra = Math.max(1, Math.round(asNum(ctx?.damage || 0) * 0.2));
      target.hp = Math.max(0, Math.round(asNum(target.hp || 0) - extra));
    }

    const teamAttackChance = clamp(
      asNum(bundle.active?.teamAttackChance) + asNum(bundle.active?.bonusTeamAttackChance),
      0,
      0.95
    );
    if (teamAttackChance > 0 && Math.random() < teamAttackChance) {
      applyTeamAttackFromActor(actor, target, 4);
    }

    if (asNum(bundle.universal?.critBuffProcChance) > 0 && !!ctx?.isCrit) {
      if (Math.random() < asNum(bundle.universal.critBuffProcChance) && party) {
        for (const a of aliveParty(party)) {
          if (!a.statuses || typeof a.statuses !== "object") a.statuses = {};
          a.statuses.atkBuffPct = Math.max(asNum(a.statuses.atkBuffPct), 0.08);
          a.statuses.atkBuffTurns = Math.max(asNum(a.statuses.atkBuffTurns), 2);
        }
      }
    }
  }

  if (phase === "player_attack" && party && rt) {
    const living = livingCount(party);
    if (bundle.active?.flatAttackBoostPct && living <= 2 && !rt.slasherLastStandApplied2) {
      for (const a of aliveParty(party)) addPctStats(a, 1.0);
      rt.slasherLastStandApplied2 = true;
    }
    if (bundle.universal?.horrorAttackBoostPct && living === 1 && !rt.slasherLastStandApplied1) {
      for (const a of aliveParty(party)) addPctStats(a, 1.5);
      rt.slasherLastStandApplied1 = true;
    }
  }

  if (phase === "enemy_attack" && bundle.active?.defenseScalingPerBattle && actor && rt?.battlesCompleted > 0) {
    const pct = 0.03 * rt.battlesCompleted;
    actor.def = Math.max(1, Math.round(asNum(actor.def || 1) * (1 + pct)));
  }

  if (phase === "player_attack" && actor && rt?.battlesCompleted > 0) {
    const damageScale = asNum(bundle.active?.scaleDamageAcrossRun) ? 0.04 * rt.battlesCompleted : 0;
    const specialScale = asNum(bundle.active?.specialScalingPerBattlePct) * rt.battlesCompleted;
    const totalScale = damageScale + specialScale;
    if (totalScale > 0 && target && Number(target.hp || 0) > 0 && kind !== "enemy") {
      const extra = Math.max(1, Math.round(asNum(ctx?.damage || 0) * totalScale));
      target.hp = Math.max(0, Math.round(asNum(target.hp || 0) - extra));
    }
  }

  return bundle;
}

export function applyMatineeBattleInitEffects(GameState, party = []) {
  const setIds = getActiveSetIds(GameState);
  if (!setIds.length || !Array.isArray(party) || !party.length) return;
  const rt = ensureRuntime(GameState);
  const bundle = mergeRewards(setIds);

  const battlesCompleted = Math.max(0, Math.floor(asNum(rt?.battlesCompleted)));
  const noCasualtyStreak = Math.max(0, Math.floor(asNum(rt?.noCasualtyStreak)));

  for (const actor of party) {
    if (!actor) continue;
    const g = genreOfActor(actor);
    let atkPct = 0;
    let defPct = 0;
    let hpPct = 0;
    let critFlat = 0;

    if (g === "HORROR") atkPct += asNum(bundle.universal?.horrorAttackBoostPct);
    if (g === "COMEDY") defPct += asNum(bundle.universal?.comedyDefenseBoostPct);
    if (g === "ANIMATION") atkPct += asNum(bundle.universal?.animationStatBoostPct);
    if (g === "ANIMATION") defPct += asNum(bundle.universal?.animationStatBoostPct);
    if (g === "ADVENTURE") atkPct += asNum(bundle.universal?.adventureStatBoostPct);
    if (g === "MUSICAL") atkPct += asNum(bundle.universal?.musicalStatBoostPct);
    if (g === "MUSICAL") defPct += asNum(bundle.universal?.musicalStatBoostPct);

    atkPct += asNum(bundle.active?.flatAttackBoostPct);
    atkPct += asNum(bundle.active?.damageBoostPct);
    hpPct += asNum(bundle.active?.betweenBattleHpBoostPct);
    critFlat += asNum(bundle.active?.critChanceBoost);

    actor.atk = Math.max(1, Math.round(asNum(actor.atk || 1) * (1 + atkPct)));
    actor.def = Math.max(1, Math.round(asNum(actor.def || 1) * (1 + defPct)));
    actor.maxHp = Math.max(1, Math.round(asNum(actor.maxHp || 1) * (1 + hpPct)));
    actor.hp = Math.min(actor.maxHp, Math.max(1, Math.round(asNum(actor.hp || actor.maxHp || 1))));
    actor.critChance = clamp(asNum(actor.critChance || 0) + critFlat, 0, 0.95);
  }

  applyConsecutiveBattleScaling(party, asNum(bundle.active?.consecutiveStatBoostPct), noCasualtyStreak);

  if (rt) rt.lastBattlePartySnapshot = { alive: aliveParty(party).length, total: party.length, noCasualties: aliveParty(party).length === party.length };

  for (const id of setIds) {
    if (id === "king_of_the_hill") {
      for (const actor of party) {
        if (!actor) continue;
        const min = asNum(actor?.damageVarianceMin || 0);
        const max = asNum(actor?.damageVarianceMax || 0);
        if (min === 0 && max === 0) {
          actor.damageVarianceMin = 1 - asNum(bundle.active?.damageVariance || 0.05);
          actor.damageVarianceMax = 1 + asNum(bundle.active?.damageVariance || 0.05);
        }
      }
    }
    if (id === "classic_adventures") {
      for (const actor of party) {
        if (!actor) continue;
        if (!actor.statuses || typeof actor.statuses !== "object") actor.statuses = {};
        actor.statuses.buffPowerPct = Math.max(asNum(actor.statuses.buffPowerPct), asNum(bundle.universal?.buffPowerPct));
      }
    }
    if (id === "two_thousands_comedies") {
      for (const actor of party) {
        if (!actor) continue;
        if (!actor.statuses || typeof actor.statuses !== "object") actor.statuses = {};
        actor.statuses.debuffPowerPct = Math.max(asNum(actor.statuses.debuffPowerPct), asNum(bundle.active?.debuffPowerPct));
      }
    }
    if (id === "lynchian") {
      for (const actor of party) {
        if (!actor) continue;
        if (!actor.statuses || typeof actor.statuses !== "object") actor.statuses = {};
        actor.statuses.effectPowerPct = Math.max(asNum(actor.statuses.effectPowerPct), asNum(bundle.universal?.effectPowerPct));
        actor.statuses.effectDurationPct = Math.max(asNum(actor.statuses.effectDurationPct), asNum(bundle.universal?.effectDurationPct));
      }
    }
  }

  if (rt) {
    rt.lastBattlePartySnapshot = {
      alive: aliveParty(party).length,
      total: party.length,
      noCasualties: aliveParty(party).length === party.length
    };
    rt.battleRound = 0;
  }

  if (battlesCompleted > 0 && asNum(bundle.active?.scaleHealingAcrossRun)) {
    const pct = 0.04 * battlesCompleted;
    for (const actor of party) {
      if (!actor) continue;
      const heal = Math.max(0, Math.round(asNum(actor.maxHp || 1) * pct));
      actor.hp = Math.min(asNum(actor.maxHp || 1), asNum(actor.hp || 0) + heal);
    }
  }
}
