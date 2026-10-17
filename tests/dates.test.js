// Run: node tests/dates.test.js
// "Is this birthday in the future?" must use the phone's own calendar day.
// Bug (2026-10-17): new Date('YYYY-MM-DD') is UTC midnight, so in Utah from 6 pm on,
// tomorrow's date counted as "not in the future" and got in.
process.env.TZ = 'America/Denver'; // set before any Date is made
const assert = require('assert');
const L = require('../lifecalc.js');
const S = require('../sync.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.log('FAIL', name, '\n ', e.message); }
}

const evening = new Date(2026, 9, 17, 20, 0); // Oct 17 2026, 8 pm in Utah (Oct 18 02:00 UTC)
const morning = new Date(2026, 9, 17, 7, 0);

test('TZ really is Utah in this run', () => {
  assert.strictEqual(evening.toISOString(), '2026-10-18T02:00:00.000Z');
});

test('backup import: tomorrow\'s birthday is refused in the evening', () => {
  const out = S.cleanImport({ people: [{ name: 'Future', date: '2026-10-18' }] }, [], evening, () => 'x1');
  assert.deepStrictEqual(out, []);
});

test('backup import: tomorrow\'s passed date is dropped in the evening', () => {
  const out = S.cleanImport({ people: [{ id: 'a1', name: 'A', date: '1950-01-01', died: '2026-10-18' }] }, [], evening, () => 'x1');
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].died, null);
});

test('backup import: today\'s birthday and passed date still get in, morning and evening', () => {
  for (const now of [morning, evening]) {
    const out = S.cleanImport({ people: [{ id: 'b1', name: 'B', date: '2026-10-17' }, { id: 'c1', name: 'C', date: '1950-01-01', died: '2026-10-17' }] }, [], now, () => 'x1');
    assert.deepStrictEqual(out.map(p => [p.id, p.died]), [['b1', null], ['c1', '2026-10-17']]);
  }
});

test('isFutureDay compares local calendar days', () => {
  assert.strictEqual(L.isFutureDay('2026-10-18', evening), true);
  assert.strictEqual(L.isFutureDay('2026-10-17', evening), false);
  assert.strictEqual(L.isFutureDay('2026-10-17', morning), false);
  assert.strictEqual(L.isFutureDay('2026-10-16', morning), false);
  assert.strictEqual(L.isFutureDay('2027-01-01', morning), true);
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
