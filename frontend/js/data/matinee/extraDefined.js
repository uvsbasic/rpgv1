// frontend/js/data/matinee/extraDefined.js

export const EXTRA_MOVIE_SET_DEFS = [
  { id: "classic_oscar_sweep", name: "Classic Oscar Sweep", movieIds: ["forrest_gump", "godfather", "schindlers_list", "titanic"], campaignOnly: true },
  { id: "slasher_icons", name: "Slasher Icons", movieIds: ["halloween", "scream", "friday_the_13th", "nightmare_on_elm_street"], campaignOnly: true },
  { id: "absurdist_comedy_essentials", name: "Absurdist Comedy Essentials", movieIds: ["monty_python_holy_grail", "airplane", "the_naked_gun", "young_frankenstein"], campaignOnly: true },
  { id: "two_thousands_comedies", name: "2000s Comedies", movieIds: ["superbad", "wedding_crashers", "the_hangover", "the_40_year_old_virgin"], campaignOnly: true },
  { id: "classic_adventures", name: "Classic Adventures", movieIds: ["pirates_black_pearl", "jurassic_park", "the_mummy_1999", "lotr_fellowship"], anyOfGroups: [["lotr_fellowship", "lotr_two_towers", "lotr_return_king"]], campaignOnly: true },
  { id: "broadway_big_screen", name: "Broadway on the Big Screen", movieIds: ["sound_of_music", "chicago", "la_la_land", "wicked"], eitherSlots: [{ slotIndex: 3, options: ["wicked", "wicked_for_good"] }], campaignOnly: true },
  { id: "land_of_oz", name: "The Land of Oz", movieIds: ["wizard_of_oz", "the_wiz", "wicked", "wicked_for_good"], campaignOnly: true },
  { id: "heros_fanfare", name: "The Hero's Fanfare", movieIds: ["superman_1978", "star_wars", "raiders_of_the_lost_ark", "harry_potter_2001"], anyOfGroups: [["star_wars", "empire_strikes_back"], ["raiders_of_the_lost_ark", "temple_of_doom", "last_crusade"], ["harry_potter_2001", "harry_potter_chamber", "harry_potter_azkaban"]], campaignOnly: true },
  { id: "true_avatar_apologist", name: "True Avatar Apologist", movieIds: ["avatar", "the_terminator", "aliens", "titanic"], eitherSlots: [{ slotIndex: 1, options: ["the_terminator", "terminator_2"] }], campaignOnly: true },
  { id: "pta_fanboy", name: "PTA Fanboy", movieIds: ["boogie_nights", "magnolia", "the_master", "there_will_be_blood"], campaignOnly: true },
  { id: "spielberg_touch", name: "The Spielberg Touch", movieIds: ["jurassic_park", "et", "jaws", "raiders_of_the_lost_ark"], anyOfGroups: [["raiders_of_the_lost_ark", "temple_of_doom", "last_crusade"]], campaignOnly: true },
  { id: "lynchian", name: "Lynchian", movieIds: ["eraserhead", "blue_velvet", "mulholland_drive", "dune_1984"], campaignOnly: true },
  { id: "prince_of_darkness_set", name: "The Prince of Darkness", movieIds: ["halloween", "the_thing", "escape_from_new_york", "christine"], eitherSlots: [{ slotIndex: 2, options: ["escape_from_new_york", "they_live"] }], campaignOnly: true },
  { id: "the_studio", name: "The Studio", movieIds: ["princess_mononoke", "my_neighbor_totoro", "nausicaa_valley_wind", "howls_moving_castle"], eitherSlots: [{ slotIndex: 3, options: ["howls_moving_castle", "spirited_away"] }], campaignOnly: true },
  { id: "king_of_the_hill", name: "King of the Hill", movieIds: ["office_space", "idiocracy", "extract", "beavis_and_butthead_do_america"], campaignOnly: true }
];

export const SET_ID_BY_NAME = Object.fromEntries(EXTRA_MOVIE_SET_DEFS.map((s) => [s.name, s.id]));
