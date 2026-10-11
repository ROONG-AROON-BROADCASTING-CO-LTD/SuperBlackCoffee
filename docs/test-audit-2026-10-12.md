# Test Audit Result — 2026-10-12

Scope: apps/admin, apps/attendance, apps/franchise, apps/api, apps/stock, apps/website and the shared management/UI code they consume. Read CODEX_TEST_AUDIT.md in full before implementation. Used the existing Vitest/React Testing Library, Playwright, Go testing/httptest and PostgreSQL fixtures. No new test framework or dependency was introduced.

This is a risk-based audit, not a claim that every production branch is tested. Existing suites were compared with session handling, tenant scope, attendance timing, schedules, financial/stock mutations, promotions and website enquiry flows. Remaining gaps are explicitly listed below.

## apps/admin

- Existing tests: 29 app suites / 194 tests covering session restore/logout, login roles, routes/sidebar, dashboard queries, branches, catalog templates, orders, operations, audit and API clients. Shared management includes employee schedules, attendance, leave approvals, inventory and promotions.
- Missing tests found: promotion edit failure preservation, reversed campaign dates, cancelled deletion, deletion failure, and explicit selection of the promotion session cookie.
- Tests added: four shared promotion editor/deletion tests and three API session-header cases (admin/franchise_owner/stock). API promotion validation and tenant tests additionally protect admin workflows.
- Tests improved: shared promotion mocks are cleared between cases; failures await the actual server error before asserting that the form remains usable.
- Remaining risks: not every operation/catalog UI branch has a browser integration test; current ESLint config does not configure TS/TSX rules.

## apps/attendance

- Existing tests: 13 app suites / 97 tests covering PIN login/setup, session transitions, API failures, location permission and coordinate boundaries, Bangkok date/year/leap-day boundaries, live clock cleanup, leave forms and history. API suites cover grace-period before/exact/after boundaries, duplicate check-in/out, overnight checkout, shift restrictions, geofence, leave ownership and cancellation.
- Missing tests found: geofence verification failing because the database is unavailable.
- Tests added: API dependency-failure test asserts that location verification returns 500 and cannot authorize a check-in.
- Tests improved: None in attendance frontend.
- Remaining risks: physical GPS/device permissions and real mobile operating-system behaviour are not exercised; rare SQL failure branches are not exhaustively fault-injected.

## apps/franchise

- Existing tests: 12 app suites / 78 tests covering owner-only session restoration, login, navigation, settings/password validation, maintenance and ingredient requests. API integration covers account ownership, cross-franchise inventory/schedules/leave/maintenance isolation, and atomic profile/password changes.
- Missing tests found: promotion requests did not explicitly select the franchise session; shared campaigns could be mutated through a branch role.
- Tests added: shared-page assertion for franchise_owner headers; API tests for shared/foreign campaign isolation and preserved own-branch edit/delete behaviour.
- Tests improved: shared management failure assertions/mocks as above.
- Remaining risks: API permits franchise_owner promotion mutations although the current franchise UI is read-only; this pre-existing product contract was preserved. Full browser workflows across two real franchise accounts are not covered end to end.

## apps/api

- Existing tests: unit/service/repository/middleware/handler tests plus DB-backed router and schedule integration suites. Existing coverage includes JWT algorithms/expiry, role cookies, route guards, branch/tenant ownership, transaction rollback, stock count/sales/FEFO/concurrent oversell, purchase/order transitions, attendance timing and schedules.
- Missing tests found: promotion date and normalization boundaries, shared campaign mutation isolation, normalized blank website leads, admin-only lead inbox mutations, dependency failure for promotions/inbox/geofence.
- Tests added: promotion_input_audit_test.go (8 validation scenarios plus normalization/defaults), promotion_scope_audit_integration_test.go, website_lead_audit_integration_test.go and dependency_failure_audit_test.go.
- Tests improved: the monthly-day-off integration assertion now checks only monthly leave on weekends. Compensation may occur on weekends under the user's latest rule; the old assertion incorrectly included compensation. No monthly prohibition was removed.
- Remaining risks: Go coverage is not complete; Redis/R2 live integrations, some DB error branches, PDF internals and administrative migration CLI failure paths remain uncovered. Concurrent changes to shared promotion assignments during permission checking are not explicitly tested.

## apps/stock

- Existing tests: 14 app suites / 133 tests covering PIN/session separation, count/order validation and retries, financial workbook parsing, menu consumption, stock status filtering and responsive drawer behaviour. API includes concurrent stock sales, no overselling, branch isolation and atomic rollback.
- Missing tests found: promotion drawer save button on mobile was covered by navigation; E2E still referenced the obsolete mock expiry-promotion UI; promotion API requests could select another platform cookie.
- Tests added: one shared-page stock-role test and the stock-role API test above. Updated Playwright flow saves editable campaign data, asserts request payload and stock header, reloads and verifies the returned persisted campaign on desktop and mobile.
- Tests improved: replaced the obsolete mock-only scenario with a current workflow, maintaining meaningful success and browser-error assertions. API boundaries are mocked; actual persistence is covered separately by PostgreSQL tests.
- Remaining risks: all browser flows are not yet DB-backed end to end; physical touch/keyboard behaviour on devices is outside the Chromium emulation coverage.

## apps/website

- Existing tests: None in website source at audit start. Build/typecheck existed.
- Missing tests found: language persistence and blocked storage; contact/franchise submission success/failure; invalid contact topic contract; normalized whitespace-only lead data.
- Tests added: 13 tests in WebsiteLanguageProvider.test.tsx and ContactContent.test.tsx. They cover cookie priority, storage migration, invalid stored languages, blocked storage, successful contact submission, HTTP 400/429/500 preservation, pending duplicate-click protection, franchise plan/location submission and network-failure preservation.
- Tests improved: None (new suites).
- Remaining risks: server routing/metadata/sitemap, remaining menu/branch interactive filters, analytics delivery and visual QA of all website routes are not covered by these tests. Coverage includes website src, not generated Next files or app route modules.

## Bugs Found

| Location                                            | Problem / actual behaviour                                                                  | Expected behaviour and fix                                                                             | Regression evidence                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| API promotion_handler.go                            | A scoped manager could update/delete a campaign assigned to their branch and another branch | Scoped mutations require exclusive assignment to that branch; admin retains shared-campaign management | New test first failed with PATCH 200, then passed; also checks foreign denial and own-branch success |
| Shared promotions.ts / PromotionsManagementPage.tsx | Fetch did not pin a session, allowing admin-cookie precedence on a stock/franchise screen   | Every promotion/catalogue request sends the mode's X-SBC-Session-Role                                  | Three API role cases, page-role assertions and browser stock-header assertion                        |
| WebsiteLanguageProvider.tsx                         | Storage exceptions crashed rendering or language switching                                  | Cookie and in-memory language remain usable when browser storage is unavailable                        | Blocked-storage test failed before catch guards and passed after                                     |
| BrandPagesRedesign.tsx                              | Contact topic Other used `other`, rejected by API's general topic                           | Send `general` for Other                                                                               | Actual option value and POST payload asserted                                                        |
| API website_handler.go                              | Whitespace-only name/phone passed pre-trim validation and persisted empty data              | Trim and validate required minimum lengths before DB/rate-limit mutation                               | DB-backed test first returned 201; fixed result is 400 with zero persisted rows                      |
| StockNavigation.tsx                                 | Mobile bar above modal intercepted promotion Save                                           | Bar is below normal modal, above cart only when cart is open                                           | Playwright mobile click failed before change and passes after; no forced click                       |

## Production Code Changed

- apps/api/internal/handler/promotion_handler.go — tighten shared-campaign mutation ownership; fixes cross-branch effects while preserving own-branch/admin operations.
- apps/api/internal/handler/website_handler.go — reject normalized blank/short required lead fields; valid lead contract remains the same.
- packages/management/src/api/promotions.ts — optional typed session role on API methods, sent as scoped cookie-selection header.
- packages/management/src/pages/PromotionsManagementPage.tsx — pass the screen's role to read/mutation/catalogue requests; intended app isolation enforced.
- apps/stock/src/components/StockNavigation.tsx — navigation layer depends on cartOpen, allowing promotion modal actions while retaining cart navigation behaviour.
- apps/website/src/components/WebsiteLanguageProvider.tsx — tolerate storage errors without breaking rendering/switching.
- apps/website/src/components/BrandPagesRedesign.tsx — correct Other topic to the existing general API contract.
- vitest.config.ts — include shared management and website src in coverage; earlier percentage omitted both areas.

## Verification

Commands were executed, not inferred from configuration:

| Gate                       | Result / command                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin unit/component       | PASS: `pnpm run test:admin` — 194 tests                                                                                                                                       |
| Attendance unit/component  | PASS: `pnpm run test:attendance` — 97 tests                                                                                                                                   |
| Franchise unit/component   | PASS: `pnpm run test:franchise` — 78 tests                                                                                                                                    |
| Stock unit/component       | PASS: `pnpm run test:stock` — 133 tests                                                                                                                                       |
| Shared management baseline | PASS: `pnpm run test:management` — 68 tests before new promotion cases; final shared cases included in complete run                                                           |
| Website                    | PASS: `pnpm exec vitest run apps/website/src` — 13 tests                                                                                                                      |
| Monorepo + coverage        | PASS: `pnpm run test:coverage` — 85 files / 615 tests (baseline 83 / 594); includes all frontend suites                                                                       |
| Browser                    | PASS: `pnpm run test:e2e` — 10 tests, desktop and mobile Chromium                                                                                                             |
| Go baseline                | PASS: `go test ./... -coverprofile=/tmp/sbc-audit-go.cover` (DB integration cases skip without URL)                                                                           |
| Go integration/coverage    | PASS: `TEST_DATABASE_URL=… GOCACHE=/tmp/sbc-audit-go-cache go test -count=1 -p 1 -coverpkg=./internal/... -coverprofile=/tmp/sbc-audit-full.cover ./...`                      |
| Go race                    | PASS: `TEST_DATABASE_URL=… GOCACHE=/tmp/sbc-audit-go-cache go test -count=1 -p 1 -race ./...`                                                                                 |
| Go vet/build               | PASS: `GOCACHE=/tmp/sbc-audit-go-cache go vet ./...` and `go build -o /tmp/sbc-audit-api ./cmd/api`                                                                           |
| Lint                       | PASS: `pnpm run lint`; important limitation: admin/franchise/website ESLint configs have only ignores, no TS rules. Attendance/stock lint scripts run TypeScript checks       |
| Typecheck                  | PASS: frontend build scripts run tsc; also explicit `pnpm --filter @stackbuild/website typecheck`                                                                             |
| Builds                     | PASS: build:admin, build:attendance, build:franchise, build:stock and build:website                                                                                           |
| Formatting/diff            | PASS: targeted prettier check, gofmt and `git diff --check`                                                                                                                   |
| Second pass                | Completed; found session selection and mobile interception; added mutation failures/date bounds, dependency-failure tests and franchise-form tests; reran affected/full gates |

Test DB was a new disposable database `codex_audit_20261012` inside the existing test Postgres container on port 5434. Production/local application DB on port 5433 was not used. Tests never called real website enquiry endpoints. Playwright API fixtures are isolated per test.

### Generated coverage results

Frontend totals: statements 69.59%, branches 65.78%, functions 59.63%, lines 70.81%. The denominator now includes shared management and website src; it is not directly comparable to the smaller baseline denominator.

| App source  | Statements | Branches | Functions |  Lines |
| ----------- | ---------: | -------: | --------: | -----: |
| Admin       |     67.02% |   61.99% |    58.97% | 68.38% |
| Attendance  |     73.67% |   79.10% |    64.67% | 74.39% |
| Franchise   |     82.63% |   79.09% |    71.84% | 82.33% |
| Stock       |     82.41% |   78.41% |    78.29% | 83.43% |
| Website src |     27.49% |   16.56% |    19.87% | 27.79% |

Go combined internal-package statement coverage: 50.2% from `/tmp/sbc-audit-full.cover`, generated with `-coverpkg=./internal/...` so router integration execution counts towards handler coverage. Go's native report does not report branch coverage. Critical helpers: JWT middleware, attendance input/time helpers, promotion input/normalization are 100%; `validatePromotionScope` and wider handler failure paths are not 100%. Coverage artifacts remain ignored by Git.

## Files Added

- apps/api/internal/handler/dependency_failure_audit_test.go
- apps/api/internal/handler/promotion_input_audit_test.go
- apps/api/internal/router/promotion_scope_audit_integration_test.go
- apps/api/internal/router/website_lead_audit_integration_test.go
- apps/website/src/components/ContactContent.test.tsx
- apps/website/src/components/WebsiteLanguageProvider.test.tsx
- docs/test-audit-2026-10-12.md — this report

## Files Modified in This Audit

- apps/api/internal/handler/promotion_handler.go — exclusive branch ownership
- apps/api/internal/handler/website_handler.go — normalized validation
- apps/api/internal/handler/staff_schedule_integration_test.go — weekend assertion corrected (existing changes preserved)
- apps/stock/src/components/StockNavigation.tsx — modal navigation layering
- apps/website/src/components/BrandPagesRedesign.tsx — topic contract
- apps/website/src/components/WebsiteLanguageProvider.tsx — unavailable-storage fallback
- packages/management/src/api/promotions.ts — scoped session header
- packages/management/src/api/**tests**/promotions.test.ts — role cases
- packages/management/src/pages/PromotionsManagementPage.tsx — mode-specific requests
- packages/management/src/pages/**tests**/PromotionsManagementPage.test.tsx — failure/date/role cases and mock isolation
- e2e/stock-promotions.spec.ts — current persisted-promotion workflow
- vitest.config.ts — broader coverage include

## Existing User Changes Preserved

These files were dirty before this audit and were not reverted:

- apps/api/internal/handler/staff_schedule_export.go
- apps/api/internal/handler/staff_schedule_handler.go
- apps/api/internal/handler/staff_schedule_integration_test.go
- packages/management/src/pages/EmployeesManagementPage.tsx
- packages/management/src/pages/**tests**/EmployeesManagementPage.test.tsx

Only the obsolete weekend assertion was additionally changed in the existing schedule integration test. Generated Next next-env changes from builds were removed from the final audit diff. No commit/push was performed.

## Remaining Untested Areas

| Area                                             | Reason / risk                                                                                                   | Follow-up test and infrastructure                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Redis cache invalidation/pubsub/stream live path | Nil/fallback tests exist; live Redis was not used because current running Redis belongs to application services | Isolated Redis test container and integration tests; risk of stale cache or dropped events |
| R2 real uploads                                  | External storage/credentials intentionally not used; validation and mocked image boundaries covered             | Local S3-compatible fixture or injected SDK boundary for transport/failure cases           |
| Some SQL dependency-failure branches             | Not every query/transaction stage is fault-injected; important rollback/isolation cases already tested          | Additional targeted DB trigger/fault fixtures; avoid blanket success claims                |
| Concurrent promotion reassignment                | Single-request ownership boundaries tested; check-then-mutate race not exercised                                | Transaction-level concurrency regression test and locking review                           |
| Website filters/server route metadata/analytics  | Initial website suite focuses on mutation and language failures; other behaviour still has limited coverage     | RTL filter tests and isolated website Playwright routing/analytics tests                   |
| Physical mobile devices                          | Browser emulation cannot validate GPS permission prompts/keyboard OS behaviour                                  | Device smoke tests with consent/location fixtures                                          |
| Vendor PDF parser internals and migration CLI    | Not primary business code; output-level PDF tests exist                                                         | Isolated malformed-document/CLI integration fixtures if those workflows expand             |

## Remaining Existing Issues

- ESLint scripts succeed but their existing flat configs do not enable TS/TSX linting. Did not introduce new tooling during the test audit.
- Attendance build warns about a chunk larger than 500 kB; present in the baseline build. No performance redesign was performed.
- Existing duplicate generated Next type files (`* 2.ts`) caused a later website typecheck failure. Moved four exact generated duplicates to `/tmp/sbc-next-generated-backup.x0ZBVk` for recovery; typecheck/build then passed. No source file was deleted.
- Go default cache encountered permission/import-cache errors. Repeated checks with an isolated writable GOCACHE; final checks passed.
- Browser sandbox blocked Chromium startup. Reran through approved execution outside the sandbox; final browser tests passed.
- A combined coverage/browser run exceeded two existing 5-second component-test deadlines under concurrent load. No expectations were weakened or tests deleted; complete coverage was rerun separately to verify the outcome.

## Final Assessment

- apps/admin: PASS WITH RISKS — core sessions/management covered, new promotion failures protected, TS lint coverage incomplete.
- apps/attendance: PASS WITH RISKS — timing/location/session/leave core covered, real device behaviour and some SQL failures remain.
- apps/franchise: PASS WITH RISKS — ownership/isolation covered; current read-only UI versus broader API capability preserved.
- apps/api: PASS WITH RISKS — unit/integration/race/vet/build pass; live integrations and several uncovered branches remain.
- apps/stock: PASS WITH RISKS — count/sale/rollback/ownership covered, promotion modal saves verified on mobile and desktop.
- apps/website: PASS WITH RISKS — enquiry/language bugs fixed with tests; website-wide coverage is still limited.

Overall Test Health: ACCEPTABLE WITH RISKS. Do not interpret passing gates as complete regression coverage or as every Definition of Done coverage criterion having no remaining risk.
