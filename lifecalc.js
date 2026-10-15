// Life Counter — pure date math. No DOM here, so Node tests can load it.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LifeCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR, WEEK = 7 * DAY;
  const YEAR_DAYS = 365.2425;

  // Birth instant in the device's local time. No time given → noon, marked approximate.
  function birthDate(person) {
    const [y, m, d] = person.date.split('-').map(Number);
    let hh = 12, mm = 0;
    if (person.time) [hh, mm] = person.time.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

  function addMonths(date, n) {
    const d = new Date(date.getTime());
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  }

  // Calendar days keep the clock time across DST changes.
  function addDays(date, n) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  // Whole calendar years/months/days between two dates, plus the remainder.
  function calendarAge(birth, now) {
    let years = now.getFullYear() - birth.getFullYear();
    if (addMonths(birth, years * 12) > now) years--;
    let months = 0;
    while (addMonths(birth, years * 12 + months + 1) <= now) months++;
    const anchor = addMonths(birth, years * 12 + months);
    let days = 0;
    while (addDays(anchor, days + 1) <= now) days++;
    const rest = now - addDays(anchor, days);
    return {
      years, months, days,
      hours: Math.floor(rest / HOUR),
      minutes: Math.floor((rest % HOUR) / MIN),
      seconds: Math.floor((rest % MIN) / SEC),
    };
  }

  function totalMonths(birth, now) {
    const a = calendarAge(birth, now);
    return a.years * 12 + a.months;
  }

  // Every way to say how old someone is.
  function ages(birth, now) {
    const ms = now - birth;
    return {
      years: ms / (YEAR_DAYS * DAY),
      months: totalMonths(birth, now),
      weeks: ms / WEEK,
      days: ms / DAY,
      hours: ms / HOUR,
      minutes: ms / MIN,
      seconds: ms / SEC,
      calendar: calendarAge(birth, now),
    };
  }

  // Benchmarks. kind: exact (fixed ms), days (calendar days), months (calendar months).
  const MILESTONES = [
    { key: 's1e8', label: '100 million seconds', kind: 'exact', ms: 1e8 * SEC },
    { key: 's5e8', label: '500 million seconds', kind: 'exact', ms: 5e8 * SEC },
    { key: 's1e9', label: '1 billion seconds', kind: 'exact', ms: 1e9 * SEC },
    { key: 's1234567890', label: '1,234,567,890 seconds', kind: 'exact', ms: 1234567890 * SEC },
    { key: 's1.5e9', label: '1.5 billion seconds', kind: 'exact', ms: 1.5e9 * SEC },
    { key: 's2e9', label: '2 billion seconds', kind: 'exact', ms: 2e9 * SEC },
    { key: 's2.5e9', label: '2.5 billion seconds', kind: 'exact', ms: 2.5e9 * SEC },
    { key: 's3e9', label: '3 billion seconds', kind: 'exact', ms: 3e9 * SEC },
    { key: 'm1e6', label: '1 million minutes', kind: 'exact', ms: 1e6 * MIN },
    { key: 'm1e7', label: '10 million minutes', kind: 'exact', ms: 1e7 * MIN },
    { key: 'm2e7', label: '20 million minutes', kind: 'exact', ms: 2e7 * MIN },
    { key: 'm3e7', label: '30 million minutes', kind: 'exact', ms: 3e7 * MIN },
    { key: 'm4e7', label: '40 million minutes', kind: 'exact', ms: 4e7 * MIN },
    { key: 'm5e7', label: '50 million minutes', kind: 'exact', ms: 5e7 * MIN },
    { key: 'h1e5', label: '100,000 hours', kind: 'exact', ms: 1e5 * HOUR },
    { key: 'h2e5', label: '200,000 hours', kind: 'exact', ms: 2e5 * HOUR },
    { key: 'h3e5', label: '300,000 hours', kind: 'exact', ms: 3e5 * HOUR },
    { key: 'h5e5', label: '500,000 hours', kind: 'exact', ms: 5e5 * HOUR },
    { key: 'd5000', label: '5,000 days', kind: 'days', n: 5000 },
    { key: 'd10000', label: '10,000 days', kind: 'days', n: 10000 },
    { key: 'd11111', label: '11,111 days', kind: 'days', n: 11111 },
    { key: 'd12345', label: '12,345 days', kind: 'days', n: 12345 },
    { key: 'd15000', label: '15,000 days', kind: 'days', n: 15000 },
    { key: 'd20000', label: '20,000 days', kind: 'days', n: 20000 },
    { key: 'd22222', label: '22,222 days', kind: 'days', n: 22222 },
    { key: 'd25000', label: '25,000 days', kind: 'days', n: 25000 },
    { key: 'd30000', label: '30,000 days', kind: 'days', n: 30000 },
    { key: 'w1000', label: '1,000 weeks', kind: 'days', n: 7000 },
    { key: 'w2000', label: '2,000 weeks', kind: 'days', n: 14000 },
    { key: 'w3000', label: '3,000 weeks', kind: 'days', n: 21000 },
    { key: 'w4000', label: '4,000 weeks', kind: 'days', n: 28000 },
    { key: 'mo100', label: '100 months', kind: 'months', n: 100 },
    { key: 'mo200', label: '200 months', kind: 'months', n: 200 },
    { key: 'mo300', label: '300 months', kind: 'months', n: 300 },
    { key: 'mo400', label: '400 months', kind: 'months', n: 400 },
    { key: 'mo500', label: '500 months', kind: 'months', n: 500 },
    { key: 'mo1000', label: '1,000 months', kind: 'months', n: 1000 },
  ];

  // Planet years in Earth years.
  const PLANETS = [
    { name: 'Mercury', years: 0.2408467 },
    { name: 'Venus', years: 0.61519726 },
    { name: 'Mars', years: 1.8808158 },
    { name: 'Jupiter', years: 11.862615 },
    { name: 'Saturn', years: 29.447498 },
  ];

  function milestoneDate(birth, m) {
    if (m.kind === 'exact') return new Date(birth.getTime() + m.ms);
    if (m.kind === 'days') return addDays(birth, m.n);
    return addMonths(birth, m.n);
  }

  function milestones(birth) {
    const list = MILESTONES.map(m => ({
      key: m.key, label: m.label, date: milestoneDate(birth, m), timed: m.kind === 'exact',
    }));
    // Planet birthdays: the next few whole planet-years.
    for (const p of PLANETS) {
      if (p.name === 'Jupiter' || p.name === 'Saturn') continue;
      const step = [10, 25, 50, 100].filter(n => n * p.years < 100);
      for (const n of step) {
        list.push({
          key: 'p' + p.name + n, label: `${n}th ${p.name} birthday`,
          date: new Date(birth.getTime() + n * p.years * YEAR_DAYS * DAY), timed: false,
        });
      }
    }
    return list.sort((a, b) => a.date - b.date);
  }

  const ZODIAC = [
    ['Capricorn', 1, 19], ['Aquarius', 2, 18], ['Pisces', 3, 20], ['Aries', 4, 19],
    ['Taurus', 5, 20], ['Gemini', 6, 20], ['Cancer', 7, 22], ['Leo', 8, 22],
    ['Virgo', 9, 22], ['Libra', 10, 22], ['Scorpio', 11, 21], ['Sagittarius', 12, 21],
  ];
  function zodiac(month, day) {
    for (const [name, m, last] of ZODIAC) if (month === m && day <= last) return name;
    return month === 12 ? 'Capricorn' : ZODIAC[month][0];
  }

  const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
  // Uses the real Chinese calendar when the browser has it (so January babies are right).
  function chineseZodiac(birth) {
    let year = birth.getFullYear(), exact = false;
    try {
      const parts = new Intl.DateTimeFormat('en-u-ca-chinese', { year: 'numeric' }).formatToParts(birth);
      const rel = parts.find(p => p.type === 'relatedYear');
      if (rel) { year = Number(rel.value); exact = true; }
    } catch (e) { /* fall back to the Gregorian year */ }
    return { animal: ANIMALS[((year - 4) % 12 + 12) % 12], exact };
  }

  const STONES = ['Garnet', 'Amethyst', 'Aquamarine', 'Diamond', 'Emerald', 'Pearl', 'Ruby', 'Peridot', 'Sapphire', 'Opal', 'Topaz', 'Turquoise'];

  function generation(year) {
    if (year >= 2013) return 'Gen Alpha';
    if (year >= 1997) return 'Gen Z';
    if (year >= 1981) return 'Millennial';
    if (year >= 1965) return 'Gen X';
    if (year >= 1946) return 'Boomer';
    return 'Silent Gen';
  }

  function nextBirthday(birth, now) {
    let years = now.getFullYear() - birth.getFullYear();
    let d = addMonths(birth, years * 12);
    if (d <= now) d = addMonths(birth, ++years * 12);
    return { date: d, turning: years };
  }

  // The birthday where your age equals your birth day of the month.
  function goldenBirthday(birth) {
    const day = birth.getDate();
    return { date: addMonths(birth, day * 12), age: day };
  }

  function facts(birth, now) {
    const ms = now - birth;
    const minutes = ms / MIN;
    const days = ms / DAY;
    const nb = nextBirthday(birth, now);
    const cz = chineseZodiac(birth);
    const wk = d => d.toLocaleDateString('en-US', { weekday: 'long' });
    return {
      bornOn: wk(birth),
      zodiac: zodiac(birth.getMonth() + 1, birth.getDate()),
      chinese: cz.animal, chineseExact: cz.exact,
      birthstone: STONES[birth.getMonth()],
      generation: generation(birth.getFullYear()),
      nextBirthday: nb.date, turning: nb.turning, nextBirthdayWeekday: wk(nb.date),
      halfBirthday: addMonths(birth, 6),
      golden: goldenBirthday(birth),
      planets: PLANETS.map(p => ({ name: p.name, age: ms / (p.years * YEAR_DAYS * DAY) })),
      heartbeats: minutes * 80,          // ~80 bpm lifetime average
      breaths: minutes * 16,             // ~16 breaths a minute
      sleptYears: (days / YEAR_DAYS) / 3, // ~1/3 of life asleep
      fullMoons: days / 29.530588,
      sunMiles: (days / YEAR_DAYS) * 584e6, // Earth's orbit ≈ 584 million miles
      leapDays: countLeapDays(birth, now),
    };
  }

  function countLeapDays(birth, now) {
    let n = 0;
    for (let y = birth.getFullYear(); y <= now.getFullYear(); y++) {
      if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) {
        const feb29 = new Date(y, 1, 29, 12);
        if (feb29 >= birth && feb29 <= now) n++;
      }
    }
    return n;
  }

  // Two people: gap and the day the older one was exactly twice the younger's age.
  function compare(birthA, birthB) {
    const older = birthA <= birthB ? birthA : birthB;
    const younger = older === birthA ? birthB : birthA;
    const gap = younger - older;
    return {
      aIsOlder: older === birthA,
      gapMs: gap,
      gapDays: gap / DAY,
      doubleAgeDay: new Date(younger.getTime() + gap),
    };
  }

  // .ics text for one or more people's future milestones.
  function icsDate(d) {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function icsDay(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  }
  function icsEscape(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }
  function buildIcs(people, now) {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life Counter//EN', 'CALSCALE:GREGORIAN'];
    const stamp = icsDate(now);
    for (const person of people) {
      const birth = birthDate(person);
      for (const m of milestones(birth)) {
        if (m.date <= now) continue;
        lines.push('BEGIN:VEVENT');
        lines.push(`UID:lifecounter-${person.id}-${m.key}@timothyhadfield.github.io`);
        lines.push(`DTSTAMP:${stamp}`);
        if (m.timed && person.time) {
          lines.push(`DTSTART:${icsDate(m.date)}`);
          lines.push(`DTEND:${icsDate(new Date(m.date.getTime() + 15 * MIN))}`);
        } else {
          lines.push(`DTSTART;VALUE=DATE:${icsDay(m.date)}`);
          lines.push(`DTEND;VALUE=DATE:${icsDay(addDays(m.date, 1))}`);
        }
        lines.push(`SUMMARY:${icsEscape(`${person.name}: ${m.label}`)}`);
        lines.push('END:VEVENT');
      }
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  return {
    SEC, MIN, HOUR, DAY, WEEK, MILESTONES, PLANETS,
    birthDate, addMonths, addDays, calendarAge, ages, milestones,
    zodiac, chineseZodiac, generation, nextBirthday, goldenBirthday, facts,
    countLeapDays, compare, buildIcs,
  };
});
