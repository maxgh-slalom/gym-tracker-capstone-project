# Feature Specification: GymTracker — Gym & Nutrition Tracking (v1)

**Feature Branch**: `001-gym-nutrition-tracker`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Develop GymTracker, a single-user gym and nutrition tracking app where the user can create custom exercises, log workout sessions with sets, reps, weight, and dates, track body weight over time, and view progress trends. The app should also support food logging by allowing the user to search foods, record meals, track calories and macros, and compare daily intake against calorie and macro goals. This first version should stay small, reliable, and demo-friendly, with realistic sample data for presentation."

## Clarifications

### Session 2026-09-30

- Q: How should daily calorie/macro goals behave over time when the user changes them? → A:
  Effective-dated goals — each day is compared against the goal set that was in effect on that
  date, so changing goals never alters how past days are judged.
- Q: How does the user specify how much of a food they ate? → A: Each food defines a named
  reference portion and that portion's weight in grams; the user enters either a number of
  servings or a gram amount, and the entry stores the resolved gram amount as the source of truth.
- Q: What happens when the user deletes a catalog item (exercise or food) that historical records
  reference? → A: Archive rather than delete — the item disappears from pickers and search but
  historical records continue to display it intact; archiving is reversible.
- Q: What should happen when demo seed data is loaded a second time? → A: An explicit "Reset demo"
  action wipes all existing data and reloads the seed deterministically, behind a clear
  confirmation.
- Q: How does the user choose the time period shown in the progress view? → A: A custom start/end
  date range picker; no fixed presets.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Log a workout session with custom exercises (Priority: P1)

The user defines the exercises they actually perform (for example "Incline Dumbbell Press" or
"Romanian Deadlift"), then records a training session on a given date by picking exercises and
entering each set's reps and weight. After saving, the session appears in a history list and can
be reopened, corrected, or deleted.

**Why this priority**: This is the core reason the app exists. Without workout logging there is no
product; every other feature enriches data that this story produces.

**Independent Test**: Create two custom exercises, log a dated session containing multiple
exercises with several sets each, then reload the app and confirm the session and all set details
are still present and editable. Delivers a usable training log on its own.

**Acceptance Scenarios**:

1. **Given** an empty exercise library, **When** the user creates an exercise with a name and
   muscle group, **Then** the exercise is saved and available for selection in future sessions.
2. **Given** at least one saved exercise, **When** the user logs a session dated today containing
   that exercise with three sets of reps and weight, **Then** the session is persisted and listed
   in workout history under that date.
3. **Given** a saved session, **When** the user edits a set's weight and saves, **Then** the
   updated value is persisted and reflected in history and in any derived totals.
4. **Given** a saved session, **When** the user deletes it, **Then** it is removed from history and
   no longer contributes to totals or trends.
5. **Given** the user tries to create an exercise whose name already exists, **When** they save,
   **Then** the app rejects the duplicate with a clear message and the library is unchanged.
6. **Given** an exercise referenced by past sessions, **When** the user archives it, **Then** it no
   longer appears when building a new session, while past sessions still show it by name.

---

### User Story 2 - Track body weight over time (Priority: P2)

The user records their body weight with a date, sees the full history of entries, and can correct
or remove a mistaken entry.

**Why this priority**: Body weight is the simplest and most visible measure of progress, and it is
the input that makes the progress view meaningful. It is small, self-contained, and demos well.

**Independent Test**: Record body weight entries on several different dates, confirm they are
listed newest-first with correct values, then edit one and delete another and confirm both changes
persist across a reload.

**Acceptance Scenarios**:

1. **Given** no prior entries, **When** the user records a body weight with a date, **Then** the
   entry is saved and appears in the body weight history.
2. **Given** an entry already exists for a date, **When** the user records another weight for that
   same date, **Then** the app replaces the existing entry for that date rather than creating a
   duplicate, and informs the user it was updated.
3. **Given** existing entries, **When** the user submits a weight that is zero, negative, or
   non-numeric, **Then** the app rejects it with a clear message and saves nothing.

---

### User Story 3 - Log meals and compare intake to calorie and macro goals (Priority: P2)

The user searches a food catalog by name, adds a food to a meal for a given date with a chosen
portion, and sees that day's running totals for calories, protein, carbohydrates, and fat compared
against their configured daily goals, including remaining amounts.

**Why this priority**: Nutrition tracking is the second half of the product promise and is what
makes GymTracker more than a workout log. It is separable from workout logging and can be
demonstrated on its own.

**Independent Test**: Set daily calorie and macro goals, search for and log several foods across
different meals on one date, and confirm the day's totals and remaining-versus-goal figures are
correct and update immediately when an entry is added or removed.

**Acceptance Scenarios**:

1. **Given** a food catalog, **When** the user searches by a partial food name, **Then** matching
   foods are listed with their reference portion and the calories and macros for that portion.
2. **Given** a food search result, **When** the user logs it to a named meal on a date by entering
   either a number of servings or a gram amount, **Then** the entry is saved and the day's totals
   increase by the correctly scaled calories and macros.
3. **Given** daily goals are set and entries exist, **When** the user views the day, **Then** the
   app shows consumed, goal, and remaining values for calories, protein, carbohydrates, and fat.
4. **Given** intake exceeds a goal, **When** the user views the day, **Then** the overage is shown
   clearly as exceeded rather than as a negative remainder presented without explanation.
5. **Given** a logged food entry, **When** the user removes it, **Then** the day's totals and
   remaining values recalculate immediately.
6. **Given** no goals were in effect on a date, **When** the user views that day with entries,
   **Then** totals are still shown and the app indicates that no goals applied.
7. **Given** days already logged under an older goal set, **When** the user changes their goals
   today, **Then** those earlier days still compare against the goals that were in effect then.

---

### User Story 4 - View progress trends (Priority: P3)

The user opens a progress view, chooses a start and end date, and sees how key measures moved over
that range: body weight over time, training volume per session or per week, best weight lifted per
exercise over time, and daily calories versus the calorie goal in effect each day.

**Why this priority**: Trends turn recorded data into insight and are the most persuasive part of a
demo, but they depend entirely on data produced by the earlier stories.

**Independent Test**: With existing workout, body weight, and nutrition data, open the progress
view and confirm each trend reflects the underlying records for the chosen range, and that changing
the start or end date changes the displayed data accordingly.

**Acceptance Scenarios**:

1. **Given** body weight entries across several weeks, **When** the user opens the progress view,
   **Then** body weight is displayed over time in date order with the net change for the range.
2. **Given** logged sessions, **When** the user opens the progress view, **Then** training volume
   per period is shown, derived consistently from the logged sets.
3. **Given** logged sessions for a chosen exercise, **When** the user selects that exercise,
   **Then** the heaviest weight recorded per session date is shown over time.
4. **Given** nutrition entries and goals that changed mid-range, **When** the user opens the
   progress view, **Then** daily calories are shown against the goal that applied on each day.
5. **Given** no data exists in the chosen range, **When** the user opens the progress view,
   **Then** each trend shows an explicit empty state instead of a blank or broken chart.
6. **Given** the progress view, **When** the user enters a start date later than the end date,
   **Then** the app rejects the range with a clear message and leaves the current view unchanged.

---

### User Story 5 - Demo with realistic sample data (Priority: P3)

A presenter can start the app from a clean checkout and immediately show a populated account —
several weeks of plausible workouts, body weight entries trending gently, a food catalog, and
logged meals with goals — without manually entering anything.

**Why this priority**: The stated purpose of v1 includes presentation. It is low effort, but it is
only meaningful once the features it populates exist.

**Independent Test**: Start from an empty database, run the demo reset, and confirm every screen —
exercises, workout history, body weight, nutrition, and progress — shows coherent, realistic
content with no empty states.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** the presenter runs the demo reset, **Then** exercises,
   workout sessions, body weight entries, foods, meal entries, and goals are populated with
   internally consistent, plausible values.
2. **Given** sample data is loaded, **When** the presenter opens the progress view, **Then** every
   trend has enough points to be visually meaningful.
3. **Given** a database already containing data, **When** the presenter runs the demo reset,
   **Then** the app warns that all existing data will be erased and proceeds only after explicit
   confirmation, after which the database matches the seed state exactly with no duplicates.
4. **Given** sample data exists, **When** the presenter adds or deletes their own records,
   **Then** those changes behave identically to records created from scratch.

---

### Edge Cases

- A workout session is saved with no exercises, or an exercise is added with no sets — the app must
  either reject it with a clear message or persist it unambiguously as an empty session.
- A set is entered with zero or negative reps, negative weight, or non-numeric values.
- Bodyweight exercises are logged with zero added weight — this is legitimate and must not be
  rejected as invalid weight.
- A session, body weight entry, or meal is dated in the future, or far in the past.
- An archived exercise or food still appears in historical records — it must remain readable and
  must still contribute to totals and trends for the dates it was logged.
- The user archives every exercise, leaving no selectable options when starting a new session.
- A food search returns no matches, or returns a very large number of matches.
- A portion size of zero or a negative portion is entered for a food, in either servings or grams.
- A food's reference portion gram weight is zero, making servings-to-grams conversion impossible.
- Two entries are recorded for the same body weight date.
- The progress view is opened when only one data point exists, so no trend can be drawn.
- The progress view is opened with a start date later than the end date, or with a range spanning
  no days.
- Meals are logged on a date before any goal set took effect, so no goal applies to that day.
- Numeric values are entered with locale-specific separators or excessive decimal precision.
- The demo reset is triggered accidentally while real data exists.
- The database file is missing or unreadable at startup.

## Requirements *(mandatory)*

### Functional Requirements

#### Exercises

- **FR-001**: Users MUST be able to create a custom exercise with a name and a muscle group.
- **FR-002**: System MUST reject an exercise whose name duplicates an existing exercise
  (case-insensitive) and explain the rejection.
- **FR-003**: Users MUST be able to view and rename exercises in their library.
- **FR-004**: Users MUST be able to archive an exercise instead of deleting it. An archived
  exercise is excluded from exercise pickers and library listings by default, while every
  historical set that references it continues to display its name and contribute to totals and
  trends.
- **FR-004a**: Users MUST be able to view archived exercises and restore them to active use.
- **FR-004b**: System MUST NOT provide a way to permanently delete an exercise that is referenced
  by any logged set.

#### Workout logging

- **FR-005**: Users MUST be able to log a workout session identified by a date, containing one or
  more exercises, each with one or more sets.
- **FR-006**: System MUST record, for each set, the reps performed and the weight used.
- **FR-007**: System MUST allow a weight of zero to support bodyweight exercises.
- **FR-008**: System MUST reject sets with non-positive reps, negative weight, or non-numeric
  values, and report which field is invalid.
- **FR-009**: Users MUST be able to view workout history ordered by date, most recent first.
- **FR-010**: Users MUST be able to edit and delete a previously logged session and its sets.
- **FR-011**: System MUST allow multiple sessions on the same calendar date.

#### Body weight

- **FR-012**: Users MUST be able to record a body weight value for a specific date.
- **FR-013**: System MUST store at most one body weight entry per date, replacing the prior value
  for that date and informing the user that it was updated.
- **FR-014**: System MUST reject body weight values that are non-numeric or not greater than zero.
- **FR-015**: Users MUST be able to view, edit, and delete body weight entries.

#### Food catalog and meal logging

- **FR-016**: System MUST provide a searchable food catalog where each food carries a name, a named
  reference portion (for example "1 medium egg"), the weight of that reference portion in grams,
  and the calories, protein, carbohydrates, and fat contained in that reference portion.
- **FR-017**: Users MUST be able to search foods by partial, case-insensitive name match.
- **FR-018**: System MUST return an explicit empty result indication when a search matches no foods.
- **FR-019**: Users MUST be able to log a food to a meal on a specific date by entering either a
  number of servings of its reference portion or a direct gram amount.
- **FR-020**: System MUST resolve every logged amount to grams and store the gram amount as the
  authoritative quantity for the entry, converting servings using the food's reference portion
  weight.
- **FR-020a**: System MUST scale calories and macros proportionally from the food's reference
  portion to the entry's resolved gram amount.
- **FR-021**: System MUST reject logged amounts that are non-numeric or not greater than zero, in
  either servings or grams.
- **FR-022**: Users MUST be able to group entries into meals of the day (for example breakfast,
  lunch, dinner, snack).
- **FR-023**: Users MUST be able to edit and delete logged food entries.
- **FR-024**: Users MUST be able to add a custom food to the catalog, supplying its name, reference
  portion name, reference portion weight in grams, and nutrition values for that portion.
- **FR-024a**: System MUST reject a food whose reference portion weight is not greater than zero.
- **FR-024b**: Users MUST be able to archive a food instead of deleting it. An archived food is
  excluded from search results and pickers, while existing meal entries that reference it continue
  to display it and contribute to totals and trends. Archived foods MUST be viewable and
  restorable, and foods referenced by meal entries MUST NOT be permanently deletable.

#### Goals and daily comparison

- **FR-025**: Users MUST be able to set daily goals for calories, protein, carbohydrates, and fat,
  effective from a chosen date.
- **FR-025a**: System MUST retain the history of goal sets so that each goal set applies from its
  effective date until the effective date of the next one.
- **FR-025b**: Changing goals MUST NOT alter the goal values used to evaluate any date before the
  new effective date.
- **FR-025c**: System MUST store at most one goal set per effective date, replacing the previous
  values for that date, and users MUST be able to view and delete past goal sets.
- **FR-025d**: System MUST reject goal values that are non-numeric or negative.
- **FR-026**: System MUST display, for a selected date, total consumed calories and macros, the
  goals in effect on that date, and the remaining amount for each.
- **FR-027**: System MUST clearly distinguish exceeding a goal from being under it.
- **FR-028**: System MUST show daily totals even when no goal set was in effect on that date, and
  indicate that no goals applied.
- **FR-029**: System MUST recalculate daily totals immediately when an entry is added, edited, or
  removed.

#### Progress trends

- **FR-029a**: Users MUST be able to choose the period shown in the progress view by entering an
  explicit start date and end date.
- **FR-029b**: System MUST reject a range whose start date is after its end date, with a clear
  message, and leave the previously displayed range intact.
- **FR-030**: System MUST present body weight over time for the selected date range.
- **FR-031**: System MUST present training volume per session and per week within the selected
  range, derived from logged sets using a single documented formula.
- **FR-032**: System MUST present the heaviest weight logged per session date for a user-selected
  exercise within the selected range.
- **FR-033**: System MUST present daily calorie intake within the selected range against the
  calorie goal that was in effect on each of those days.
- **FR-034**: System MUST show an explicit empty state for any trend with no data in the selected
  range.

#### Data, validation, and errors

- **FR-035**: System MUST persist all records so that they survive application restart.
- **FR-036**: System MUST validate every submitted value on the server before storing it, and
  reject invalid input with a message naming the offending field and the reason.
- **FR-037**: System MUST accept only dates in a single unambiguous format and reject malformed
  dates.
- **FR-038**: System MUST report failures visibly to the user rather than failing silently or
  showing partially updated screens.
- **FR-039**: System MUST operate as a single-user application with no authentication or account
  management in this version.

#### Sample data

- **FR-040**: System MUST provide a single "Reset demo" action that loads realistic sample data
  covering exercises, at least four weeks of workout sessions, body weight entries, a food catalog,
  logged meals, and at least two effective-dated goal sets.
- **FR-041**: The reset action MUST erase all existing application data before loading the seed, so
  that the resulting state is identical every time it is run regardless of what preceded it.
- **FR-041a**: System MUST warn that all existing data will be permanently erased and require
  explicit confirmation before performing the reset.
- **FR-041b**: Sample data MUST be generated relative to the current date so that the demo always
  shows recent activity.
- **FR-042**: Sample data MUST be distinguishable from user-entered data only by its content, not
  by behaving differently.
- **FR-043**: System MUST NOT load sample data automatically under any condition, including on a
  first run against an empty database. The explicit, confirmed reset is the only path by which
  seed data enters the database.

### Key Entities *(include if feature involves data)*

- **Exercise**: A movement the user performs. Has a unique name, a muscle group, and an archived
  flag. Referenced by logged sets; never hard-deleted once referenced.
- **Workout Session**: A dated training occasion. Optionally has a note. Contains logged sets.
- **Set**: One performed set within a session, tied to exactly one exercise. Has reps, weight, and
  an order within the exercise.
- **Body Weight Entry**: A dated body weight measurement. At most one per date.
- **Food**: A catalog item with a name, a named reference portion, that portion's weight in grams,
  the calories, protein, carbohydrates, and fat it contains, and an archived flag. May be built-in
  or user-created.
- **Meal Entry**: A dated record that a specific food was consumed in a specific meal slot. Stores
  the resolved gram amount as the authoritative quantity. References exactly one food.
- **Goal Set**: The user's target calories, protein, carbohydrates, and fat per day, together with
  the date from which those targets take effect. A sequence of goal sets forms the goal history;
  the set with the latest effective date on or before a given day governs that day.
- **Sample Data Set**: The deterministic collection of seed records used for demonstration,
  spanning all of the above and generated relative to the current date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a complete workout session of 3 exercises with 3 sets each in under 2
  minutes from opening the app.
- **SC-002**: A user can record a body weight entry in under 15 seconds.
- **SC-003**: A user can search for a food and log it to a meal in under 30 seconds.
- **SC-004**: 100% of records created during a session are still present and unchanged after the
  application is restarted.
- **SC-005**: 100% of invalid submissions (non-positive reps, negative weight, zero or negative
  serving or gram amount, negative goal values, non-numeric or malformed values, malformed dates,
  inverted date ranges) are rejected with a message that names the offending field; none are
  stored.
- **SC-006**: Daily calorie and macro totals match the sum of the day's scaled entries exactly, for
  every day containing entries.
- **SC-006a**: For any day, the goals displayed are those of the most recent goal set effective on
  or before that day, in 100% of cases, including after goals are later changed.
- **SC-006b**: Logging the same food as 2 servings and as the equivalent gram amount produces
  identical stored quantities and identical daily totals.
- **SC-007**: Every screen renders within 1 second on a dataset of 500 sessions, 5,000 sets, 500
  body weight entries, and 2,000 meal entries.
- **SC-008**: A presenter can go from a clean checkout to a fully populated demo in under 5 minutes
  using documented steps, with no screen showing an empty state.
- **SC-008a**: Running the demo reset twice in a row yields byte-identical application data both
  times, with no duplicated records.
- **SC-009**: Every trend in the progress view can be traced back to its underlying records, with
  no discrepancy between displayed and recorded values.
- **SC-009a**: Archiving an exercise or food changes zero historical totals or trend values.
- **SC-010**: No unhandled failure leaves the interface in a state where the user cannot tell
  whether their data was saved.

## Assumptions

- **Single user, no authentication**: The app serves one person on their own machine. Accounts,
  login, and multi-user data isolation are out of scope for v1.
- **Local operation**: The app runs locally and requires no internet connection. The food catalog
  is local rather than backed by a third-party nutrition API; "external API data" handling applies
  if such an integration is added later.
- **Units**: A single, consistent unit system is used throughout (kilograms for weight, grams for
  macros, kilocalories for energy). Unit conversion and user-selectable units are out of scope.
- **Dates**: Dates are calendar dates without time-of-day, interpreted in the user's local
  timezone. Timezone handling beyond that is out of scope.
- **Volume definition**: Training volume means the sum of reps × weight across a session's sets;
  this single definition is used everywhere volume appears.
- **Progress range default**: The progress view opens with the date range prefilled to the most
  recent 90 days ending today; the user edits the start and end dates directly. No preset buttons
  are provided.
- **Archiving over deletion**: Catalog items that have never been referenced may still be deleted
  outright; archiving is what replaces deletion once references exist. Archived items are hidden
  from pickers and search but remain fully visible in historical records.
- **Charts**: "Trends" means simple time-series visualizations plus a summary figure. Statistical
  analysis, predictions, and one-rep-max estimation are out of scope.
- **Scope boundaries for v1**: Workout templates and routines, rest timers, supersets, exercise
  media or instructions, barcode scanning, recipes, photo logging, social features, data
  import/export, notifications, and offline sync are all out of scope.
- **Scale**: The dataset is personal-sized — a few years of daily use at most — so no pagination,
  data purging, or performance tuning beyond straightforward querying is expected.
- **Browser support**: A current desktop browser is assumed for the demo; responsive layout is
  desirable but a dedicated mobile experience is out of scope.
- **Sample data**: Sample data is fictional but plausible. It is loaded only by the presenter
  explicitly invoking the demo reset, never automatically on start, and the reset is destructive by
  design. A fresh checkout therefore opens with empty states until the presenter loads the demo,
  which is accepted: the empty states are themselves worth demonstrating.
