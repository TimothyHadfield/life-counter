// Life Counter — accounts (Firebase Google sign-in + Firestore) and Google Calendar.
// Loaded as a module. If it fails to load, the app keeps working on this device only.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, doc, onSnapshot, runTransaction, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const S = window.LifeSync;
const App = () => window.LCApp;

const app = initializeApp({
  apiKey: 'AIzaSyAadOyWF9-KeWf20NARKOF70KRLF14uwSE',
  authDomain: 'life-counter-th.firebaseapp.com',
  projectId: 'life-counter-th',
  appId: '1:312956207631:web:0dffb424c5b3de637f997a',
  messagingSenderId: '312956207631',
});
const auth = getAuth(app);
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache() }); }
catch (e) { db = initializeFirestore(app, {}); }

// ---------- account sync ----------
let user = null, unsub = null, ready = false, pushTimer = null, server = null;
let status = 'signed-out'; // signed-out | loading | saved | saving | offline | error

function setStatus(s) { status = s; App().cloudChanged(); }

onAuthStateChanged(auth, u => {
  if (unsub) { unsub(); unsub = null; }
  user = u; ready = false; server = null;
  if (!u) { App().leaveAccount(); setStatus('signed-out'); return; }
  App().enterAccount(u.uid);
  setStatus('loading');
  const ref = doc(db, 'users', u.uid);
  unsub = onSnapshot(ref, { includeMetadataChanges: false }, snap => {
    server = snap.exists() ? snap.data() : { people: [], deleted: {} };
    if (!ready) {
      ready = true;
      offerGuestPeople(u.uid);
      if (server.calendarId && !App().calendarId()) App().setCalendarId(server.calendarId, true);
    }
    const local = App().getDoc();
    const merged = S.mergeDocs(server, local);
    App().applyDoc(merged);
    if (!S.sameDoc(merged, server) || (App().calendarId() || null) !== (server.calendarId || null)) push();
    else if (!snap.metadata.fromCache) setStatus('saved');
  }, err => { console.warn(err); setStatus('error'); });
});

// First sign-in on this device: offer to add the people saved here (once per account).
function offerGuestPeople(uid) {
  const flag = 'lifecounter.merged.' + uid;
  let done = false;
  try { done = localStorage.getItem(flag) === '1'; localStorage.setItem(flag, '1'); } catch (e) {}
  if (done) return;
  const guest = App().guestDoc();
  if (!guest.people.length) return;
  const names = guest.people.slice(0, 3).map(p => p.name).join(', ') + (guest.people.length > 3 ? '…' : '');
  if (confirm(`Add the ${guest.people.length} people saved on this device (${names}) to this account?`)) {
    App().applyDoc(S.mergeDocs(App().getDoc(), guest));
  }
}

function push() {
  if (!user || !ready) return;
  clearTimeout(pushTimer);
  setStatus('saving');
  pushTimer = setTimeout(async () => {
    const ref = doc(db, 'users', user.uid);
    try {
      const merged = await runTransaction(db, async tx => {
        const snap = await tx.get(ref);
        const cur = snap.exists() ? snap.data() : { people: [], deleted: {} };
        const m = S.mergeDocs(cur, App().getDoc());
        tx.set(ref, {
          people: m.people, deleted: m.deleted,
          calendarId: App().calendarId() || cur.calendarId || null,
          updatedAt: serverTimestamp(),
        });
        return m;
      });
      App().applyDoc(merged);
      setStatus('saved');
    } catch (e) {
      console.warn('save failed', e);
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, 600);
}
window.addEventListener('online', () => { if (status === 'offline' || status === 'error') push(); });

// ---------- Google Calendar ----------
const SCOPE_READ = 'https://www.googleapis.com/auth/calendar.events.readonly';
const SCOPE_APP = 'https://www.googleapis.com/auth/calendar.app.created';
const SCOPE_FULL = 'https://www.googleapis.com/auth/calendar';
const TOKEN_KEY = 'lifecounter.gtoken';
let calStatus = '';

function getToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    if (t && t.uid === (user && user.uid) && t.exp > Date.now()) return t;
  } catch (e) {}
  return null;
}
function dropToken() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }
function wantFull() { try { return localStorage.getItem('lifecounter.fullscope') === '1'; } catch (e) { return false; } }

// Must run straight from a tap (iOS blocks popups after an await).
function connect() {
  if (!user) return Promise.reject(new Error('Sign in first.'));
  const p = new GoogleAuthProvider();
  p.addScope(SCOPE_READ);
  p.addScope(wantFull() ? SCOPE_FULL : SCOPE_APP);
  p.setCustomParameters({ login_hint: user.email || '' });
  return reauthenticateWithPopup(user, p).then(res => {
    const cred = GoogleAuthProvider.credentialFromResult(res);
    if (!cred || !cred.accessToken) throw new Error('Google did not give calendar access.');
    const t = { uid: user.uid, token: cred.accessToken, exp: Date.now() + 55 * 60000, full: wantFull() };
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) {}
    App().cloudChanged();
    return t;
  });
}

// Use the saved token, or open the Google popup first (still inside the tap).
function withToken() {
  const t = getToken();
  return t ? Promise.resolve(t) : connect();
}

async function gapi(path, opts = {}) {
  const t = getToken();
  if (!t) throw new Error('needs-connect');
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://www.googleapis.com/calendar/v3' + path, {
      ...opts, headers: { authorization: 'Bearer ' + t.token, 'content-type': 'application/json', ...(opts.headers || {}) },
    });
    if (res.status === 401) { dropToken(); App().cloudChanged(); throw new Error('needs-connect'); }
    if ((res.status === 429 || res.status === 403 || res.status >= 500) && attempt < 5) {
      const body = res.status === 403 ? await res.clone().text() : '';
      if (res.status !== 403 || /rateLimit|userRateLimit/i.test(body)) { await new Promise(r => setTimeout(r, 500 * 2 ** attempt)); continue; }
    }
    return res;
  }
}

async function listAll(path) {
  const out = [];
  let page = '';
  do {
    const res = await gapi(path + (path.includes('?') ? '&' : '?') + 'maxResults=2500' + (page ? '&pageToken=' + encodeURIComponent(page) : ''));
    if (!res.ok) throw new Error('Calendar read failed (' + res.status + ')');
    const j = await res.json();
    out.push(...(j.items || []));
    page = j.nextPageToken;
  } while (page);
  return out;
}

async function ensureCalendar() {
  let id = App().calendarId();
  if (id) {
    const r = await gapi('/calendars/' + encodeURIComponent(id));
    if (r.ok) return id;
    if (r.status !== 404 && r.status !== 403) throw new Error('Calendar check failed (' + r.status + ')');
  }
  const r = await gapi('/calendars', { method: 'POST', body: JSON.stringify({
    summary: 'Life Counter', description: 'Milestones from Life Counter',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }) });
  if (r.status === 403 && !getToken().full) {
    try { localStorage.setItem('lifecounter.fullscope', '1'); } catch (e) {}
    dropToken();
    throw new Error('Google needs one more permission. Tap Sync again.');
  }
  if (!r.ok) throw new Error('Could not make the Life Counter calendar (' + r.status + ')');
  id = (await r.json()).id;
  App().setCalendarId(id);
  return id;
}

async function runPool(items, n, fn) {
  let i = 0, done = 0;
  const total = items.length;
  await Promise.all(Array.from({ length: Math.min(n, total) }, async () => {
    while (i < total) { const it = items[i++]; await fn(it); done++; setCal(`Syncing… ${done}/${total}`); }
  }));
}

function setCal(s) { calStatus = s; App().cloudChanged(); }

let syncing = null;
async function doSync() {
  const calId = await ensureCalendar();
  setCal('Syncing…');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const want = S.desiredEvents(App().getDoc().people, new Date(), tz);
  const have = await listAll(`/calendars/${encodeURIComponent(calId)}/events?privateExtendedProperty=lc%3D1&showDeleted=false`);
  const plan = S.planCalendar(want, have);
  const base = `/calendars/${encodeURIComponent(calId)}/events`;
  const jobs = [
    ...plan.insert.map(e => async () => {
      let r = await gapi(base, { method: 'POST', body: JSON.stringify(e) });
      if (r.status === 409) r = await gapi(`${base}/${e.id}`, { method: 'PUT', body: JSON.stringify({ ...e, status: 'confirmed' }) });
      if (!r.ok) throw new Error('Add failed (' + r.status + ')');
    }),
    ...plan.update.map(e => async () => {
      const r = await gapi(`${base}/${e.id}`, { method: 'PUT', body: JSON.stringify({ ...e, status: 'confirmed' }) });
      if (!r.ok) throw new Error('Update failed (' + r.status + ')');
    }),
    ...plan.remove.map(id => async () => {
      const r = await gapi(`${base}/${id}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error('Remove failed (' + r.status + ')');
    }),
  ];
  await runPool(jobs, 4, j => j());
  const n = jobs.length;
  setCal(n ? `Synced · ${plan.insert.length} added, ${plan.update.length} changed, ${plan.remove.length} removed` : 'Synced · up to date');
}

function syncCalendar(fromTap) {
  if (syncing) return syncing;
  if (!getToken() && !fromTap) return Promise.resolve();
  syncing = withToken().then(doSync).catch(e => { setCal(e.message === 'needs-connect' ? 'Tap Sync to reconnect Google' : e.message); })
    .finally(() => { syncing = null; });
  return syncing;
}

// Quiet sync after edits, only while a token is still good.
let autoTimer = null;
function autoSync() {
  if (!getToken() || !App().calendarId()) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => syncCalendar(false), 4000);
}

function findBirthdays() {
  return withToken().then(async () => {
    setCal('Looking for birthdays…');
    const a = await listAll('/calendars/primary/events?eventTypes=birthday');
    let b = [];
    try { b = await listAll('/calendars/primary/events?eventTypes=default&q=birthday'); } catch (e) {}
    const found = S.parseBirthdays([...a, ...b], new Date());
    setCal(found.length ? `Found ${found.length} birthdays` : 'No birthdays found in Google Calendar');
    return found;
  }).catch(e => { setCal(e.message === 'needs-connect' ? 'Tap again to reconnect Google' : e.message); return null; });
}

window.LCCloud = {
  ready: true,
  get user() { return user && { email: user.email, uid: user.uid }; },
  get status() { return status; },
  get calStatus() { return calStatus; },
  get calendarLinked() { return !!getToken(); },
  // Must be called straight from a tap.
  signIn: () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => { if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') alert('Sign-in failed: ' + (e.code || e.message)); }),
  signOut: () => { dropToken(); return signOut(auth); },
  push: () => { push(); autoSync(); },
  syncCalendar: () => syncCalendar(true),
  findBirthdays,
};
App().cloudChanged();
