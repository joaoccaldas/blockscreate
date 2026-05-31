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

Future relics, rare drops, recipes, or shrine rewards can all call `game.powerups.grant(id)`.

## Save Format

The save now includes:

- `structures`
- `discoveries`
- `powerups`
- `animalPeaceTime`

Older saves remain tolerant because loaders default missing fields.

## Why This Makes The Game More Fun

Players now get surprise rewards for building, exploring, and experimenting. The game can recognize useful structures while still leaving building creative and open-ended. This is the right foundation for blueprints, decorative blocks, relic hunts, era-specific buildings, and shareable structure saves.

