# Game Evaluation - age features, confidence, and gaps

Audit date: 2026-06-01
Build audited: v5.13.0
Verification: `npm test` passes all 10 suites.

Confidence legend:

- **High**: covered by automated tests and/or direct source inspection.
- **Medium**: implemented and source-backed, but needs more playtest/balance.
- **Low**: present mostly as data/theme framing, not a deep mechanic yet.

## Overall Read

BlocksCreate now credibly has the spine of "Minecraft + RPG + Civilization":
mine/place/craft, survive enemies and hazards, unlock eras, keep a journal,
discover clues, grow population, and watch settlers turn resources into a
village. The strongest stretch is First Cell -> Age of Dinosaurs -> early Bronze
settlement, because those eras have distinct verbs. Later ages exist and are
playable, but Iron and Industrial still lean too much on reskinned survival
instead of age-defining systems.

The core fun loop works:

1. Gather resources.
2. Craft tools/blocks.
3. Build recognized structures.
4. Earn CP and complete objectives.
5. Unlock the next era.
6. Grow a visible settlement with settlers.

The main gap is depth per age. The game has many good systems, but only some
are deep enough to feel like a new genre layer rather than new content.

## First Cell

Confidence: **High**

What works:

- Distinct movement: swimming/drifting instead of normal land physics.
- Auto-absorption of nutrients and mineral vents teaches collection gently.
- Stability, gradients, membrane crafting, and proto-cell stabilization create a
  compact origin-of-life loop.
- Era-aware mobile controls expose up/down swim buttons.
- Onboarding and HUD language are different from later survival eras.

What does not work yet:

- No enemy/hazard pressure, so the era is mostly a tutorial and resource hunt.
- The science is a playful abstraction, not a simulation.
- It ends before there is much choice or mastery.

Best next improvement:

- Add a gentle microbe/drift hazard that threatens stability but is forgiving.
  This gives the first age stakes without making the opener hostile.

## Age of Dinosaurs

Confidence: **High**

What works:

- Strongest age identity: dinosaurs, raptors, T-Rex, grazers, meteor showers,
  cold nights, fossils, clues, and alternate-history framing.
- Minecraft-style survival is real: mining, tools, crafting, hunger, combat,
  shelters, fire, block gravity, and placement adjacency.
- RPG layer exists: predator defeat tracking, relic-style powerups, hidden
  discoveries, journal entries, and mastery goals.
- Grazer bond, pack pressure, and T-Rex fear make animals more than simple mobs.
- Full Grazer Bond now tames a nearby stego/trike into a persistent companion
  that follows the player and counts as dinosaur/town defense.
- Companions are now commandable: follow, stay, or guard town. Guarding grazers
  move toward the settlement and can defend it from raids.
- Companions are now rideable: mounting near a tamed grazer boosts travel speed,
  reduces travel hunger drain, updates HUD/touch controls, and persists in saves.
- Companions now have small cargo storage, so long exploration trips are less
  inventory-constrained and the grazer has a practical role beyond speed.
- Alpha raptors now create a rare stronger predator challenge and drop a trophy
  item, giving the age a better "come prepared" test.
- Asteroid/meteor events can physically change terrain and create clue blocks.

What does not work yet:

- Predator and event balance still needs real playtest tuning.
- Mounted companions are fast travel/cargo helpers, not full combat mounts yet.
- Dinosaur systems are fun, but not yet story-resolving; alpha raptors are a
  first boss-like step, not a finale.

Best next improvement:

- Add companion rescue behavior or leveling so the grazer becomes a long-term
  survival partner, not only a useful transport/storage tool.

## Bronze Age / Early Cities

Confidence: **Medium-High**

What works:

- Bronze has the first real civilization identity: copper/tin, smelting, bricks,
  workshop recognition, town blocks, raider pressure, drought events, and
  settlement growth.
- Settlers are now a real mini-economy:
  farmers produce food, gatherers physically seek and harvest trees/ore, builders
  spend stockpiled wood to place village blocks, and guards add defense.
- Farming is now physical: players craft farm plots, plant wheat seeds, crops
  grow through visible stages, ripe wheat can be harvested, and farmers tend
  crop blocks into town food stock.
- Granaries raise storage and markets convert wheat/ore surplus into CP, making
  food surplus economically useful.
- Caravan posts now consume food/wheat surplus and return rare trade beads plus
  CP, so markets produce a collectible reward instead of only score.
- Build-site markers let players direct builders toward a specific small
  structure, making settlement growth less random.
- Housing gates supported population, so building matters.
- HUD exposes role counts and town stockpile.

What does not work yet:

- Markets/caravans are local town trade, not multi-settlement trade yet.
- Builders complete planned sites, but the result is still a small generic
  structure rather than a catalog of recognizable houses/workshops.
- Farming balance is intentionally simple: no irrigation network, spoilage,
  crop rotation, seed quality, or storage cap yet.

Best next improvement:

- Add irrigation and field quality so Bronze farming becomes a planning puzzle.

## Iron Age / Iron Kingdoms

Confidence: **Medium**

What works:

- Iron/gold ore generation, smelting, iron tools, city-lighting objectives, and
  watchtower recognition are implemented.
- Raider/bandit hostility gives the era a defense theme.
- Gates, guards and tamed companions now deter raider/bandit spawns; roads give
  the player a movement boost.
- Siege raids now bypass the scout deterrence path and spawn a small bandit
  party, so defended towns can still be tested.
- Iron-era manifests, decorations, objectives, and progression gates exist.

What does not work yet:

- Siege raids exist, but they are spawn pressure rather than full wall/gate
  pathing and damage.
- Roads/laws/expansion are mostly thematic data, not mechanics.
- Roads are functional speed tiles, but law/expansion are still mostly thematic.

Best next improvement:

- Make sieges physical: raiders path to gates, damage weak walls, and retreat if
  defenders hold.

## Industrial Age

Confidence: **Low-Medium**

What works:

- Industrial era exists as a playable destination with smog/ash/machine theming.
- Machine enemies and industrial decorations give it a visual identity.
- It is included in era registry, manifests, themes, and progression.
- Auto Miners now generate ore over time and add pollution, making automation a
  real tradeoff instead of only a theme.
- Windmills now reduce pollution and offset Auto Miner output, adding the first
  clean-power choice.

What does not work yet:

- No power grid, factories or rails yet.
- Pollution is a light pressure with clean-up, not a full environmental
  simulation.
- Automation exists as one block, so the age has identity but not depth.

Best next improvement:

- Add a second production chain so wind power, machines and pollution become a
  real factory puzzle.

## Cross-Cutting Systems

High confidence:

- Saves/migration tolerate new fields and persist major systems.
- Journal and era intro make history/discovery more legible.
- Objectives gate progression with mandatory/mastery/portal categories.
- Generated assets are checked for dimensions and validity.
- CI is configured for Node 22; generated-art byte drift is advisory.

Medium confidence:

- Balance: hunger, predator damage, droughts, raider pressure, settler output,
  and CP pacing need full-run playtests.
- World expansion works horizontally with modified chunk snapshots, but true
  streaming chunks are not finished.
- Mobile controls exist and are tested structurally, but need hand-feel testing.

Low confidence / not done:

- True diplomacy/trade between settlements.
- Deep pathfinding for settlers and enemies.
- Multi-town simulation.
- Deep industrial automation and pollution.
- Shareable summaries/screenshots.

## GitHub Status

As of this audit, local `main` is prepared for the v5.13 gameplay commit. The
gameplay work through v5.13 should be pushed to GitHub with the code and docs
together so the evaluation stays versioned with the game. GitHub Actions may
still show red if the account-level billing lock remains; that is separate from
local test health and Pages deploy behavior.

## Priority Order

1. Companion rescue behavior / light leveling.
2. Irrigation and field quality: makes Bronze farming strategic.
3. Physical siege pathing/damage: makes Iron architecture matter.
4. Second Industrial production chain: turns windmills into factory strategy.
5. Recognizable build-site plans: lets builders create named town structures.
6. True chunk streaming: engine milestone for bigger worlds.
