// Life Counter — pure sync + Google Calendar planning. No network here, so Node tests can load it.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./lifecalc.js'));
  else root.LifeSync = factory(root.LifeCalc);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  // ---------- account data merge ----------
  // A doc is {people: [{id, ..., updated}], deleted: {id: ms}}.
  // Newest edit of each person wins; a delete newer than the person's last edit removes them.
  function mergeDocs(a, b) {
    a = a || {}; b = b || {};
    const deleted = { ...(a.deleted || {}) };
    for (const [id, t] of Object.entries(b.deleted || {})) deleted[id] = Math.max(deleted[id] || 0, t);
    const byId = new Map();
    for (const p of [...(a.people || []), ...(b.people || [])]) {
      const cur = byId.get(p.id);
      if (!cur || (p.updated || 0) > (cur.updated || 0)) byId.set(p.id, p);
    }
    const order = [...(a.people || []), ...(b.people || [])].map(p => p.id);
    const people = [...new Set(order)].map(id => byId.get(id)).filter(p => !(deleted[p.id] >= (p.updated || 0)));
    return { people, deleted };
  }

  function sameDoc(a, b) {
    return JSON.stringify(mergeDocs(a, {}).people) === JSON.stringify(mergeDocs(b, {}).people)
      && JSON.stringify(sortKeys(a.deleted || {})) === JSON.stringify(sortKeys(b.deleted || {}));
  }
  function sortKeys(o) { return Object.fromEntries(Object.entries(o).sort()); }

  // ---------- calendar events ----------
  // Google event ids: lowercase a–v and 0–9, 5–1024 chars. Hex is a subset.
  function hash32(s, seed) {
    let h = seed >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  function eventId(personId, key) {
    const s = personId + '|' + key;
    return 'lc' + hash32(s, 2166136261) + hash32(s, 3735928559) + hash32(s, 374761393);
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function dayStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  // Every future milestone (including "would have" ones) as a Google event body.
  function desiredEvents(people, now, timeZone) {
    const out = [];
    for (const p of people) {
      if (p.noYear) continue;
      const birth = L.birthDate(p);
      for (const m of L.milestones(birth)) {
        if (m.date <= now) continue;
        const ev = {
          id: eventId(p.id, m.key),
          summary: L.eventTitle(p, m),
          description: 'From Life Counter',
          extendedProperties: { private: { lc: '1', person: p.id, key: m.key } },
          transparency: 'transparent',
        };
        if (m.timed && p.time) {
          ev.start = { dateTime: m.date.toISOString(), timeZone };
          ev.end = { dateTime: new Date(m.date.getTime() + 15 * 60000).toISOString(), timeZone };
        } else {
          ev.start = { date: dayStr(m.date) };
          ev.end = { date: dayStr(L.addDays(m.date, 1)) };
        }
        out.push(ev);
      }
    }
    return out;
  }

  function startKey(s) {
    if (!s) return '';
    return s.date || new Date(s.dateTime).toISOString();
  }

  // Compare what's in the Life Counter calendar with what should be there.
  // Only events carrying our private "lc" mark are ever touched.
  function planCalendar(desired, existing) {
    const mine = existing.filter(e => e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.lc === '1');
    const have = new Map(mine.map(e => [e.id, e]));
    const want = new Map(desired.map(e => [e.id, e]));
    const insert = [], update = [], remove = [];
    for (const e of desired) {
      const cur = have.get(e.id);
      if (!cur) insert.push(e);
      else if (cur.summary !== e.summary || startKey(cur.start) !== startKey(e.start)) update.push(e);
    }
    for (const e of mine) if (!want.has(e.id)) remove.push(e.id);
    return { insert, update, remove };
  }

  // ---------- birthdays found in Google Calendar ----------
  const NAME_RE = /^(.*?)(?:'s|’s|s')?\s+birthday\b.*$/i;
  function nameFrom(summary) {
    const s = (summary || '').trim();
    const m = s.match(NAME_RE);
    if (m && m[1].trim()) return m[1].trim();
    const n = s.replace(/\bbirthday\b/i, '').replace(/[-–:!]+/g, ' ').trim();
    return n || null;
  }

  // items: Calendar API events (series masters). Returns [{googleId, name, date, noYear}].
  function parseBirthdays(items, now) {
    const seen = new Set(), out = [];
    for (const e of items || []) {
      if (!e || e.status === 'cancelled' || !e.start) continue;
      const isBirthdayType = e.eventType === 'birthday';
      if (!isBirthdayType && !/birthday/i.test(e.summary || '')) continue;
      if (isBirthdayType && e.birthdayProperties && e.birthdayProperties.type && e.birthdayProperties.type !== 'birthday') continue;
      if (!isBirthdayType && !(e.recurrence || []).some(r => /FREQ=YEARLY/.test(r))) continue;
      const raw = e.start.date || (e.start.dateTime || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) continue;
      const name = nameFrom(e.summary);
      if (!name) continue;
      const year = Number(raw.slice(0, 4));
      const createdYear = e.created ? new Date(e.created).getFullYear() : null;
      // A series that starts the year it was made (or later), or before 1900, has no real birth year.
      const noYear = year < 1900 || year > now.getFullYear() || (createdYear !== null && year >= createdYear);
      const key = name.toLowerCase() + raw.slice(4);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ googleId: e.id, name, date: raw, noYear });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Is this found birthday already in the app?
  function alreadyHave(people, found) {
    return people.some(p => (p.googleId && p.googleId === found.googleId)
      || (p.name.toLowerCase() === found.name.toLowerCase() && p.date.slice(5) === found.date.slice(5)));
  }

  return { mergeDocs, sameDoc, eventId, desiredEvents, planCalendar, nameFrom, parseBirthdays, alreadyHave };
});
