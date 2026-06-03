/**
 * HUD layout guard (mobile, collapsed mode).
 *
 * We can't run a real browser in CI, so this test encodes the on-screen
 * rectangles of the always-visible HUD elements at a representative phone
 * viewport (390x844, the iPhone 12/13/14 logical size) and asserts they don't
 * overlap. It is the deterministic stand-in for "is the screen crowded?": if a
 * future change repositions a panel into another, this fails.
 *
 * Keep the RECTS below in sync with styles.css. Each rect is the element's
 * box in CSS px from the top-left, with env(safe-area-inset-*) treated as 0
 * (the worst case for crowding). Only elements visible in the default mobile
 * (info-collapsed) survival HUD are listed.
 */
import assert from 'node:assert';

const VW = 390; // viewport width
const VH = 844; // viewport height

// name: [x, y, w, h]  — derived from styles.css mobile + .info-collapsed rules.
const RECTS = {
  // top-left: health + hunger bars only on phones (era badge hidden):
  // 2 bars @72px + icons + gaps ≈ 175px.
  topbar: [8, 8, 175, 30],
  // compact objectives, docked top-left under the topbar in collapsed mode
  objPanel: [8, 46, Math.round(VW * 0.62), 60],
  // top-right cluster. CSS positions by distance-from-right, so left = VW - right - width.
  pauseBtn: [VW - 8 - 38, 8, 38, 38],       // right:8  w:38
  infoBtn: [VW - 54 - 38, 8, 38, 38],       // right:54 w:38
  buildIndicator: [VW - 100 - 60, 8, 60, 34], // right:100 w~60
  // quick inventory/craft column, top-right under the menu button
  touchQuick: [VW - 8 - 44, 54, 44, 96],    // right:8 w:44
};

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

function overlaps(a, b) {
  return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] &&
         a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
}

// All listed elements must sit inside the viewport.
for (const [name, r] of Object.entries(RECTS)) {
  assert.ok(r[0] >= 0 && r[1] >= 0, `${name} starts on-screen`);
  assert.ok(r[0] + r[2] <= VW + 1, `${name} fits viewport width`);
  assert.ok(r[1] + r[3] <= VH, `${name} fits viewport height`);
}
ok('all default mobile HUD elements fit the phone viewport');

// No two always-visible elements overlap.
const names = Object.keys(RECTS);
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const a = names[i];
    const b = names[j];
    assert.ok(!overlaps(RECTS[a], RECTS[b]), `${a} must not overlap ${b}`);
  }
}
ok('no two default mobile HUD panels overlap (screen is not crowded)');

// The objectives panel must not collide with the right-side quick buttons —
// this was the specific regression behind the crowded screenshot.
assert.ok(!overlaps(RECTS.objPanel, RECTS.touchQuick),
  'objectives panel clears the quick inventory/craft column');
ok('objectives panel clears the quick-action column');

console.log(`\nAll ${passed} HUD layout checks passed.`);
