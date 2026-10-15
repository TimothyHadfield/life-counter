# Life Counter — direction

_Tim's intent, from the kickoff interview (2026-10-15). **This overrules every other file.** Rerun the interview (`/kickoff`) if the goal changes. Items marked (assumed) weren't answered yet._

## What it's for
"A system of keeping track of weird info about someone's life and any of your friends lives based on their birthday."
His notes: "Life counter: shows exactly how old you are in all the different ways (minutes, seconds, hours) and shows you dates on important benchmarks (1 billion seconds, etc). Auto adds to Google Calendar if available."

Done (v1) = enter yourself and friends; see live ages every way, a dated benchmark list, fun birth facts, friend comparisons; get the milestones into a calendar.

## Who uses it, and where
- Users: just Tim · accounts: no
- Devices: iPhone first, laptop too

## Hard constraints
- Money: $0, free tiers only, no card on file
- Data: birthdays (name, date, optional time) stored in the browser on that device only (localStorage). No server. Backup = export/import a JSON file. The repo is public, so no real birthdays in the repo.
- Birth time: optional; without one, count from noon and say it's approximate.

## Scope, in priority order
1. Live ticking counters (years, months, weeks, days, hours, minutes, seconds)
2. Benchmarks list with dates (1 billion seconds, 10,000 days, …), past ✓ / upcoming
3. Fun birth facts (weekday born, zodiac, Chinese zodiac, birthstone, planet ages, heartbeats ≈, golden birthday …)
4. Friend comparisons (age gaps, double-age day, who hits the next milestone first)
5. Calendar: one .ics file per person (or everyone), imported once

## Parking lot (explicitly later / out)
- Truly automatic Google Calendar writing (Google login + Calendar API) · Tim chose the import-once file instead
- Sync between phone and laptop / friends using it themselves · Tim chose "just me, on my device"

## Taste
"iPhone first, match my projects": dark, compact, like his other apps. He decides visuals, wording and names.

## Working agreement
- Act on the recommendation; set up + build v1 now (Tim, 2026-10-15).
- Folder stays at `Code Projects\Life Counter` (Tim, 2026-10-15).
