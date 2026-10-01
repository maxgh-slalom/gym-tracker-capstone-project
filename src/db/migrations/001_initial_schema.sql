-- GymTracker initial schema.
-- Every CHECK here mirrors a validator in src/validation/, so a service-layer bug
-- cannot write invalid data (Constitution VI).

CREATE TABLE exercises (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL UNIQUE,
  muscle_group TEXT NOT NULL CHECK (muscle_group IN
                 ('chest','back','legs','shoulders','arms','core','full_body','other')),
  archived_at  TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_exercises_active ON exercises (archived_at, name);

CREATE TABLE workout_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL CHECK (date(session_date) IS NOT NULL),
  note         TEXT CHECK (note IS NULL OR length(note) <= 500),
  created_at   TEXT NOT NULL
);
CREATE INDEX idx_sessions_date ON workout_sessions (session_date DESC);

CREATE TABLE workout_sets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL REFERENCES workout_sessions (id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises (id) ON DELETE RESTRICT,
  position    INTEGER NOT NULL CHECK (position >= 0),
  reps        INTEGER NOT NULL CHECK (reps > 0),
  weight_kg   REAL NOT NULL CHECK (weight_kg >= 0)
);
CREATE INDEX idx_sets_session ON workout_sets (session_id, position);
CREATE INDEX idx_sets_exercise ON workout_sets (exercise_id);

CREATE TABLE body_weights (
  entry_date TEXT PRIMARY KEY CHECK (date(entry_date) IS NOT NULL),
  weight_kg  REAL NOT NULL CHECK (weight_kg > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE foods (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  name_key      TEXT NOT NULL UNIQUE,
  portion_name  TEXT NOT NULL,
  portion_grams REAL NOT NULL CHECK (portion_grams > 0),
  calories      REAL NOT NULL CHECK (calories >= 0),
  protein_g     REAL NOT NULL CHECK (protein_g >= 0),
  carbs_g       REAL NOT NULL CHECK (carbs_g >= 0),
  fat_g         REAL NOT NULL CHECK (fat_g >= 0),
  is_builtin    INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
  archived_at   TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_foods_search ON foods (archived_at, name_key);

CREATE TABLE meal_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL CHECK (date(entry_date) IS NOT NULL),
  meal_slot  TEXT NOT NULL CHECK (meal_slot IN ('breakfast','lunch','dinner','snack')),
  food_id    INTEGER NOT NULL REFERENCES foods (id) ON DELETE RESTRICT,
  quantity_g REAL NOT NULL CHECK (quantity_g > 0),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_meals_date ON meal_entries (entry_date, meal_slot);
CREATE INDEX idx_meals_food ON meal_entries (food_id);

CREATE TABLE goal_sets (
  effective_date TEXT PRIMARY KEY CHECK (date(effective_date) IS NOT NULL),
  calories       REAL NOT NULL CHECK (calories >= 0),
  protein_g      REAL NOT NULL CHECK (protein_g >= 0),
  carbs_g        REAL NOT NULL CHECK (carbs_g >= 0),
  fat_g          REAL NOT NULL CHECK (fat_g >= 0),
  created_at     TEXT NOT NULL
);
