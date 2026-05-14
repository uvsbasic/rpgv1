// frontend/js/screens/intermission.js

import { GameState, changeScreen } from "../game.js";
import { SCREEN } from "../layout.js";
import { Input } from "../ui.js";
import {
  addInventoryEntries,
  assignAwardToMovie,
  assignBudgetToMovie,
  consumeTickets,
  ensureCampaignIntermissionState,
  expirePendingAwards,
  getAwardById,
  getBadgeName,
  getBudgetById,
  getItemCombosForLevel
} from "../systems/intermissionSystem.js";

let optionIndex = 0;
let actorIndex = 0;
let optionsCache = [];

function getPartyMovies() {
  const src = Array.isArray(GameState.party?.movies) ? GameState.party.movies : [];
  return src.filter(Boolean);
}

function actorLabel(movie) {
  return String(movie?.shortTitle || movie?.title || movie?.id || "Unknown");
}

function buildOptions() {
  ensureCampaignIntermissionState(GameState);
  const c = GameState.campaign;
  const movies = getPartyMovies();
  const actor = movies[actorIndex] || null;
  const out = [];

  // Intermission happens after a win, where currentLevel already points to the next level.
  // Combo gates should unlock from completed levels, not the incoming level.
  const completedLevel = Math.max(1, (GameState.currentLevel || 1) - 1);
  const combos = getItemCombosForLevel(completedLevel);
  for (const combo of combos) {
    out.push({
      key: `combo:${combo.id}`,
      label: `Buy Combo: ${combo.name} (${combo.cost}T)`,
      cost: combo.cost,
      apply: () => addInventoryEntries(GameState, combo.items)
    });
  }

  const unlocked = Array.isArray(c.unlockedBudgets) ? c.unlockedBudgets : [];
  for (const budgetId of unlocked) {
    const budget = getBudgetById(budgetId);
    if (!budget || !actor) continue;
    const current = String(c.badges?.budgets?.[actor.id] || "");
    if (current === budget.id) continue;
    out.push({
      key: `budget:${budget.id}:${actor.id}`,
      label: `Equip Budget on ${actorLabel(actor)}: ${budget.name} (1T)`,
      cost: 1,
      apply: () => assignBudgetToMovie(GameState, actor.id, budget.id)
    });
  }

  const pending = Array.isArray(c.pendingAwardOpportunities) ? c.pendingAwardOpportunities : [];
  for (const awardId of pending) {
    const award = getAwardById(awardId);
    if (!award || !actor) continue;
    const cost = Math.max(1, Math.floor(Number(award.tier || 1)));
    out.push({
      key: `award:${award.id}:${actor.id}`,
      label: `Claim Award for ${actorLabel(actor)}: ${award.name} (${cost}T)`,
      cost,
      apply: () => assignAwardToMovie(GameState, actor.id, award.id)
    });
  }

  out.push({
    key: "continue",
    label: "Continue to Next Level Intro",
    cost: 0,
    apply: () => {
      expirePendingAwards(GameState);
      changeScreen("levelIntro");
    }
  });

  optionsCache = out;
  optionIndex = Math.max(0, Math.min(optionIndex, Math.max(0, out.length - 1)));
}

function tryApplyOption(opt) {
  if (!opt) return;
  if (opt.key === "continue") {
    opt.apply();
    return;
  }
  if (!consumeTickets(GameState, opt.cost)) return;
  opt.apply();
  buildOptions();
}

export const IntermissionScreen = {
  enter() {
    ensureCampaignIntermissionState(GameState);
    optionIndex = 0;
    actorIndex = 0;
    buildOptions();
  },

  update(mouse) {
    const movies = getPartyMovies();
    if (movies.length <= 0) {
      changeScreen("levelIntro");
      return;
    }

    if (Input.pressed("Left") || Input.pressed("ArrowLeft")) {
      Input.consume("Left");
      Input.consume("ArrowLeft");
      actorIndex = (actorIndex + movies.length - 1) % movies.length;
      buildOptions();
      return;
    }
    if (Input.pressed("Right") || Input.pressed("ArrowRight")) {
      Input.consume("Right");
      Input.consume("ArrowRight");
      actorIndex = (actorIndex + 1) % movies.length;
      buildOptions();
      return;
    }
    if (Input.pressed("Up") || Input.pressed("ArrowUp")) {
      Input.consume("Up");
      Input.consume("ArrowUp");
      optionIndex = (optionIndex + optionsCache.length - 1) % Math.max(1, optionsCache.length);
      return;
    }
    if (Input.pressed("Down") || Input.pressed("ArrowDown")) {
      Input.consume("Down");
      Input.consume("ArrowDown");
      optionIndex = (optionIndex + 1) % Math.max(1, optionsCache.length);
      return;
    }

    if (Input.pressed("Enter") || mouse?.clicked || mouse?.tapped) {
      Input.consume("Enter");
      tryApplyOption(optionsCache[optionIndex] || null);
    }
  },

  render(ctx) {
    ensureCampaignIntermissionState(GameState);
    const c = GameState.campaign;
    const movies = getPartyMovies();
    const selectedMovie = movies[actorIndex] || null;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);

    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Intermission", Math.floor(SCREEN.W / 2), 22);

    ctx.font = "10px monospace";
    ctx.fillStyle = "#9bb1d9";
    ctx.fillText(`Tickets: ${c.tickets}`, Math.floor(SCREEN.W / 2), 38);
    ctx.fillText(`Selected Movie: ${actorLabel(selectedMovie)} (Left/Right)`, Math.floor(SCREEN.W / 2), 52);
    ctx.textAlign = "start";

    let y = 72;
    for (let i = 0; i < optionsCache.length; i++) {
      const opt = optionsCache[i];
      const isHot = i === optionIndex;
      ctx.fillStyle = isHot ? "#ffed8f" : "#dbe5ff";
      ctx.fillText(`${isHot ? ">" : " "} ${opt.label}`, 20, y);
      y += 14;
    }

    const panelY = 168;
    ctx.strokeStyle = "#46608f";
    ctx.strokeRect(12.5, panelY + 0.5, SCREEN.W - 25, 118);
    ctx.fillStyle = "#9bb1d9";
    ctx.fillText("Party Badges", 20, panelY + 12);

    let rowY = panelY + 30;
    for (const movie of movies) {
      const mId = String(movie?.id || "");
      const awardId = String(c.badges?.awards?.[mId] || "");
      const budgetId = String(c.badges?.budgets?.[mId] || "");
      ctx.fillStyle = "#dbe5ff";
      ctx.fillText(actorLabel(movie), 20, rowY);
      ctx.fillStyle = "#b7c8ef";
      ctx.fillText(`Award: ${getBadgeName("award", awardId)} | Budget: ${getBadgeName("budget", budgetId)}`, 130, rowY);
      rowY += 20;
    }
  }
};
