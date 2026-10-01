# GymTracker

A single-user gym and nutrition tracker that runs locally. Log workouts, track body weight,
record meals against effective-dated calorie and macro goals, and view progress trends.

No accounts, no cloud, no internet connection. Your data lives in one SQLite file.

## Requirements

**Node.js >= 22.5** — nothing else. The project uses the built-in `node:sqlite` module, so there
is no native compilation step and no database server to install.

## Run

```bash
npm install     # installs one package: express
npm start       # http://127.0.0.1:3000
```

The first start creates `data/gymtracker.db` and applies migrations. **No data is loaded
automatically** — click **Load demo data** in the app to populate it, or:

```bash
curl -X POST http://127.0.0.1:3000/api/demo/reset \
  -H 'Content-Type: application/json' -d '{"confirm":"RESET"}'
```

> The reset erases **all** data, including your own records. It cannot be undone.

## Test

```bash
npm test
```

182 tests across validation, persistence, and the API routes. Each test file uses its own
temporary database, so `data/gymtracker.db` is never touched.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./data/gymtracker.db` | SQLite file location |

The server binds to `127.0.0.1` only and is not reachable from the network.

## Structure

```text
server.js   entry point: migrate, then listen
src/
  routes/        HTTP concerns only
  services/      business rules
  db/            connection, migrations, repositories (the only place SQL lives)
  validation/    boundary validation
  seed/          deterministic demo data
public/          vanilla HTML/CSS/JS frontend, no build step
tests/           unit, integration, and API suites
```

Requests flow `frontend → API → routes → services → repositories → SQLite`, and SQL exists only
beneath `src/db/`.

## Documentation

Full specification, implementation plan, data model, API contract, and a demo script live in
[specs/001-gym-nutrition-tracker/](specs/001-gym-nutrition-tracker/). Start with
[quickstart.md](specs/001-gym-nutrition-tracker/quickstart.md).

The engineering principles this codebase is held to are in
[.specify/memory/constitution.md](.specify/memory/constitution.md).
