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
| Microbe predators / drift hazards | ✅ |
| **Cell visibly evolves: nucleus → organelles → flagellum → complete** | ✅ |
| **Primordial-sea backdrop (no sky/clouds) + microscope mood** | ✅ |
| **Stage-up celebrations + evolution pip track in the HUD** | ✅ |

The first age now *shows* progress instead of only reporting a number. The cell
is drawn procedurally and grows new structure as stability rises — a bare
protocell gains a nucleus, then energy organelles, then a whipping flagellum,
then a complete-cell glow ready to evolve. The scene is a deep-water microscope
field (light shafts, marine snow, lens vignette) rather than a daytime sky, and
each new organelle fires a toast + sparkle so the player feels the transformation.

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
| **Physical sieges: raiders march on the town & smash through walls** | ✅ |
| **Breach stakes: raiders pillage buildings/stock; guards sally out** | ✅ |
| **Telegraphed raids: horn + HUD muster countdown; rally bonus** | ✅ |

Raiders/bandits (and industrial machines) now path toward the settlement when
the player is away and physically batter any wall too tall to climb. Wall
integrity scales with block hardness — a cobblestone rampart outlasts a thatch
fence, bedrock is immune — so *what you build* is your defense, not an abstract
deterrence roll. Near the player they revert to chasing directly.

The siege loop now has stakes on both sides: town **guards sally out** and fight
raiders within a defensive perimeter (damage scales with guard count, kills earn
CP), and any raider that reaches the town center **pillages** — looting the
stockpile and smashing buildings, which rolls back that building's bonus
(`Civilization.onStructureLost`). Walls buy time, guards win the fight, an
undefended breach costs you.

Sieges are now telegraphed: the big raid sounds a **war horn**, raises a pulsing
**HUD muster countdown**, and waits a ~14s window before the raiders arrive — time
to rush home, raise walls, and light the gate. Being at your town when the raid
lands **rallies the militia**, doubling guard damage for the fight. Defense is now
an active decision, not a passive stat.

**Next & why:** shift focus to the **Industrial Age** — a second production chain
(ore → smelter → machine parts → factory output) so the final era has its own
identity and an automation power-fantasy, mirroring how Iron got defense depth.

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
| Intra-era progression | ✅ 3-stage era evolution with HUD progress and animated stage-up moments | richer per-era stage names/rewards |
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
