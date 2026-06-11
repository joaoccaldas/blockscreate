# The Era Graph — canonical roadmap for all ages

> This document is the **single source of truth** for how the game's ages connect.
> It is encoded as data in [`src/core/eraGraph.js`](../src/core/eraGraph.js) and
> guarded by [`test/era-graph.mjs`](../test/era-graph.mjs). **Always follow it:**
> adding or routing an era means editing the graph here and there together, and
> keeping the invariants green.

## Premise

The game is **infinite**. Ages are not a line — they are a **directed graph of
realities**. A run *begins* linear (the prime spine), but the branch of reality a
player leans into can route them into **different next ages**, and high-divergence
realities occasionally **cross** — another era's reality bleeds into the current
one. Two players can therefore reach the same far age by different routes, or end
up in ages the other never saw.

Three edge types:

- **prime** — the default spine. Every non-terminal *implemented* era has exactly
  one prime out-edge, so a player who expresses no strong branch always advances.
- **branch** — a route taken only when the player's **dominant reality branch**
  (the Journal's "timeline leaning", derived from clue `branch` counts) matches,
  *and* the destination era is implemented.
- **cross** — a non-adjacent "realities meet" link, surfaced as a Timeline
  crossover/rift (the bleeds in `Timeline`/`Simulation`): another reality's mobs,
  blocks, or clues briefly intrude. Crosses never *move* the player; they enrich
  the current age.

## Reality branches

Branches come from the clue/anomaly `branch` tags already in the game
(`HistoricalClues`, `SimulationAnomalies`). Current branch ids and the lean they
represent:

| Branch id | Lean | Seeds from |
| --- | --- | --- |
| `saurian_echo` | beasts & deep time | fossils, meteor shards |
| `firekeepers` | fire & culture | charcoal handprints |
| `accurate_line` | survival → movement | migration markers |
| `merchant_city` | trade & wealth | markets, caravans |
| `road_empire` | infrastructure | roads |
| `fortress_city` | defense & war | walls, gates |
| `city_state` | dense settlement | civic density |
| `observer` | the meta-layer | anomalies |

New branches are added alongside new clues; a branch only *matters* where a route
references it.

**How routing happens in play:** `Game._dominantBranch()` blends the clue tally
with *playstyle* signals — trade level → `merchant_city`, roads → `road_empire`,
defense/gates → `fortress_city` — and only diverges off the prime spine when a
lean is clearly dominant (weight ≥ 3). So a trade-heavy Iron player evolves into
the **Trade Republic** instead of the Industrial Age; a default player stays on
the spine.

## The graph

Tiers are depth from the origin. ✅ = implemented and playable today; 🔭 = on the
roadmap (encoded as a node with `implemented:false`, so routing skips it until it
ships, then it activates automatically).

### Prime spine (always linear by default)

| Tier | Era | id | Status |
| --- | --- | --- | --- |
| 0 | 🫧 First Cell | `cell` | ✅ |
| 1 | 🦖 Age of Dinosaurs | `stone` | ✅ |
| 2 | ⚒️ Bronze Age | `bronze` | ✅ |
| 3 | 🛡️ Iron Age | `iron` | ✅ |
| 4 | 🏭 Industrial Age | `industrial` | ✅ |
| 5 | ⚡ Electric Age | `electric` | 🔭 |
| 6 | 💾 Information Age | `information` | 🔭 |
| 7 | 🚀 Space Age | `space` | 🔭 |
| 8 | 🧠 Synthetic Age | `synthetic` | 🔭 |
| 9 | 🌌 Simulation Age | `simulation` | 🔭 |
| 10 | ♾️ The Stack | `stack` | 🔭 (meta-capstone; New Game+ "descend a layer") |

### Branch ages (reached via a dominant branch)

| Tier | Era | id | Reached from → via branch | Rejoins | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | 🌿 Age of Flora | `flora` | `cell` → `photic` (a Sunlit-Shallows start) | → `bronze` | ✅ |
| 4 | 🏛️ Trade Republic | `republic` | `iron` → `merchant_city`/`road_empire` | → `information` | ✅ |
| 5 | 🜨 Steam Arcanum | `arcanum` | `industrial` → `firekeepers` (clockwork) | → `information` | 🔭 |
| 8 | 🧬 Bio-Singularity | `bio` | `information` → `saurian_echo` | → `simulation` | 🔭 |

\* `photic` is a future **cell** branch (a light-seeking first cell); it ships with
the Age of Flora.

### Crossings (realities meet — no era change)

| Cross | Where it can fire | What bleeds in |
| --- | --- | --- |
| Saurian Echo rift | `iron`+ at glitch divergence | dinosaur mobs/fossils intrude |
| Guild rift | `industrial` with `merchant_city` lean | Trade-Republic goods/relics |
| Garden rift | any era, rift divergence | Age-of-Flora flora + a seed-clue |
| Observer rift | any era, rift divergence | the meta-layer (see `Simulation`) |

Crossings are realized by the existing `Timeline` glitch/rift staging and the
`Simulation` arc; new crosses are added as data here and a staging branch there.

## Branch ages play differently (not just reskins)

Each age can declare **modifiers** in `src/core/eraModifiers.js` that bend the
core loops, so a branch is a different *game*, not different art:

- **🌿 Age of Flora** (cultivation): `cropGrowth ×2.2`, foliage drops bonus fiber,
  grazers bond faster — building a living garden is the point.
- **🏛️ Trade Republic** (commerce): `tradeRate ×1.9`, `tradeYield ×1.6` — wealth,
  not war, grows the civilization.

Prime ages stay neutral. Adding an identity = one entry; covered by
`test/era-modifiers.mjs`.

## Invariants (enforced by `test/era-graph.mjs`)

1. Every **implemented** era is reachable from `cell` using only implemented routes.
2. Every non-terminal implemented era has **exactly one `prime`** out-edge to an
   implemented era (so default progression never dead-ends or forks ambiguously).
3. No route targets an unknown era id.
4. `branch` routes name a real branch id from the table above.
5. The prime spine order matches the `tier` ordering (prime edges go strictly
   deeper by tier).
6. Terminal eras (no implemented out-edge) are allowed only at the deepest
   implemented tier (today: `industrial`; later: `stack`).

## How to add an era (the extensibility contract)

1. Add the node to `ERA_NODES` (tier, name, icon) and at least one **inbound**
   route (prime or branch) from an implemented era in `ERA_ROUTES`.
2. Implement it as a real world: an entry in `src/core/eras.js`, plus its
   blocks/recipes/objectives/manifest.
3. Flip the node to `implemented:true`. Routing to it activates automatically and
   the prime spine extends by one.
4. Update this table and keep `test/era-graph.mjs` green.

Because routing always falls back to the prime spine when a branch destination
isn't implemented yet, **partial graphs are always playable** — the future is
encoded but never blocks the present.

## Reality variants (the modular asset/skin layer)

Each era × branch (× future universe) can look and feel distinct via **variants**
— a data-only "skin" layer in `src/core/eraTheme.js` (`ERA_VARIANTS`), guarded by
`test/variants.mjs`. A variant is a *partial* theme: any field it sets (tint,
accent, weather, decorations, and later sky/sprites/world-gen flavor) overrides
the base era theme; everything else is inherited. So a new reality's look is just
a data entry — no engine changes.

- **Chosen by `pickVariant(eraId, { branch, seed })`:** a branch-named variant
  when the player routed in via that branch; otherwise a *seed-derived* one, so
  even the **first era differs every run** and is shareable ("I got the Abyssal
  start"). The choice is saved on the world (`world.variant`) and persists.
- **Shipped variants today:** First Cell — Hydrothermal Vents / Sunlit Shallows /
  Abyssal Dark; Dinosaurs — Saurian Echo / Firekeepers. Other eras stay on their
  base look until variants are added (incremental adoption).
- **Surfaced to the player:** the era-intro names the reality ("Sunlit Shallows
  — drifting in bright, oxygen-rich shallows"), so each start has identity.

To add a reality look: add an `ERA_VARIANTS[era][id]` entry (and, optionally,
branch a route to it / key world-gen off `world.variant`). That's it.

## Reality codes (sharing a world with friends)

Because a reality is fully deterministic (seed → terrain, era → age, variant →
look), it compresses to a short, copy-pasteable code:

```
R1.<seed base36>.<era>.<variant|->.<mode s|c>      e.g. R1.2gk4f9.cell.sunlit.s
```

`src/core/RealityCode.js` (guarded by `test/reality-code.mjs`) encodes/decodes it
and builds a share URL (`?r=CODE`). In game, the pause menu's **🔗 Share this
reality** copies the link; opening a `?r=` link turns the landing **Play** button
into "Play shared reality", dropping the friend into the *same* world. Decoding is
tolerant (unknown/unimplemented eras → null; stale variants dropped), so codes
stay valid as the graph grows.
