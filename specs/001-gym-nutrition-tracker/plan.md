# Implementation Plan: GymTracker — Gym & Nutrition Tracking (v1)

**Branch**: `001-gym-nutrition-tracker` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-gym-nutrition-tracker/spec.md`

## Summary

GymTracker is a single-user, locally-run gym and nutrition tracker: custom exercises, dated
workout sessions with sets/reps/weight, body weight history, effective-dated calorie and macro
goals, food search and meal logging, progress trends over a user-chosen date range, and a
deterministic demo seed.

The technical approach is a single Node.js process that serves a static vanilla frontend from
`public/` and exposes a JSON REST API under `/api`. Code is layered strictly as
**routes → services → repositories → SQLite**, with SQL confined to the repository layer. The only
runtime dependency is Express; persistence uses the built-in `node:sqlite` module and tests use
the built-in `node:test` runner, so the project carries exactly one third-party package.

Two decisions carried into this plan resolve open items in the spec:

- **Seed data never loads automatically.** The plan input asked for automatic seeding of an empty
  database, but the spec clarification requires that demo data load only on explicit, confirmed
  request. The clarification wins: the sole path into the database is
  `POST /api/demo/reset` (FR-040, FR-041, FR-041a), now reinforced by FR-043. A fresh checkout
  opens with empty states until the presenter loads the demo. Startup therefore only migrates and
  listens — it never writes application data, which keeps the destructive and non-destructive
  concerns from blurring together.
- **Two edge cases left open by the spec are now decided**: a workout session must contain at
  least one set (empty sessions rejected with 400), and dates later than today are rejected.
  Rationale is recorded in [research.md](./research.md).
- **Six requirements defects found by the checklist review were resolved in the spec**: the
  rounding policy and input precision rules were promoted to requirements (FR-044 to FR-047),
  timezone handling was pinned to the server's local date (FR-048, FR-049), an accessibility
  baseline was added (FR-050 to FR-054), food nutrition values became immutable once referenced
  (FR-024c, FR-024d), SC-006 and SC-008 were reworded to be satisfiable, and the contract now
  applies one rule for 400 versus 404. See research R13 and R14.

## Technical Context

**Language/Version**: JavaScript (ES2022, ES modules), Node.js >= 22.5 — verified locally on
v24.6.0

**Primary Dependencies**: Express 5 (only runtime dependency). Persistence via the built-in
`node:sqlite` module; no ORM, no query builder, no validation library, no bundler, no transpiler,
no charting library.

**Storage**: SQLite single file at `data/gymtracker.db`, opened with `foreign_keys = ON` and
`journal_mode = WAL`. Schema applied by an ordered, idempotent migration runner at startup.

**Testing**: Built-in `node:test` + `node:assert/strict`, run via `npm test`. Three suites — unit
(validation and nutrition math), integration (repositories against a temporary on-disk database),
and API (routes exercised over HTTP on an ephemeral port). Every test file creates and destroys
its own database; no test touches `data/gymtracker.db`.

**Target Platform**: Local desktop. Server binds to `127.0.0.1` only; a current evergreen desktop
browser consumes the frontend. No internet access required at runtime.

**Project Type**: Web application — a single monolithic Node process serving both the static
frontend and the REST API from one origin, so no CORS configuration is required.

**Performance Goals**: Every screen renders within 1 second at the SC-007 dataset size (500
sessions, 5,000 sets, 500 body weight entries, 2,000 meal entries), achieved through indexed
queries and server-side aggregation rather than caching.

**Constraints**: No secrets in the repository or client. No internet dependency. No build step —
`npm install && npm start` is the complete path from clean checkout to running app. All SQL
parameterized. All user-supplied text inserted into the DOM as text, never as HTML.

**Scale/Scope**: Single user, personal-sized data (a few years of daily use). Roughly 8 tables,
~30 REST endpoints, 6 frontend views.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against [constitution.md](../../.specify/memory/constitution.md) v1.0.0. Initial check:
**PASS**. Post-design re-check: **PASS** — no Phase 1 decision introduced a violation.

| Principle | Gate | Verdict |
|-----------|------|---------|
| I. Simplicity First | Vanilla stack; no framework, bundler, or ORM; every dependency justified | **PASS** — exactly one runtime dependency (Express), justified in research R1. SQLite driver, test runner, and charts use built-ins or hand-rolled code. |
| II. Clear Separation | frontend → API → routes → services → repositories → SQLite; SQL only in the data layer | **PASS** — enforced by directory layout: routes import only services, services import only repositories, and SQL text appears only under `src/db/`. |
| III. Validate at Boundaries | Server-side authoritative validation; parameterized queries only | **PASS** — `src/validation/` runs on every write before the service layer; all statements use bound parameters; frontend validation is UX-only. |
| IV. Fail Loudly | No swallowed errors; contextual logs; accurate status codes | **PASS** — typed `AppError` hierarchy plus one central error middleware that logs full context server-side; startup aborts on migration or database failure. No empty `catch`. |
| V. Secure by Default | No client-reachable secrets; escape rendered content; no stack traces to clients | **PASS** — v1 holds no credentials; DOM updates use `textContent` and `createElement` only; error responses carry `{code, message, field}` and never stack traces; server bound to loopback. |
| VI. SQLite Single Source of Truth | One store, migration scripts, schema constraints | **PASS** — numbered SQL migrations; `NOT NULL`, `CHECK`, `UNIQUE`, and foreign keys mirror every validation rule; `localStorage` holds only the last-used progress date range. |
| VII. Lightweight Tests | Validation, persistence, and API routes covered; isolated throwaway DB | **PASS** — three suites, each against a temp database, behind a single `npm test`. |
| VIII. Documented Code | Why-comments for non-obvious logic; module docblocks | **PASS** — each module opens with a one-line docblock naming its layer; goal resolution, servings→grams conversion, the rounding policy, and SVG scaling each carry a short why-comment. |

Two constitutional risks and their mitigations:

- **`POST /api/demo/reset` destroys all data** and is reachable over HTTP. Mitigated by requiring
  an explicit `{"confirm": "RESET"}` body, binding the server to loopback only, and gating the UI
  action behind a typed confirmation (Principle V).
- **`node:sqlite` is marked experimental.** Accepted deliberately in research R2 rather than
  adding a native-compilation dependency. The engine floor is declared in `package.json` and
  asserted at startup, so an unsupported runtime fails loudly and immediately (Principle IV).

## Project Structure

### Documentation (this feature)

```text
specs/001-gym-nutrition-tracker/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (/speckit-specify, /speckit-clarify)
├── research.md          # Phase 0 output — decisions and rejected alternatives
├── data-model.md        # Phase 1 output — tables, constraints, indexes, derived values
├── quickstart.md        # Phase 1 output — run, test, and demo instructions
├── contracts/
│   └── rest-api.md      # Phase 1 output — endpoint contracts and error shape
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
package.json                      # one dependency (express), engines floor, npm start / npm test
server.js                         # entry point: migrate, then listen (never writes app data)
data/                             # gitignored; holds gymtracker.db

src/
├── app.js                         # builds the Express app (no listen) so tests can start it
├── config.js                      # PORT, DB_PATH, NODE_ENV resolution with safe defaults
├── errors.js                      # AppError, ValidationError, NotFoundError, ConflictError
├── middleware/
│   ├── error-handler.js           # single exit point: logs context, maps error -> status + body
│   └── not-found.js               # unmatched /api routes -> 404 JSON instead of HTML
├── validation/
│   ├── primitives.js              # isoDate, positiveNumber, nonNegativeNumber, integer, enum, text
│   └── schemas/                   # one file per resource, applied by routes before services
│       ├── exercises.js
│       ├── workouts.js
│       ├── body-weights.js
│       ├── foods.js
│       ├── meal-entries.js
│       ├── goals.js
│       └── progress.js
├── routes/                        # HTTP concerns only
│   ├── index.js                   # mounts all routers under /api
│   ├── exercises.routes.js
│   ├── workouts.routes.js
│   ├── body-weights.routes.js
│   ├── foods.routes.js
│   ├── meal-entries.routes.js
│   ├── nutrition.routes.js        # GET /api/nutrition/day/:date (totals vs effective goals)
│   ├── goals.routes.js
│   ├── progress.routes.js
│   └── demo.routes.js
├── services/                      # business rules; no SQL, no req/res
│   ├── health.service.js          # database reachability and emptiness, for GET /api/health
│   ├── exercises.service.js       # duplicate-name check, archive/restore, guarded delete
│   ├── workouts.service.js        # session assembly, at-least-one-set rule
│   ├── body-weights.service.js    # one-entry-per-date upsert semantics
│   ├── foods.service.js
│   ├── meal-entries.service.js    # servings-or-grams resolution to stored grams
│   ├── goals.service.js           # effective-date resolution for a day and across a range
│   ├── nutrition.service.js       # day totals, remaining, over/under classification
│   ├── progress.service.js        # trend assembly for a date range
│   ├── demo.service.js            # resetDemo: the single, destructive, confirmed seed path
│   └── nutrition-math.js          # single owner of scaling and rounding
├── db/
│   ├── connection.js              # opens DatabaseSync, applies pragmas, fails loudly
│   ├── migrate.js                 # ordered, idempotent migration runner
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── repositories/              # the ONLY place SQL exists
│       ├── health.repo.js
│       ├── exercises.repo.js
│       ├── workouts.repo.js          # sole owner of the reps x weight volume formula
│       ├── body-weights.repo.js
│       ├── foods.repo.js
│       ├── meal-entries.repo.js
│       ├── goals.repo.js
│       └── progress.repo.js       # body weight and calorie aggregates; delegates workout math
└── seed/
    ├── catalog.js                 # fixed built-in exercise and food catalog
    └── generate.js                # deterministic records generated relative to today

public/                               # served statically; no build step
├── index.html
├── css/styles.css
└── js/
    ├── main.js                    # bootstrap + hash router
    ├── api.js                     # fetch wrapper; surfaces API errors, never swallows them
    ├── banner.js                  # the one error/success surface; separate from main.js so
    │                              #   views can import it without a cycle back to the router
    ├── dialog.js                  # labelled <dialog> modals; native prompt/confirm are
    │                              #   unsupported in embedded browsers and cannot meet FR-050/052
    ├── demo.js                    # the demo reset flow, shared by the header and empty states
    ├── dom.js                     # element helpers that only ever set textContent
    ├── format.js                  # date and number display formatting
    ├── chart.js                   # hand-rolled inline SVG line and bar rendering
    └── views/
        ├── workouts.view.js
        ├── exercises.view.js
        ├── body-weight.view.js
        ├── nutrition.view.js
        ├── goals.view.js
        └── progress.view.js

tests/
├── helpers/
│   ├── test-db.js                 # creates and tears down a temp database per test file
│   └── test-server.js             # starts the app on an ephemeral port
├── unit/
│   ├── validation.test.js
│   ├── nutrition-math.test.js
│   └── goals-effective-date.test.js
├── integration/                   # one file per repository, so stories stay parallelizable
│   ├── migrations.test.js
│   ├── exercises.repo.test.js
│   ├── workouts.repo.test.js
│   ├── body-weights.repo.test.js
│   ├── foods.repo.test.js
│   ├── meal-entries.repo.test.js
│   ├── goals.repo.test.js
│   ├── progress.repo.test.js
│   └── demo-seed.test.js
└── api/
    ├── exercises.api.test.js
    ├── workouts.api.test.js
    ├── body-weights.api.test.js
    ├── foods.api.test.js
    ├── meal-entries.api.test.js
    ├── nutrition.api.test.js
    ├── goals.api.test.js
    ├── progress.api.test.js
    └── demo.api.test.js
```

**Structure Decision**: A single Node.js project at the repository root rather than separate
`backend/` and `frontend/` packages. The frontend is static files with no build step, so a second
package would add tooling without adding separation; the `public/` versus `src/` split already
makes the client/server boundary obvious while keeping one `npm install` and one start command,
which both Principle I and the local-demo constraint favor. The layering required by Principle II
is enforced inside `src/` by the `routes/`, `services/`, and `db/repositories/` directories, with
SQL existing only beneath `src/db/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The Constitution Check passes in full both before and after design, so this table
is intentionally empty.
