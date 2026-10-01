# Phase 0 Research: GymTracker v1

**Feature**: 001-gym-nutrition-tracker | **Date**: 2026-09-30

All decisions below were made against [the constitution](../../.specify/memory/constitution.md),
with Principle I (Simplicity First) as the tiebreaker. No `NEEDS CLARIFICATION` items remain.

---

## R1 — Web framework: Express 5

**Decision**: Use Express 5 as the single runtime dependency.

**Rationale**: The constitution names Express explicitly as the backend. It supplies the three
things this app needs — routing, static file serving, and JSON body parsing — in one small,
stable package with no transitive native code. Express 5 includes built-in `express.json()` and
`express.static()`, so no additional middleware packages are required.

**Alternatives rejected**:

- *Raw `node:http`*: would mean hand-rolling a router, a static file server with correct MIME
  types and range handling, and a body parser. That is more code to own and more places to get
  security wrong, which is a worse simplicity outcome than one well-understood dependency.
- *Fastify / Koa*: no advantage at this scale and contradicts the constitution's named stack.

---

## R2 — SQLite driver: built-in `node:sqlite`

**Decision**: Use the built-in `node:sqlite` module (`DatabaseSync`), with `"engines": { "node":
">=22.5.0" }` in `package.json` and an explicit version assertion at startup.

**Rationale**: Verified working on the local toolchain (Node v24.6.0) with no flag required. This
gives the project zero native dependencies, so `npm install` never invokes `node-gyp`, never needs
a C toolchain, and cannot fail from a missing prebuilt binary — directly serving the stated
priority of demo reliability and the constitution's local-runnability constraint. Its synchronous
API also suits a single-user app, removing async complexity from the data layer.

**Trade-off accepted**: `node:sqlite` is flagged experimental and prints an `ExperimentalWarning`.
The API surface used here (`DatabaseSync`, `prepare`, `run`, `get`, `all`, `exec`) is small and
stable. The engine floor is declared and asserted so that an unsupported runtime fails loudly at
startup rather than subtly at query time (Principle IV).

**Alternatives rejected**:

- *`better-sqlite3`*: more mature, but a native module requiring compilation or a matching
  prebuilt binary. A failed install on a presentation machine is exactly the failure mode this
  project must avoid, and it adds a dependency the standard library already covers.
- *`node:sqlite` behind an abstraction layer* to allow swapping drivers later: a premature
  abstraction with no present-day requirement, forbidden by Principle I.

---

## R3 — Validation: hand-written primitives, no library

**Decision**: A small `src/validation/` module exposing primitive checkers (`isoDate`,
`positiveNumber`, `nonNegativeNumber`, `integer`, `oneOf`, `text`) composed into per-resource
schemas. Validation runs in the route layer, before any service call.

**Rationale**: The app has roughly a dozen write shapes and about six distinct field types. A
schema library (zod, joi, ajv) would be larger than the code it replaces and would add a
dependency for no capability gain. Keeping validation hand-written also makes the error payload
shape — `{code, message, field}` — trivial to control, which FR-036 and SC-005 require.

**Layer placement**: Shape, type, and range checks belong to the boundary (routes), per Principle
III. Cross-record rules — duplicate names, archived-item references, existence checks — belong to
services, because they require data access. This split is a rule, not a preference, and is stated
in each module's docblock.

**Alternatives rejected**: *zod* — ergonomic but unnecessary; *express-validator* — couples
validation to Express and obscures the error shape.

---

## R4 — Numeric precision and rounding

**Decision**: Store all masses and energy values as SQLite `REAL`. Perform all scaling in
double-precision floating point. Round exactly once, at the service output boundary, through a
single shared helper in `src/services/nutrition-math.js`: energy to whole kcal, macros and masses
to one decimal place.

**Rationale**: At this data scale the accumulated floating-point error is negligible — summing
2,000 values of magnitude ~500 in IEEE-754 doubles yields error on the order of 1e-10, roughly
nine orders of magnitude below the 0.05 rounding threshold. Rounding is therefore deterministic in
practice, which satisfies SC-006 ("totals match exactly") and SC-006b ("2 servings equals the
equivalent gram amount") without integer-minor-unit bookkeeping.

**The rule that makes this safe**: totals are summed from *unrounded* stored values and rounded
once for display. Rounding per entry and then summing is forbidden, because that is what actually
produces visible drift. A unit test asserts both properties.

**Alternatives rejected**:

- *Integer minor units (centigrams, decikcal)*: eliminates a theoretical problem that does not
  occur at this scale, at the cost of conversion code at every boundary and unreadable raw rows.
- *Per-entry rounding before summing*: simpler to write, but demonstrably produces totals that
  disagree with the underlying records, violating SC-006 and SC-009.

---

## R5 — Effective-dated goal resolution

**Decision**: Store goal sets keyed by `effective_date` (one row per effective date). The goals
governing any day *D* are those of the row with the greatest `effective_date <= D`. For a single
day the repository resolves this in SQL (`ORDER BY effective_date DESC LIMIT 1`). For a date range
the service fetches all goal sets once and walks them alongside the day sequence in JavaScript.

**Rationale**: The range case is where a naive implementation goes wrong — a correlated subquery
per day is both slower and harder to read than one fetch plus a linear merge. Goal sets are few
(single digits in practice), so loading them all is cheap. This keeps FR-033's per-day goal line
correct across mid-range goal changes while keeping SQL simple.

**Edge case**: days before the earliest goal set have no governing goals. The API returns `goals:
null` for those days rather than zeros or a fabricated default, so the UI can honour FR-028 and
show "no goals applied".

**Alternatives rejected**:

- *Single mutable goals row*: rejected at clarification; retroactively rewrites history.
- *Snapshotting goals onto each meal entry*: denormalizes, and leaves days with no entries without
  goal context.

---

## R6 — Servings-to-grams resolution

**Decision**: Each food stores a `portion_name`, a `portion_grams` (> 0), and nutrition values
*for that reference portion*. A meal entry accepts either `servings` or `grams` — exactly one of
the two — and stores only the resolved `quantity_g`. Conversion is `quantity_g = servings ×
portion_grams`. Nutrition scaling is `value × (quantity_g / portion_grams)`.

**Rationale**: Storing one authoritative quantity removes any possibility of the two
representations disagreeing, which is what SC-006b tests. `portion_grams > 0` is enforced by both
a validator and a `CHECK` constraint, so the conversion can never divide by zero — this resolves
the spec edge case about zero-weight reference portions by making the state unreachable.

**API consequence**: supplying both `servings` and `grams`, or neither, is a 400 with
`field: "quantity"`. The response always echoes both the stored `quantityG` and the equivalent
`servings` for display convenience.

---

## R7 — Archiving instead of deletion

**Decision**: `exercises` and `foods` each carry a nullable `archived_at` timestamp. Archived rows
are excluded from pickers and search by default and included when `includeArchived=true`. Foreign
keys from `workout_sets.exercise_id` and `meal_entries.food_id` use `ON DELETE RESTRICT`. Hard
`DELETE` is permitted only for rows with zero references, and returns 409 otherwise with a message
pointing the user at archiving.

**Rationale**: `ON DELETE RESTRICT` makes the database itself the final guarantor of historical
integrity (Principle VI), so a service-layer bug cannot orphan history. Archiving as the primary
path keeps the library usable over time without ever rewriting the past, satisfying SC-009a.

**Alternatives rejected**: *Cascade delete* — silently rewrites historical totals; *hard block
with no archive* — the library accumulates retired items permanently.

---

## R8 — Charts without a charting library

**Decision**: Render trends as hand-built inline SVG in `public/js/chart.js`, supporting a line
series with optional reference line (for the calorie goal) and a bar series (for weekly volume).

**Rationale**: The app must work with no internet access, which rules out a CDN-delivered library;
vendoring Chart.js (~200 KB) into the repository contradicts Principle I and the no-bundler
constraint. The required visuals are four simple time series. A focused SVG renderer — axis
scaling, polyline construction, and labels — is a modest, dependency-free module. Elements are
created with `document.createElementNS`, never by assigning `innerHTML`, which keeps Principle V
intact.

**Scope guard**: no zooming, panning, tooltips-on-hover beyond a simple title element, or
animation. Out of scope per the spec's Charts assumption.

---

## R9 — A single, explicit seeding path

**Decision**: `src/seed/generate.js` produces the complete seed deterministically from a single
input (today's date). It has exactly one consumer: `resetDemo()`, invoked only by
`POST /api/demo/reset`.

| Operation | Trigger | Destructive | Confirmation |
|---|---|---|---|
| `resetDemo()` | `POST /api/demo/reset` | Yes — deletes all rows, then loads the seed | `{"confirm": "RESET"}` required |

The whole operation runs inside one transaction, so a failure mid-load leaves the database
unchanged rather than half-seeded.

**Rationale**: The plan input asked for automatic seeding of an empty database, but the spec
clarification requires that seed data load only when explicitly requested. The clarification is
authoritative. Keeping one path rather than two is also the better design: startup never writes
application data, so there is no code path that could seed a database the user believed was
theirs, and "how did this data get here?" has exactly one answer. A fresh checkout opening with
empty states is acceptable — those empty states are required behaviour (FR-034) and are worth
showing in the demo anyway.

**UI consequence**: the action is labelled "Load demo data" when the database is empty and "Reset
demo data" when it is not. Same endpoint, same confirmation; only the wording adapts, so the
presenter is never told they are about to erase data that does not exist.

**Determinism**: no `Math.random()`. Variation comes from a small seeded pseudo-random generator
with a fixed constant seed, so two resets on the same day produce identical data (SC-008a). Dates
are generated as offsets from today so the demo always looks current (FR-041b).

**Seed contents**: 12 exercises across 5 muscle groups; 8 weeks of sessions at 4 per week; daily
body weight entries with a gentle downward trend plus realistic noise; ~40 catalog foods; 6 weeks
of meal entries across 4 meal slots; and 2 goal sets with different effective dates, so the
effective-dating behaviour is visible in the demo rather than merely implemented.

---

## R10 — Resolving the two open spec edge cases

The spec deliberately left these for the plan. Both are now decided.

**Empty workout sessions → rejected.** A session must contain at least one set. The alternative
(persisting empty sessions) creates rows that contribute nothing to history or trends and force
every consumer to handle a meaningless state. Rejecting at the boundary with
`field: "entries"` is the loud, simple option. A session whose last set is removed during an edit
is likewise rejected, with a message telling the user to delete the session instead.

**Future dates → rejected.** Any `date` later than today (server local date) is a 400 with
`field: "date"`. Logging a workout, weigh-in, or meal that has not happened is a data-entry
mistake, not a use case. Goal sets are the single exception: a future `effective_date` is
*allowed*, because scheduling a goal change ahead of time is legitimate and harmless under the
resolution rule in R5.

---

## R11 — Testing approach

**Decision**: `node:test` with three suites, all run by `npm test`:

| Suite | Scope | Database |
|---|---|---|
| `tests/unit/` | Validation primitives and schemas, nutrition scaling and rounding, goal effective-date resolution | None — pure functions |
| `tests/integration/` | Migration idempotency, every repository's CRUD and constraint behaviour, seed determinism | Fresh temp file per test file |
| `tests/api/` | Each route group over real HTTP: success, 400 validation, 404, 409 conflict | Fresh temp file + ephemeral port |

**Rationale**: This is exactly the Principle VII critical-path set — validation, persistence, API
routes — with nothing beyond it. Tests use a temp directory path for `DB_PATH` and delete it in an
`after` hook, so `data/gymtracker.db` is never touched. The API suite starts the app on port 0 and
calls it with the global `fetch`, needing no HTTP test library.

**Explicitly out of scope**: browser/DOM tests, end-to-end automation, coverage thresholds.

---

## R12 — Frontend structure without a framework

**Decision**: One `index.html` shell with a hash-based router in `public/js/main.js` switching
between six view modules. Each view module exports `mount(container)` and `unmount()`, fetches its
own data through `public/js/api.js`, and renders via helpers in `public/js/dom.js` that only ever
assign `textContent`.

**Rationale**: Six views need navigation, not a framework. ES modules are supported natively by
every target browser, so `<script type="module">` replaces a bundler entirely. Centralizing DOM
creation in `dom.js` means the XSS-safety property required by Principle V is enforced in one
reviewable file rather than scattered across views.

**Error surfacing**: `api.js` throws on any non-2xx response, carrying the server's `code`,
`message`, and `field`. Views render that message in a visible banner and, where a `field` is
present, mark the offending input. No view may catch an error and silently continue — Principle IV
applies to the client too.

**State**: no client-side store. Each view refetches after a mutation, which at this data size is
both fast and immune to cache-coherence bugs. `localStorage` holds only the last-used progress
date range.
