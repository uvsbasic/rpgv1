// frontend/js/battleText/buildEnemyTurnLines.js
//
// Phase 4B: centralized narration for enemy-turn outcomes.

import {
  ENEMY_ACTS_FALLBACK,
  ENEMY_ATTACK_CRIT_TEMPLATE,
  ENEMY_ATTACK_GUARDED_SUFFIX_TEMPLATE,
  ENEMY_ATTACK_MORTAL_TEMPLATE,
  ENEMY_ATTACK_NORMAL_TEMPLATE,
  ENEMY_ATTACK_SHIELD_ONLY_TEMPLATE,
  ENEMY_ATTACK_SPLIT_SHIELD_HP_TEMPLATE,
  ENEMY_CONFUSED_LOW_ACC_HIT_TEMPLATE,
  ENEMY_CONFUSED_MISFIRE_TEMPLATE,
  ENEMY_CONFUSED_SELF_HEAL_TEMPLATE,
  ENEMY_CONFUSED_WILD_MISS_TEMPLATE,
  ENEMY_CONFUSION_CLEARED_TEMPLATE,
  ENEMY_MISS_DAZED_TEMPLATE,
  ENEMY_MOVE_UNKNOWN_TEMPLATE,
  ENEMY_STUNNED_SKIP_TEMPLATE,
  ENEMY_STRIKES_FALLBACK,
  ENEMY_TURN_DISRUPTED_FUNNY,
  ENEMY_TURN_DEFAULT_ENEMY_NAME,
  ENEMY_TURN_DEFAULT_MOVE_NAME,
  ENEMY_TURN_DEFAULT_TARGET_NAME,
  ENEMY_TURN_GENERIC_TARGET_NAME,
  PARTY_FALLEN,
  PARTY_FALLEN_PROMPT,
  TARGET_KNOCKED_OUT_TEMPLATE
} from "../lines/enemyTurnText.js";
import { enemyMoves } from "../../data/enemies/enemyMoves.js";

function renderTemplate(str, vars) {
  return String(str || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

function getMoveTemplate(moveId, key) {
  if (!moveId) return "";
  return enemyMoves?.[moveId]?.lines?.[key];
}

function clampIndex(n, len) {
  if (!Number.isFinite(n)) return 0;
  if (len <= 0) return 0;
  const v = Math.floor(n);
  if (v < 0) return 0;
  if (v >= len) return len - 1;
  return v;
}

function normalizeMoveTextSpec(spec) {
  if (typeof spec === "string") {
    const t = spec.trim();
    return t ? { lines: [t], effectLineIndex: 0 } : null;
  }

  if (Array.isArray(spec)) {
    const lines = spec.map((v) => String(v || "").trim()).filter(Boolean);
    if (lines.length === 0) return null;
    // Default multi-line timing: effect lands on the final authored line.
    return { lines, effectLineIndex: lines.length - 1 };
  }

  if (spec && typeof spec === "object" && Array.isArray(spec.lines)) {
    const lines = spec.lines.map((v) => String(v || "").trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const idx = clampIndex(Number(spec.effectLineIndex), lines.length);
    return { lines, effectLineIndex: idx };
  }

  return null;
}

function buildMoveTextSpec(moveId, key, fallbackTemplate) {
  const authored = normalizeMoveTextSpec(getMoveTemplate(moveId, key));
  if (authored) return authored;
  return { lines: [String(fallbackTemplate || "")], effectLineIndex: 0 };
}

export function buildPartyFallenLine() {
  return PARTY_FALLEN;
}

export function buildPartyFallenPromptLine() {
  return PARTY_FALLEN_PROMPT;
}

export function buildEnemyStrikesFallbackLine() {
  return ENEMY_STRIKES_FALLBACK;
}

export function buildEnemyActsFallbackLine() {
  return ENEMY_ACTS_FALLBACK;
}

export function buildEnemyTurnEntries({ events }) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const entries = [];

  for (const evt of events) {
    const type = String(evt?.type || "");

    if (type === "turnDisruptedFunny") {
      entries.push({ text: ENEMY_TURN_DISRUPTED_FUNNY });
      continue;
    }

    if (type === "enemyStunnedSkip") {
      entries.push({ text: renderTemplate(ENEMY_STUNNED_SKIP_TEMPLATE, { enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME }) });
      continue;
    }

    if (type === "enemyMoveUnknown") {
      entries.push({ text: renderTemplate(ENEMY_MOVE_UNKNOWN_TEMPLATE, { enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME }) });
      continue;
    }

    if (type === "enemyMissDazed") {
      const moveId = evt.moveId || "";
      const spec = buildMoveTextSpec(moveId, "missDazed", ENEMY_MISS_DAZED_TEMPLATE);
      for (let i = 0; i < spec.lines.length; i++) {
        entries.push({
          text: renderTemplate(spec.lines[i], {
            enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME,
            moveName: evt.moveName || ENEMY_TURN_DEFAULT_MOVE_NAME
          }),
          effectLine: i === spec.effectLineIndex
        });
      }
      continue;
    }

    if (type === "enemyConfusedMisfire") {
      const moveId = evt.moveId || "";
      const spec = buildMoveTextSpec(moveId, "confusedMisfire", ENEMY_CONFUSED_MISFIRE_TEMPLATE);
      for (let i = 0; i < spec.lines.length; i++) {
        entries.push({
          text: renderTemplate(spec.lines[i], {
            enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME,
            moveName: evt.moveName || ENEMY_TURN_DEFAULT_MOVE_NAME
          }),
          effectLine: i === spec.effectLineIndex
        });
      }
      continue;
    }

    if (type === "enemyConfusedSelfHeal") {
      entries.push({ text: renderTemplate(ENEMY_CONFUSED_SELF_HEAL_TEMPLATE, {
        enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME,
        healed: Number(evt.healed || 0)
      }) });
      continue;
    }

    if (type === "enemyConfusedWildMiss") {
      const moveId = evt.moveId || "";
      const spec = buildMoveTextSpec(moveId, "confusedWildMiss", ENEMY_CONFUSED_WILD_MISS_TEMPLATE);
      for (let i = 0; i < spec.lines.length; i++) {
        entries.push({
          text: renderTemplate(spec.lines[i], {
            enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME,
            moveName: evt.moveName || ENEMY_TURN_DEFAULT_MOVE_NAME
          }),
          effectLine: i === spec.effectLineIndex
        });
      }
      continue;
    }

    if (type === "enemyConfusedLowAccuracyHit") {
      const moveId = evt.moveId || "";
      const spec = buildMoveTextSpec(moveId, "confusedLowAccHit", ENEMY_CONFUSED_LOW_ACC_HIT_TEMPLATE);
      for (let i = 0; i < spec.lines.length; i++) {
        entries.push({
          text: renderTemplate(spec.lines[i], {
            enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME,
            moveName: evt.moveName || ENEMY_TURN_DEFAULT_MOVE_NAME
          }),
          effectLine: i === spec.effectLineIndex
        });
      }
      continue;
    }

    if (type === "enemyConfusionCleared") {
      entries.push({ text: renderTemplate(ENEMY_CONFUSION_CLEARED_TEMPLATE, { enemyName: evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME }) });
      continue;
    }

    if (type === "enemyAttackHit") {
      const enemyName = evt.enemyName || ENEMY_TURN_DEFAULT_ENEMY_NAME;
      const moveId = evt.moveId || "";
      const moveName = evt.moveName || ENEMY_TURN_DEFAULT_MOVE_NAME;
      const targetName = evt.targetName || ENEMY_TURN_GENERIC_TARGET_NAME;
      const hpDmg = Number(evt.damage || 0);
      const shieldDmg = Number(evt.absorbedShield || 0);
      const totalDmg = hpDmg + shieldDmg;

      const key = evt.isMortal
        ? "attackMortal"
        : (evt.isCrit ? "attackCrit" : "attackNormal");
      const fallbackTpl = evt.isMortal
        ? ENEMY_ATTACK_MORTAL_TEMPLATE
        : (evt.isCrit ? ENEMY_ATTACK_CRIT_TEMPLATE : ENEMY_ATTACK_NORMAL_TEMPLATE);
      const spec = buildMoveTextSpec(moveId, key, fallbackTpl);

      for (let i = 0; i < spec.lines.length; i++) {
        let line = renderTemplate(spec.lines[i], { enemyName, moveName, targetName, totalDmg, shieldDmg, hpDmg });
        if (i === spec.effectLineIndex) {
          if (shieldDmg > 0 && hpDmg > 0) {
            line += renderTemplate(ENEMY_ATTACK_SPLIT_SHIELD_HP_TEMPLATE, { shieldDmg, hpDmg });
          } else if (shieldDmg > 0) {
            line += renderTemplate(ENEMY_ATTACK_SHIELD_ONLY_TEMPLATE, { shieldDmg });
          }

          if (evt.guarded) line += renderTemplate(ENEMY_ATTACK_GUARDED_SUFFIX_TEMPLATE, { targetName });
        }
        entries.push({ text: line, effectLine: i === spec.effectLineIndex });
      }
      continue;
    }

    if (type === "targetKnockedOut") {
      entries.push({ text: renderTemplate(TARGET_KNOCKED_OUT_TEMPLATE, { targetName: evt.targetName || ENEMY_TURN_DEFAULT_TARGET_NAME }) });
      continue;
    }
  }

  return entries;
}

export function buildEnemyTurnLines({ events }) {
  return buildEnemyTurnEntries({ events }).map((e) => e.text);
}
