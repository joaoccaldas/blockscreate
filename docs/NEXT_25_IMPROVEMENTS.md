# Next 25 Improvements

This queue is ordered by expected fun impact for the "Minecraft + RPG +
Civilization" promise: build, explore, survive, bond, automate, and watch a
society persist.

| # | Improvement | Why It Matters | How To Wire | Test |
| --- | --- | --- | --- | --- |
| 1 | Intra-era evolution stages | ✅ Shipped in v5.14: makes each task feel like the age is visibly changing. | 3-stage progress from mandatory objectives, HUD bar and animated stage-up toast. | Stage thresholds work; save/load preserves current stage. |
| 2 | Hidden simulation anomalies | ✅ Shipped in v5.15: adds strange one-shot world lapses that reward curiosity without explaining the secret. | `SimulationAnomalyLog` watches stage progress, meteors, companion bonding and clue pressure; anomalies reveal observer-branch journal clues. | Anomalies are gated, one-shot, saved, and unlock the hidden Observer Pattern discovery. |
| 3 | Living hint system | ✅ Shipped in v5.16: keeps new players moving and teaches artifact curiosity when progress stalls. | `GuidanceHints` watches quiet time since progress, active objectives, clues and era stages; emits cooldown-limited HUD nudges. | Hints wait before firing, avoid spam, reset on progress and persist seen hints. |
| 4 | Companion rescue | Turns grazers from transport into protective partners. | Add danger detection, retreat-to-town behavior and rescue cooldown to `Mob`. | Rescue state persists; retreat triggers near lethal danger; cooldown prevents spam. |
| 5 | Irrigation and soil quality | Makes Bronze farming a planning puzzle. | Add water-nearby fertility score and crop growth modifiers. | Crop growth faster near irrigation, slower on poor soil. |
| 6 | Physical siege pathing | Makes Iron walls and gates matter. | Give raiders a town/gate target and simple wall damage/retreat rules. | Raiders path to gates; gates absorb damage; defended towns survive. |
| 7 | Companion cargo | ✅ Shipped in v5.13: longer, friendlier exploration loops. | Six cargo slots on tamed grazers with `V` / `📦` transfer. | Items persist; capacity enforced; transfer works. |
| 8 | Microbe hazard | Gives First Cell gentle stakes. | Add drifting hostile microbe that drains stability on touch. | Hazard spawns, chases weakly, reduces stability, never hard-locks. |
| 9 | Industrial factory chain | Gives late game a real production puzzle. | Add factory block converting ore/coal into parts with pollution. | Factory consumes stock, outputs parts, raises pollution. |
| 10 | Pollution consequences | Makes Industrial choices meaningful. | Tie high pollution to hunger drain, crop slowdown, hostile machine rate. | Pollution thresholds affect survival and farming. |
| 11 | Roads and caravans network | Connects building with exploration. | Track road-connected market/caravan posts and apply trade multiplier. | Connected posts trade more; broken road lowers output. |
| 12 | Multi-town outposts | Makes exploration persistent. | Let build sites claim small outposts with local stock. | Outpost serializes and receives caravan/resource benefits. |
| 13 | Quest-style discoveries | Gives RPG direction without handholding. | Add clue chains that unlock era-specific optional objectives. | Discovering clue A unlocks objective B once. |
| 14 | Companion leveling | Rewards keeping one grazer alive. | Add XP from travel/defense; unlock speed/cargo/guard bonuses. | XP persists; levels apply expected modifiers. |
| 15 | Enemy telegraphs | Makes combat fairer and more expressive. | Add wind-up state before heavy attacks for rex/alpha/bandits. | Damage only lands after telegraph window. |
| 16 | Better combat feedback | Makes fighting readable. | Add hit arcs, knockback tuning, low-health enemy bars. | Hostile damage/hurt states render and remain deterministic. |
| 17 | Seasonal pressure | Adds rhythm to food/storage. | Add mild seasonal timer affecting crops, drought, cold. | Season changes modify growth and events. |
| 18 | Storage buildings UX | Makes town economy legible. | Add granary/stock panel showing caps and flow. | HUD reflects stock caps and updates after production. |
| 19 | NPC schedules | Makes settlers feel alive. | Give roles day/night anchors: farm, build, guard, sleep. | Role target changes by day factor. |
| 20 | Town happiness | Makes civ simulation more than CP. | Derive happiness from food, safety, housing and pollution. | Happiness affects population growth and persists. |
| 21 | Rails or carts | Gives Industrial exploration identity. | Add rail block speed path and cart mount later. | Rail speed applies only on rails and saves. |
| 22 | Ruins and dungeons | Gives exploration set pieces. | Generate small structures per era/biome with loot/clues. | Ruins spawn deterministically and serialize edits. |
| 23 | Better world map | Helps navigation and settlement planning. | Add minimap/journal map from explored columns and town markers. | Explored map persists; markers update. |
| 24 | Inventory quality pass | Reduces friction. | Add quick transfer, stack split, item search/category filters. | Inventory operations preserve counts. |
| 25 | Accessibility polish | Broadens playability. | Add colorblind palette, font scale, key remap storage. | Settings persist and UI reflects choices. |
| 26 | Browser E2E smoke | Catches deploy-only issues. | Add Playwright menu -> start -> move -> save -> reload path. | E2E runs headless against local server. |
| 27 | Shareable settlement summary | Makes achievements social. | Generate run card from era, structures, companions, town stats. | Summary data matches save state. |

## Current Pick

Rideable grazers shipped in v5.12, companion cargo shipped in v5.13,
intra-era evolution stages shipped in v5.14, hidden simulation anomalies shipped
in v5.15, and living hints shipped in v5.16. The next best follow-up is
companion rescue/retreat behavior, because it turns the grazer from useful
equipment into a creature that can save the run.
