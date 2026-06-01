# History Simulation Audit

## Current State

BlocksCreate is now a modular historical sandbox, but not yet the complete vision.

- **World generation:** expandable persistent worlds. The map starts finite (`320x110`) but grows horizontally in chunk-sized regions while preserving edits. True chunk streaming is still next.
- **Persistence:** edited worlds, generated/modified chunk metadata, civilization stats, objectives, discoveries, structures, historical clues and powerups persist in saves.
- **Era specificity:** eras now have manifests for historical framing, hazards, animals, clues, mastery, branches and player form.
- **Origin era:** the progression now begins with **First Cell**, a simplified origin-of-life era about nutrients, warm vents, membranes and proto-cell stabilization.
- **Progressive interface:** First Cell uses smaller/pulsing player visuals, drifting movement, automatic absorption and life/stability HUD labels before later eras reveal broader survival/building verbs.
- **Cell learning loop:** First Cell now surfaces stability and chemical-gradient guidance so the player learns origin-of-life concepts through action.
- **Physical clues:** Age of Dinosaurs can generate clue blocks such as fossil beds, meteor shards, handprints and standing stones.
- **World events:** Age of Dinosaurs now has cold-night pressure and meteor showers that place physical meteor shards.
- **RPG encounters:** Age of Dinosaurs can trigger predator migrations and grazer herds; Early Cities can trigger droughts and raider scouts.
- **Dinosaur behavior:** raptors gain pack pressure, T-Rex creates fear zones, grazers can form a bond, and defended camps reduce survival pressure.
- **RPG progression:** primitive weapons, defeated-enemy stats, relic powerups and optional mastery goals make runs branch more meaningfully.
- **Living settlements:** housing-supported settlers now appear on screen with roles. Farmers produce food, gatherers physically harvest nearby trees/ore into a town stockpile, builders spend wood to raise village blocks, and guards contribute to defense.
- **Era biomes:** chunks now have deterministic era biomes, starting with fern valleys, fossil basins, meteor scars and ash fields for the Age of Dinosaurs.
- **Progression:** portals require both CP and mandatory goals. Optional mastery goals grant benefits without blocking advancement.
- **Historical consistency:** First Cell is science-inspired abstraction, Age of Dinosaurs is explicitly alternate-history survival fantasy, and later eras use historical sandbox framing.

## What Improved In This Pass

- Added a pre-dinosaur **First Cell** era so progression begins at the origin of life.
- Added origin-era blocks/resources: primordial mud, nutrient blobs, mineral vents and lipid membranes.
- Added origin-era recipes and objectives that teach interaction before larger survival systems appear.
- Added `eraManifests.js` so eras scale as data packs.
- Reframed `stone` as **Age of Dinosaurs** while preserving save compatibility.
- Added mandatory, mastery and portal objective categories.
- Added advancement gating through `game.canAdvance()`.
- Improved HUD clarity with era story text, mastery count and explicit gate reason.
- Documented historical/alternate-history branches for each era.
- Added `HistoricalClueLog` so clue blocks become journal entries and branch pressure.
- Added `WorldEventLog` so era hazards and events can start affecting play.
- Added timed random encounters with save persistence and HUD surfacing.
- Added primitive weapons, predator tracking and relic powerups.
- Expanded Early Cities mastery toward food storage and town-light planning.
- Added chunk metadata and modified-chunk snapshots so saves can migrate from dense worlds toward streamed infinite worlds.
- Added deterministic era biome lookup so future chunks can spawn different resources, clues, hazards and scenery by era.

## Next Technical Frontier

The next engine-level milestone should complete **true chunked infinite worlds**:

1. Replace the dense-grid fallback with loaded chunk windows.
2. Save only modified chunks as the authoritative world state.
3. Stream chunks around the player.
4. Attach biome, hazard, clue and ruin generation to era manifests.
5. Let alternate-history branches alter future chunk generation.

This pass upgrades the bridge: deterministic horizontal expansion now carries
chunk ids, generated/modified chunk indexes, era biome metadata and modified
chunk snapshots. The player can keep exploring beyond the initial map without
losing built structures, and the save format now has the hooks needed for real
streaming.

## UX/Gamibility Notes

The game is more fun when players always understand:

- what they must do to progress,
- what optional mastery can improve,
- what hidden discoveries they have found,
- what buffs are active,
- why an era feels different.

The HUD now surfaces those answers without exposing every secret.
