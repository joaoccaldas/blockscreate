# BlocksCreate

A browser-based block-building civilization history sandbox. Mine, build, survive, discover hidden historical clues, and lead a settlement through branching eras.

## Features

- Block placement, mining, crafting, inventory and survival
- Era-specific progression with mandatory and optional mastery goals
- First Humans era with shelter, fire, tools, food, fossil clues and alternate-history hooks
- Structure recognition for huts, camps, workshops, watchtowers and portal rings
- Hidden discoveries and timed powerups
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
```

## Current Engine Note

Worlds are persistent but finite today. The documented next engine milestone is chunked infinite world generation with modified-chunk saves.

## Author

Joao Caldas

## License

MIT
