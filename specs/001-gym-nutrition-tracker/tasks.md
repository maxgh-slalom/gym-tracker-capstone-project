---

description: "Task list template for feature implementation"
---

# Tasks: GymTracker — Gym & Nutrition Tracking (v1)

**Input**: Design documents from `/specs/001-gym-nutrition-tracker/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks ARE included. Constitution Principle VII makes tests mandatory for validation, persistence, and API routes, and the plan input asked for them explicitly.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single Node.js project at the repository root, per plan.md **Structure Decision**: backend in `src/`,
static frontend in `public/`, tests in `tests/`. No build step.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create `package.json` at repository root with `"type": "module"`, `"engines": { "node": ">=22.5.0" }`, exactly one dependency `express@^5`, and scripts `"start": "node server.js"` and `"test": "node --test tests/"`
- [X] T002 [P] Create the directory skeleton from plan.md: `src/{middleware,validation/schemas,routes,services,db/{migrations,repositories},seed}`, `public/{css,js/views}`, `tests/{helpers,unit,integration,api}`, and `data/`
- [X] T003 [P] Create `src/config.js` exporting `PORT` (default `3000`), `DB_PATH` (default `./data/gymtracker.db`), and `NODE_ENV` (default `development`); assert `process.versions.node >= 22.5.0` and exit with an explicit message naming the required version if not

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Layering, persistence, validation, and error handling that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `src/errors.js` with `AppError` (carrying `statusCode`, `code`, optional `field`) and subclasses `ValidationError` (400 / `VALIDATION_ERROR`, `field` required), `NotFoundError` (404 / `NOT_FOUND`), `ConflictError` (409 / `CONFLICT`)
- [X] T005 Create `src/db/connection.js` opening `node:sqlite` `DatabaseSync` at `DB_PATH` and applying `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`, `PRAGMA busy_timeout = 5000`; throw rather than return a degraded connection on failure
- [X] T006 Create `src/db/migrations/001_initial_schema.sql` with all 8 tables exactly as specified in data-model.md: `schema_migrations`, `exercises` (`name_key` UNIQUE, `muscle_group` CHECK in `chest|back|legs|shoulders|arms|core|full_body|other`, nullable `archived_at`), `workout_sessions` (`CHECK (date(session_date) IS NOT NULL)`, `note` ≤ 500), `workout_sets` (`session_id` FK ON DELETE CASCADE, `exercise_id` FK ON DELETE RESTRICT, `CHECK (reps > 0)`, `CHECK (weight_kg >= 0)`, `CHECK (position >= 0)`), `body_weights` (`entry_date` PRIMARY KEY, `CHECK (weight_kg > 0)`), `foods` (`name_key` UNIQUE, `CHECK (portion_grams > 0)`, `CHECK (calories >= 0)` and the same for `protein_g`/`carbs_g`/`fat_g`, `is_builtin` CHECK IN (0,1), nullable `archived_at`), `meal_entries` (`meal_slot` CHECK IN `breakfast|lunch|dinner|snack`, `food_id` FK ON DELETE RESTRICT, `CHECK (quantity_g > 0)`), `goal_sets` (`effective_date` PRIMARY KEY, all four values `CHECK (... >= 0)`), plus every index listed in data-model.md
- [X] T007 Create `src/db/migrate.js` applying migration files in filename order inside a transaction, recording each in `schema_migrations`, and skipping already-applied versions so re-running is a no-op
- [X] T008 [P] Create `src/validation/primitives.js` exporting `isoDate({ maxToday })` (format `YYYY-MM-DD`, real calendar date, rejects dates after the server's current local date per FR-049 and dates before `1900-01-01` per FR-037a), `positiveNumber`, `nonNegativeNumber`, `integer({ min })`, `oneOf(values)`, `text(min, max)`, `decimals(1)` (FR-046, user input only — see FR-046a), and `exactlyOneOf(fields)`; every number parser must reject separators other than `.` (FR-047) and throw `ValidationError` naming the field
- [X] T009 [P] Create `src/services/nutrition-math.js` as the single owner of scaling and rounding: `scaleToGrams(value, quantityG, portionGrams)`, `servingsToGrams`, `gramsToServings`, `roundKcal` (whole number), `roundMass` (one decimal) per FR-044; export a `sumThenRound` helper so totals are summed unrounded and rounded once (FR-045)
- [X] T010 Create `src/middleware/error-handler.js` as the single exit point: log `{ method, path, code, message, stack }` server-side, respond `{ error: { code, message, field } }`, and map unknown errors to 500 `INTERNAL_ERROR` with a generic message and no stack trace (Principle V)
- [X] T011 [P] Create `src/middleware/not-found.js` returning 404 JSON `NOT_FOUND` for unmatched `/api/*` paths so the SPA shell is never served to an API call
- [X] T012 Create `src/db/repositories/health.repo.js` with a single `isEmpty()` query counting rows across the application tables, `src/services/health.service.js` returning `{ status, database, empty }`, and `GET /api/health` in `src/routes/index.js` delegating to that service. The route performs no data access of its own (Principle II)
- [X] T013 Create `src/app.js` building the Express app without listening: `express.json()`, `express.static('public')`, the `/api` router, then not-found and error-handler last
- [X] T014 Create `server.js` running migrations, logging the resolved database path and migration count, then listening on `127.0.0.1` at `PORT`; abort startup with a non-zero exit on any migration or connection failure (Principle IV). Never writes application data (FR-043)
- [X] T015 [P] Create `tests/helpers/test-db.js` creating a unique temp-directory database per test file and removing it in an `after` hook; must never touch `data/gymtracker.db`
- [X] T016 [P] Create `tests/helpers/test-server.js` starting `src/app.js` on port 0 against a temp database and returning the resolved base URL for `fetch`
- [X] T017 [P] Create `public/index.html` shell: semantic landmarks, a nav with links for Workouts, Exercises, Body Weight, Nutrition, Goals, Progress, a `<main id="view">` mount point, a global error banner region with `role="alert"`, and `<script type="module" src="/js/main.js">`
- [X] T018 [P] Create `public/js/dom.js` with element helpers that set `textContent` only and never `innerHTML` (Principle V), plus a `labelledField()` helper that wires `<label for>`/`id` and `aria-describedby` for error text (FR-050, FR-052)
- [X] T019 [P] Create `public/js/api.js` wrapping `fetch` with JSON headers; throw an error carrying `code`, `message`, and `field` on any non-2xx response and never swallow a failure (Principle IV)
- [X] T020 [P] Create `public/js/format.js` applying FR-044 display rules: energy as whole kcal, all masses to one decimal place, dates as `YYYY-MM-DD`
- [X] T021 [P] Create `public/css/styles.css` with a visible `:focus-visible` indicator (FR-051) and distinct styling for the error banner, empty states, and over-goal values
- [X] T022 Create `public/js/main.js` with a hash router mapping routes to view modules exposing `mount(container)`/`unmount()`, rendering thrown API errors into the banner region
- [X] T023 [P] Create `tests/unit/validation.test.js` covering every primitive in T008: valid cases, boundary cases, rejection of a future date, rejection of two-decimal masses, rejection of comma separators, and that each rejection names the offending field
- [X] T024 [P] Create `tests/unit/nutrition-math.test.js` asserting proportional scaling, servings↔grams round-tripping, FR-044 rounding, and that `sumThenRound` differs from per-entry rounding on a case that would drift
- [X] T025 [P] Create `tests/integration/migrations.test.js` asserting migrations apply to an empty database, are idempotent on a second run, that `foreign_keys` is actually ON, that a row written through one connection is still present after that connection is closed and the database reopened (FR-035, SC-004), and that pointing `DB_PATH` at an unreadable path fails loudly instead of starting degraded

**Checkpoint**: Server starts, health responds, migrations are proven, validation and rounding are proven — user story implementation can now begin

---

## Phase 3: User Story 1 - Log a workout session with custom exercises (Priority: P1) 🎯 MVP

**Goal**: The user can define custom exercises and record, review, correct, and delete dated training sessions containing sets of reps and weight.

**Independent Test**: Create two exercises, log a dated session with multiple exercises and several sets each, restart the server, and confirm the session and all set details persist and remain editable.

### Tests for User Story 1

- [X] T026 [P] [US1] Create `tests/integration/exercises.repo.test.js` covering insert, case-insensitive `name_key` uniqueness, archive/restore, reference counting, that deleting a referenced exercise is blocked by `ON DELETE RESTRICT`, and that archiving an exercise leaves every historical total and volume value unchanged (SC-009a)
- [X] T027 [P] [US1] Create `tests/integration/workouts.repo.test.js` covering session+sets insertion in one transaction, `ON DELETE CASCADE` of sets, multiple sessions on one date, and set ordering by `position`
- [X] T028 [P] [US1] Create `tests/api/exercises.api.test.js` covering create 201, duplicate name 409, unknown muscle group 400, archive/restore 200, delete unreferenced 204, delete referenced 409
- [X] T029 [P] [US1] Create `tests/api/workouts.api.test.js` covering create 201, empty `entries` 400 with `field: entries`, entry with no sets 400, non-positive reps 400, negative weight 400, zero weight accepted, future date 400, unknown or archived `exerciseId` 400 (not 404, per the contract convention), full replace via PUT, and delete 204

### Implementation for User Story 1

- [X] T030 [P] [US1] Create `src/validation/schemas/exercises.js`: `name` `text(1, 80)`, `muscleGroup` `oneOf` the eight values from data-model.md
- [X] T031 [P] [US1] Create `src/validation/schemas/workouts.js`: `date` `isoDate({ maxToday: true })`, `note` optional `text(0, 500)`, `entries` minimum 1 item, each entry's `sets` minimum 1 item, `reps` `integer({ min: 1 })`, `weightKg` `nonNegativeNumber` with `decimals(1)`; error `field` paths follow `entries[i].sets[j].reps`
- [X] T032 [P] [US1] Create `src/db/repositories/exercises.repo.js` with parameterized statements only, writing `name_key` as `lower(trim(name))` on every insert and update, and exposing a set-reference count for the delete guard
- [X] T033 [P] [US1] Create `src/db/repositories/workouts.repo.js` as the **single owner of the volume formula** (FR-031a): list/summary including `setCount` and `totalVolume` (FR-009a), full-detail read joining exercise names and `archived_at`, transactional create/replace/delete of a session with its sets, and the exported aggregates `sessionVolumes(from, to)`, `volumeByWeek(from, to)`, and `bestWeightByDate(exerciseId, from, to)` that the progress layer consumes rather than reimplements
- [X] T034 [US1] Create `src/services/exercises.service.js` enforcing FR-002 duplicate names (409), FR-004 archive, FR-004a restore, and FR-004b refusal to delete a referenced exercise with a message naming the set count (depends on T032)
- [X] T035 [US1] Create `src/services/workouts.service.js` enforcing at-least-one-set (research R10) and rejecting archived exercises in new entries; it obtains volume from `workouts.repo.js` and MUST NOT recompute `reps × weight` itself (FR-031a) (depends on T033)
- [X] T036 [US1] Create `src/routes/exercises.routes.js` for GET/POST/PATCH/archive/restore/DELETE per contracts/rest-api.md §Exercises, validating with T030 before calling the service
- [X] T037 [US1] Create `src/routes/workouts.routes.js` for GET list, GET detail, POST, PUT, DELETE per contracts/rest-api.md §Workouts, validating with T031 before calling the service
- [X] T038 [US1] Mount the exercises and workouts routers in `src/routes/index.js`
- [X] T039 [P] [US1] Create `public/js/views/exercises.view.js`: library list, create form, rename, archive/restore, an `includeArchived` toggle, archived rows visually marked, and an explicit empty state for the case where every exercise has been archived and none is selectable
- [X] T040 [P] [US1] Create `public/js/views/workouts.view.js`: history list newest-first, session detail, set editor, and delete; archived exercises shown but marked in history
- [X] T041 [US1] Register the workouts and exercises routes in `public/js/main.js` and link them from the nav in `public/index.html`

**Checkpoint**: User Story 1 is fully functional and independently testable — the app is a usable training log

---

## Phase 4: User Story 2 - Track body weight over time (Priority: P2)

**Goal**: The user can record one body weight per date, review the history, and correct or remove entries.

**Independent Test**: Record entries on several dates, confirm they list newest-first with correct values, re-enter a different value for an existing date and confirm it replaces rather than duplicates, then edit and delete and confirm both survive a reload.

### Tests for User Story 2

- [X] T042 [P] [US2] Create `tests/integration/body-weights.repo.test.js` covering upsert on `PRIMARY KEY(entry_date)`, the created-versus-replaced signal, range queries, and the `CHECK (weight_kg > 0)` constraint
- [X] T043 [P] [US2] Create `tests/api/body-weights.api.test.js` covering create 200, replacement on the same date returning `replaced: true`, zero/negative/non-numeric weight 400, future date 400, delete 204, delete of a missing date 404

### Implementation for User Story 2

- [X] T044 [P] [US2] Create `src/validation/schemas/body-weights.js`: `date` `isoDate({ maxToday: true })`, `weightKg` `positiveNumber` with `decimals(1)`
- [X] T045 [US2] Create `src/db/repositories/body-weights.repo.js` using `INSERT ... ON CONFLICT(entry_date) DO UPDATE` and reporting whether the row was created or replaced
- [X] T046 [US2] Create `src/services/body-weights.service.js` implementing FR-013 replacement semantics and surfacing the replaced flag so the UI can say the prior value was updated (depends on T045)
- [X] T047 [US2] Create `src/routes/body-weights.routes.js` for GET list, PUT by date, DELETE by date per contracts/rest-api.md §Body weight, and mount it in `src/routes/index.js`
- [X] T048 [US2] Create `public/js/views/body-weight.view.js` with an entry form defaulting to today, a newest-first history list, inline edit, delete, and the "replaced the previous value" message; register it in `public/js/main.js` and the nav

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - Log meals and compare intake to calorie and macro goals (Priority: P2)

**Goal**: The user can search foods, log meals by servings or grams, set effective-dated goals, and see a day's totals, goals, and remaining amounts.

**Independent Test**: Set goals, log several foods across meal slots on one date by servings and by grams, and confirm totals and remaining-versus-goal figures are correct, recalculate on delete, and that a day logged under older goals still compares against those older goals.

### Tests for User Story 3

- [X] T049 [P] [US3] Create `tests/unit/goals-effective-date.test.js` asserting the governing goal set is the greatest `effective_date <= D`, that a date equal to an effective date uses that set, that days before the earliest set resolve to `null`, and that range resolution produces per-day values across a mid-range change
- [X] T050 [P] [US3] Create `tests/integration/foods.repo.test.js` covering case-insensitive search, `name_key` uniqueness, `CHECK (portion_grams > 0)`, archive/restore, entry reference counting, and blocked delete when referenced
- [X] T051 [P] [US3] Create `tests/integration/meal-entries.repo.test.js` covering insertion with resolved `quantity_g`, day/slot grouping, and `ON DELETE RESTRICT` against foods
- [X] T052 [P] [US3] Create `tests/integration/goals.repo.test.js` covering upsert on `PRIMARY KEY(effective_date)`, ordered history retrieval, and deletion falling back to the next-earlier set
- [X] T053 [P] [US3] Create `tests/api/foods.api.test.js` covering search 200 with results, empty search returning `foods: []` and `total: 0` at 200, create 201, duplicate name 409, `portionGrams <= 0` 400, archive/restore, and FR-024c rejection of nutrition edits on a referenced food with 409
- [X] T054 [P] [US3] Create `tests/api/meal-entries.api.test.js` covering create by servings 201, create by grams 201, both-or-neither 400 with `field: quantity`, non-positive quantity 400, unknown or archived `foodId` 400, future date 400, patch, and delete 204
- [X] T055 [P] [US3] Create `tests/api/goals.api.test.js` covering upsert by effective date, history ordering, negative values 400, a future effective date accepted (the FR-049 exception), effective lookup, and delete 204
- [X] T056 [P] [US3] Create `tests/api/nutrition.api.test.js` asserting SC-006 (day total equals the sum of unrounded entries rounded once), SC-006b (2 servings equals the equivalent gram amount), `exceeded` flags, and `goals: null` with `comparison: null` on a day with no governing goal set

### Implementation for User Story 3

- [X] T057 [P] [US3] Create `src/validation/schemas/foods.js`: `name` `text(1, 120)`, `portionName` `text(1, 60)`, `portionGrams` `positiveNumber`, and `calories`/`proteinG`/`carbsG`/`fatG` `nonNegativeNumber`
- [X] T058 [P] [US3] Create `src/validation/schemas/meal-entries.js`: `date` `isoDate({ maxToday: true })`, `mealSlot` `oneOf(['breakfast','lunch','dinner','snack'])`, `foodId` integer, and `exactlyOneOf(['servings','grams'])` each `positiveNumber`
- [X] T059 [P] [US3] Create `src/validation/schemas/goals.js`: `effectiveDate` `isoDate()` **without** `maxToday` (FR-049 exception), all four targets `nonNegativeNumber`
- [X] T060 [P] [US3] Create `src/db/repositories/foods.repo.js` with case-insensitive substring search over `name_key`, a limit parameter, archived filtering, and a meal-entry reference count
- [X] T061 [P] [US3] Create `src/db/repositories/meal-entries.repo.js` storing only `quantity_g`, with day reads joined to food rows and grouped by `meal_slot`
- [X] T062 [P] [US3] Create `src/db/repositories/goals.repo.js` with upsert by `effective_date`, full ordered history, and the `effective_date <= ? ORDER BY effective_date DESC LIMIT 1` lookup
- [X] T063 [US3] Create `src/services/foods.service.js` enforcing duplicate names (409) and the FR-024c lock: when `entryCount > 0`, reject changes to `portionGrams`, `calories`, `proteinG`, `carbsG`, `fatG` with 409 naming the field, while leaving `name` and `portionName` editable per FR-024d (depends on T060)
- [X] T064 [US3] Create `src/services/goals.service.js` exposing `effectiveFor(date)` and `effectiveForRange(from, to)`, the latter fetching all goal sets once and walking them alongside the day sequence (research R5) (depends on T062)
- [X] T065 [US3] Create `src/services/meal-entries.service.js` resolving servings or grams to a single stored `quantity_g` via `nutrition-math.js`, rejecting archived foods, and returning both `quantityG` and derived `servings` (depends on T061, T009)
- [X] T066 [US3] Create `src/services/nutrition.service.js` assembling the day view: totals summed unrounded then rounded once (FR-045), `comparison` with `remaining` and an explicit `exceeded` flag (FR-027), and `goals`/`comparison` as `null` when no set governs the date (FR-028) (depends on T064, T065)
- [X] T067 [US3] Create `src/routes/foods.routes.js` per contracts/rest-api.md §Foods, returning `entryCount` so the UI can disable locked inputs
- [X] T068 [US3] Create `src/routes/meal-entries.routes.js` per contracts/rest-api.md §Meal entries
- [X] T069 [US3] Create `src/routes/goals.routes.js` per contracts/rest-api.md §Goals
- [X] T070 [US3] Create `src/routes/nutrition.routes.js` for `GET /api/nutrition/day/:date`, and mount all four routers in `src/routes/index.js`
- [X] T071 [P] [US3] Create `public/js/views/nutrition.view.js`: date picker, food search, add-to-meal form offering servings or grams, per-slot entry lists, and a totals panel showing consumed/goal/remaining with over-goal indicated by text as well as colour (FR-053)
- [X] T072 [P] [US3] Create `public/js/views/goals.view.js`: effective-dated goal history, an upsert form, delete, and an explanation that past days keep their own goals
- [X] T073 [US3] Register the nutrition and goals routes in `public/js/main.js` and the nav in `public/index.html`

**Checkpoint**: User Stories 1, 2, and 3 all work independently — the product promise is complete without trends

---

## Phase 6: User Story 4 - View progress trends (Priority: P3)

**Goal**: The user can choose a start and end date and see body weight, training volume, per-exercise best, and calories against the goal in effect each day.

**Independent Test**: With existing data, open the progress view, confirm each trend matches the underlying records for the chosen range, change the dates and confirm the data changes, and set a range with no data to confirm empty states.

### Tests for User Story 4

- [X] T074 [P] [US4] Create `tests/integration/progress.repo.test.js` asserting that progress aggregates come from `workouts.repo.js` rather than a second implementation (FR-031a), that weekly grouping uses the documented week boundary, that per-exercise best is `MAX(weight_kg)` per session date, and that bodyweight-only sessions contribute zero volume
- [X] T075 [P] [US4] Create `tests/api/progress.api.test.js` covering a populated range, `from` later than `to` 400 with `field: from`, empty series for a barren range, `exerciseBest: null` when `exerciseId` is omitted, and `goalCalories` varying across a mid-range goal change

### Implementation for User Story 4

- [X] T076 [P] [US4] Create `src/validation/schemas/progress.js`: `from` and `to` both required `isoDate()`, plus a cross-field rule rejecting `from > to` with `field: from` (FR-030b)
- [X] T077 [US4] Create `src/db/repositories/progress.repo.js` with read-only aggregates for body weight points and daily calories only; workout aggregates are delegated to `workouts.repo.js` so the volume formula keeps one implementation (FR-031a)
- [X] T078 [US4] Create `src/services/progress.service.js` assembling all four series plus body weight `netChangeKg` (last − first, `null` with fewer than two points) and joining per-day `goalCalories` via `goals.service.effectiveForRange` (depends on T064, T077, T033)
- [X] T079 [US4] Create `src/routes/progress.routes.js` for `GET /api/progress` and mount it in `src/routes/index.js`
- [X] T080 [P] [US4] Create `public/js/chart.js` rendering inline SVG via `document.createElementNS` only: a line series with an optional stepped reference line, a bar series, axis scaling and labels, and a single-point fallback; no `innerHTML`, no animation, no dependency
- [X] T081 [US4] Create `public/js/views/progress.view.js` with start/end date inputs defaulting to the last 90 days and persisted in `localStorage` as the only client-side state, an exercise selector, the four charts, a text summary table beside each chart (FR-054), explicit empty states (FR-034), and preservation of the current view when a range is rejected; register it in `public/js/main.js` and the nav

**Checkpoint**: All four functional user stories are independently functional

---

## Phase 7: User Story 5 - Demo with realistic sample data (Priority: P3)

**Goal**: A presenter can populate every screen with coherent, recent, deterministic sample data, and return to that exact state on demand.

**Independent Test**: From an empty database, run the demo load and confirm every screen shows realistic content; run it a second time and confirm the data is identical with no duplicates.

### Tests for User Story 5

- [X] T082 [P] [US5] Create `tests/integration/demo-seed.test.js` asserting the generator is deterministic for a fixed date (two runs produce identical rows, SC-008a), that dates are relative to today (FR-041b), that two goal sets with different effective dates exist, and that reset is transactional
- [X] T083 [P] [US5] Create `tests/api/demo.api.test.js` covering reset 200 with counts, a missing or wrong `confirm` value 400 with `field: confirm`, reset against an already-empty database succeeding, reset replacing prior user data entirely, and that a seeded record can be edited and deleted through the normal endpoints exactly like a user-created one (FR-042)

### Implementation for User Story 5

- [X] T084 [P] [US5] Create `src/seed/catalog.js` with 12 exercises across 5 muscle groups (one pre-archived) and ~40 builtin foods carrying realistic `portionName`, `portionGrams`, and nutrition values
- [X] T085 [US5] Create `src/seed/generate.js` producing the full seed from today's date using a fixed-seed PRNG and no `Math.random()`: ~32 sessions over 8 weeks with progressive loading, ~56 daily body weights trending gently downward with noise, ~500 meal entries over 6 weeks across 4 slots, and 2 goal sets effective 8 and 3 weeks ago (depends on T084)
- [X] T086 [US5] Create `src/services/demo.service.js` exposing `resetDemo()`, which deletes all application rows and inserts the generated seed inside a single transaction so a mid-load failure leaves the database unchanged (depends on T085)
- [X] T087 [US5] Create `src/routes/demo.routes.js` for `POST /api/demo/reset` requiring an exact `{"confirm": "RESET"}` body, returning per-table counts, and mount it in `src/routes/index.js`
- [X] T088 [US5] Add the demo control to `public/index.html` and `public/js/main.js`: labelled "Load demo data" when `GET /api/health` reports `empty: true` and "Reset demo data" otherwise, gated behind a typed confirmation, with a clear warning that all data will be erased

**Checkpoint**: All five user stories are complete and the demo script in quickstart.md is executable end to end

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Constitution compliance, accessibility, and validation of the whole

- [X] T089 [P] Accessibility pass across `public/`: every control labelled (FR-050), keyboard order and `:focus-visible` verified (FR-051), validation messages wired via `aria-describedby` (FR-052), no colour-only meaning (FR-053), chart text summaries present (FR-054)
- [X] T090 [P] Error-handling sweep: confirm every view surfaces thrown API errors in the banner, marks the `field` input where present, and that no `catch` block anywhere swallows an error (Principle IV)
- [X] T091 [P] Layering audit: confirm no SQL text exists outside `src/db/`, that `src/routes/` imports only services, that `src/services/` imports only repositories, and that `reps × weight` appears in exactly one module (FR-031a, Principle II)
- [X] T092 [P] Security sweep: confirm no `innerHTML` assignment in `public/`, no stack traces in any response body, and that `server.js` binds `127.0.0.1` only (Principle V)
- [X] T093 [P] Documentation pass: a one-line docblock naming the layer at the top of every module in `src/`, and why-comments on goal resolution, servings→grams conversion, the rounding policy, and SVG scaling (Principle VIII)
- [X] T094 Performance check against SC-007: load 500 sessions, 5,000 sets, 500 body weight entries, and 2,000 meal entries, then confirm every screen renders within 1 second; add indexes only if a measurement demands it
- [X] T095 Create `README.md` at repository root with a short description and the run/test/demo commands, pointing to `specs/001-gym-nutrition-tracker/quickstart.md` for detail
- [X] T096 Run the full quickstart.md demo script end to end from a clean checkout, confirm `npm test` passes, and time the three journeys in SC-001, SC-002, and SC-003 (log a 3×3 session, record a weigh-in, search and log a food) against their stated thresholds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–7)**: All depend on Foundational completion
  - Can then proceed in parallel (if staffed) or sequentially in priority order
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. No dependencies on other stories
- **US2 (P2)**: Depends only on Foundational. Fully independent of US1
- **US3 (P2)**: Depends only on Foundational. Fully independent of US1 and US2
- **US4 (P3)**: Depends on Foundational. Its code is independent, but a *meaningful* demonstration needs data from US1, US2, and US3 — it is testable in isolation only through its empty states and fixture data
- **US5 (P3)**: Depends on Foundational plus the repositories from US1, US2, and US3, because the seed writes to all of their tables. This is the one story that genuinely cannot ship before the others

### Within Each User Story

- Tests are written first and must fail before implementation
- Schemas and repositories before services
- Services before routes
- Routes before views
- Story complete before moving to the next priority

### Critical Path

```text
T001-T003 → T004-T007 → T008-T014 → T026-T041 (US1 / MVP)
                              ↓
                   T042-T048 (US2) ‖ T049-T073 (US3)
                              ↓
                   T074-T081 (US4) → T082-T088 (US5) → T089-T096
```

### Parallel Opportunities

- T002 and T003 in Setup
- T008, T009, T011, T015–T021, T023–T025 in Foundational (12 tasks, distinct files)
- All four test files opening each user story phase
- All schema and repository tasks within a story (distinct files)
- Both view modules within US1 and within US3
- The five polish audits T089–T093
- With three developers: US1, US2, and US3 can run concurrently once Phase 2 lands

---

## Parallel Example: User Story 3

```bash
# Launch all US3 tests together (8 files, no shared state):
Task: "tests/unit/goals-effective-date.test.js"
Task: "tests/integration/foods.repo.test.js"
Task: "tests/integration/meal-entries.repo.test.js"
Task: "tests/integration/goals.repo.test.js"
Task: "tests/api/foods.api.test.js"
Task: "tests/api/meal-entries.api.test.js"
Task: "tests/api/goals.api.test.js"
Task: "tests/api/nutrition.api.test.js"

# Then launch all US3 schemas and repositories together (6 files):
Task: "src/validation/schemas/foods.js"
Task: "src/validation/schemas/meal-entries.js"
Task: "src/validation/schemas/goals.js"
Task: "src/db/repositories/foods.repo.js"
Task: "src/db/repositories/meal-entries.repo.js"
Task: "src/db/repositories/goals.repo.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T025) — **critical, blocks everything**
3. Complete Phase 3: User Story 1 (T026–T041)
4. **STOP and VALIDATE**: create exercises, log a session, restart the server, confirm persistence

At this point the app is a working training log — a legitimate standalone product.

### Incremental Delivery

| Increment | Phases | Delivers |
|---|---|---|
| 1 | 1–3 | Training log (MVP) |
| 2 | + 4 | Body weight tracking |
| 3 | + 5 | Nutrition and goals — the full product promise |
| 4 | + 6 | Progress trends |
| 5 | + 7 | Demo-ready sample data |
| 6 | + 8 | Polished and audited |

Each increment leaves the app shippable. Stopping after increment 3 yields a complete tracker without charts; stopping after 4 yields the whole product minus presentation convenience.

### Notes

- Tests precede implementation within each story and must fail first
- Every test file provisions its own temp database; `data/gymtracker.db` is never touched by tests
- Commit after each task; each is independently reviewable
- Run `npm test` before every commit — the suite is fast enough to be a per-commit gate
