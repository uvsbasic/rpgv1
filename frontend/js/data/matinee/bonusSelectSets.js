// frontend/js/data/matinee/bonusSelectSets.js
import { getUnlockedSetDefs } from "./extraDiscovery.js";

export function getMatineeSetArchetypes(GameState) {
  const defs = getUnlockedSetDefs(GameState);
  return defs.map((def) => {
    const movieIds = [...def.movieIds];
    for (const slot of def.eitherSlots || []) {
      const i = Number(slot.slotIndex);
      const options = (slot.options || []).map(String).filter(Boolean);
      if (i >= 0 && i < movieIds.length && options.length) {
        movieIds[i] = options[Math.floor(Math.random() * options.length)];
      }
    }

    return {
      id: `matinee_set__${def.id}`,
      name: def.name,
      quickName: def.name,
      movieIds,
      hidden: false,
      campaignOnly: true,
      isMatineeSet: true,
      setId: def.id
    };
  });
}
