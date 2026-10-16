# Life Counter — progress (handoff for Claude)

## START HERE
_Last updated 2026-10-15 (late, after commit de44aa9). For Claude only; Tim doesn't read this. Catch-up authorizes nothing: only "Authorized next steps" below is approved work._
1. Read this file (it's short on purpose).
2. Read `direction.md` (it overrules everything).
3. Skim the last 3 entries of `chat.md`. Plan for accounts/calendar: `docs/accounts-calendar-plan.md`.

## Goal right now
Accounts + Google Calendar + compare + passed are built and live. Tim has signed in (as timhadfield7) and run Find birthdays: many found, but **family members were missing**. Fix shipped (bad16fc: search shared calendars, 🎂 titles, "Born …" year in description). Waiting on Tim to retry. If still missing, ask him for one name + which calendar + exact title.

## Status
| Area | State | Notes |
|---|---|---|
| Live counters | live | ticks every second; frozen + "would be N today" for passed people |
| Milestones | live | 37 benchmarks + planet birthdays; "Would have:" after passed date |
| Facts / Friends | live | facts use `asOf` (death date if passed) |
| Compare | live | ⇄ button in Live header, Friends rows, people sheet; picker if >2 people |
| Passed date | live | optional field in edit form |
| Accounts | live | Google sign-in (popup), Firestore `users/{uid}`, merge newest-wins + tombstones |
| Google Calendar | live, untested with real Google data | "Life Counter" calendar, sync on tap + auto 4s after edits while token (1h) valid |
| Birthday import | live; works on Tim's account except family (fix pending his retry) | primary birthday events + every readable calendar (`birthdayCalendars`: birthday-named → all events, others → q=birthday), checkbox sheet |
| .ics / JSON backup | live | 2026-10-16 sweep: backup import now validated (`LifeSync.cleanImport`) |

## Authorized next steps
- 2026-10-15 · Build accounts + calendar + compare + passed (done). Nothing further authorized yet.

## Standing instructions (Tim's words)
- "Google-only sign-in". Guest (device-only) mode stays.
- Separate "Life Counter" calendar for milestones.
- Unverified-app warning and 100-user cap: "fine for now".
- Passed: later milestones show as "would have" and stay in the calendar.
- v1 scope: "Live ticking counters, Benchmarks list, Fun birth facts, Friend comparisons". Birth time optional, default noon.
- Folder stays at `Code Projects\Life Counter`.

## Traps / rules that bite
- **Google popups must open synchronously inside the tap handler** (iOS blocks after an await). `connect()`/`signIn` are called straight from click handlers.
- Calendar token lives 1 hour in sessionStorage `lifecounter.gtoken`; no refresh token without a server. Scopes `calendar.events.readonly` + `calendar.app.created`; if creating the calendar 403s, flag `lifecounter.fullscope` switches to full `calendar` scope.
- Only events with private extendedProperty `lc=1` are ever touched. Event ids = 'lc' + FNV hex; insert, 409 → PUT confirmed.
- Firebase project `life-counter-th` became an Identity Platform project after `firebase deploy --only auth`. Authorized domains: localhost, firebaseapp, web.app, timothyhadfield.github.io.
- Admin API calls: scratchpad script exchanged the firebase-tools refresh token (clientId/secret from firebase-tools lib/api.js). OAuth client secret must never be committed.
- Rules test: `tests/rules.test.mjs` needs `npm i @firebase/rules-unit-testing firebase` somewhere it can resolve, then `firebase emulators:exec --only firestore "node tests/rules.test.mjs firestore.rules"` (emulator port 8087). Last run 2026-10-15: 12/12.
- Storage keys: guest `lifecounter.v1`; account cache `lifecounter.acct.<uid>`; one-time guest merge flag `lifecounter.merged.<uid>`.
- phone-view `--do fill:SEL=TEXT` splits on `=` → selectors can't contain `=`. phone-view runs `--eval` after `--do`.
- `render()` rebuilds the whole top bar: it saves and restores `.chips` scrollLeft (fixed 2026-10-15 after Tim: "problems scrolling on the top pannel with the users"). Keep that if render changes.
- **The claude.ai Google Calendar connector in this environment is robert7hadfield@gmail.com (not Tim).** Tim's app account is timhadfield7@gmail.com. Don't read that connector's calendar for Life Counter debugging; ask Tim instead. (Tim corrected this 2026-10-15: "it says timhadfield7, not rob".)
- Birthday calendar mode matches the calendar **name** only; a description mentioning birthdays (e.g. a family events calendar) must stay "search" mode or parties/trips become people.
- Commit messages with quotes break PowerShell `-m @'…'@` arg passing → use `git commit -F <scratchpad file>`.
- Repo is public: never commit real birthdays or backup files.
- Test account: none yet (needs a real Google account `claude-test`; stubbed `LCCloud` used for UI checks).

## Decisions
- 2026-10-15 · Plain HTML/JS, no build; math in `lifecalc.js`, sync logic in `sync.js` (UMD, Node-tested); Firebase in `cloud.js` (ES module, gstatic SDK 12.16.0).
- 2026-10-15 · One Firestore doc per user {people, deleted, calendarId, updatedAt}; writes are transactions merging server + local.
- 2026-10-15 · Account icon top-right opens Account sheet (sign in / status / calendar / sign out).
- 2026-10-15 · Calendar sync runs on tap (no server). Birthdays without a year ask for one.
- 2026-10-16 · Sweep (no visual changes): crafted backup file could inject HTML via id/time/died (Firebase audit Low 1) → `cleanImport` + `esc()`; tab/pick/Past taps use `persist()` (were pushing to Firestore + starting calendar auto-sync, 8 pushes per 6 taps measured); meta description + aria-label "Help". Added CLAUDE.md. Tests 21/21 + 17/17.
- 2026-10-15 · Phone: 4 bottom tabs. Laptop ≥900px: all panels. Dark theme, amber accent, no card borders.

## NOT verified
- Real sign-in works for Tim (measured by Tim using it 2026-10-15); other users unknown (consent screen may be in "Testing": Publish app at https://console.cloud.google.com/auth/audience?project=life-counter-th)
- Whether `calendar.app.created` scope is accepted, and real milestone calendar writes (Tim hasn't reported on Sync milestones)
- Whether Google birthday events carry the birth year (shared family calendar puts it in the description: "Born November 8, 2001", now parsed)
- Find birthdays across shared calendars (2026-10-15 fix, needs `calendar.calendarlist.readonly`; token `v:2` forces one reconnect) · needs Tim's real run
- iPhone popup flow, iOS .ics import, JSON backup load on iPhone

## Rejected / parked
- ~~Device-only, no accounts~~ · 2026-10-15 · reversed by Tim's second ask
- ~~Calendar sync while app closed~~ · needs Blaze billing (not $0)

## Map
- `LifeCounter.html` · the whole UI
- `lifecalc.js` · date math, milestones, facts, compare, .ics, passed (`diedDate`, `asOf`, `eventTitle`)
- `sync.js` · merge, calendar event plan, birthday parsing
- `cloud.js` · Firebase auth/Firestore + Calendar API calls (`window.LCCloud`)
- `firestore.rules`, `firebase.json`, `.firebaserc` · deploy: `firebase deploy --only firestore:rules`
- Tests: `node tests/lifecalc.test.js` (21/21), `node tests/sync.test.js` (17/17, 2026-10-16), rules `tests/rules.test.mjs` 12/12 · 2026-10-15
- Project path: `C:\Users\timha\OneDrive\Desktop\my-website\Code Projects\Life Counter`; push to main redeploys Pages.
- Live: https://timothyhadfield.github.io/life-counter/ · repo TimothyHadfield/life-counter
