/**
 * Reproducible enemy sprite generator.
 *
 * Produces deterministic 32x32 RGBA pixel-art sprites for the hostile mobs that
 * previously rendered as plain colored boxes. Run:
 *
 *   node tools/gen-sprites.mjs
 *
 * Output lands in assets/generated/sprites/ and is committed, so the game has
 * no build/runtime dependency — this script just lets us regenerate art.
 *
 * Sprites face RIGHT (the renderer mirrors for left-facing mobs) and sit on the
 * bottom edge so they align with the ground like the existing animal sprites.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Pix } from './pnglib.mjs';

const OUT = 'assets/generated/sprites';
mkdirSync(OUT, { recursive: true });

const S = 32;
const px = (...args) => new Pix(S, S);

// --- shared palette helpers ---
const shade = ([r, g, b], f) => [Math.round(r * f), Math.round(g * f), Math.round(b * f), 255];

function legs(p, color, y, xs) {
  for (const x of xs) p.rect(x, y, 3, 5, color);
}

// ---------- Wolf: low grey quadruped, ears + tail + red eye ----------
function wolf() {
  const p = px();
  const body = [108, 110, 120, 255];
  const dark = shade(body, 0.7);
  legs(p, dark, 24, [8, 13, 18, 23]);
  p.rect(7, 14, 18, 10, body);          // body
  p.ellipse(24, 14, 5, 5, body);        // head
  p.rect(27, 13, 4, 3, body);           // snout
  p.rect(20, 8, 2, 4, dark);            // ear
  p.rect(23, 8, 2, 4, dark);            // ear
  p.rect(5, 12, 5, 3, dark);            // tail
  p.set(27, 14, [255, 60, 60, 255]);    // eye
  p.set(28, 14, [255, 60, 60, 255]);
  p.rect(28, 17, 3, 1, [240, 240, 245, 255]); // fang
  return p;
}

// ---------- Boar: bulky brown, tusks, snout ----------
function boar() {
  const p = px();
  const body = [122, 90, 58, 255];
  const dark = shade(body, 0.7);
  legs(p, dark, 25, [9, 14, 19, 23]);
  p.ellipse(15, 16, 9, 7, body);        // bulky body
  p.ellipse(24, 17, 5, 5, body);        // head
  p.rect(28, 17, 3, 3, shade(body, 0.85)); // snout
  p.rect(8, 9, 8, 3, shade(body, 0.55));   // bristly back
  p.set(25, 15, [60, 30, 20, 255]);     // eye
  p.rect(28, 20, 2, 1, [240, 235, 220, 255]); // tusk
  p.set(30, 16, [240, 235, 220, 255]);
  return p;
}

// ---------- Raider: red-tunic humanoid with a club ----------
function raider() {
  const p = px();
  const skin = [214, 168, 120, 255];
  const tunic = [150, 60, 60, 255];
  const dark = shade(tunic, 0.7);
  p.rect(12, 4, 8, 7, skin);            // head
  p.rect(13, 6, 2, 2, [40, 20, 20, 255]); // eyes
  p.rect(17, 6, 2, 2, [40, 20, 20, 255]);
  p.rect(11, 3, 10, 2, [90, 40, 40, 255]); // headband
  p.rect(11, 11, 10, 11, tunic);        // torso
  p.rect(9, 12, 3, 8, skin);            // back arm
  p.rect(20, 12, 3, 8, skin);           // front arm
  p.rect(12, 22, 4, 8, dark);           // legs
  p.rect(16, 22, 4, 8, dark);
  p.rect(23, 6, 3, 16, [120, 80, 40, 255]); // club shaft
  p.rect(22, 4, 5, 5, [90, 60, 30, 255]);    // club head
  return p;
}

// ---------- Bandit: purple-hooded humanoid with a blade ----------
function bandit() {
  const p = px();
  const cloak = [91, 59, 106, 255];
  const dark = shade(cloak, 0.65);
  const skin = [200, 150, 110, 255];
  p.rect(11, 3, 11, 9, cloak);          // hood
  p.rect(13, 7, 7, 3, [20, 16, 24, 255]); // shadowed face
  p.set(14, 8, [255, 80, 80, 255]);     // glaring eyes
  p.set(18, 8, [255, 80, 80, 255]);
  p.rect(11, 12, 11, 10, cloak);        // body cloak
  p.rect(10, 13, 3, 8, dark);
  p.rect(20, 13, 3, 8, skin);           // sword arm
  p.rect(12, 22, 4, 8, dark);
  p.rect(16, 22, 4, 8, dark);
  p.rect(23, 4, 2, 18, [210, 215, 230, 255]); // blade
  p.rect(22, 20, 4, 2, [120, 90, 50, 255]);    // hilt
  return p;
}

// ---------- Machine: industrial walker, gear + glowing core ----------
function machine() {
  const p = px();
  const steel = [90, 94, 102, 255];
  const dark = shade(steel, 0.65);
  const rust = [150, 90, 50, 255];
  p.rect(7, 6, 18, 16, steel);          // chassis
  p.rect(7, 6, 18, 2, shade(steel, 1.2 > 1 ? 1 : 1.2)); // top highlight
  p.rect(9, 8, 14, 2, dark);
  p.ellipse(16, 14, 4, 4, [40, 44, 50, 255]); // core housing
  p.ellipse(16, 14, 2, 2, [120, 230, 255, 255]); // glowing core
  p.rect(6, 10, 2, 8, rust);            // side bolts
  p.rect(24, 10, 2, 8, rust);
  // tracked legs
  p.rect(7, 23, 7, 5, dark);
  p.rect(18, 23, 7, 5, dark);
  p.set(9, 25, [255, 200, 60, 255]);    // indicator lights
  p.set(21, 25, [255, 200, 60, 255]);
  p.rect(13, 3, 6, 3, [60, 64, 70, 255]); // antenna housing
  p.rect(15, 0, 2, 3, [60, 64, 70, 255]); // antenna
  p.set(16, 0, [255, 80, 80, 255]);
  return p;
}

// ---------- Stegosaurus: green grazer with back plates ----------
function stego() {
  const p = px();
  const body = [86, 138, 74, 255];
  const dark = shade(body, 0.7);
  const plate = [120, 170, 90, 255];
  legs(p, dark, 24, [7, 12, 18, 23]);
  p.ellipse(15, 17, 11, 6, body);       // big body
  p.ellipse(26, 18, 4, 4, body);        // small head
  p.rect(2, 16, 6, 3, body);            // tail base
  p.rect(0, 15, 3, 2, dark);            // tail tip
  // back plates
  for (let i = 0; i < 4; i++) {
    const bx = 9 + i * 4;
    p.rect(bx, 9 - (i === 1 || i === 2 ? 1 : 0), 3, 4, plate);
  }
  p.set(27, 17, [30, 40, 20, 255]);     // eye
  return p;
}

// ---------- Triceratops: bulky with frill + horns ----------
function trike() {
  const p = px();
  const body = [120, 132, 96, 255];
  const dark = shade(body, 0.7);
  legs(p, dark, 24, [7, 12, 17, 22]);
  p.ellipse(14, 17, 10, 6, body);       // body
  p.ellipse(24, 17, 5, 5, body);        // head
  p.rect(26, 9, 5, 9, shade(body, 0.85)); // frill
  p.rect(28, 13, 3, 1, [240, 235, 220, 255]); // nose horn area
  p.rect(27, 11, 1, 3, [240, 235, 220, 255]); // brow horn
  p.rect(29, 11, 1, 3, [240, 235, 220, 255]); // brow horn
  p.rect(2, 16, 5, 3, body);            // tail
  p.set(25, 16, [30, 30, 20, 255]);     // eye
  return p;
}

// ---------- Raptor: lean fast predator, raised tail, claws ----------
function raptor() {
  const p = px();
  const body = [124, 138, 74, 255];
  const dark = shade(body, 0.7);
  const belly = [180, 180, 120, 255];
  p.rect(10, 20, 3, 7, dark);           // legs
  p.rect(16, 20, 3, 7, dark);
  p.ellipse(14, 16, 7, 4, body);        // body
  p.rect(15, 14, 5, 2, belly);
  p.ellipse(22, 12, 4, 3, body);        // head up high
  p.rect(25, 12, 3, 2, body);           // snout
  p.rect(4, 12, 8, 2, body);            // raised tail
  p.rect(2, 11, 3, 2, dark);
  p.set(24, 11, [255, 90, 60, 255]);    // eye
  p.set(25, 13, [240, 240, 230, 255]);  // teeth
  p.rect(11, 27, 3, 1, [230, 220, 60, 255]); // claw
  return p;
}

// ---------- T-Rex: huge apex predator, tiny arms, big jaw ----------
function rex() {
  const p = px();
  const body = [95, 114, 66, 255];
  const dark = shade(body, 0.65);
  const belly = [150, 160, 100, 255];
  p.rect(10, 22, 4, 9, dark);           // thick legs
  p.rect(17, 22, 4, 9, dark);
  p.ellipse(15, 16, 9, 6, body);        // massive body
  p.rect(13, 15, 8, 4, belly);
  p.ellipse(24, 11, 6, 5, body);        // big head
  p.rect(27, 12, 4, 4, body);           // jaw/snout
  p.rect(3, 12, 9, 3, body);            // heavy tail
  p.rect(1, 11, 3, 2, dark);
  p.rect(20, 17, 3, 2, body);           // tiny arm
  p.set(26, 9, [255, 200, 40, 255]);    // eye
  // teeth row
  for (let i = 0; i < 4; i++) p.rect(27 + i, 16, 1, 1, [245, 245, 235, 255]);
  return p;
}

const sprites = { stego, trike, raptor, rex, wolf, boar, raider, bandit, machine };
let count = 0;
for (const name in sprites) {
  const png = sprites[name]().toPNG();
  writeFileSync(`${OUT}/${name}.png`, png);
  console.log(`  ✓ ${OUT}/${name}.png (${png.length} bytes)`);
  count++;
}
console.log(`\nGenerated ${count} enemy sprites.`);
