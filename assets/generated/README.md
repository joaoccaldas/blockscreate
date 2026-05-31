# Generated Game Assets

These assets were generated with Codex built-in image generation on May 31, 2026, then processed locally into runtime PNGs.

## Runtime Assets

- `sprites/player.png` - 4-frame 32px player sheet: idle, walk 1, walk 2, jump.
- `sprites/cow.png`, `sprites/pig.png`, `sprites/chicken.png`, `sprites/goat.png` - 32px livestock sprites.
- `textures/blocks.png` - 4x4 32px terrain atlas used by the renderer.
- `effects/effects.png` - 4x2 32px effect icon atlas for portal, CP spark, fire, cracks, build sparkle, food, and heart.

## Source Sheets

The original generated sheets are preserved in `source/` so future passes can re-slice or reprocess without regenerating.

## Prompt Set

The generation requested cohesive 32-bit pixel art for a Minecraft-meets-Civilization side-view sandbox, using flat `#00ff00` chroma-key backgrounds. Backgrounds were removed locally and final runtime assets were resized with nearest-neighbor sampling.

