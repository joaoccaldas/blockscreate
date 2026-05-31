# Fun Systems Architecture

This pass adds modular systems that make BlocksCreate more playful without hard-coding one-off behavior into the game loop.

## Structure Recognition

File: `src/systems/Structures.js`

Structures turn free-form buildings into civilization meaning. The tracker scans blocks near the player or a newly placed block, then checks data-driven recognizers:

- `camp` - campfire plus torch
- `hut` - roof, floor, and walls
- `workshop` - campfire plus wood and masonry
- `watchtower` - vertical height plus platform
- `portal_ring` - large ring plus torches

Adding a structure should mean adding one definition to `STRUCTURES` with:

- `id`
- `icon`
- `label`
- `reward`
- `check(ctx, game)`

## Hidden Discoveries

File: `src/systems/Discoveries.js`

Hidden discoveries reward experiments that are not visible in the objective list until unlocked:

- First Shelter
- Firekeeper
- Deep Delver
- Sky Builder
- Ancient Mason
- Portal Architect
- Animal Friend

Each discovery can award CP and a timed powerup. Add discoveries as data in `DISCOVERIES`.

## Powerups

File: `src/systems/Powerups.js`

Powerups are timed effects queried by the game loop:

- Builder's Glove: longer reach
- Miner's Charm: faster mining
- Feast: slower hunger drain
- Architect's Eye: faster structure scanning
- Time Shard: CP multiplier
- Ember Heart: warmth and slower hunger drain
- Fossil Charm: reduced predator damage
- Meteor Pick: faster mining with a CP boost
- City Planner: faster scanning and better settlement reward flow
- Granary Feast: slower hunger drain for food-storage play

Future relics, rare drops, recipes, or shrine rewards can all call `game.powerups.grant(id)`.

## RPG Era Encounters

File: `src/systems/WorldEvents.js`

World events now include timed encounters, not only ambience:

- Age of Dinosaurs: cold nights, meteor showers, predator migrations and grazer herds.
- Early Cities: droughts and raider scouts.

Events are randomized through deterministic world state where possible, appear
as active HUD chips, persist in saves, and can spawn mobs or pressure survival
stats. This makes each run less predictable while keeping the systems modular.

## Primitive RPG Progression

Files: `src/core/recipes.js`, `src/core/items.js`, `src/systems/Objectives.js`

The dinosaur era now has optional weapon and predator mastery:

- `bone_knife`
- `flint_spear`
- predator defeat tracking in civilization stats
- relic discoveries such as Storm Shelter, Meteor Smith and Saurian Echo

Early Cities starts to shift the game from survival toward planning with food
storage, town lighting and city-planner rewards.

## Progressive UI And Feature Complexity

BlocksCreate now starts with a deliberately small **First Cell** era. The player
only needs to understand a few actions: absorb nutrients, collect minerals,
craft a membrane, place a boundary and stabilize a proto-cell. The next era then
opens the broader survival/building simulation with dinosaurs, fire, shelter,
weapons and hazards. This supports the design principle that the game grows in
complexity as the player evolves.

The cell era now also changes the feel of play: the player drifts instead of
walking, nearby nutrients and mineral vents are absorbed automatically, and the
HUD swaps survival labels toward life/stability. This makes the origin era feel
like a different biological scale instead of a normal character in a tiny cave.

The HUD now also exposes cell stability and the nearest chemical gradient. This
gives the player a learnable loop: drift toward gradients, absorb chemistry,
raise stability, build a membrane and evolve.

## Dinosaur Survival Behaviors

Age of Dinosaurs now reacts more like a survival ecosystem:

- raptors become faster and hit harder in packs,
- a nearby T-Rex creates a fear zone unless the player has defenses,
- peaceful time near stegosaurs or triceratops builds Grazer Bond,
- defended camps are recognized from fire, torches and protective blocks.

This makes the second era a real jump from cell-scale learning into land
survival, preparation and defensive building.

## Save Format

The save now includes:

- `structures`
- `discoveries`
- `powerups`
- `events`
- `world.chunks` with generated/modified chunk indexes, era biomes, and modified chunk snapshots
- `animalPeaceTime`

Older saves remain tolerant because loaders default missing fields.

## Why This Makes The Game More Fun

Players now get surprise rewards for building, exploring, and experimenting. The game can recognize useful structures while still leaving building creative and open-ended. This is the right foundation for blueprints, decorative blocks, relic hunts, era-specific buildings, and shareable structure saves.

## Chunked Exploration

File: `src/world/World.js`

The world still renders from a dense grid today, but it now tracks chunk ids,
modified chunks, chunk snapshots, and deterministic era biomes. That gives
future systems a clean place to attach hidden ruins, rare powerups, local
hazards, and alternate-history consequences without making every column behave
the same.
