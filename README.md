# BlocksCreate

A browser-based block-building civilization history sandbox. Mine, build, survive, discover hidden historical clues, and lead a settlement through branching eras.

## Features

- Block placement, mining, crafting, inventory and survival
- Era-specific progression with mandatory and optional mastery goals
- Age of Dinosaurs first era: survive among living dinosaurs (stegosaurus,
  triceratops, raptor, T-Rex), tame fire, build shelter, and endure meteor
  showers that climax in an asteroid impact (craters terrain + damages)
- Per-era atmosphere: signature color grade, ambient weather (drifting leaves,
  dust, ash), and themed wildlife — defined as data in `src/core/eraTheme.js`
- Enemies that hunt at night: raptors and T-Rex (Age of Dinosaurs), raiders
  and bandits (Bronze/Iron), and roaming machines (Industrial), with chase AI,
  contact damage, screen-shake feedback, and material drops
- Physical historical clue blocks such as fossils, meteor shards, handprints and standing stones
- Structure recognition for huts, camps, workshops, watchtowers and portal rings
- Hidden discoveries and timed powerups
- First-run onboarding coach-marks, a death screen with run stats + respawn,
  and confirm dialogs guarding destructive actions
- Themed menus, a labeled inventory, and crafting that shows per-ingredient
  have/need counts and missing stations
- Era events and hazards: cold nights and meteor showers in the Age of
  Dinosaurs create shelter pressure and physical meteor-shard clues
- Generated pixel-art sprites and terrain textures
- Local save/load plus GitHub Pages deployment

## Getting Started

Open `index.html` in a browser, or serve the folder with any static server.

Run checks:

```bash
node test/fun-systems.mjs
node test/assets.mjs
node test/smoke.mjs
node test/integration.mjs
node test/enemies.mjs
```

## Current Engine Note

Worlds are persistent and now expand horizontally near the edges. The next engine milestone is true chunked infinite world generation with modified-chunk saves.

## Author

Joao Caldas

## License

MIT
