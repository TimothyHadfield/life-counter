# Life Counter — chat log (for Claude)

_One entry per session, newest at the bottom, capped at 60 KB. Older entries are in `docs/archive/chat-archive.md`. The current state is in `progress.md`._

## 2026-10-15 · Kickoff + v1
- **Asked:** "keeping track of weird info about someone's life and any of your friends lives based on their birthday… shows exactly how old you are in all the different ways… dates on important benchmarks (1 billion seconds, etc). Auto adds to Google Calendar if available. Make appropriate md files and make a repository."
- **Decided (Tim, interview):** device-only, no accounts; calendar = one .ics import; v1 = counters + benchmarks + facts + friend comparisons; optional birth time (noon default); iPhone first, match his projects; build v1 now; keep folder in place.
- **Built:** `LifeCounter.html`, `lifecalc.js`, `index.html` redirect, tests, direction/progress/chat/README/research. Repo TimothyHadfield/life-counter (public), Pages on.
- **Verified how:** `node tests/lifecalc.test.js` 18/18 (1B seconds checked against known 2000-01-01 → 2031-09-09T01:46:40Z). phone-view WebKit 393×659: all four tabs, welcome, add sheet, people sheet: no overflow, no page scroll, no console errors; scripted add-two-people flow saved correctly, 63 .ics events built. Laptop 1440×900 screenshot: four panels fit.
- **Open:** real-iPhone calendar import and Google import untested; Tim's reaction to the look.
