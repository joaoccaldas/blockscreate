# Toward an infinite, persistent civilization sandbox — eval + next 30

Evaluation of BlocksCreate v5.51.0 and a prioritized roadmap to expand it into a
fun, **infinite, expansive, persistent** world with branching realities where
players explore/build/mine/create endlessly.

## Where the game is vs. the vision

| Vision | Reality today | Gap |
| --- | --- | --- |
| Infinite, expansive world | **Fixed 320×110 strip** per era; chunk *metadata* exists, no real streaming | **Structural — the #1 gap** |
| Persistent world | **One** localStorage save slot, autosave 20s | No slots, no continuity across realities, no cloud |
| Endless play | Finite era ladder; Industrial/Republic are **terminal** | No New Game+/prestige/endgame loop |
| Branching realities | Graph + 2 early branches (Flora, Republic) | Branches **reskin**, don't play differently |
| Build/create endlessly | ~48 blocks, crafting, automation chain | Shallow vs Minecraft/Terraria; no blueprints/logic |
| Explore endlessly | Decorations, clues, anomalies | No dungeons/POIs/NPCs/quests; world ends at edges |

**What's genuinely strong:** clean modular architecture, data-driven era graph,
reality variants + codes, the timeline→anomaly→simulation mystery, daily/share
loops, per-era music, goal beacon, the Chronicle clock. 32 test suites, zero
TODO/FIXME. The *foundation* is excellent; the *world* is small and the *endgame*
is absent.

## Known issues / risks (not crashes — design gaps)
- Bounded world: you hit invisible walls; no reason/way to explore far.
- Single save slot: a new game **overwrites** the old; no multi-reality saves.
- Terminal eras dead-end the run.
- Civ panel is **crowding** (Chronicle + era-story + ~7 rows + sub-panels); the
  Clock is **hidden on mobile** (collapsed civ panel).
- Portal screen lists branch eras as locked cards (spoils the surprise).
- Branch eras reuse mobs/blocks → read different, play the same.

---

## Shipped from this roadmap (as of v5.54)
- ✅ **#1 horizontal world** — `world.expand()` grows the strip as you walk
  (already wired before this roadmap).
- ✅ **#2 deep mining** (v5.52) — worlds ~150 tiles deep; deep-stone layer,
  crystal treasure, magma hazard.
- ✅ **#11 New Game+ / prestige** (v5.53) — "Descend a Layer" reboots from the
  First Cell one simulation deeper, with a compounding, capped, persisted legacy.
- ✅ **#29 (part)** minimap (v5.54) — a corner side-view to navigate the deep/wide
  world. *Remaining #29:* civ-panel declutter + a mobile-visible clock.
- ✅ **Audit fixes** (v5.55) — the portal no longer spoils branch ages (undiscovered
  branches are hidden until routed into); `Civilization.cpMult` initialised.

Next structural targets: **#7 named save slots**, the rest of **#29**, and
**#15 branch-distinct mechanics**.

## The next 30 improvements (prioritized)

### A. The infinite world (structural core) — do first
1. **Horizontal chunk streaming** (P0) — generate/free 32-wide chunks around the
   player so the world is endless left/right. *How:* the chunk scaffolding exists;
   make World generate on demand past the loaded range, RLE-persist edited chunks,
   free far ones. Unlocks everything below.
2. **Deep mining (vertical expansion)** (P0) — extend height + ore/biome layers by
   depth (stone→deepstone→magma) so "mine endlessly" is real.
3. **Procedural biomes along the strip** (P1) — forests, deserts, tundra, swamps,
   oceans with their own blocks/mobs, seeded by position. Makes exploring worth it.
4. **Cave systems & ravines** (P1) — noise-carved underground networks with loot.
5. **Points of interest** (P1) — ruins, villages, shrines, dungeons spawned on a
   seeded grid; the reward that pulls exploration.
6. **World border as lore, not wall** (P2) — at extreme distance the world
   "un-renders" (ties to the simulation mystery) instead of an invisible wall.

### B. Persistence & continuity
7. **Multiple save slots / named worlds** (P0) — stop overwriting; let players keep
   several realities. *How:* key saves by world id; a load/manage screen.
8. **One persistent meta-world across eras** (P1) — advancing an era *transforms*
   the same coordinates rather than regenerating, so your build history persists
   through time. The headline "persistent" feature.
9. **Cloud/export sync via reality codes** (P2) — already have codes; add
   import/restore of full saves by code/file for cross-device continuity.
10. **Auto-snapshot history** (P2) — keep the last N autosaves to undo disasters.

### C. Endless / late-game loop
11. **New Game+ "descend a layer"** (P0) — finishing the final era boots the next
    nested simulation, carrying a relic forward (pays off the sim-within-sim
    premise; gives the endgame a loop).
12. **Prestige / civilization legacy** (P1) — persistent meta-currency + permanent
    perks across runs (faster mining, extra settlers) — the "always progressing"
    hook.
13. **Procedural / endless eras past Industrial** (P1) — Electric→Information→
    Space→… as data, so the ladder never truly ends.
14. **Endless "Sandbox" mode** (P1) — a no-objective, infinite creative-survival
    world for pure building.

### D. Branches & realities (make them *play* different)
15. **Branch-distinct mechanics** (P0) — Flora = farming/ecology focus, Republic =
    trade/economy focus, with unique blocks/objectives/win-states, not reskins.
16. **More early branches** (P1) — a Fungal/Abyssal cell path, a Nomad vs Settler
    fork in the stone age — so the first hour has real replay.
17. **Cross-reality rifts you can enter** (P1) — step through a rift into a short
    parallel slice for loot, then return (tangible "realities meet").
18. **Reality-specific assets** (P2) — palette/sprite swaps per branch so an
    alternate timeline *looks* unmistakably other.

### E. Build & create depth
19. **Blueprints / copy-paste & save structures** (P1) — design once, stamp
    anywhere; share blueprint codes. Huge for creativity.
20. **Logic blocks (redstone-like)** (P1) — wires, switches, gates → contraptions;
    the single biggest creative-longevity lever Minecraft proved.
21. **2–3× more blocks + decorative set** (P1) — slabs, stairs, glass, paint,
    furniture; building variety.
22. **Liquids & physics** (P2) — flowing water/lava, farming irrigation, hazards.
23. **Vehicles / rails / mounts across eras** (P2) — carts, boats, tamed mounts;
    traversal of the now-infinite world.

### F. Explore & quest depth
24. **NPCs & quests** (P1) — wandering traders, settlers with requests, era
    questlines that hand out goals and lore.
25. **Dungeon/boss encounters** (P1) — a reason to gear up; a defeat→loot loop.
26. **A codex/almanac hub** (P1) — one screen unifying journal/map/achievements/
    bestiary so the now-sprawling content is *discoverable* (fixes a real UX gap).

### G. Simulation depth
27. **Seasons & weather cycles** (P1) — visible time passing; affects farming,
    hazards, mood (ties to the Chronicle clock).
28. **Living ecology & settler AI** (P2) — predator/prey, settler needs/jobs/
    happiness, a town that grows believably.

### H. UI/UX & polish (verifiable now)
29. **HUD declutter + mobile clock + minimap** (P0) — collapse the civ panel into
    tabs, surface the Chronicle on mobile, add a corner minimap for the infinite
    world. Fixes the crowding the eval flagged; testable via layout guards.
30. **Evolving player avatar + richer sprites/parallax** (P1) — the player form
    visibly changes across eras/phases (you asked for this); parallax sky +
    nicer sprites lift the "is this finished?" read for new players.

## Build order
**Foundation first:** #1 streaming → #2 deep mining → #7 save slots → #11 New
Game+ → #29 HUD/minimap → #15 branch-distinct mechanics. These convert the
bounded era-ladder into the endless, persistent, branching sandbox the vision
describes; everything else (biomes, POIs, blueprints, logic, NPCs) layers on the
streaming world.

> **Process caveat:** ~18 hours of features are verified only headlessly (32
> suites). Before/early in this expansion, a real **on-device playtest + balance
> pass** is the highest-value non-code action — it will reshape priorities here.
