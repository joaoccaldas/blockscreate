# Era Roadmap — what each age has, and what's next

BlocksCreate is a "civilization simulation meets Minecraft": you mine and build
block by block, but the goal is to grow a society and carry it across deep time.
This doc inventories each era's current features and the next step for each —
and why — so progression stays the spine of the game.

Status legend: ✅ shipped · 🚧 partial · ⬜ planned

---

## 🫧 First Cell (origin)
The tutorial-era: teaches interaction with the fewest systems.

| Feature | Status |
| --- | --- |
| Swim physics (no gravity, up/down) | ✅ |
| Absorb nutrients / vent minerals on contact | ✅ |
| Stability + gradient guidance HUD | ✅ |
| Craft membrane → proto-cell → evolve | ✅ |
| Era-aware mobile swim controls + guidance banner | ✅ |
| Microbe predators / drift hazards | ⬜ |

**Next & why:** add a gentle microbe threat (something that chases the cell) so
survival has stakes before the dinosaur era. Keep it forgiving — this era's job
is to teach, not punish.

---

## 🦖 Age of Dinosaurs (survival identity)
The "Minecraft survival" core with a prehistoric twist.

| Feature | Status |
| --- | --- |
| Mine/build with tools, tool-tier gating | ✅ |
| Block gravity (sand/gravel) + placement adjacency | ✅ |
| Dinosaurs: stego/trike (passive), raptor/T-Rex (hostile) | ✅ |
| Pack fear / bonding systems | ✅ |
| Meteor showers + asteroid impact craters | ✅ |
| Cold nights, predator migrations, world events | ✅ |
| Fossil/clue blocks + timeline branches (Journal) | ✅ |
| **Settlers** (visible villagers) | ✅ (new) |
| Tameable grazer companions | ✅ |
| Companion commands: follow / stay / guard town | ✅ |
| Rideable grazer companions for faster exploration | ✅ |
| Companion cargo for longer exploration runs | ✅ |
| Alpha raptor challenge event + trophy drop | ✅ |

**Next & why:** add rescue/retreat behavior or gentle companion leveling. Cargo
and mounting make the bond useful; progression would make one companion feel
like a long-term partner.

---

## ⚒️ Bronze Age (first towns)
Where "civilization" should start to dominate over raw survival.

| Feature | Status |
| --- | --- |
| Copper/tin mining, bronze smelting (station-gated) | ✅ |
| Brick + town blocks, settlement scoring | ✅ |
| Workshop structure recognition | ✅ |
| Settlers + housing-gated population | ✅ |
| Farming plots (plant → grow → harvest) | ✅ |
| Farmers tend visible crops into town food | ✅ |
| Granary storage + market surplus trade | ✅ |
| Caravan post converts surplus into rare trade beads | ✅ |
| Trade / market between settlements | 🚧 local caravans only |
| Irrigation / crop rotation / spoilage | ⬜ |

**Next & why:** add irrigation and field quality so farming asks for planning,
not only planting. Bronze should become the first "sustain a town" puzzle.

---

## 🛡️ Iron Age (cities & defense)

| Feature | Status |
| --- | --- |
| Iron/gold smelting, iron tools | ✅ |
| City lighting objective, watchtower structure | ✅ |
| Raiders/bandits hostile waves | ✅ |
| Gates/guards/tamed companions deter raids | ✅ |
| Roads that speed travel | ✅ |
| Siege raids that bypass scout deterrence | ✅ |

**Next & why:** make sieges physical: raiders should path toward gates, damage
weak walls, and retreat if the town holds. That makes defense architecture matter.

---

## 🏭 Industrial Age (acceleration)

| Feature | Status |
| --- | --- |
| Era theme (smog, ash, machines) | ✅ |
| Machine enemies | ✅ |
| Auto Miner automation block | ✅ |
| Pollution tradeoff system | ✅ first pass |
| Windmill clean-power block | ✅ |

**Next & why:** add a second production chain (factory/workshop/rail) so clean
power matters as part of an automation network, not just a pollution reducer.

---

## Cross-cutting (all eras)

| System | Status | Next |
| --- | --- | --- |
| Settlers / population | ✅ roles + economy; builders raise village blocks and complete planned build sites; gatherers seek + harvest trees/ore; farmers tend visible crop plots | richer pathing; recognizable house plans |
| Journal (clues/discoveries/branches) | ✅ | per-era lore pages |
| Save/persistence (+ chunk metadata) | ✅ | true chunk streaming |
| Audio | ✅ SFX + ambient | per-era music themes |
| Accessibility | ✅ reduce-motion, focus, landing settings | colorblind palette, font scale |
| Balance | 🚧 | playtest predator/drought/absorption pacing |

## Why this order
The game's promise is **civilization across time**. Each era's "next" item is
chosen to strengthen that era's *distinct identity* (cell = learn, dinosaurs =
survive, bronze = sustain, iron = defend, industrial = automate) rather than
adding generic content — so advancing an era always feels like a new kind of
play, not just new textures.
