# Production-Readiness Checkpoint

Status labels: **Implemented**, **Tested and Passed**, **Implemented but Not Fully Tested**, **Blocked**, **Not Implemented**.
Last updated: 2026-10-14 (Stage 1 + parts of Stages 2, 5). Resume from "Next concrete task" below; do not restart the analysis.


## STAGE 2 UPDATE (master data) — 2026-10-15

**Implemented and Tested and Passed (real MariaDB, 43/43 tests):**
- Tracked, idempotent, additive migration runner (`server/database/migrations.ts`, table `schema_migrations`). A failed migration is not recorded, is retried on next start and shows as `schema: failed` in `/api/health`.
  - `001_expense_category_color`: `expense_categories.color VARCHAR(7)` + distinct default colours for existing categories (no records touched).
  - `002_reference_columns_and_backfill`: `expenses.category_id/branch_id`, `bookings.branch_id/facility_id` (+ indexes), backfilled by exact case-insensitive name match only; unmatched rows stay NULL.
- Expense categories: validation, case-insensitive uniqueness, **colour stored in DB** and shown in the UI (swatches + custom picker) and in the analytics expense breakdown; collision-safe IDs (were `EC-00<count>`); rename carries existing expenses along; **delete refused (409) when expenses use the category** (deactivate instead).
- Branches: validation/uniqueness; collision-safe IDs; **rename cascades** to facilities, bookings, expenses and users so history stays attached (reports match by name); new branches appear in analytics automatically.
- Facilities: branch must exist and be active; capacity/price validation; duplicate-in-branch protection; rename cascades to bookings; **cannot delete or move a facility that has bookings** (409); capacity edits flow into occupancy.
- Audit log now records the signed-in user (was hard-coded `System Admin`) for these entities.
- Structured errors: validation => 400, conflict => 409, missing => 404, DB failure => 500 (sanitised).

**Also fixed while merging `main` (PR #3):**
- `main` introduced an in-memory SQLite fallback that activated on **any** MySQL connection error, in production too: the app reported healthy while writes went to a throwaway DB. It is now **opt-in** (`ALLOW_MEMORY_DB=true`, never in production) and `/api/health` reports `degraded` while it is active.
- `.env.example` on `main` contained what appeared to be real DB host/user/password in a **public** repo. Scrubbed in the file; **still in git history => rotate that password.**
- `.env.example` was loaded with `override: true` as a fallback (could override real env vars) — now dev-only and non-overriding; `PORT` env is honoured (default 3000).
- Added the `customDates` filter (non-contiguous dates) to the shared rules with tests.

**Observed but not changed:** `main` deleted `package-lock.json` and `bun.lock` (non-reproducible installs; `npm ci` will fail). Recommend restoring one lockfile.

**Still Not Implemented in Stage 2:** per-user Profile persistence (still singleton `profile_settings id=1`), Business Settings persistence review + `tax_rate` removal, password reset (needs SMTP config), foreign-key constraints on the new reference columns (deliberately deferred until backfill is verified on production data), user management hardening (IDs/validation), expense create/edit still writes name text and does not yet populate `category_id`/`branch_id` (Stage 3).

**Deployment note:** on first start the server runs migrations 001–002 against the configured database automatically. They are additive (new columns/indexes + backfill). Take a backup first.

## A. Root causes found (evidence in code)

| # | Root cause | Where | Effect |
|---|---|---|---|
| 1 | Every read path caught DB errors and returned `[]` / blank settings | `server/repositories/*` | A failing query or dead DB looked like "no data": all-zero KPIs, empty tables, silent "success". |
| 2 | Booking mapper rewrote `Cancelled` to `Active` | `operationsRepository.getBookings` | Cancelled bookings counted as live revenue/occupancy in Dashboard, Reports, Facility Records, CRM. |
| 3 | No authentication on any `/api/*` route except `/me` | all routers | Anyone could read/write all business data, grant themselves any role, create users. |
| 4 | Login backdoors | `authController.login` | Default passwords (`admin123`, `password`, email-prefix…) accepted for any user; admin auto-created for 3 emails with any password. |
| 5 | Public `/signup` accepted a client-chosen `role` | `authController.signup` | Anyone could create a Director. |
| 6 | Permission lookup failed **open** (everything allowed if role row missing/unparseable) | `authController` | Permissions were advisory only. |
| 7 | Analytics: fuzzy branch matching (`includes`), "this month" silently replaced by latest month with data, shared expense hard-coded `/2`, occupancy ignored date range, revenue included cancelled | `financeService` | Contradictory, partly fabricated figures. |
| 8 | Occupancy floored at 1 booking (`Math.max(activeCount,1)`) | `operationsRepository.getFacilityRecords` | Facilities with zero bookings showed non-zero occupancy. **Not yet fixed.** |
| 9 | Payment IDs `PAY-<last 6 digits of Date.now()>` repeat every ~17 min | booking create | Intermittent primary-key collisions => booking transaction rolled back. |
| 10 | Frontend wrappers read `data.error` only and never sent the token | `src/services/*` | Real error messages lost ("API Request failed"); would break once auth was enforced. |
| 11 | `.env` loaded with `override: true` | `config.ts` | A stale `.env` silently overrides the host's real environment variables (a classic cause of "wrong DB / credentials"). |
| 12 | `ensureDatabaseSchema` swallowed migration failures with a warning; ran only when `/api/health` was hit | `db.ts` | Schema problems invisible. |

## B. Files changed (this PR)

- `server/middleware/auth.ts` (new) – JWT auth with fresh DB lookup, fail-closed permissions, Director always-full-access, branch scope, 5xx sanitiser.
- `server/middleware/roleGuard.ts` (new) – blocks privilege escalation via user management.
- `server/domain/businessRules.ts` (new) – single source of truth for revenue/expense/occupancy/date/branch/margin rules (integer-cent money).
- `server/services/financeService.ts` – rewritten on the shared rules; adds `branchPerformance` and `dateRange`.
- `server/controllers/authController.ts` – no backdoors, bootstrap-only signup, rate-limited login, legacy plain-text upgrade-once.
- `server/routes/*.ts` – authentication + per-module permissions on every router.
- `server/app.ts` (new), `server.ts` – importable app factory, startup DB/schema check, honest `/api/health`.
- `server/database/db.ts` – schema status tracking, role matrix seeding (`INSERT IGNORE`), less logging.
- `server/config/config.ts` – no env dumps, refuses default JWT secret in production, real env beats `.env`.
- `server/repositories/*` – read paths rethrow; booking status preserved; collision-safe payment IDs.
- `server/scripts/createAdmin.ts` (new) – `npm run admin:create` recovery path.
- `src/services/http.ts` (new) + all `src/services/*Service.ts` – authenticated requests, real error messages, 401 => login.
- `src/App.tsx`, `src/types.ts`, `EditBookingModal.tsx` – session-expiry handling; `Cancelled` booking status.
- `tests/*.test.ts` (new), `package.json` (`npm test`).

## C. Database changes

No destructive change and no schema migration were required in this PR. At startup the server (additively):
`INSERT IGNORE`s the 4 default role rows into `user_roles_permissions` (never overwrites an edited row) and runs the existing additive column checks.
**Applied only to the isolated local test database. Nothing was applied to your production database.**

> ⚠️ `clean_production.sql` / `server/database/clean_production.sql` begin with `DROP TABLE` statements. Never run them on production. The two copies have diverged (root copy lacks `subscriptions`, `import_batches`, `employees`…); consolidate into numbered migrations (Stage 2).

## D. Functional results

| Area | Label |
|---|---|
| API authentication on all routers; login hardening; signup closure; role-escalation guard; branch scope on bookings/expenses/customers/analytics | Implemented, **Tested and Passed** (real MariaDB) |
| Backend permission enforcement incl. "Receptionist without Dashboard gets 403 on the API" | Implemented, **Tested and Passed** |
| Shared business rules + analytics (revenue, expenses, net profit, margin, bookings, unique clients, date ranges, branch performance, shared-expense split, occupancy KPI) | Implemented, **Tested and Passed** at API level |
| Frontend token handling / 401 handling | Implemented but Not Fully Tested (compiles; no browser run) |
| Dashboard UI wiring to `branchPerformance`, Expense Overview from DB categories, Top Customers, revenue-section overflow fix, occupancy text sizing | **Not Implemented** |
| Dashboard/Reports CSV + PDF exports | **Not Implemented** |
| Daily Logger / Facility Records / CRM / Expenses repair, validation, edit/cancel flows | **Not Implemented** (only the `Cancelled` fix) |
| Expense category colours (migration + UI) | **Not Implemented** |
| Branch/Facility admin hardening, deletion protection | **Not Implemented** |
| Password reset (tokens + SMTP) | **Not Implemented** (no SMTP config exists in the repo) |
| Business/Profile settings persistence (profile is a singleton `profile_settings id=1`, not the signed-in user) | **Not Implemented** |
| Import Wizard (not transactional; payment errors swallowed; colliding IDs `PAY-IMP-<last4>-<n>`) | **Not Implemented** |
| Payroll "Coming Soon" lock (currently derives payroll from expenses matching `%Payroll%`) | **Not Implemented** |

## E. Test results

`npm test` (Node built-in runner via tsx) => **29 tests, 29 passed, 0 failed, 0 skipped** against MariaDB 10.11 (local, isolated `nexus_test`).
12 are pure unit tests of the business rules; 17 are HTTP integration tests through the real Express app and real SQL. `npm run build` succeeds; `tsc --noEmit` clean.
**Not run:** any test against your real MySQL/phpMyAdmin host (no credentials/network from this environment), browser/E2E tests, SMTP.

## F. Data reconciliation verified (test dataset)

Cancelled and Rejected records excluded; unique clients counted by identity; shared expense counted once combined and split (cents-exact) across active branches; per-branch revenue/expenses/net profit sum to combined; expense-category, facility-revenue, expense-item and time-series totals each equal the headline totals; margin = net/revenue (0 at zero revenue); "this month" never falls back to another month; zero capacity is safe.

## G. Remaining work (in dependency order)

1. **Stage 2** – consolidated numbered migrations; add `branch_id`/`facility_id`/`category_id` FKs and backfill (bookings & expenses currently match by **name**, so renaming a branch orphans history); `expense_categories.color`; per-user profile; settings persistence & `tax_rate` removal; password reset.
2. **Stage 3** – booking & expense create/edit with real validation (customer/branch/facility existence, capacity, conflicts) in one transaction; replace count-based IDs (`bookings.length + 1`, `EXP-…-<count>`) which collide under concurrency; fix `Math.max(activeCount,1)` occupancy.
3. **Stage 4** – Facility Records & CRM from shared rules (move duplicated frontend maths out of `FacilityOccupancyStatusCard`, `OverviewMetrics`, etc.).
4. **Stage 5** – Dashboard UI wiring + layout fixes + Top Customers + CSV/PDF export; Payroll lock.
5. **Stage 6** – Import Wizard rewrite (transactional, validated, CSV-injection-safe).
6. **Stage 7** – cross-module regression, audit-log actor (currently hard-coded `'System Admin'`), performance (analytics loads all rows into memory; move to SQL aggregation when volume requires).

Known limitation of this PR: analytics filters/aggregates in the Node process over all rows (correct, but not SQL-side); fine for current volumes.

## H. Deployment requirements

1. **Set `JWT_SECRET`** (long random). Production now refuses to start without it. Existing sessions are invalidated once.
2. **Make sure a Director can sign in** before deploying: backdoor passwords no longer work. If unsure, run `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create` on the server (creates or resets a Director).
3. Existing users with hand-typed plain-text passwords still log in once and are upgraded to bcrypt automatically.
4. Real environment variables now take precedence over `.env`.
5. Public sign-up is disabled once any user exists; create users in Administration → Users & Roles.
6. Only the Director role can edit the permission matrix; Director permissions cannot be removed.
7. `/api/health` returns 503 when the DB is unreachable and no longer reveals the DB host.
8. SMTP variables are not yet defined anywhere (needed for password reset, Stage 2).
9. **Rotate the GitHub token used for this work** and any credentials that were ever pasted into chats or committed.
