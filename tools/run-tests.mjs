/**
 * Runs every headless test suite in sequence and exits non-zero if any fail.
 * Used by `npm test` and CI so there is one canonical "are we green?" command.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const dir = 'test';
const suites = readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort();

let failed = 0;
for (const file of suites) {
  const path = `${dir}/${file}`;
  process.stdout.write(`\n=== ${path} ===\n`);
  const res = spawnSync(process.execPath, [path], { stdio: 'inherit' });
  if (res.status !== 0) {
    failed++;
    process.stdout.write(`!!! ${path} FAILED\n`);
  }
}

if (failed) {
  console.error(`\n${failed} suite(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${suites.length} suites passed.`);
