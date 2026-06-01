# Game Evaluation - age features, confidence, and gaps

Audit date: 2026-06-01
Build audited: v5.7.0 (`a5a7821`)
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
- Asteroid/meteor events can physically change terrain and create clue blocks.

What does not work yet:

- Grazer bonding is tracked, but not yet a tangible companion/mount/guard reward.
- Predator and event balance still needs real playtest tuning.
- Dinosaur systems are fun, but not yet boss-like or story-resolving.

Best next improvement:

- Turn grazer bond into a tameable companion. That would make this age's unique
  social/survival mechanic pay off on screen.

## Bronze Age / Early Cities

Confidence: **Medium-High**

What works:

- Bronze has the first real civilization identity: copper/tin, smelting, bricks,
  workshop recognition, town blocks, raider pressure, drought events, and
  settlement growth.
- Settlers are now a real mini-economy:
  farmers produce food, gatherers physically seek and harvest trees/ore, builders
  spend stockpiled wood to place village blocks, and guards add defense.
- Housing gates supported population, so building matters.
- HUD exposes role counts and town stockpile.

What does not work yet:

- Farming is not yet physical. Food exists, but crops do not have plant -> grow
  -> harvest gameplay.
- Trade/markets are only roadmap concepts.
- Builders place useful village blocks, but they do not yet path to a planned
  construction site or build recognizable houses.

Best next improvement:

- Add farming plots with growth and settler tending. This is the missing
  sustain loop that makes Bronze feel like a food-producing town instead of a
  survival camp with villagers.

## Iron Age / Iron Kingdoms

Confidence: **Medium**

What works:

- Iron/gold ore generation, smelting, iron tools, city-lighting objectives, and
  watchtower recognition are implemented.
- Raider/bandit hostility gives the era a defense theme.
- Iron-era manifests, decorations, objectives, and progression gates exist.

What does not work yet:

- Walls and gates are not functionally strategic yet. They can be built, but
  raiders do not meaningfully path around, siege, or respond to them.
- Roads/laws/expansion are mostly thematic data, not mechanics.
- The age risks feeling like "Bronze plus iron pickaxe" rather than a new civic
  phase.

Best next improvement:

- Make walls/gates mechanically defensive: block raids, funnel enemies, and
  contribute to city safety. That turns building into strategy.

## Industrial Age

Confidence: **Low-Medium**

What works:

- Industrial era exists as a playable destination with smog/ash/machine theming.
- Machine enemies and industrial decorations give it a visual identity.
- It is included in era registry, manifests, themes, and progression.

What does not work yet:

- No power, factories, rails, automation, or pollution tradeoff mechanics.
- Recipes currently stop at Iron; Industrial is mostly an endpoint/theme.
- It does not yet deliver the "acceleration" fantasy.

Best next improvement:

- Add one automation block first, not a whole factory system: a powered miner or
  conveyor with a small pollution cost. One real automated verb would define the
  age better than several decorative blocks.

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
- Industrial automation and pollution.
- Shareable summaries/screenshots.

## GitHub Status

As of this audit, local `main` is fast-forwarded to `origin/main` at `a5a7821`.
The gameplay work through v5.7 is on GitHub. This audit is stored as a follow-up
documentation commit so the evaluation itself is versioned with the game.

## Priority Order

1. Bronze farming plots: completes the food economy and gives farmers visible
   work.
2. Dinosaur taming: turns bonding into a reward and makes the dinosaur age more
   memorable.
3. Iron walls/gates: makes defense strategic instead of decorative.
4. Industrial automation block: gives the final age a real identity.
5. Better pathing: makes settlers/enemies feel intentional.
6. True chunk streaming: engine milestone for bigger worlds.
