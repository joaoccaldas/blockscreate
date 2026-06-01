# Game Evaluation — systems, depth, and what's next

A grounded read of the current build (v5.0). Each section: **where we stand**,
**the gap**, and **the next step**.

## Landing page
- **Stand:** hero art (cell→dinos), tagline, era-journey strip, feature
  highlights, Play/Continue/How-to. Communicates the premise at a glance.
- **Gap:** still a single static image; no motion preview of actual gameplay.
- **Next:** an animated canvas teaser (a looping mined/placed block + walking
  player) and per-era hero art that swaps with your furthest-unlocked age.

## Building / mining logic
- **Stand:** hold-to-mine with hardness-based timing; tool tier multiplies speed.
  **Tool gating** now refuses too-weak/wrong tools (`minTier` per block, e.g.
  stone needs a pickaxe, iron ore needs a stone pickaxe) with a hint toast.
  **Gravity** drops unsupported sand/gravel (after mining, placing, or a meteor
  crater). **Placement adjacency** requires a neighboring block, so you can no
  longer build in mid-air. Creative ignores gating. Covered by `test/mechanics.mjs`.
- **Gap:** no fluid flow (water is static); no multi-block structures with
  integrity; no block-specific mining sounds.
- **Next:** simple water spread; era-specific dig sounds; ladders/scaffolding.

## Recipes
- **Stand:** 24 recipes, era-gated, station-gated (campfire smelting/cooking),
  with per-ingredient have/need UI feedback. First Cell → Industrial covered.
- **Gap:** flat list; no categories, no search, no "show only craftable", no
  recipe discovery (everything for the era is visible immediately).
- **Next:** group by category (tools/blocks/smelting), a craftable-only filter,
  and lock advanced recipes behind a discovered ingredient or station.

## Inventory
- **Stand:** 36 slots + 9 hotbar, stacking, labeled cells, tap-to-hotbar,
  scroll/number selection.
- **Gap:** no **drag-to-rearrange**, no **stack split**, no **trash/drop**, no
  sort. Picking only swaps with the active hotbar slot.
- **Next:** drag-and-drop between slots, shift-click quick-move, split on
  right-click, and a sort button.

## Tasks / objectives
- **Stand:** per-era mandatory + mastery + portal objectives, sticky, saved,
  CP rewards, gate the next era. Onboarding teaches the loop.
- **Gap:** objectives are global per era, not chained or branching; no
  daily/optional bounties; completed ones vanish (no journal of achievements).
- **Next:** an objective/achievement log (Tier-2 Journal), branch-specific
  goals, and repeatable bounties tied to world events.

## Historical events
- **Stand:** `WorldEvents` drives cold nights, meteor showers, predator
  migrations, grazer herds, droughts, raider scouts — with HUD states, cooldowns
  and save persistence; meteors drop physical clue blocks.
- **Gap:** events are mostly Age-of-Dinosaurs flavored; later eras reuse few.
  No player-visible "event log" or forecast; effects are light (mostly spawn
  pressure).
- **Next:** per-era event tables, a small event-history panel, and deeper
  consequences (drought spoils stored food, raids damage placed blocks).

## Features & possibilities (backlog, ranked)
1. **Tier-2 UI**: Journal (clues/discoveries/branches), era-intro screen,
   settings on landing. *(highest player-facing value)*
2. **Mining/placing rules**: tool gating, gravity, placement adjacency.
3. **Inventory UX**: drag/split/sort/trash.
4. **Crafting UX**: categories + craftable filter + recipe discovery.
5. **NPC settlers**: population spawns villagers that gather/build, making CP
   feel alive.
6. **Per-era enemies & bosses** (e.g. an era-ending threat).
7. **Animated per-era hero art** on the landing page.
8. **Audio depth**: per-era ambient tracks, more SFX variety.
9. **True chunk streaming** (engine milestone already scoped).
10. **Shareable run summaries / screenshots.**
