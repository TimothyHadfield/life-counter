# Accounts, Google Calendar, Compare, Passed — plan

> **Tim asked (2026-10-15):** "make an account system so that people can save their data accross devices. Also make it so that they can connect to their google calendar and it will automatically identify people's birthdays already put in and put them into the app as well as allow the user to put in important dates in their calendar such as "Robbie turns 1 billion seconds" or something like that. Make a compare button by each person's name where you can select a different person and compare differences in all the data. Also allow you to make a "passed" date change to someones info as to say when they died."
> **Instruction:** build ("make").

**Status:** building · see BUILT sections at the bottom as phases land.

## Decided by Tim
- 2026-10-15 · Google's "unverified app" warning + 100-user cap is fine for now; no verification yet.
- 2026-10-15 · Sign-in: Google only. The app still works signed out (device-only, as v1).
- 2026-10-15 · Milestone events go in a separate "Life Counter" calendar the app creates.
- 2026-10-15 · After a passed date, later milestones stay, labelled "Would have …", and stay in the calendar.
- 2026-10-15 · This reverses v1's "just me, on my device" and "one file, import once" (direction.md updated).

## The answer (one sentence)
Firebase (free Spark) Google sign-in + one Firestore doc per user gives cross-device sync; the same Google sign-in, asked for two extra calendar permissions, lets the browser read birthday events and write milestones into a "Life Counter" calendar, with no server and $0.

## Blockers / deciding constraint
- **No server ($0, Spark plan):** Google access tokens from the browser last 1 hour with no refresh token, so calendar sync runs when the user taps **Sync** (or right after editing someone while the token is fresh). Nothing runs in the background. *reasoned* (refresh tokens need a client secret → Cloud Functions → Blaze billing).
- **Birth years:** Google birthday events come from Contacts and recur yearly; the birth year may be missing. Imported people without a year get flagged "add year" and are left out of the math until fixed. *documented (partly) + reasoned*.
- **Consent screen publishing status** can't be read or set from the CLI. If it's in "Testing", only listed test users can sign in. Tim may need one click ("Publish app"). *reasoned; measure after setup*.

## What the evidence says
- Calendar API `events.list` with `eventTypes=birthday` returns contact birthdays; `birthdayProperties.contact` links to People API. Birthday events can't be created or edited via API. *documented* · [event types](https://developers.google.com/calendar/api/guides/event-types)
- Sensitive scopes (calendar read) → unverified-app warning; Testing mode = test users only, 7-day refresh tokens. *documented*
- `calendar.app.created` (manage only calendars the app created) may be non-sensitive but isn't listed in the console picker. *unclear* → measure; fall back to `calendar` if it's refused.
- Smart Advisor set up Google sign-in fully from the CLI on 2026-10-15 (`firebase deploy --only auth` with `auth.providers.googleSignIn` in firebase.json). Use `signInWithPopup`, not redirect (iOS + GitHub Pages trap from Fitness Tracker). *measured in another project*

## What exists today
- [LifeCounter.html](../LifeCounter.html): whole UI, state in localStorage key `lifecounter.v1` `{people[], selected, tab, showPast}`.
- [lifecalc.js](../lifecalc.js): pure math, `.ics` builder. 18 Node tests.
- Person: `{id, name, date, time}`.

## Options
| Option | What it is | Cost | How it fails |
|---|---|---|---|
| A · Firebase Auth (Google) + Firestore `users/{uid}` + calendar via the same Google popup | Matches his other apps | Free; 1h token, popup per sync | Testing-mode consent screen blocks non-test users |
| B · Google Identity Services only, data in a Google Drive appData file | No Firebase | Free; Drive scope too | More permission prompts; no live cross-device updates |
| C · Firebase + Cloud Function for background calendar sync | True "automatic" | **Needs Blaze (card)** | Violates $0 |

## Recommendation (ranked)
1. If only one thing is built, build **Passed date + Compare** (no backend, no risk).
2. Then **accounts + sync** (Option A).
3. Then **calendar connect** (import birthdays, write milestones) on top of A.

## Deliberately NOT planned
- ~~Background/automatic calendar sync with no tap~~ · needs a server with billing
- ~~Email/password accounts~~ · Tim chose Google only
- ~~People API for birth years~~ · another sensitive scope; ask for the year in-app instead
- ~~Reading "Mom's birthday"-style events the user typed by hand~~ · phase 3b only if Tim asks; real birthday events first

## How this could be wrong
- Birthday events carry the birth year in their series start date → check on a real account; if so, fewer "add year" prompts.
- `calendar.app.created` works without the sensitive-scope path → measured on first connect.
- Firestore whole-doc writes lose an edit made on two devices at the same moment → acceptable for one person's own list (last write wins).

## Data model
- Person: `{id, name, date, time|null, died: 'YYYY-MM-DD'|null, diedTime|null, source: 'manual'|'google', googleId?, noYear?: true}`
- Firestore `users/{uid}`: `{people[], calendarId|null, updatedAt}`. Rules: owner only.
- Local stays the source when signed out. First sign-in merges local + cloud by id. Signing out keeps a local copy (device-only mode keeps working).

## Phases (each ships on its own)
1. **Passed + Compare** (no backend). Done when: passed person's counters freeze at the death moment and show "would be X today"; later milestones say "Would have …"; .ics keeps them; compare button next to each name opens A vs B with every unit, fact and milestone side by side + differences; tests for death math fail before the change.
2. **Accounts + sync.** Firebase project `life-counter-th`, Google sign-in, rules deployed, profile icon top-right → sign in / account. Done when: rules allow owner only (emulator or REST check), signed-out app unchanged, sign-in popup opens in WebKit headless.
3. **Calendar connect.** Account sheet → Connect Google Calendar → popup with calendar scopes → (a) list birthday events → checklist to import (flag missing years) → (b) create/find "Life Counter" calendar → upsert one event per future milestone per person (deterministic event ids), delete stale ones. Done when: pure diff logic tested in Node; real Google run is Tim's (NOT verified until then).

## Questions for Tim
a. ~~Unverified warning OK?~~ → yes, for now (2026-10-15)
b. ~~Sign-in method~~ → Google only (2026-10-15)
c. ~~Which calendar~~ → separate "Life Counter" calendar (2026-10-15)
d. ~~After passed date~~ → show as "Would have …" (2026-10-15)

## Sources
- https://developers.google.com/calendar/api/guides/event-types
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- https://developers.google.com/health/setup (Testing-mode 7-day tokens)
