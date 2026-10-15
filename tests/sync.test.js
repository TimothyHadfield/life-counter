// Run: node tests/sync.test.js
const assert = require('assert');
const S = require('../sync.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.log('FAIL', name, '\n ', e.message); }
}
const P = (id, name, updated, extra = {}) => ({ id, name, date: '2000-01-01', time: null, updated, ...extra });

test('merge: union of two devices', () => {
  const m = S.mergeDocs({ people: [P('a', 'Tim', 1)] }, { people: [P('b', 'Sam', 1)] });
  assert.deepStrictEqual(m.people.map(p => p.id), ['a', 'b']);
});

test('merge: newer edit wins either way round', () => {
  const old = { people: [P('a', 'Tim', 1)] }, neu = { people: [P('a', 'Timothy', 5)] };
  assert.strictEqual(S.mergeDocs(old, neu).people[0].name, 'Timothy');
  assert.strictEqual(S.mergeDocs(neu, old).people[0].name, 'Timothy');
});

test('merge: a delete does not come back from the other device', () => {
  const phone = { people: [], deleted: { a: 10 } };
  const cloud = { people: [P('a', 'Tim', 3)] };
  assert.deepStrictEqual(S.mergeDocs(cloud, phone).people, []);
  assert.deepStrictEqual(S.mergeDocs(phone, cloud).people, []);
});

test('merge: an edit after the delete brings them back', () => {
  const m = S.mergeDocs({ people: [], deleted: { a: 10 } }, { people: [P('a', 'Tim', 20)] });
  assert.strictEqual(m.people.length, 1);
});

test('merge: stale offline device cannot wipe newer edits', () => {
  const cloud = { people: [P('a', 'Tim', 50), P('b', 'Sam', 40)] };
  const staleDevice = { people: [P('a', 'Tim (old)', 10)] }; // never saw Sam
  const m = S.mergeDocs(cloud, staleDevice);
  assert.deepStrictEqual(m.people.map(p => p.name), ['Tim', 'Sam']);
});

test('merge: empty sides', () => {
  assert.deepStrictEqual(S.mergeDocs({}, {}).people, []);
  assert.strictEqual(S.mergeDocs(null, { people: [P('a', 'x', 1)] }).people.length, 1);
});

test('event ids are valid Google ids and stable', () => {
  const id = S.eventId('2xf7us6i', 's1.5e9');
  assert.ok(/^[a-v0-9]{5,1024}$/.test(id), id);
  assert.strictEqual(id, S.eventId('2xf7us6i', 's1.5e9'));
  assert.notStrictEqual(id, S.eventId('2xf7us6i', 's1e9'));
});

test('desired events: timed only with a birth time, carry a time zone', () => {
  const now = new Date(2026, 9, 15);
  const timed = S.desiredEvents([{ id: 'a', name: 'Robbie', date: '2004-03-15', time: '06:45' }], now, 'America/Denver');
  const bil = timed.find(e => e.extendedProperties.private.key === 's1e9');
  assert.strictEqual(bil.summary, 'Robbie turns 1 billion seconds');
  assert.ok(bil.start.dateTime && bil.start.timeZone === 'America/Denver');
  const allDay = S.desiredEvents([{ id: 'b', name: 'Sam', date: '2004-03-15', time: null }], now, 'America/Denver');
  assert.ok(allDay.every(e => e.start.date && !e.start.dateTime));
  assert.ok(timed.every(e => new Date(e.start.dateTime || e.start.date) > now));
});

test('desired events: people with no birth year are skipped', () => {
  assert.strictEqual(S.desiredEvents([{ id: 'c', name: 'X', date: '2026-05-01', time: null, noYear: true }], new Date(2026, 9, 15), 'UTC').length, 0);
});

test('plan: insert new, update changed, remove stale, ignore foreign events', () => {
  const want = [
    { id: 'lc1', summary: 'A', start: { date: '2030-01-01' } },
    { id: 'lc2', summary: 'B', start: { date: '2030-01-02' } },
  ];
  const lc = { private: { lc: '1' } };
  const have = [
    { id: 'lc2', summary: 'B old', start: { date: '2030-01-02' }, extendedProperties: lc },
    { id: 'lc9', summary: 'gone', start: { date: '2031-01-01' }, extendedProperties: lc },
    { id: 'other', summary: 'Dentist', start: { date: '2030-01-01' } },
  ];
  const p = S.planCalendar(want, have);
  assert.deepStrictEqual(p.insert.map(e => e.id), ['lc1']);
  assert.deepStrictEqual(p.update.map(e => e.id), ['lc2']);
  assert.deepStrictEqual(p.remove, ['lc9']);
});

test('plan: nothing to do when in sync', () => {
  const e = { id: 'lc1', summary: 'A', start: { dateTime: '2030-01-01T10:00:00.000Z' }, extendedProperties: { private: { lc: '1' } } };
  const p = S.planCalendar([e], [{ ...e, start: { dateTime: '2030-01-01T03:00:00-07:00' } }]);
  assert.strictEqual(p.insert.length + p.update.length + p.remove.length, 0);
});

test('names from birthday titles', () => {
  assert.strictEqual(S.nameFrom("Robbie's birthday"), 'Robbie');
  assert.strictEqual(S.nameFrom('Robbie Smith’s Birthday'), 'Robbie Smith');
  assert.strictEqual(S.nameFrom('Mom birthday'), 'Mom');
  assert.strictEqual(S.nameFrom('Birthday - Jess'), 'Jess');
});

test('birthdays: with year, without year, non-birthday skipped, duplicates merged', () => {
  const now = new Date(2026, 9, 15);
  const items = [
    { id: 'g1', eventType: 'birthday', summary: "Robbie's birthday", start: { date: '1990-06-02' }, created: '2019-01-01T00:00:00Z', birthdayProperties: { type: 'birthday' } },
    { id: 'g2', eventType: 'birthday', summary: "Jess's birthday", start: { date: '2021-08-09' }, created: '2021-03-01T00:00:00Z', birthdayProperties: { type: 'birthday' } },
    { id: 'g3', eventType: 'birthday', summary: 'Wedding anniversary', start: { date: '2015-06-02' }, birthdayProperties: { type: 'anniversary' } },
    { id: 'g4', eventType: 'default', summary: "Mom's Birthday", start: { date: '1965-02-11' }, created: '2020-01-01T00:00:00Z', recurrence: ['RRULE:FREQ=YEARLY'] },
    { id: 'g5', eventType: 'default', summary: 'Birthday party at Sam\'s', start: { date: '2024-02-11' }, created: '2024-01-01T00:00:00Z' },
    { id: 'g6', eventType: 'birthday', summary: "Robbie's birthday", start: { date: '1990-06-02' }, created: '2019-01-01T00:00:00Z' },
  ];
  const b = S.parseBirthdays(items, now);
  assert.deepStrictEqual(b.map(x => [x.name, x.date, x.noYear]), [
    ['Jess', '2021-08-09', true], ['Mom', '1965-02-11', false], ['Robbie', '1990-06-02', false],
  ]);
});

test('already have: by google id or same name + month/day', () => {
  const people = [{ id: 'a', name: 'Robbie', date: '1990-06-02' }, { id: 'b', name: 'X', date: '1980-01-01', googleId: 'g9' }];
  assert.ok(S.alreadyHave(people, { googleId: 'g1', name: 'robbie', date: '1990-06-02' }));
  assert.ok(S.alreadyHave(people, { googleId: 'g9', name: 'Other', date: '2000-02-02' }));
  assert.ok(!S.alreadyHave(people, { googleId: 'g2', name: 'Jess', date: '2001-08-09' }));
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
