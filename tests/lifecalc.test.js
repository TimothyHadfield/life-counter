// Run: node tests/lifecalc.test.js
const assert = require('assert');
const L = require('../lifecalc.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.log('FAIL', name, '\n ', e.message); }
}
const day = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('birth with no time defaults to noon', () => {
  const b = L.birthDate({ date: '2004-03-15', time: null });
  assert.strictEqual(b.getHours(), 12);
  assert.strictEqual(day(b), '2004-03-15');
});

test('birth with time uses it', () => {
  const b = L.birthDate({ date: '2004-03-15', time: '06:45' });
  assert.strictEqual(b.getHours(), 6);
  assert.strictEqual(b.getMinutes(), 45);
});

test('1 billion seconds = 31.69 years later (known: 2000-01-01 00:00 UTC → 2031-09-09 01:46:40 UTC)', () => {
  const b = new Date(Date.UTC(2000, 0, 1));
  const m = L.milestones(b).find(x => x.key === 's1e9');
  assert.strictEqual(m.date.toISOString(), '2031-09-09T01:46:40.000Z');
});

test('10,000 days from 2000-01-01 is 2027-05-19', () => {
  const b = L.birthDate({ date: '2000-01-01', time: null });
  const m = L.milestones(b).find(x => x.key === 'd10000');
  assert.strictEqual(day(m.date), '2027-05-19');
});

test('1,000 weeks = 7,000 days', () => {
  const b = L.birthDate({ date: '2000-01-01', time: null });
  const w = L.milestones(b).find(x => x.key === 'w1000');
  assert.strictEqual(day(w.date), day(L.addDays(b, 7000)));
});

test('milestones come back sorted by date', () => {
  const ms = L.milestones(L.birthDate({ date: '1999-07-04', time: null }));
  for (let i = 1; i < ms.length; i++) assert.ok(ms[i].date >= ms[i - 1].date);
});

test('addMonths clamps to month end (Jan 31 + 1 → Feb 29 in 2024)', () => {
  assert.strictEqual(day(L.addMonths(new Date(2024, 0, 31, 12), 1)), '2024-02-29');
});

test('calendar age on the day before and of a birthday', () => {
  const b = L.birthDate({ date: '2004-03-15', time: null });
  assert.strictEqual(L.calendarAge(b, new Date(2026, 2, 14, 12)).years, 21);
  const a = L.calendarAge(b, new Date(2026, 2, 15, 12));
  assert.deepStrictEqual([a.years, a.months, a.days], [22, 0, 0]);
});

test('calendar age months and days', () => {
  const b = L.birthDate({ date: '2004-03-15', time: null });
  const a = L.calendarAge(b, new Date(2026, 9, 20, 15, 30));
  assert.deepStrictEqual([a.years, a.months, a.days, a.hours, a.minutes], [22, 7, 5, 3, 30]);
});

test('western zodiac edges', () => {
  assert.strictEqual(L.zodiac(1, 19), 'Capricorn');
  assert.strictEqual(L.zodiac(1, 20), 'Aquarius');
  assert.strictEqual(L.zodiac(3, 21), 'Aries');
  assert.strictEqual(L.zodiac(12, 21), 'Sagittarius');
  assert.strictEqual(L.zodiac(12, 22), 'Capricorn');
  assert.strictEqual(L.zodiac(7, 4), 'Cancer');
});

test('chinese zodiac uses lunar new year (Jan 15 2000 is still Rabbit)', () => {
  const z = L.chineseZodiac(new Date(2000, 0, 15, 12));
  if (z.exact) assert.strictEqual(z.animal, 'Rabbit');
  assert.strictEqual(L.chineseZodiac(new Date(2000, 5, 1, 12)).animal, 'Dragon');
});

test('generation buckets', () => {
  assert.strictEqual(L.generation(2004), 'Gen Z');
  assert.strictEqual(L.generation(1990), 'Millennial');
});

test('next birthday turns the right age', () => {
  const b = L.birthDate({ date: '2004-03-15', time: null });
  const nb = L.nextBirthday(b, new Date(2026, 9, 15));
  assert.strictEqual(day(nb.date), '2027-03-15');
  assert.strictEqual(nb.turning, 23);
});

test('golden birthday: born on the 15th → 15th birthday', () => {
  const g = L.goldenBirthday(L.birthDate({ date: '2004-03-15', time: null }));
  assert.strictEqual(day(g.date), '2019-03-15');
  assert.strictEqual(g.age, 15);
});

test('leap days lived', () => {
  const b = L.birthDate({ date: '2004-03-15', time: null });
  assert.strictEqual(L.countLeapDays(b, new Date(2026, 9, 15)), 5); // 2008 12 16 20 24
});

test('compare: gap and double-age day', () => {
  const a = L.birthDate({ date: '2000-01-01', time: null });
  const b = L.birthDate({ date: '2004-01-01', time: null });
  const c = L.compare(a, b);
  assert.ok(c.aIsOlder);
  assert.strictEqual(Math.round(c.gapDays), 1461);
  assert.strictEqual(day(c.doubleAgeDay), '2008-01-01');
});

test('ics has only future events, stable UIDs, CRLF', () => {
  const people = [{ id: 'p1', name: 'Tim, Jr', date: '2004-03-15', time: '06:45' }];
  const now = new Date(2026, 9, 15);
  const ics = L.buildIcs(people, now);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('UID:lifecounter-p1-s1e9@timothyhadfield.github.io'));
  assert.ok(!ics.includes('lifecounter-p1-s5e8@'), 'past milestone should be skipped');
  assert.ok(ics.includes('SUMMARY:Tim\\, Jr turns 1 billion seconds'));
  assert.ok(/DTSTART:\d{8}T\d{6}Z/.test(ics), 'timed event when birth time known');
  const events = ics.split('BEGIN:VEVENT').length - 1;
  assert.strictEqual(events, ics.split('END:VEVENT').length - 1);
});

test('ics without birth time uses all-day events only', () => {
  const ics = L.buildIcs([{ id: 'p2', name: 'Sam', date: '2004-03-15', time: null }], new Date(2026, 9, 15));
  assert.ok(!/DTSTART:\d{8}T/.test(ics));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:'));
});

test('passed: ages freeze at the passed date', () => {
  const p = { id: 'r', name: 'Robbie', date: '1940-05-01', time: null, died: '2020-03-03' };
  const end = L.asOf(p, new Date(2026, 9, 15));
  const a = L.calendarAge(L.birthDate(p), end);
  assert.deepStrictEqual([a.years, a.months, a.days], [79, 10, 2]);
  const alive = { id: 's', name: 'Sam', date: '2000-01-01', time: null };
  const now = new Date(2026, 9, 15);
  assert.strictEqual(L.asOf(alive, now), now);
});

test('passed: titles say "would have" only after the passed date', () => {
  const p = { id: 'r', name: 'Robbie', date: '1990-01-01', time: null, died: '2015-06-01' };
  const ms = L.milestones(L.birthDate(p));
  const before = ms.find(m => m.key === 's5e8');
  const after = ms.find(m => m.key === 's1e9');
  assert.strictEqual(L.eventTitle(p, before), 'Robbie turns 500 million seconds');
  assert.strictEqual(L.eventTitle(p, after), 'Robbie would have turned 1 billion seconds');
  const planet = ms.find(m => m.key === 'pMars10');
  assert.strictEqual(L.eventTitle(p, planet), "Robbie's 10th Mars birthday");
});

test('passed: future "would have" events stay in the calendar file', () => {
  const p = { id: 'r', name: 'Robbie', date: '1990-01-01', time: null, died: '2015-06-01' };
  const ics = L.buildIcs([p], new Date(2026, 9, 15));
  assert.ok(ics.includes('SUMMARY:Robbie would have turned 1.5 billion seconds'));
});

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
