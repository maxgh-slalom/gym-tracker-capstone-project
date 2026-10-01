# GymTracker Constitution

## Core Principles

### I. Simplicity First (NON-NEGOTIABLE)
GymTracker is a simple monolith: a vanilla HTML/CSS/JavaScript frontend, a minimal Node.js +
Express backend, and SQLite for persistence. Simple, readable, maintainable code always wins
over abstraction or premature optimization. No frameworks, build pipelines, ORMs, or design
patterns are introduced unless a concrete, present-day requirement cannot be met without them.
YAGNI applies: do not build for hypothetical future needs. Every new dependency must be
justified in writing; the default answer is "use the standard library or plain code".

### II. Clear Separation of Responsibilities
Frontend, backend, and data access remain clearly separated with one-directional dependencies:
frontend → HTTP API → backend routes → data access → SQLite. The frontend never issues SQL or
assumes database internals. Express route handlers own HTTP concerns (parsing, status codes,
response shape) and delegate all persistence to a dedicated data-access module. SQL lives only
in the data-access layer. Business rules must not be duplicated across layers; when logic is
needed on both sides, the backend is authoritative and the frontend may only mirror it for UX.

### III. Validate at System Boundaries
All user input and all external API data MUST be validated at the boundary where it enters the
system, before it reaches business logic or the database. Backend validation is mandatory and
authoritative; frontend validation is UX-only and never trusted. Validation checks presence,
type, range, and allowed values, and rejects invalid data with HTTP 400 and a clear, actionable
message. All SQL MUST use parameterized queries — string-concatenated SQL is forbidden. Data
returned from external APIs is treated as untrusted and validated before storage or rendering.

### IV. Fail Loudly
Errors are surfaced, never swallowed. Empty `catch` blocks, ignored promise rejections, and
catch-and-return-default patterns are forbidden. Every error path either handles the error
meaningfully or propagates it. Server errors are logged with enough context to diagnose them
(operation, identifiers, original error) and returned to the client with an accurate status code
and a clear message. Error messages must state specifically what failed and why; generic text
such as "something went wrong" is not acceptable in logs. Invalid state detected at startup
(unreachable database, missing required configuration) aborts startup rather than running
degraded.

### V. Secure by Default
Secrets, credentials, and API keys MUST NOT appear in client-side code, in the repository, or in
any response sent to the browser. Configuration containing secrets is read from environment
variables on the server only. Calls to external APIs requiring credentials are proxied through
the backend. User-supplied content is escaped or inserted as text when rendered in the DOM;
building HTML by concatenating untrusted strings is forbidden. Responses expose only the fields
a client needs — never raw rows containing internal or sensitive columns. Stack traces and
internal error details are logged server-side, never returned to clients.

### VI. SQLite as the Single Source of Truth
SQLite is the one authoritative store for all persistent application data. No parallel store,
shadow cache, or duplicated state in files, in-memory globals, or browser storage may be treated
as authoritative; `localStorage` may hold UI preferences only. The schema is defined and evolved
through ordered, committed migration scripts applied at startup — never by manual, undocumented
edits to the database file. Schema constraints (`NOT NULL`, foreign keys, unique indexes) enforce
data integrity at the storage layer in addition to boundary validation.

### VII. Lightweight Tests for Critical Paths
Automated tests are required for the critical paths: input validation rules, persistence and
data-access functions, and API routes (success plus the primary failure cases). Tests run with a
lightweight runner (the Node.js built-in test runner is preferred) against an isolated throwaway
SQLite database, never a developer's or production database. Tests must be deterministic,
independent of execution order, and runnable locally with a single command. Exhaustive coverage
of trivial code and full UI automation are explicitly out of scope — breadth over critical paths
beats depth everywhere.

### VIII. Documented Code
Non-obvious logic MUST carry a short comment explaining *why*, not *what*. Comments that restate
the code are noise and must be removed. Each module begins with a concise docblock stating its
purpose and its place in the layering; each exported function documents its parameters, return
value, and thrown errors when these are not evident from the signature. Documentation is updated
in the same change as the code it describes; stale comments are treated as defects.

## Technology Constraints

- **Frontend**: vanilla HTML, CSS, and JavaScript (ES modules) served as static files. No SPA
  framework, transpiler, bundler, or CSS preprocessor.
- **Backend**: Node.js with Express. Route handlers stay thin; middleware is added only when a
  concern is genuinely cross-cutting.
- **Database**: SQLite accessed through a single data-access module. Parameterized queries only.
- **Dependencies**: the dependency list stays minimal. Adding a runtime dependency requires a
  stated reason why the standard library or an existing dependency is insufficient.
- **Local execution**: the project MUST remain runnable locally with `npm install` followed by a
  single start command, with no external services required. Default configuration must let a
  fresh clone start successfully.
- **Structure**: generated and hand-written code alike follow the existing directory layout and
  naming conventions rather than introducing new organizational schemes.

## Development Workflow

- Every change identifies the layer(s) it touches and respects the boundaries in Principle II.
- Changes to validation, persistence, or API routes ship with the tests required by Principle
  VII; a change is not complete until those tests pass locally.
- Review checklist for every change: no swallowed errors, no unparameterized SQL, no secrets
  reachable from the client, no unjustified dependency, no new abstraction without a concrete
  need, comments present for non-obvious logic and absent where redundant.
- Plans produced by the planning workflow MUST pass the Constitution Check gate before
  implementation begins; any violation is either recorded with an explicit justification and the
  simpler alternative that was rejected, or the plan is revised.

## Governance

This constitution supersedes other development practices and conventions for GymTracker. Where
guidance conflicts, this document wins.

Amendments require: (1) a written rationale for the change, (2) an update to this file including
the version bump and amendment date, and (3) a review of dependent artifacts
(`.specify/templates/plan-template.md`, `.specify/templates/spec-template.md`,
`.specify/templates/tasks-template.md`, and agent guidance files) so that no guidance contradicts
the amended text.

Versioning follows semantic versioning: MAJOR for removing or redefining a principle in a
backward-incompatible way, MINOR for adding a principle or materially expanding guidance, PATCH
for clarifications and wording fixes that do not change obligations.

Compliance is verified at plan time via the Constitution Check gate and at review time via the
Development Workflow checklist. Complexity that violates Principle I must be justified explicitly
or removed.

**Version**: 1.0.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-09-30
