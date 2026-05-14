// frontend/js/screens/battleReward.js

import { GameState, changeScreen } from "../game.js";
import { SCREEN } from "../layout.js";
import { Input } from "../ui.js";
import { clearPendingBattleRewards, ensureCampaignIntermissionState } from "../systems/intermissionSystem.js";

function rewardLine(r) {
  if (!r) return "";
  if (r.type === "item_combo") return `Item Combo Obtained: ${r.name}`;
  if (r.type === "budget_unlock") return `Budget Unlocked: ${r.name}`;
  if (r.type === "award_opportunity") return `Pending Award Opportunity: ${r.name} (Tier ${r.tier})`;
  return "Reward";
}

export const BattleRewardScreen = {
  enter() {
    ensureCampaignIntermissionState(GameState);
  },

  update(mouse) {
    if (Input.pressed("Enter") || mouse?.clicked || mouse?.tapped) {
      Input.consume("Enter");
      clearPendingBattleRewards(GameState);
      changeScreen("intermission");
    }
  },

  render(ctx) {
    ensureCampaignIntermissionState(GameState);
    const rewards = Array.isArray(GameState.campaign.pendingBattleRewards)
      ? GameState.campaign.pendingBattleRewards
      : [];

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, SCREEN.W, SCREEN.H);
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Battle Rewards", Math.floor(SCREEN.W / 2), 24);
    ctx.textAlign = "start";

    ctx.font = "10px monospace";
    let y = 62;
    for (const reward of rewards) {
      ctx.fillStyle = "#ffed8f";
      ctx.fillText(`- ${rewardLine(reward)}`, 30, y);
      y += 18;
    }

    ctx.fillStyle = "#9bb1d9";
    ctx.fillText("Press Enter to continue to Intermission.", 30, SCREEN.H - 24);
  }
};
