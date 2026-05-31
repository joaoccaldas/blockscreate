# History Simulation Audit

## Current State

BlocksCreate is now a modular historical sandbox, but not yet the complete vision.

- **World generation:** expandable persistent worlds. The map starts finite (`320x110`) but grows horizontally near edges while preserving edits. True chunk streaming is still next.
- **Persistence:** edited worlds, civilization stats, objectives, discoveries, structures, historical clues and powerups persist in saves.
- **Era specificity:** eras now have manifests for historical framing, hazards, animals, clues, mastery, branches and player form.
- **Physical clues:** Age of Dinosaurs can generate clue blocks such as fossil beds, meteor shards, handprints and standing stones.
- **World events:** Age of Dinosaurs now has cold-night pressure and meteor showers that place physical meteor shards.
- **Progression:** portals require both CP and mandatory goals. Optional mastery goals grant benefits without blocking advancement.
- **Historical consistency:** the opening era is explicitly alternate-history survival fantasy, while later eras use historical sandbox framing.

## What Improved In This Pass

- Added `eraManifests.js` so eras scale as data packs.
- Reframed the first era as **Age of Dinosaurs** while preserving `stone` save compatibility.
- Added mandatory, mastery and portal objective categories.
- Added advancement gating through `game.canAdvance()`.
- Improved HUD clarity with era story text, mastery count and explicit gate reason.
- Documented historical/alternate-history branches for each era.
- Added `HistoricalClueLog` so clue blocks become journal entries and branch pressure.
- Added `WorldEventLog` so era hazards and events can start affecting play.

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
