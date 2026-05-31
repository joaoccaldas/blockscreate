# BlocksCreate Improvement Evaluation

BlocksCreate already has the right spine for "Minecraft meets Civilization": block mining, crafting, survival stats, eras, local saves, objectives, animals, particles, audio, and mobile controls. The next step is to make civilization feel systemic rather than decorative.

## 25 Improvements

1. **Real era travel** - unlocking Bronze Age should let the player enter a generated Bronze Age world immediately, not only mark the era as available later.
2. **Station-gated crafting** - cooking, smelting, and later industry should require built infrastructure such as campfires or furnaces.
3. **Settlement statistics** - track housing, light, and placed-block counts so "building a society" has measurable consequences.
4. **More natural resource nodes** - add clay and gravel/flint so early building and tool recipes are supported by terrain instead of placeholder materials.
5. **Variable block drops** - leaves/grass/gravel should sometimes drop useful materials, improving exploration and foraging.
6. **Per-era objective sets** - Bronze and Iron Age should have their own guidance, not reuse only Stone Age goals.
7. **Advanced era recipes made reachable** - ore blocks should drop ore resources that match smelting recipes.
8. **Civilization bonuses for infrastructure** - torches, campfires, and durable blocks should provide extra CP or settlement value.
9. **Advance action in HUD** - when the portal is open, give the player a clear button to advance instead of relying on menu navigation.
10. **Crafting requirement feedback** - disabled recipes should explain whether inputs or stations are missing.
11. **Save migration tolerance** - new settlement fields should load safely from older saves.
12. **Documented roadmap** - maintain a design document that explains priority, why each item matters, and what shipped.
13. **Unit tests for new rules** - regression tests should cover station requirements, drops, settlement scoring, and era travel.
14. **Better biome/readability pass** - terrain should visibly communicate beaches, clay banks, gravel seams, and ore depth.
15. **Tool durability or repair** - tools should become meaningful inventory decisions instead of permanent speed multipliers.
16. **NPC worker loop** - population should eventually gather, farm, or build in small ways so Civ Points imply a living settlement.
17. **Threat/season pressure** - add light winter/night danger to make shelters and food stores matter.
18. **Food chain expansion** - add farming, wheat growth, and cooking recipes to support longer sessions.
19. **Production buildings** - kiln, furnace, workshop, granary, and forge should unlock recipe tiers.
20. **Town center/claim radius** - define a settlement core so placed blocks count when they form a coherent village.
21. **Improved inventory UX** - sort, quick-move, split stacks, and item labels would reduce friction.
22. **Accessibility controls** - remapping, reduced motion, and high-contrast UI would improve readiness.
23. **Performance budget tests** - world generation and render loops should be profiled as content grows.
24. **End-to-end browser test** - a small Playwright flow should verify menu, start, mine, craft, save, and resume.
25. **Release checklist** - versioning, changelog, Pages deploy verification, and smoke test instructions should be formalized.

## Implemented In This Pass

- Real era advancement from the HUD.
- Station-gated recipes for cooking and metal work.
- Settlement tracking for housing, light, per-block placement, and CP bonuses.
- Clay, gravel, flint/fiber drops, and ore drops aligned with smelting recipes.
- Bronze and Iron objective sets.
- Crafting UI feedback for missing stations.
- Tests covering the new gameplay rules.

## Implemented In RPG Era Pass

- Primitive weapon recipes for `bone_knife` and `flint_spear`.
- Predator defeat tracking in civilization stats.
- Optional Age of Dinosaurs mastery for spear crafting and predator defense.
- Random timed era encounters: predator migration, grazer herd, drought and raider scouts.
- Relic-style powerups for warmth, predator resistance, mining, city planning and food storage.
- Early Cities mastery goals for food stores and town lighting, making the next era more about settlement management.

## Implemented In Origin Era Pass

- Added **First Cell** as the new opening era before dinosaurs.
- Added science-inspired origin-of-life framing: nutrients, warm vents, membranes and proto-cell stabilization.
- Added cell-era blocks, recipes, objectives, biome hooks and a smaller player form.
- Updated onboarding and how-to copy so the game starts simple and gains complexity as eras unlock.

## Implemented In Cell Feel Pass

- Added drifting/swimming movement for First Cell.
- Added automatic absorption of nearby nutrient blobs and mineral vents.
- Added a pulsing cell rendering path instead of using the humanoid sprite.
- Shifted HUD labels in First Cell from normal survival toward life/stability.

## Implemented In Cell Stability Pass

- Added a First Cell stability meter to the HUD.
- Added chemical-gradient guidance toward nearby nutrients or mineral vents.
- Connected absorption, stored resources, membrane building and proto-cell crafting to a visible stability model.
