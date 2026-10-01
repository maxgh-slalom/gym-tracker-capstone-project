# Phase 1 Contract: REST API

**Feature**: 001-gym-nutrition-tracker | **Date**: 2026-09-30 | **Base path**: `/api`

All endpoints accept and return `application/json`. The server also serves the static frontend
from `/`, from the same origin, so no CORS headers are configured. The server binds to
`127.0.0.1` only.

## Conventions

- Request and response bodies use **camelCase**; the repository layer maps to and from snake_case
  columns so SQL naming never reaches the API.
- Dates are `YYYY-MM-DD` strings. Dates later than today are rejected (research R10); goal
  `effectiveDate` is the sole exception and may be in the future.
- `POST` returns `201` with the created resource. `PATCH`/`PUT` return `200` with the updated
  resource. `DELETE` returns `204` with no body.
- Unknown fields in a request body are ignored, not rejected. Missing required fields are a `400`.

## Error shape

Every non-2xx response has exactly this body. Stack traces and internal detail are logged
server-side only (Principle V).

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "reps must be a positive integer",
    "field": "entries[0].sets[2].reps"
  }
}
```

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | A field failed a boundary rule. `field` is always present. |
| `NOT_FOUND` | 404 | The addressed resource does not exist. |
| `CONFLICT` | 409 | Duplicate name, or deletion of a referenced item. |
| `INTERNAL_ERROR` | 500 | Unexpected failure. `message` is generic; full context is in the server log. |

---

## Health

### `GET /api/health`

`200` → `{ "status": "ok", "database": "ok", "empty": true }`

Used by the quickstart to confirm the server and database are both live. `empty` reports whether
any application data exists, which is what the UI uses to label the demo action "Load demo data"
rather than "Reset demo data".

---

## Exercises

### `GET /api/exercises`

| Query | Type | Default |
|---|---|---|
| `includeArchived` | boolean | `false` |
| `muscleGroup` | enum | all |

`200` → `{ "exercises": [ { "id", "name", "muscleGroup", "archived", "archivedAt", "setCount" } ] }`

`setCount` lets the UI show why an exercise cannot be hard-deleted without a second request.

### `POST /api/exercises`

```json
{ "name": "Incline Dumbbell Press", "muscleGroup": "chest" }
```

`201` → the created exercise.
`400` empty or over-length name, unknown `muscleGroup`.
`409` `code: CONFLICT` when `name` duplicates an existing exercise case-insensitively (FR-002).

### `PATCH /api/exercises/:id`

Body may contain `name`, `muscleGroup`, or both. `200`, `400`, `404`, `409` as above.

### `POST /api/exercises/:id/archive` · `POST /api/exercises/:id/restore`

No body. `200` → the updated exercise. `404` if unknown. Archiving an already-archived exercise is
idempotent and returns `200`.

### `DELETE /api/exercises/:id`

`204` when the exercise has no sets referencing it.
`409` otherwise, with `message: "Exercise is used by 42 logged sets. Archive it instead."`
(research R7).

---

## Workouts

### `GET /api/workouts`

| Query | Type | Default |
|---|---|---|
| `from`, `to` | date | all time |
| `limit` | integer 1–200 | `50` |

`200` → `{ "sessions": [ { "id", "date", "note", "setCount", "totalVolume", "exercises": ["Squat", "Bench Press"] } ] }`

A summary shape for the history list, newest first (FR-009). Volume uses the single definition in
the data model.

### `GET /api/workouts/:id`

`200` → the full session:

```json
{
  "id": 7,
  "date": "2026-09-29",
  "note": "Felt strong",
  "totalVolume": 12450,
  "entries": [
    {
      "exerciseId": 3,
      "exerciseName": "Back Squat",
      "exerciseArchived": false,
      "sets": [ { "reps": 5, "weightKg": 100 }, { "reps": 5, "weightKg": 105 } ]
    }
  ]
}
```

`exerciseArchived` lets the UI mark archived exercises in history without hiding them (FR-004).

### `POST /api/workouts`

```json
{
  "date": "2026-09-29",
  "note": "Felt strong",
  "entries": [
    { "exerciseId": 3, "sets": [ { "reps": 5, "weightKg": 100 } ] }
  ]
}
```

`201` → the full session.

| Failure | Status | `field` |
|---|---|---|
| `date` malformed or in the future | 400 | `date` |
| `entries` missing or empty | 400 | `entries` |
| an entry has no sets | 400 | `entries[i].sets` |
| `reps` not a positive integer | 400 | `entries[i].sets[j].reps` |
| `weightKg` negative or non-numeric | 400 | `entries[i].sets[j].weightKg` |
| `exerciseId` unknown | 404 | — |

Logging against an **archived** exercise is rejected with `400` / `field: entries[i].exerciseId`,
since archived items must not appear in new entries.

### `PUT /api/workouts/:id`

Full replacement using the same body as `POST`. Sets are deleted and re-inserted inside one
transaction. The at-least-one-set rule applies, so emptying a session is a `400` directing the
user to delete it instead (research R10).

### `DELETE /api/workouts/:id`

`204`. Sets are removed by `ON DELETE CASCADE`.

---

## Body weight

### `GET /api/body-weights`

Query: `from`, `to`. `200` → `{ "entries": [ { "date", "weightKg" } ] }`, newest first.

### `PUT /api/body-weights/:date`

```json
{ "weightKg": 78.4 }
```

Upsert keyed by the path date (FR-013).

`200` → `{ "date", "weightKg", "replaced": true }` — `replaced` tells the UI to say the prior
value was updated rather than added.
`400` when `weightKg` ≤ 0 or non-numeric (`field: weightKg`), or the date is malformed or future.

### `DELETE /api/body-weights/:date`

`204`, or `404` if no entry exists for that date.

---

## Foods

### `GET /api/foods`

| Query | Type | Default |
|---|---|---|
| `search` | string | all |
| `includeArchived` | boolean | `false` |
| `limit` | integer 1–100 | `25` |

`search` is a case-insensitive substring match (FR-017).

`200` → `{ "foods": [...], "total": 3 }`. A search with no matches returns `foods: []` and
`total: 0` with status `200` — an empty result is not an error (FR-018).

Each food:

```json
{
  "id": 12,
  "name": "Greek Yogurt 2%",
  "portionName": "1 cup",
  "portionGrams": 227,
  "calories": 146,
  "proteinG": 20,
  "carbsG": 8,
  "fatG": 4,
  "isBuiltin": true,
  "archived": false,
  "entryCount": 17
}
```

### `POST /api/foods`

Body: `name`, `portionName`, `portionGrams`, `calories`, `proteinG`, `carbsG`, `fatG`.

`201` → the created food.
`400` when `portionGrams` ≤ 0 (`field: portionGrams`) or any nutrition value is negative.
`409` on a case-insensitive duplicate name.

### `PATCH /api/foods/:id` · `POST /api/foods/:id/archive` · `POST /api/foods/:id/restore` · `DELETE /api/foods/:id`

Same semantics as the exercise equivalents. `DELETE` returns `409` when any meal entry references
the food.

Editing a food's nutrition values changes how **all** of its past entries are reported, because
entries store only a quantity. The `PATCH` response includes `affectedEntryCount` so the UI can
warn before saving.

---

## Meal entries

### `POST /api/meal-entries`

Exactly one of `servings` or `grams` must be supplied (research R6).

```json
{ "date": "2026-09-29", "mealSlot": "breakfast", "foodId": 12, "servings": 1.5 }
```

`201` →

```json
{
  "id": 88,
  "date": "2026-09-29",
  "mealSlot": "breakfast",
  "foodId": 12,
  "foodName": "Greek Yogurt 2%",
  "quantityG": 340.5,
  "servings": 1.5,
  "calories": 219,
  "proteinG": 30,
  "carbsG": 12,
  "fatG": 6
}
```

| Failure | Status | `field` |
|---|---|---|
| both or neither of `servings`/`grams` | 400 | `quantity` |
| `servings` or `grams` ≤ 0 or non-numeric | 400 | `servings` / `grams` |
| `mealSlot` not a known slot | 400 | `mealSlot` |
| `date` malformed or in the future | 400 | `date` |
| `foodId` unknown | 404 | — |
| food is archived | 400 | `foodId` |

### `PATCH /api/meal-entries/:id`

May change `mealSlot`, `date`, and the quantity (again, exactly one of `servings`/`grams`).

### `DELETE /api/meal-entries/:id`

`204`.

---

## Nutrition day view

### `GET /api/nutrition/day/:date`

The single call backing the nutrition screen (FR-026 through FR-029).

```json
{
  "date": "2026-09-29",
  "goals": { "effectiveDate": "2026-09-08", "calories": 2400, "proteinG": 180, "carbsG": 240, "fatG": 70 },
  "totals": { "calories": 2510, "proteinG": 172, "carbsG": 268, "fatG": 74 },
  "comparison": {
    "calories": { "goal": 2400, "consumed": 2510, "remaining": -110, "exceeded": true },
    "proteinG": { "goal": 180, "consumed": 172, "remaining": 8, "exceeded": false },
    "carbsG":   { "goal": 240, "consumed": 268, "remaining": -28, "exceeded": true },
    "fatG":     { "goal": 70,  "consumed": 74,  "remaining": -4,  "exceeded": false }
  },
  "meals": {
    "breakfast": [ { "id": 88, "foodName": "Greek Yogurt 2%", "quantityG": 340.5, "servings": 1.5, "calories": 219, "proteinG": 30, "carbsG": 12, "fatG": 6 } ],
    "lunch": [], "dinner": [], "snack": []
  }
}
```

When no goal set is effective on or before the date, `goals` and `comparison` are both `null` and
`totals` is still populated (FR-028). They are `null` rather than zero-filled so the UI cannot
accidentally render a 0 kcal goal as a real target.

`exceeded` is returned explicitly rather than left to the client to infer from a negative
`remaining`, satisfying FR-027 at the contract level.

Totals are summed from unrounded entry values and rounded once (research R4), so the displayed
total always equals the sum of the displayed entries.

---

## Goals

### `GET /api/goals`

`200` → `{ "goalSets": [ { "effectiveDate", "calories", "proteinG", "carbsG", "fatG" } ] }`,
newest effective date first — this is the goal history (FR-025a).

### `GET /api/goals/effective/:date`

`200` → the governing goal set for that date, or `{ "goalSet": null }` when none applies.

### `PUT /api/goals/:effectiveDate`

```json
{ "calories": 2400, "proteinG": 180, "carbsG": 240, "fatG": 70 }
```

Upsert keyed by effective date (FR-025c). `200` → the stored goal set.
`400` when any value is negative or non-numeric, or `effectiveDate` is malformed.
Future effective dates are permitted here (research R10).

### `DELETE /api/goals/:effectiveDate`

`204`. Days previously governed by the deleted set fall back to the next-earlier set, or to no
goals if none remains.

---

## Progress

### `GET /api/progress`

| Query | Type | Required |
|---|---|---|
| `from` | date | yes |
| `to` | date | yes |
| `exerciseId` | integer | no — omit to skip the per-exercise series |

One call returns all four trends for the range (FR-029a through FR-034).

```json
{
  "range": { "from": "2026-07-02", "to": "2026-09-30" },
  "bodyWeight": {
    "points": [ { "date": "2026-07-02", "weightKg": 80.1 } ],
    "netChangeKg": -1.7
  },
  "volumeBySession": { "points": [ { "date": "2026-07-03", "volume": 11200 } ] },
  "volumeByWeek":    { "points": [ { "weekStart": "2026-06-29", "volume": 41800 } ] },
  "exerciseBest":    { "exerciseId": 3, "exerciseName": "Back Squat",
                       "points": [ { "date": "2026-07-03", "bestWeightKg": 100 } ] },
  "caloriesVsGoal":  { "points": [ { "date": "2026-07-02", "calories": 2510, "goalCalories": 2400 } ] }
}
```

`400` with `field: "from"` when `from` is later than `to` (FR-029b). The client keeps its current
view on this error rather than clearing it.

Each series returns `points: []` when the range holds no data; the client renders the empty state
(FR-034). `exerciseBest` is `null` when `exerciseId` is omitted.

In `caloriesVsGoal`, `goalCalories` is the goal in effect on **that** day and may differ between
points when goals changed mid-range (FR-033, research R5). It is `null` for days before the
earliest goal set.

---

## Demo

### `POST /api/demo/reset`

**Destructive.** Deletes every application row, then loads the deterministic seed, all in one
transaction.

```json
{ "confirm": "RESET" }
```

`200` → `{ "reset": true, "counts": { "exercises": 12, "sessions": 32, "sets": 400, "bodyWeights": 56, "foods": 40, "mealEntries": 500, "goalSets": 2 } }`

`400` with `field: "confirm"` when the confirmation string is absent or wrong. This is the
contract-level guard required by the Constitution Check; the UI adds a typed confirmation on top,
and the loopback-only bind keeps the endpoint off the network.

This is the **only** way seed data enters the database (FR-043). Startup never loads it, so a
fresh checkout serves empty states until this endpoint is called deliberately. When the database
is already empty the operation still runs — the delete phase is simply a no-op — and the UI
labels it "Load demo data" so the presenter is not warned about erasing data that does not exist.
