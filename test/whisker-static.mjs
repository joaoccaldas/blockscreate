import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const root = resolve('whisker-dash');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

const localRefs = [
  ...html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["']/gi),
]
  .map((m) => m[1])
  .filter((ref) => !/^(?:https?:)?\/\//.test(ref) && !ref.startsWith('data:'));

const missing = localRefs.filter((ref) => {
  const clean = ref.split(/[?#]/, 1)[0];
  return !existsSync(resolve(root, clean));
});
assert.deepEqual(missing, [], `Missing Whisker Dash local references: ${missing.join(', ')}`);

const deployFiles = [
  'deploy/audio.js',
  'deploy/multiplayer.js',
  'deploy/core.js',
  'deploy/world.js',
  'deploy/player.js',
  'deploy/ui.js',
];
const deploySource = deployFiles.map((p) => readFileSync(resolve(root, p), 'utf8')).join('\n');

assert.doesNotMatch(
  deploySource,
  /navigator\.geolocation|getUserMedia|mediaDevices\.getUserMedia/i,
  'Whisker Dash must not request camera, microphone or geolocation permissions',
);

assert.match(html, /maxlength="16"/, 'Player/cat display name must remain length-limited');
assert.match(html, /peerjs/i, 'P2P dependency should remain visible in the entry page');

console.log('Whisker Dash static/privacy contract passed.');
