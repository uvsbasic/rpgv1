// frontend/js/data/matinee/campaignMeta.js
export const campaignMeta = [
  {
    id: "unlock_imdb_minmaxer",
    archetypeId: "imdb_minmaxer",
    presentation: "overlay",
    when: (state) => !!state.flags?.secrets?.imdbSequenceCompleted
  },

  {
    id: "unlock_dads_dvd_shelf",
    archetypeId: "dads_dvd_shelf",
    presentation: "overlay",
    when: (state) => (state.stats?.winsByGenre?.ACTION || 0) >= 10
  },

  {
    id: "unlock_ratatouille",
    archetypeId: "ratatouille_only",
    presentation: "overlay",
    codeLabel: "Congrats!! Now just pick something next time.",
    showOverlay: true,

    when: (G) => {
      const curScreen = String(G?.currentScreen || "");
      if (curScreen !== "menu") return false;

      const clicks = Number(G?.stats?.randomizeClicks || 0);

      const trial = G?.flags?.secrets?.ratatouilleTrial;
      const forcedUsed = !!trial?.forcedUsed;
      const completed = !!trial?.completed;

      return clicks >= 30 && forcedUsed && completed;
    }
  },

  {
    id: "unlock_criterion_goblin",
    archetypeId: "criterion_goblin",
    presentation: "overlay",
    codeLabel: "How many criterions you got??",
    when: (state) => (state.stats?.winsByFranchise?.Arthouse || 0) >= 7
  },

  {
    id: "unlock_test_test_on_film_professor_defeat",
    archetypeId: "test_test",
    presentation: "overlay",
    showOverlay: false,
    emitEvent: false,
    when: (state) => !!state.flags?.secrets?.filmProfessorDefeated
  }
];

export const campaignScreen = [
  {
    id: "unlock_directors_cut_purist_on_campaign_clear",
    archetypeId: "directors_cut_purist",
    presentation: "screen",
    codeLabel: "For you, my level 9 cinephile.",
    targetScreen: "unlockDirectorsCut",
    when: (state) => !!state.stats?.campaignCleared
  }
];

export const campaignUnlocks = [...campaignMeta, ...campaignScreen];
