# Life Counter — chat log (for Claude)

_One entry per session, newest at the bottom, capped at 60 KB. Older entries are in `docs/archive/chat-archive.md`. The current state is in `progress.md`._

## 2026-10-15 · Kickoff + v1
- **Asked:** "keeping track of weird info about someone's life and any of your friends lives based on their birthday… shows exactly how old you are in all the different ways… dates on important benchmarks (1 billion seconds, etc). Auto adds to Google Calendar if available. Make appropriate md files and make a repository."
- **Decided (Tim, interview):** device-only, no accounts; calendar = one .ics import; v1 = counters + benchmarks + facts + friend comparisons; optional birth time (noon default); iPhone first, match his projects; build v1 now; keep folder in place.
- **Built:** `LifeCounter.html`, `lifecalc.js`, `index.html` redirect, tests, direction/progress/chat/README/research. Repo TimothyHadfield/life-counter (public), Pages on.
- **Verified how:** `node tests/lifecalc.test.js` 18/18 (1B seconds checked against known 2000-01-01 → 2031-09-09T01:46:40Z). phone-view WebKit 393×659: all four tabs, welcome, add sheet, people sheet: no overflow, no page scroll, no console errors; scripted add-two-people flow saved correctly, 63 .ics events built. Laptop 1440×900 screenshot: four panels fit.
- **Open:** real-iPhone calendar import and Google import untested; Tim's reaction to the look.

## 2026-10-15 · Accounts, Google Calendar, compare, passed
- **Asked:** "make an account system so that people can save their data accross devices… connect to their google calendar… identify people's birthdays… put in important dates… "Robbie turns 1 billion seconds"… compare button by each person's name… "passed" date…"
- **Decided (Tim):** Google-only sign-in; separate Life Counter calendar; unverified warning + 100-user cap fine; after passed, "would have" milestones kept.
- **Built:** plan `docs/accounts-calendar-plan.md`; phase 1 passed + compare (commit 2c1259b); phase 2/3 `cloud.js`, `sync.js`, account sheet, calendar sync, birthday import, Firebase project `life-counter-th` (auth, Firestore, rules).
- **Verified how:** node tests 21/21 + 14/14; Firestore rules emulator 12/12; headless WebKit: sign-in popup reaches accounts.google.com; stubbed LCCloud account sheet (signed in/out) and birthday import flow at 393px.
- **Open:** real Google sign-in/calendar on Tim's account; consent screen may need "Publish app".
