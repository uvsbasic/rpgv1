// frontend/js/data/intermission/itemCombos.js
// Ticket-purchasable combo bundles used in intermission options.

export const ITEM_COMBOS = [
  {
    id: "family_popcorn_combo",
    name: "Family Popcorn Combo",
    cost: 2,
    minLevel: 1,
    items: [
      { id: "jumbo_popcorn", count: 2 },
      { id: "small_soda", count: 5 }
    ]
  },
  {
    id: "nacho_combo",
    name: "Nacho Combo",
    cost: 2,
    minLevel: 1,
    items: [
      { id: "nacho_bomb", count: 2 },
      { id: "large_soda", count: 3 }
    ]
  },
  {
    id: "broken_soda_machine",
    name: "Broken Soda Machine",
    cost: 3,
    minLevel: 2,
    items: [
      { id: "soda_launcher", count: 1 },
      { id: "large_soda", count: 5 }
    ]
  },
  {
    id: "pretzel_lover",
    name: "Pretzel Lover's Combo",
    cost: 4,
    minLevel: 2,
    items: [
      { id: "whole_pretzel", count: 2 },
      { id: "pretzel_bites", count: 4 }
    ]
  },  
  {
    id: "hot_chips",
    name: "Hot Cheeto Girl Special",
    cost: 6,
    minLevel: 4,
    items: [
      { id: "nacho_bomb", count: 2 },
      { id: "large_soda", count: 2 },
      { id: "large_chips", count: 2 },
      { id: "small_chips", count: 4 }
    ]
  },
  {
    id: "sticky_floor_combo",
    name: "Sticky Floor Combo",
    cost: 6,
    minLevel: 4,
    items: [
      { id: "stale_popcorn", count: 2 },
      { id: "fun_candy", count: 3 },
      { id: "small_soda", count: 3 }
    ]
  },
  {
    id: "bootlegger",
    name: "The Bootlegger",
    cost: 6,
    minLevel: 4,
    items: [
      { id: "camera_phone", count: 5 },
      { id: "camcorder", count: 3 }
    ]
  },
  {
    id: "popcorn_lover",
    name: "Popcorn Lover Meal",
    cost: 8,
    minLevel: 5,
    items: [
      { id: "butter_popcorn", count: 3},
      { id: "caramel_popcorn", count: 3},
      { id: "jumbo_popcorn", count: 2},
      { id: "stale_popcorn", count: 1}
    ]
  },
  {
  id: "arcade_special",
  name: "Arcade Special",
  cost: 7,
  minLevel: 5,
  items: [
    { id: "laser_pointer", count: 1 },
    { id: "ringtone_blast", count: 2 },
    { id: "jumbo_candy", count: 2 }
  ]
  }, 
  {
    id: "midnight_run",
    name: "Midnight Essentials",
    cost: 8,
    minLevel: 6,
    items: [
      { id: "large_soda", count: 3 },
      { id: "whole_pretzel", count: 2 },
      { id: "red_slush", count: 1 },
      { id: "blue_slush", count: 1 }
    ]
  },
  {
    id: "broken_slushie_machine",
    name: "Broken Slushie Machine",
    cost: 8,
    minLevel: 8,
    items: [
      { id: "blue_slush", count: 3 },
      { id: "red_slush", count: 3 },
      { id: "green_slush", count: 2}
    ]
  },
  {
    id: "mystery_box1",
    name: "???",
    cost: 15,
    minLevel: 10,
    items: [
      { id: "green_slush", count: 2},
      { id: "purple_slush", count: 2 },
      { id: "stale_popcorn", count: 2},
      { id: "projector_3d", count: 1 }
    ]
  },
  {
    id: "lazy_boy",
    name: "The Lazy Boy",
    cost: 20,
    minLevel: 12,
    items: [
      { id: "large_soda", count: 8},
      { id: "bottom_popcorn", count: 3 },
      { id: "purple_slush", count: 2},
      { id: "jumbo_cannon", count: 1 }
    ]
  },
];
