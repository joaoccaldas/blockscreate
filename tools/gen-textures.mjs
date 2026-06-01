/**
 * Reproducible procedural block-texture generator.
 *
 * The hand-made AI atlas (textures/blocks.png) only covers the common terrain
 * and ores. Several blocks — the entire First Cell set, plus bedrock, gold ore,
 * thatch and the historical clue blocks — fell back to flat shaded rectangles,
 * which looked cheap next to the textured ones.
 *
 * This script paints deterministic 32x32 pixel-art tiles for those blocks into
 * a second atlas (textures/blocks_extra.png) so the renderer can texture every
 * block. Output is committed; run `node tools/gen-textures.mjs` to regenerate.
 *
 * The layout (column,row) is exported as TEXTURE_LAYOUT and mirrored in the
 * renderer's EXTRA_ATLAS map — keep them in sync (the asset test guards size).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Pix, encodePNG } from './pnglib.mjs';

const OUT = 'assets/generated/textures';
mkdirSync(OUT, { recursive: true });

const T = 32;
const ATLAS_COLS = 4;

// Deterministic value noise so textures are stable across runs.
function rand(x, y, seed) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const shade = ([r, g, b], f) => [
  Math.max(0, Math.min(255, Math.round(r * f))),
  Math.max(0, Math.min(255, Math.round(g * f))),
  Math.max(0, Math.min(255, Math.round(b * f))),
  255,
];

/** Fill a tile with a speckled base derived from a base color + noise. */
function speckle(p, ox, oy, base, seed, amp = 0.18) {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const n = (rand(x, y, seed) - 0.5) * 2 * amp;
      p.set(ox + x, oy + y, shade(base, 1 + n));
    }
  }
}

/** Lit top edge + shaded bottom/right edge, matching the renderer's bevel. */
function bevel(p, ox, oy, top, side) {
  for (let x = 0; x < T; x++) {
    p.set(ox + x, oy + 0, top);
    p.set(ox + x, oy + 1, top);
    p.set(ox + x, oy + T - 1, side);
  }
  for (let y = 0; y < T; y++) {
    p.set(ox + T - 1, oy + y, side);
  }
}

// Each painter receives (p, ox, oy) and draws one 32px tile.
const TILES = {
  bedrock(p, ox, oy) {
    speckle(p, ox, oy, [58, 58, 64], 1, 0.3);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(rand(i, 1, 5) * T);
      const y = Math.floor(rand(i, 2, 5) * T);
      p.set(ox + x, oy + y, [20, 20, 24, 255]);
    }
  },
  gold_ore(p, ox, oy) {
    speckle(p, ox, oy, [125, 125, 130], 7, 0.16);
    bevel(p, ox, oy, [150, 150, 156, 255], [95, 95, 100, 255]);
    // gold nuggets
    const spots = [[8, 9], [20, 7], [14, 18], [24, 21], [6, 23]];
    for (const [x, y] of spots) {
      p.rect(ox + x, oy + y, 3, 3, [244, 210, 74, 255]);
      p.set(ox + x, oy + y, [255, 240, 150, 255]);
    }
  },
  thatch(p, ox, oy) {
    speckle(p, ox, oy, [196, 161, 74], 9, 0.12);
    // horizontal straw strands
    for (let y = 2; y < T; y += 4) {
      for (let x = 0; x < T; x++) {
        p.set(ox + x, oy + y, shade([150, 120, 50], 1 + (rand(x, y, 9) - 0.5) * 0.3));
      }
    }
  },
  // ---- First Cell era ----
  primordial_mud(p, ox, oy) {
    speckle(p, ox, oy, [39, 111, 104], 11, 0.22);
    bevel(p, ox, oy, [63, 184, 168, 255], [29, 81, 77, 255]);
    // bubbling pockets
    for (let i = 0; i < 6; i++) {
      const x = 3 + Math.floor(rand(i, 3, 11) * (T - 6));
      const y = 3 + Math.floor(rand(i, 4, 11) * (T - 6));
      p.rect(ox + x, oy + y, 2, 2, [90, 200, 185, 255]);
    }
  },
  nutrient_blob(p, ox, oy) {
    speckle(p, ox, oy, [115, 224, 106], 13, 0.16);
    // glossy nutrient cells
    for (let i = 0; i < 7; i++) {
      const x = 4 + Math.floor(rand(i, 5, 13) * (T - 8));
      const y = 4 + Math.floor(rand(i, 6, 13) * (T - 8));
      p.rect(ox + x, oy + y, 4, 4, [184, 255, 133, 255]);
      p.set(ox + x + 1, oy + y + 1, [240, 255, 210, 255]);
    }
  },
  mineral_vent(p, ox, oy) {
    speckle(p, ox, oy, [80, 106, 118], 17, 0.22);
    bevel(p, ox, oy, [155, 214, 224, 255], [53, 66, 74, 255]);
    // crystalline shards + warm glow at base
    for (let i = 0; i < 5; i++) {
      const x = 5 + Math.floor(rand(i, 7, 17) * (T - 10));
      p.rect(ox + x, oy + 18 - (i % 3) * 2, 2, 8, [155, 214, 224, 255]);
    }
    for (let x = 0; x < T; x++) p.set(ox + x, oy + T - 2, [255, 150, 90, 200]);
  },
  lipid_membrane(p, ox, oy) {
    speckle(p, ox, oy, [232, 168, 255], 19, 0.12);
    // membrane bilayer rows of round heads
    for (let y = 3; y < T; y += 7) {
      for (let x = 1; x < T; x += 4) {
        p.rect(ox + x, oy + y, 3, 3, [255, 214, 255, 255]);
        p.set(ox + x + 1, oy + y + 3, [159, 102, 200, 255]);
      }
    }
  },
  // ---- historical clue blocks ----
  fossil_bed(p, ox, oy) {
    speckle(p, ox, oy, [120, 110, 92], 23, 0.14);
    bevel(p, ox, oy, [150, 140, 120, 255], [90, 82, 68, 255]);
    // bone curl
    const bone = [235, 228, 205, 255];
    p.rect(ox + 8, oy + 20, 16, 2, bone);
    p.rect(ox + 8, oy + 18, 2, 4, bone);
    p.rect(ox + 22, oy + 18, 2, 4, bone);
    p.rect(ox + 12, oy + 10, 8, 6, bone);
    p.set(ox + 14, oy + 12, [90, 82, 68, 255]);
    p.set(ox + 17, oy + 12, [90, 82, 68, 255]);
  },
  meteor_shard(p, ox, oy) {
    speckle(p, ox, oy, [44, 40, 52], 29, 0.24);
    // glowing crystal core
    p.rect(ox + 12, oy + 8, 8, 16, [120, 90, 160, 255]);
    p.rect(ox + 14, oy + 10, 4, 12, [200, 150, 255, 255]);
    p.set(ox + 15, oy + 13, [255, 230, 255, 255]);
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rand(i, 9, 29) * T);
      const y = Math.floor(rand(i, 10, 29) * T);
      p.set(ox + x, oy + y, [180, 140, 230, 255]);
    }
  },
  charcoal_handprint(p, ox, oy) {
    speckle(p, ox, oy, [150, 140, 120], 31, 0.12);
    const ink = [40, 36, 40, 255];
    // palm + 4 fingers
    p.rect(ox + 11, oy + 15, 10, 9, ink);
    p.rect(ox + 11, oy + 8, 2, 8, ink);
    p.rect(ox + 14, oy + 6, 2, 10, ink);
    p.rect(ox + 17, oy + 7, 2, 9, ink);
    p.rect(ox + 20, oy + 9, 2, 7, ink);
  },
  standing_stone(p, ox, oy) {
    speckle(p, ox, oy, [111, 111, 120], 37, 0.16);
    bevel(p, ox, oy, [140, 140, 150, 255], [80, 80, 88, 255]);
    // carved glyph
    p.rect(ox + 14, oy + 6, 4, 20, [255, 210, 120, 120]);
    p.rect(ox + 10, oy + 12, 12, 3, [255, 210, 120, 120]);
  },
  hide_wall(p, ox, oy) {
    speckle(p, ox, oy, [150, 96, 60], 41, 0.16);
    bevel(p, ox, oy, [184, 128, 84, 255], [110, 70, 42, 255]);
    // stitching seams
    for (let y = 4; y < T; y += 8) {
      for (let x = 2; x < T; x += 4) p.set(ox + x, oy + y, [90, 56, 34, 255]);
    }
  },
  bone_pile(p, ox, oy) {
    speckle(p, ox, oy, [120, 110, 92], 43, 0.12);
    const bone = [235, 228, 205, 255];
    for (let i = 0; i < 5; i++) {
      const x = 3 + Math.floor(rand(i, 11, 43) * (T - 12));
      const y = 6 + Math.floor(rand(i, 12, 43) * (T - 12));
      p.rect(ox + x, oy + y, 10, 2, bone);
      p.set(ox + x - 1, oy + y - 1, bone);
      p.set(ox + x + 10, oy + y - 1, bone);
    }
  },
};

// Stable atlas order — append-only to avoid shifting existing coords.
export const TEXTURE_ORDER = [
  'bedrock', 'gold_ore', 'thatch', 'primordial_mud',
  'nutrient_blob', 'mineral_vent', 'lipid_membrane', 'fossil_bed',
  'meteor_shard', 'charcoal_handprint', 'standing_stone', 'hide_wall',
  'bone_pile',
];

export const TEXTURE_LAYOUT = {};
TEXTURE_ORDER.forEach((name, i) => {
  TEXTURE_LAYOUT[name] = [i % ATLAS_COLS, Math.floor(i / ATLAS_COLS)];
});

const rows = Math.ceil(TEXTURE_ORDER.length / ATLAS_COLS);
const atlas = new Pix(ATLAS_COLS * T, rows * T);
for (const name of TEXTURE_ORDER) {
  const [cx, cy] = TEXTURE_LAYOUT[name];
  TILES[name](atlas, cx * T, cy * T);
}

const png = atlas.toPNG();
writeFileSync(`${OUT}/blocks_extra.png`, png);
console.log(`  ✓ ${OUT}/blocks_extra.png ${ATLAS_COLS * T}x${rows * T} (${png.length} bytes)`);
console.log(`  layout: ${JSON.stringify(TEXTURE_LAYOUT)}`);
console.log(`\nGenerated ${TEXTURE_ORDER.length} block textures.`);

void encodePNG;
