# Life Counter — notes for Claude

Tim's web app: how old you and your friends are in every unit (live, to the second), dated benchmarks
(1 billion seconds, 10,000 days, planet birthdays), birth facts, friend comparisons, a "passed" date,
optional Google sign-in with cross-device sync, and Google Calendar (milestone calendar + birthday import).
Users: Tim and anyone with a Google account. iPhone first, laptop too.

- Live: https://timothyhadfield.github.io/life-counter/ (`index.html` redirects to `LifeCounter.html`)
- Repo: TimothyHadfield/life-counter (public). Push to `main` redeploys GitHub Pages.
- Firebase project `life-counter-th` (Spark, $0): Google auth + Firestore. No Cloud Functions.

## Read first
`direction.md` (Tim's intent, overrules everything) → `progress.md` (state, Traps, Rejected) → last entries of `chat.md`.
Plan for accounts/calendar: `docs/accounts-calendar-plan.md`.

## File map
- `LifeCounter.html` · the whole UI (one classic script; render functions, sheets, click delegation)
- `lifecalc.js` · pure date math: ages, milestones, facts, compare, .ics, passed (`diedDate`, `asOf`) (UMD, Node-testable)
- `sync.js` · pure: account merge (newest wins + tombstones), calendar event plan, birthday parsing, backup import cleaning (`cleanImport`) (UMD)
- `cloud.js` · ES module: Firebase auth/Firestore + Google Calendar REST calls, exposes `window.LCCloud`. If it fails to load, the app works device-only.
- `firestore.rules` · one doc per user `users/{uid}`, owner-only, schema-checked. Don't change without Tim.
- `firebase.json`, `.firebaserc` · deploy rules: `firebase deploy --only firestore:rules`
- `tests/` · `lifecalc.test.js`, `sync.test.js` (plain Node + assert), `rules.test.mjs` (emulator)

## Run and test
- Local: `python -m http.server 8129` in this folder (background), open http://localhost:8129/LifeCounter.html
- Tests: `node tests/lifecalc.test.js`, `node tests/sync.test.js`, `node tests/dates.test.js`, `node tests/build.test.js` (no npm install needed)
  and `node tests/ui.test.mjs` (WebKit via the Playwright in `~/.claude/tools`; own local server, cloud.js stubbed, no Firebase)

## Shipping a change (every push that changes LifeCounter.html, lifecalc.js, sync.js or cloud.js)
- **Bump the build in three places, same value** (`YYYY-MM-DD.N`): `const BUILD` in LifeCounter.html, every `?v=` on its
  `<script src>` tags, and `version.json`. `tests/build.test.js` fails if they disagree.
- Why: Pages caches for 10 min and there's no service worker. On open and on return to the app, the page fetches
  `version.json` (no-store); if it's newer it reloads once with `?v=<build>` (not while a sheet is open or something is
  typed; once per build per tab via sessionStorage `lifecounter.reloadedFor`). The build shows at the bottom of the Account sheet.
- After pushing: `curl -s https://timothyhadfield.github.io/life-counter/version.json` until it shows the new build.
- Rules: needs `@firebase/rules-unit-testing` + `firebase` resolvable, then
  `firebase emulators:exec --only firestore "node tests/rules.test.mjs firestore.rules"` (port 8087)
- UI: phone-view with `--local "lifecounter.v1=<json>"` to seed people. Hidden checkbox `[data-past]` can't be clicked; click `.sw`.
- Signed-in screens: no `claude-test` Google account exists. Stub `window.LCCloud` (with `push()` counter) and call
  `LCApp.enterAccount('stubuid')` in `--eval` instead. Never write to the live Firestore.

## Data
- Person: `{id, name, date 'YYYY-MM-DD', time 'HH:MM'|null, died 'YYYY-MM-DD'|null, updated ms, googleId?, noYear?}`
- Guest: localStorage `lifecounter.v1`. Signed in: `lifecounter.acct.<uid>` + Firestore `users/{uid}` `{people, deleted, calendarId, updatedAt}`.
- `save()` = local + cloud push (+ calendar auto-sync if token valid). `persist()` = local only. Use `persist()` for
  view-only state (tab, picked person, Past toggle) so taps don't write to Firestore.
- Anything that reaches HTML goes through `esc()`. Backup files are untrusted: import only via `LifeSync.cleanImport`.

## Standing instructions (Tim's words, from progress.md)
- "Google-only sign-in". Guest (device-only) mode stays.
- Separate "Life Counter" calendar for milestones.
- Unverified-app warning and 100-user cap: "fine for now".
- Passed: later milestones show as "would have" and stay in the calendar.
- Folder stays at `Code Projects\Life Counter`.
- "iPhone first, match my projects": dark, compact. Tim decides visuals, wording and names.

## Traps
- Google popups must open synchronously inside the tap handler (iOS blocks after an await).
- Calendar token: 1 hour in sessionStorage `lifecounter.gtoken`; bump `TOKEN_V` in cloud.js when scopes change.
- Only calendar events with private extendedProperty `lc=1` are ever touched.
- `render()` rebuilds the top bar; it saves/restores `.chips` scrollLeft. Keep that.
- Repo is public: never commit real birthdays, backup files, emails or OAuth client secrets.
- Commit messages with quotes: use `git commit -F <file>`.
- phone-view `--do fill:SEL=TEXT` splits on `=`, so selectors can't contain `=`.
