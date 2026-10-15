# Life Counter — direction

_Tim's intent, from the kickoff interview (2026-10-15). **This overrules every other file.** Rerun the interview (`/kickoff`) if the goal changes. Items marked (assumed) weren't answered yet._

## What it's for
"A system of keeping track of weird info about someone's life and any of your friends lives based on their birthday."
His notes: "Life counter: shows exactly how old you are in all the different ways (minutes, seconds, hours) and shows you dates on important benchmarks (1 billion seconds, etc). Auto adds to Google Calendar if available."

Done (v1) = enter yourself and friends; see live ages every way, a dated benchmark list, fun birth facts, friend comparisons; get the milestones into a calendar.

### Added 2026-10-15 (second ask, reverses "device only" and "import once")
"make an account system so that people can save their data accross devices. Also make it so that they can connect to their google calendar and it will automatically identify people's birthdays already put in and put them into the app as well as allow the user to put in important dates in their calendar such as "Robbie turns 1 billion seconds" or something like that. Make a compare button by each person's name where you can select a different person and compare differences in all the data. Also allow you to make a "passed" date change to someones info as to say when they died."
- Sign-in: **Google only**. Guest mode (device only) still works without an account.
- Calendar: milestones go into a **separate "Life Counter" calendar**; birthdays are read from his Google Calendar and offered for import.
- Google's "unverified app" warning and 100-user cap are **fine for now**.
- Passed: after the passed date, later milestones show as **"would have"** and stay in the calendar.

## Who uses it, and where
- Users: Tim and anyone with a Google account · accounts: yes (Google sign-in, Firebase)
- Devices: iPhone first, laptop too

## Hard constraints
- Money: $0, free tiers only, no card on file (Firebase Spark plan; no Cloud Functions, so no background calendar sync)
- Data: birthdays (name, date, optional time, optional passed date). Signed out: browser only. Signed in: Firestore doc per user, owner-only rules. The repo is public, so no real birthdays in the repo.
- Birth time: optional; without one, count from noon and say it's approximate.

## Scope, in priority order
1. Live ticking counters (years, months, weeks, days, hours, minutes, seconds)
2. Benchmarks list with dates (1 billion seconds, 10,000 days, …), past ✓ / upcoming
3. Fun birth facts (weekday born, zodiac, Chinese zodiac, birthstone, planet ages, heartbeats ≈, golden birthday …)
4. Friend comparisons (age gaps, double-age day, who hits the next milestone first)
5. Calendar: one .ics file per person (or everyone), imported once
6. Accounts + cross-device sync (Google sign-in)
7. Google Calendar connect: import birthdays, write milestone events
8. Compare button by each person; passed (death) date

## Parking lot (explicitly later / out)
- ~~Google Calendar writing / sync between devices~~ · now in scope (second ask, 2026-10-15)
- Calendar sync with the app closed · needs a server (paid Blaze plan); sync runs on tap instead

## Taste
"iPhone first, match my projects": dark, compact, like his other apps. He decides visuals, wording and names.

## Working agreement
- Act on the recommendation; set up + build v1 now (Tim, 2026-10-15).
- Folder stays at `Code Projects\Life Counter` (Tim, 2026-10-15).
