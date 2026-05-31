# Production Readiness

This pass hardened BlocksCreate from "fun prototype" toward "shippable web game".
Ten improvements, why each matters, and how it was verified.

| # | Improvement | Why it matters | Verified by |
|---|-------------|----------------|-------------|
| 1 | **Generated enemy sprites** (`tools/gen-sprites.mjs`) | Enemies were colored boxes; now wolves/boars/raiders/bandits/machines have real pixel art. Reproducible from committed code — no external tool. | `test/assets.mjs` (12 checks) + CI drift check |
| 2 | **Era-specific decorations** (`eraTheme.decorations` + `Renderer.drawDecorations`) | Each age now has signature scenery (standing stones, bones, kilns, lamp posts, smokestacks…), deterministic from the seed. | Headless render-frame check |
| 3 | **Continuous integration** (`.github/workflows/ci.yml`) | Every push/PR runs syntax checks + all suites + sprite-drift check, so regressions never reach the deployed site. | The workflow itself |
| 4 | **PWA / offline** (`manifest.webmanifest`, `sw.js`) | Installable on phones; plays offline after first load via a cache-first service worker. | Manual + manifest validation |
| 5 | **Social meta + icons** (`tools/gen-icons.mjs`, OG/Twitter tags, favicon) | Proper link previews and a real app icon — basic polish users expect. | Asset generation |
| 6 | **Crash resilience** (try/catch game loop) | A single bad frame can no longer freeze the game; it logs, retries, and after sustained failure saves and shows a friendly message. | Code review; loop isolates `update`/`draw` |
| 7 | **Auto-pause on blur/hidden tab** | Returning to a tab no longer means a dead character or a giant time-skip; state is saved on hide. | Integration stub exercises listeners |
| 8 | **Accessibility** (reduced motion, focus rings, OS `prefers-reduced-motion`) | Respects motion sensitivity; keyboard focus is visible. Toggle in the pause menu disables weather/shake/decorative animation. | Code review + CSS media query |
| 9 | **Save migration & corruption tolerance** (`SaveManager.migrate`) | Old/foreign/corrupt saves load safely (defaults backfilled) or are rejected cleanly instead of crashing; newer-version saves are refused. | `test/integration.mjs` (save round-trip) |
| 10 | **This document + `package.json`/test runner** | One canonical `npm test`, a documented readiness bar, and a changelog anchor for releases. | `node tools/run-tests.mjs` |

## How to verify locally

```bash
npm test                 # runs every suite in test/
node tools/gen-sprites.mjs   # regenerate enemy art (should be no-op / no diff)
node tools/gen-icons.mjs     # regenerate app icons
npm run serve            # http://localhost:8000
```

## Release checklist

1. `npm test` green.
2. `node tools/gen-sprites.mjs` and `node tools/gen-icons.mjs` produce no diff.
3. Bump `version` in `package.json` and `CACHE` in `sw.js` (so clients update).
4. Update the landing `.version` label in `index.html`.
5. Push to `main`; confirm the Pages deploy workflow succeeds.
6. Hard-reload the live site and confirm the service worker activates.

## v4.4 Gameplay Readiness Note

The game now has more run-to-run variation through timed RPG encounters and
relic powerups. The highest gameplay risk is tuning: predator migrations,
drought hunger pressure and weapon damage should be playtested for fairness
before a broader release.

## v4.5 Origin Era Readiness Note

The first era now intentionally teaches the interaction loop with fewer systems
than the dinosaur era. The main remaining tuning need is feel: the cell form
should eventually get distinct movement/visuals so it feels like swimming,
absorbing and self-organizing rather than only mining smaller blocks.

## v4.6 Cell Feel Readiness Note

The cell now drifts, pulses and absorbs nearby resources. The next risk is
balance: automatic absorption should feel generous, but not so fast that the
origin era ends before the player understands nutrients, vents and membranes.

## v4.7 Cell Stability Readiness Note

First Cell now has an explicit stability and gradient feedback loop. The next
playtest should watch whether players understand that stability comes from
chemistry, membranes and proto-cell formation before evolution.

## Known next steps

- Complete true chunk streaming (current saves now include chunk metadata and modified chunk snapshots, but rendering still uses a dense loaded window).
- Enemy sprite sheets with walk frames (current sprites are single-frame).
- An end-to-end browser smoke test (Playwright) for menu → play → save → resume.
