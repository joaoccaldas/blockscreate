# Game review — flow, possibilities, retention (snapshot)

A working review to steer what we build next. Pairs with `docs/POLISH_25.md`
(day-one polish) and `docs/ERA_GRAPH.md` (the branching map).

## Full flow today
Landing (daily card, era strip, Play/Continue) → Portals (era + Survival/Creative)
→ **era intro** (named reality variant + route) → **onboarding** (era-specific,
once) → play loop (mine/build/craft/absorb, objectives, settlers, events,
market, timeline/anomalies/simulation) → **era advance** (routed by dominant
branch through the era graph) → … → death/era-up → **run summary** (share text +
image). Shareable **reality codes** (`?r=`) drop a friend into your exact world.

## Possibility space from the first era
The graph (see `ERA_GRAPH.md`) already encodes branches; routing falls back to
the prime spine until a branch age ships. From the **First Cell** a player today
experiences:
- **3 reality variants** (Hydrothermal / Sunlit / Abyssal), seed-picked → a
  different-looking start every run.
- **1 implemented next age** (Dinosaurs) + **1 rumored branch** (Age of Flora,
  shown redacted `???` on the map) — so forking is *felt* from minute one.
- A 5-step objective ladder, evolving cell visuals, absorb juice, achievements,
  and the daily challenge (which may feature the cell).

Across a full run the **prime spine is 5 ages**; the graph defines **11 more**
(spine + branch) for the future, all reachable by data-only additions.

## What's strong
Dopamine (achievements, floating popups), retention hooks (daily + streak),
virality (reality codes, run summary, share image), depth (industry chain +
logistics + power), and a genuine mystery spine (timeline → anomalies →
simulation), now visualized in the **Map of Space & Time**.

## What's missing to bring players back daily (ranked)
1. **A second branch actually playable** — the map shows `???` branches but only
   the spine is built. Shipping **Trade Republic** (Iron→merchant) makes "two
   players diverge" real. *(P0)*
2. **Per-era music** — the biggest "feels finished" lever still open. *(P0)*
3. **Milestones ladder** — long-horizon goals beyond per-run achievements:
   lifetime ages reached, realities branched, simulation depth, relics — a
   profile that grows across days. *(P1, partly visualized by the map now)*
4. **Goal beacon** — an on-screen arrow to the next objective kills "what do I
   do?" churn for brand-new players. *(P0)*
5. **Notifications / daily nudge** — PWA reminder that today's challenge is up.
   *(P2; needs permission UX)*
6. **More crossings that *do* something** — the matrix/bug leakage is atmospheric;
   make a rift occasionally drop a tangible out-of-era item or mob. *(P1)*

## The Map of Space & Time (shipped)
A redacted atlas: time runs top→down by age; nodes are realities (current
pulsing, visited solid, reachable dimmed, **unbuilt branches `???`**). A
"Signal beneath the map" footer leaks divergence/branches/crossovers and the
nested-simulation layers **only once reality bends**, and even then keeps the
next layer redacted. It doubles as the **milestone view** ("N ages walked").
Built modular + pure (`systems/SpaceTimeMap.js`, `test/space-time-map.mjs`).

**Next:** Trade Republic (first real branch) → per-era music → goal beacon.
