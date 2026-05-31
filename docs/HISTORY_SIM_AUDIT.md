# History Simulation Audit

## Current State

BlocksCreate is now a modular historical sandbox, but not yet the complete vision.

- **World generation:** expandable persistent worlds. The map starts finite (`320x110`) but grows horizontally near edges while preserving edits. True chunk streaming is still next.
- **Persistence:** edited worlds, civilization stats, objectives, discoveries, structures and powerups persist in saves.
- **Era specificity:** eras now have manifests for historical framing, hazards, animals, clues, mastery, branches and player form.
- **Progression:** portals require both CP and mandatory goals. Optional mastery goals grant benefits without blocking advancement.
- **Historical consistency:** First Humans uses dinosaurs as fossils, clues and alternate-history echoes, not as ordinary historical coexistence.

## What Improved In This Pass

- Added `eraManifests.js` so eras scale as data packs.
- Reframed the first era as **First Humans** while preserving `stone` save compatibility.
- Added mandatory, mastery and portal objective categories.
- Added advancement gating through `game.canAdvance()`.
- Improved HUD clarity with era story text, mastery count and explicit gate reason.
- Documented historical/alternate-history branches for each era.

## Next Technical Frontier

The next engine-level milestone should be **true chunked infinite worlds**:

1. Split world grid into deterministic chunks.
2. Save only modified chunks.
3. Stream chunks around the player.
4. Attach biome, hazard, clue and ruin generation to era manifests.
5. Let alternate-history branches alter future chunk generation.

This pass adds the bridge: deterministic horizontal expansion with `originX`
saved in the world snapshot, so the player can keep exploring beyond the initial
map without losing built structures.

## UX/Gamibility Notes

The game is more fun when players always understand:

- what they must do to progress,
- what optional mastery can improve,
- what hidden discoveries they have found,
- what buffs are active,
- why an era feels different.

The HUD now surfaces those answers without exposing every secret.
