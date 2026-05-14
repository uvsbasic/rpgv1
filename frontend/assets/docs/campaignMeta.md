# Movie RPG Campaign Meta (Canonical Implemented Spec)

This file is now the canonical, implementation-aligned spec for the matinee hidden movie and discoverable set system.

## Status

- Implementation status: COMPLETE (runtime + data + persistence + wiring)
- Scope: Campaign mode only
- Quickplay leakage: blocked (campaign set archetypes only injected in Select campaign flow)

## Canonical Data Sources

- Hidden movie unlock rules: `frontend/js/data/matinee/extraMovies.js`
- Discoverable sets + Either slots: `frontend/js/data/matinee/extraDefined.js`
- Reward payload model: `frontend/js/data/matinee/extraRewards.js`
- Reward runtime application hooks: `frontend/js/data/matinee/extraEffects.js`
- Unlock/discovery runtime evaluators: `frontend/js/data/matinee/extraSystems.js`, `frontend/js/data/matinee/extraDiscovery.js`
- Persistence: `frontend/js/data/matinee/storage.js`
- Campaign set carousel adapter: `frontend/js/data/matinee/bonusSelectSets.js`
- Bonus specials registry + loadout: `frontend/js/data/matinee/bonusSpecials.js`, `frontend/js/data/matinee/bonusSpecialsLoadout.js`

## Canonical Movie ID Mapping

Visible additions now in `movies.js`:
- `wizard_of_oz`, `friday_the_13th`, `airplane`, `the_naked_gun`, `young_frankenstein`
- `superbad`, `wedding_crashers`, `the_hangover`, `the_40_year_old_virgin`
- `heat`, `pirates_black_pearl`, `the_mummy_1999`, `chicago`, `inglourious_basterds`
- `there_will_be_blood`, `boogie_nights`, `magnolia`, `mulholland_drive`, `eraserhead`
- `the_nice_guys`, `iron_man`, `el_mariachi`, `from_dusk_till_dawn`, `sin_city_2005`
- `evil_dead_2`, `escape_from_new_york`, `christine`, `bad_boys`, `monsters_inc`
- `coraline`, `paranorman`, `my_neighbor_totoro`, `ace_ventura_pet_detective`, `batman_forever`

Hidden matinee additions now in `movies.js` (`lockedByMatinee: true`):
- `the_wiz`, `paprika`, `titanic`, `monty_python_holy_grail`, `sound_of_music`
- `superman_1978`, `harry_potter_chamber`, `harry_potter_azkaban`, `the_thing`, `aliens`
- `the_master`, `blue_velvet`, `iron_man_3`, `lethal_weapon_2`, `drag_me_to_hell`
- `doctor_strange_multiverse_madness`, `transformers`, `cars_2`, `nausicaa_valley_wind`
- `beavis_and_butthead_do_america`, `idiocracy`, `extract`, `the_mask`, `dumb_and_dumber`, `prince_of_darkness`

Existing catalog movies moved to matinee-hidden to match unlock rules:
- `dune_1984`
- `truman_show`
- `superman_2`

## Canonical Set IDs

- `classic_oscar_sweep`
- `slasher_icons`
- `absurdist_comedy_essentials`
- `two_thousands_comedies`
- `classic_adventures`
- `broadway_big_screen`
- `land_of_oz`
- `heros_fanfare`
- `true_avatar_apologist`
- `pta_fanboy`
- `spielberg_touch`
- `lynchian`
- `prince_of_darkness_set`
- `the_studio`
- `king_of_the_hill`

## Unlock Logic Coverage

All hidden movie unlock patterns are implemented in typed predicates:
- runs/wins with movie
- runs/wins with genre
- runs/wins with franchise
- runs/wins with archetype
- set unlocked prerequisite
- wins with set
- multi-flag progression (`iron_man_3` dual-run requirement)
- exact lineup run check (`truman_show`)
- prerequisite archetype gate (`superman_1978`)

## Set Discovery Rules

Implemented:
- exact required movie slots
- either/or slot options (randomized only for display)
- any-of group requirements
- unlock order persisted and reused for carousel ordering

## Reward Runtime Lifecycle

Implemented lifecycle API and wiring:
- campaign start
- battle start
- round start
- attack resolved
- battle end
- campaign end

Implemented effect application includes:
- deterministic battle-init stat modifiers from unlocked active sets
- runtime attack hooks for siphon/invert/team strike and round-heal style effects

## Bonus Specials

- Bonus specials are loaded from `bonusSpecials.js` and merged into signature pools by `specialSystem.js`
- Current bonus entries are present for representative hidden unlock movies and can be extended safely via the same registry

## Campaign-Only Guardrails

- Hidden matinee movies are excluded from normal selection until unlocked (`lockedByMatinee` gate)
- Discoverable campaign sets are appended only in Select campaign archetype list
- Quickplay does not include campaign set archetypes

## Notes on Prior Contradictions and Errors

The old draft included typos/encoding/naming inconsistencies. Canonical implemented values are now ID-based and resolved in code. The following examples were normalized:
- `Airplane` -> `airplane` (`Airplane!` title retained)
- `Young Frakenstein` typo corrected
- `Nausicaa` encoding issue normalized to `nausicaa_valley_wind`
- lineup string punctuation errors replaced by exact ID lineup evaluator

## Final Operational Rule

When this markdown conflicts with executable data files, executable data files are definitive:
- `extraMovies.js`
- `extraDefined.js`
- `extraRewards.js`
- `movies.js`
- `movieMeta.js`
