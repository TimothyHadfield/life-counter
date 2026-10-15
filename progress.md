# Life Counter — progress (handoff for Claude)

## START HERE
_Last updated 2026-10-15. For Claude only; Tim doesn't read this. Catch-up authorizes nothing: only "Authorized next steps" below is approved work._
1. Read this file (it's short on purpose).
2. Read `direction.md` (it overrules everything).
3. Skim the last 3 entries of `chat.md`. Older history: `docs/archive/`.

## Goal right now
v1 is live. Waiting on Tim to try it on his iPhone and react.

## Status
| Area | State | Notes |
|---|---|---|
| Live counters | live | ticks every second; calendar age + big seconds number |
| Milestones | live | 37 benchmarks + planet birthdays; "Past" switch |
| Facts | live | 19 facts; ≈ ones explained behind ? |
| Friends | live | gap, double-age day, next 8 milestones for everyone |
| Calendar | live | .ics per person or everyone; stable UIDs so re-import updates |
| People / backup | live | add/edit/delete; JSON backup save/load |

## Authorized next steps
- 2026-10-15 · Set up files + repo + build v1 (done). Nothing further authorized yet.

## Standing instructions (Tim's words)
- Users: "Just me, on my device". No accounts, no server.
- Calendar: "One file, import once" (not Google login).
- v1 includes: "Live ticking counters, Benchmarks list, Fun birth facts, Friend comparisons".
- Birth time: "Optional time, default noon".
- Folder stays at `Code Projects\Life Counter`.

## Traps / rules that bite
- phone-view `--do fill:SEL=TEXT` splits on `=` → selectors can't contain `=`; use `label:nth-of-type(n) input`.
- `--local` seeds key `lifecounter.v1` (JSON: people[], selected, tab, showPast).
- Repo is public: never commit real birthdays or backup files (`.gitignore` covers *.ics and backup json).
- Pages URL root is `index.html`, which redirects to `LifeCounter.html` (Tim's original file name).

## Decisions
- 2026-10-15 · Plain HTML/JS, no build; math in `lifecalc.js` (UMD) so Node tests load it.
- 2026-10-15 · Phone: 4 bottom tabs (Live, Milestones, Facts, Friends). Laptop ≥900px: all four panels at once, no tabs.
- 2026-10-15 · Chinese zodiac uses `Intl` Chinese calendar (correct for Jan/Feb births), falls back to Gregorian year.
- 2026-10-15 · Timed .ics events only when birth time is known; otherwise all-day.
- 2026-10-15 · Dark theme, amber accent (#f5b041), no card borders.

## NOT verified
- iOS Safari tapping the calendar button: should offer "Add All" to Apple Calendar · needs Tim's iPhone
- Google Calendar import of the .ics (UID dedupe on re-import) · needs a real import
- JSON backup "Load" on iPhone file picker · needs Tim's iPhone

## Rejected / parked
- ~~Google login + Calendar API auto-add~~ · 2026-10-15 · Tim chose import-once file
- ~~Firebase sync / friend accounts~~ · 2026-10-15 · Tim chose device-only

## Map
- `LifeCounter.html` · the whole app (UI + styles)
- `lifecalc.js` · date math, milestones, facts, compare, .ics builder
- `tests/lifecalc.test.js` · Tests: `node tests/lifecalc.test.js` · last run 2026-10-15: 18 passed / 0 failed
- `docs/research.md` · existing-tools check
- Live: https://timothyhadfield.github.io/life-counter/ · hosting: GitHub Pages (repo TimothyHadfield/life-counter)
