// Run: node tests/build.test.js
// The update check only works if BUILD in LifeCounter.html, every ?v= on its local files,
// and version.json all say the same build. Bump all three together.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'LifeCounter.html'), 'utf8');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.log('FAIL', name, '\n ', e.message); }
}

const buildMatch = html.match(/const BUILD = '([^']+)';/);

test('LifeCounter.html has a BUILD', () => assert.ok(buildMatch, 'no `const BUILD = \'...\';` found'));
const BUILD = buildMatch && buildMatch[1];

test('version.json says the same build', () => {
  const v = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  assert.strictEqual(v.build, BUILD);
});

test('every local script/stylesheet carries ?v=<BUILD>', () => {
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)].map(m => m[1])
    .filter(u => !/^(?:https?:|data:|\/\/)/.test(u));
  assert.ok(refs.length >= 3, 'expected lifecalc.js, sync.js, cloud.js; found ' + refs.join(', '));
  for (const u of refs) {
    const v = (u.match(/[?&]v=([^&#]+)/) || [])[1];
    assert.strictEqual(v, BUILD, `${u} should end in ?v=${BUILD}`);
  }
});

test('local files referenced exist', () => {
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"?:]+)\?v=/g)) assert.ok(fs.existsSync(path.join(root, m[1])), m[1]);
});

// Without an icon link browsers ask for /favicon.ico and log a 404 (sweep 2026-10-16). Site icon added 2026-10-17.
test('has an icon link so there is no favicon.ico 404', () => {
  assert.ok(/<link rel="icon" href="icon.svg[?"]/.test(html), "tab icon link");
  assert.ok(/<link rel="apple-touch-icon" href="apple-touch-icon.png[?"]/.test(html), "home-screen icon link");
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
