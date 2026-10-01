# Quickstart: GymTracker v1

**Feature**: 001-gym-nutrition-tracker | **Date**: 2026-09-30

## Requirements

- **Node.js >= 22.5.0** — the project uses the built-in `node:sqlite` module. Verified on v24.6.0.
- Nothing else. No database server, no build toolchain, no internet connection.

Check your runtime:

```bash
node --version
```

If this reports anything below 22.5, the server will refuse to start with an explicit message
rather than failing later in an obscure way.

## Run

```bash
npm install     # installs exactly one package: express
npm start       # http://127.0.0.1:3000
```

On first start the server creates `data/gymtracker.db` and applies migrations. It does **not** load
any data — seeding only ever happens on explicit request — so the app opens with empty states. The
console reports each step:

```text
gymtracker: database data/gymtracker.db
gymtracker: migrations applied (1)
gymtracker: database is empty — use the "Load demo data" button or POST /api/demo/reset
gymtracker: listening on http://127.0.0.1:3000
```

Confirm the server is healthy:

```bash
curl -s http://127.0.0.1:3000/api/health
# {"status":"ok","database":"ok","empty":true}
```

## Load the demo data

Nothing is seeded automatically. Either click **Load demo data** in the UI and confirm, or:

```bash
curl -X POST http://127.0.0.1:3000/api/demo/reset \
  -H 'Content-Type: application/json' \
  -d '{"confirm":"RESET"}'
```

**This erases all existing data first.** Against an empty database that is a no-op, which is why
the same endpoint serves both the initial load and a mid-demo reset. Against a database holding
real records there is no undo. The seed is deterministic and generated relative to today, so two
calls on the same day produce identical data and the demo always looks recent.

## Configuration

Everything has a working default, so a fresh clone starts with no configuration at all.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./data/gymtracker.db` | SQLite file location |
| `NODE_ENV` | `development` | Controls log verbosity only |

```bash
PORT=4000 DB_PATH=/tmp/scratch.db npm start
```

No secrets exist in v1. If a credentialled integration is ever added, it belongs in an environment
variable read on the server, never in `public/`.

## Test

```bash
npm test        # node --test tests/
```

Runs three suites — validation and nutrition math (unit), repositories, migrations, and seed
determinism (integration), and the API routes over real HTTP (api). Each test file creates its own
temporary database and deletes it afterwards, so `data/gymtracker.db` is never touched and the
suites are order-independent.

Run one suite or one file while working:

```bash
node --test tests/unit/
node --test tests/api/workouts.api.test.js
```

## Demo script

Roughly five minutes, matching SC-008.

1. **Start clean.** `rm -rf data/ && npm start`, then open `http://127.0.0.1:3000`. The app opens
   empty — worth 10 seconds of airtime, since every screen's empty state is required behaviour.
2. **Load the demo data.** Click **Load demo data** and confirm. Every screen fills immediately.
3. **Workouts** — show eight weeks of history, then open a session and point out sets, reps, and
   weight. Edit one set's weight and show the session volume update.
4. **Exercises** — show the library, create one, then try to create it again to demonstrate the
   duplicate rejection. Archive an exercise and show that it vanishes from the new-session picker
   while remaining intact in history.
5. **Body weight** — add today's weigh-in, then re-enter a different value for the same date to
   show the one-per-date replacement.
6. **Nutrition** — search a food, log it by servings, then log the same food by grams to show
   identical totals. Delete an entry and watch the remaining-versus-goal figures recalculate.
7. **Goals** — show the two seeded goal sets with different effective dates. Change today's goals,
   then navigate back to a day from six weeks ago to show it still compares against the older
   goals.
8. **Progress** — set a range covering both goal periods. Point out the stepped calorie goal line,
   the body weight trend, weekly volume, and the per-exercise best. Then set the range to a window
   with no data to show the empty states.
9. **Reset** — run the demo reset again to return to the exact state from step 2.

### Resetting mid-demo

Same action as step 2, labelled **Reset demo data** once the database holds records, or over HTTP:

```bash
curl -X POST http://127.0.0.1:3000/api/demo/reset \
  -H 'Content-Type: application/json' \
  -d '{"confirm":"RESET"}'
```

**This deletes everything.** The confirmation string is required by the contract, the UI adds a
typed confirmation, and the server listens on loopback only — but there is no undo. Do not point
it at a database holding real data.

## Starting over

```bash
rm -rf data/        # server recreates an empty database on next start; reload the demo to populate
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `SQLite is an experimental feature` warning | Expected on `node:sqlite` | Harmless; see research R2 |
| Server exits with a Node version message | Runtime below 22.5 | Upgrade Node |
| `EADDRINUSE` | Port 3000 taken | `PORT=4000 npm start` |
| Every screen is empty | Expected on a fresh database — nothing is seeded automatically | Click **Load demo data**, or POST to `/api/demo/reset` |
| `SQLITE_CONSTRAINT` in the log | A bug reached the database with invalid data — the schema caught it | Fix the validator; the constraint is working as designed |
