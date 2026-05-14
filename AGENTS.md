# AGENTS.md

This file tracks the matinee implementation phases and their completion status.

## Overall Status

- Program status: COMPLETE
- Delivery mode: single-pass full implementation
- Scope delivered: hidden movie unlocks, discoverable set unlocks, persistence, campaign-only gating, set-carousel ordering, reward/effect lifecycle hooks, bonus specials wiring, validation pass

## Phase Completion Matrix

1. Data Normalization Agent: COMPLETED
- Implemented canonical ID-based mappings in runtime data
- Added missing visible and hidden movies to `movies.js`
- Added metadata for new IDs in `movieMeta.js`
- Replaced ambiguous title-string unlock logic with typed ID predicates

2. Persistence Agent: COMPLETED
- Implemented matinee save/load/reset in `frontend/js/data/matinee/storage.js`
- Wired state bootstrap in `game.js`
- Wired reset integration in `resetSystem.js`

3. Hidden Movie Unlock Runtime Agent: COMPLETED
- Implemented unlock evaluator in `extraSystems.js`
- Integrated campaign run-start and battle result tracking in Select/Battle
- Integrated unlock evaluation calls after progression updates

4. Set Discovery + Ordering Agent: COMPLETED
- Implemented set definitions in `extraDefined.js`
- Implemented discovery evaluator in `extraDiscovery.js`
- Implemented carousel adapter in `bonusSelectSets.js`
- Preserved unlock order display behavior

5. Reward Effects Agent: COMPLETED
- Implemented reward model in `extraRewards.js`
- Implemented lifecycle API in `extraEffects.js`
- Wired battle lifecycle hooks in `battle.js` and action resolution pipeline

6. Bonus Specials Loadout Agent: COMPLETED
- Implemented bonus special registry in `bonusSpecials.js`
- Implemented loader in `bonusSpecialsLoadout.js`
- Wired bonus merge into `specialSystem.js`

7. UI + Mode Guard Agent: COMPLETED
- Select now includes campaign set archetypes from unlocked set order
- Matinee hidden-movie visibility gate integrated into movie availability filter
- Campaign-only behavior preserved (no quickplay matinee set injection)

8. Validation + QA Agent: COMPLETED
- Syntax validation run with `node --check` on all modified/new matinee and wired files
- Build command unavailable at repo root due to missing root `package.json`; module-level syntax validation succeeded
- Added executable smoke suite: `tools/matineeSmoke.mjs` (unlock/discovery/visibility regression checks)

## Delivered Files

- `frontend/js/data/matinee/storage.js`
- `frontend/js/data/matinee/extraMovies.js`
- `frontend/js/data/matinee/extraDefined.js`
- `frontend/js/data/matinee/extraRewards.js`
- `frontend/js/data/matinee/extraSystems.js`
- `frontend/js/data/matinee/extraDiscovery.js`
- `frontend/js/data/matinee/extraEffects.js`
- `frontend/js/data/matinee/bonusSpecials.js`
- `frontend/js/data/matinee/bonusSpecialsLoadout.js`
- `frontend/js/data/matinee/bonusSelectSets.js`

Wired integration updates:
- `frontend/js/game.js`
- `frontend/js/core/GameState.js`
- `frontend/js/systems/resetSystem.js`
- `frontend/js/screens/select.js`
- `frontend/js/screens/battle.js`
- `frontend/js/screens/battle/actions.js`
- `frontend/js/systems/specialSystem.js`
- `frontend/js/data/movies.js`
- `frontend/js/data/movieMeta.js`
- `frontend/assets/docs/campaignMeta.md`

## Definition of Done Check

- Referenced hidden/set movies present in `movies.js`: YES
- Unlocked hidden movies are persisted and reload-safe: YES
- Set discovery order persisted and used for display ordering: YES
- Campaign-only set behavior preserved: YES
- Bonus specials merged into runtime special resolution: YES
- Existing archetype unlock flow preserved: YES

## Maintenance Guidance

- Add new hidden movie rules in `extraMovies.js` using typed conditions
- Add new discoverable sets in `extraDefined.js`
- Add or tune rewards in `extraRewards.js` and `extraEffects.js`
- Add bonus specials in `bonusSpecials.js`
