# EMC E2E Automation Framework — Design Spec

## Status

Design proposal. No `npm run e2e` script exists today (see [TESTING.md](./TESTING.md)). Selector/field-handler details for EMC V2 already exist in [AUTOMATION_MIGRATION_SPEC.md](./AUTOMATION_MIGRATION_SPEC.md) — this doc defines the framework those selectors plug into, not a replacement for them.

## Goals

- Cover the critical author path: create event → fill wizard → save → publish → verify on the live da-events page.
- Keep tests deterministic and fast — no reliance on manual test-data cleanup or shared mutable state.
- Reuse the existing selector manifest and `data-testid` conventions rather than re-deriving them.
- Support both scripted regression (CI-gating) and ad hoc agentic flow exploration (Playwright MCP) without conflating the two.

## Non-goals

- Replacing Jest unit tests (component/hook level stays in Jest + Testing Library, per TESTING.md).
- Visual regression testing (not in scope for v1; revisit once S2 component churn settles).

---

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Runner | `@playwright/test` | Native TS, auto-waiting handles S2's portal/overlay rendering, built-in trace viewer |
| Language | TypeScript, no semicolons (match repo convention) | Consistency with `web-src/` |
| Pattern | Page Object Model, one class per route/page from the manifest | Matches the page/section/field structure already defined in `AUTOMATION_MIGRATION_SPEC.md` |
| Data seeding | Direct ESP/ESL HTTP calls (`node-fetch`/`fetch`), not UI | Same approach as the existing E2E template in `TESTING.md` §"End-to-End Testing" |
| Assertions | Playwright's built-in `expect` with web-first assertions | Avoids manual `waitFor` polling |

---

## 2. Directory layout

```
EMC/
├── playwright.config.ts
└── e2e/
    ├── fixtures/
    │   ├── auth.fixture.ts        # storageState setup, dev-token injection
    │   └── api-seed.fixture.ts    # ESP/ESL calls to create/teardown test data
    ├── pages/
    │   ├── BasePage.ts             # HashRouter nav helpers, common wait strategies
    │   ├── EventsDashboardPage.ts
    │   ├── EventFormPage.ts        # composes step objects below
    │   ├── eventForm/
    │   │   ├── BasicInfoStep.ts
    │   │   ├── SpeakersHostsStep.ts
    │   │   ├── AdditionalContentStep.ts
    │   │   └── RsvpStep.ts
    │   ├── SeriesDashboardPage.ts
    │   ├── SeriesFormPage.ts
    │   └── SpeakersDashboardPage.ts
    ├── field-handlers/
    │   ├── s2Picker.ts
    │   ├── s2ComboBox.ts
    │   ├── s2DatePicker.ts
    │   ├── s2Switch.ts
    │   └── index.ts                # registry keyed by fieldType, mirrors §3 of migration spec
    ├── specs/
    │   ├── smoke/
    │   │   └── create-publish-event.spec.ts
    │   └── regression/
    │       ├── event-form-validation.spec.ts
    │       ├── series-management.spec.ts
    │       └── attendee-dashboard.spec.ts
    └── utils/
        └── testDataFactory.ts       # builds valid/invalid payloads for seeding
```

Page objects are generated directly from the `selector-manifest-*.yml` blocks in `AUTOMATION_MIGRATION_SPEC.md` §4 — each YAML `fields`/`helpers`/`dynamicSelectors` entry maps 1:1 to a method or locator getter. Treat that doc as the source of truth for selectors; this framework consumes it, it doesn't duplicate it.

---

## 3. Field handler abstraction

Rather than each page object hardcoding S2 interaction logic, field handlers are small functions keyed by `fieldType` (`text`, `s2picker`, `s2combobox`, `s2datepicker`, `s2switch`, `s2numberfield`, `richtext`, `venue`, ...) matching the taxonomy already defined in migration spec §3. A page object step just does:

```ts
await fillField(page, EVENT_FORM_SELECTORS.startDateTime, { fieldType: 's2datepicker', value: '2026-08-01T10:00' })
```

This keeps the "how do I click an S2 Picker" logic in one place — when React Spectrum changes DOM structure across a version bump, one handler file changes, not every spec.

---

## 4. Auth strategy

EMC uses Bearer/IMS token + `x-gw-ims-org-id` (see root CLAUDE.md and `services/tokenStorage`). Two modes:

- **Local/dev target**: inject a dev token directly into `localStorage`/`sessionStorage` via a Playwright fixture before navigation — no real IMS login needed, matches `npm run dev:local` token flow.
- **Shared dev/stage target** (e.g. `eventsplatform.dev.adobe.com`): real IMS SSO. Authenticate once interactively, persist via `storageState.json` (Playwright's built-in mechanism), reuse across the whole suite via a `globalSetup` project. Never re-run interactive login per-test — SSO/MFA redirects are not CI-safe.

```ts
// playwright.config.ts (excerpt)
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'chromium', use: { storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
]
```

CI runs against stage with a service-account-style IMS token (not a human's session) so the suite doesn't depend on anyone's personal login surviving.

---

## 5. Test data strategy

Do not create/delete events through the UI for every test — slow and couples every spec to the wizard being fully functional. Instead:

- **Seed via ESP/ESL API** directly (same pattern as the `TESTING.md` E2E template) in a `beforeAll`/fixture, capture the created `eventId`/`seriesId`.
- **UI drives only the flow under test** — e.g., a "publish an event" test seeds a valid draft via API, then uses the UI only for the publish action and its confirmation, not for filling all four wizard steps from scratch.
- **Teardown in `afterAll`** even on failure — mirror the `afterAll` cleanup pattern in `TESTING.md`.
- Full "author creates an event from scratch through all 4 steps" gets exactly one true end-to-end smoke spec — this is the one test allowed to be slow, since it's the contract test for the whole wizard lifecycle (`onGatherPayload` → save → `onLoadResponse` on reload → publish).

---

## 6. Tagging & suite structure

| Tag | Purpose | When run |
|---|---|---|
| `@smoke` | Critical path only: create → save → publish → verify page render | Every PR (gates merge) |
| `@regression` | Full field coverage, validation, RBAC edge cases | Nightly against stage |
| `@api` | Pure ESP/ESL contract checks, no browser | Every PR — per migration spec §7, unchanged between old/new UI |

```bash
npx playwright test --grep @smoke
```

---

## 7. Cross-repo verification

Per the workspace CLAUDE.md's image-rendering path: EMC-only specs verify authoring and the ESP payload shape, but they cannot see the rendered da-events page. Add one cross-repo smoke spec that:

1. Publishes an event via EMC UI (or API-seeded + UI-published).
2. Fetches the live da-events URL for that event.
3. Asserts the hero image `<picture>` tag is present and points at the uploaded image URL.

This is the automated version of the "Critical debug rule for images" in the root CLAUDE.md — it catches the EMC→ESP→event-libs handoff breaking, not just EMC in isolation. Lives in `e2e/specs/regression/cross-repo-image-render.spec.ts`, runs nightly (hits a real published page, not safe to run on every PR).

---

## 8. Playwright MCP for exploratory flow checks

Separate from the CI-gating suite above. Use `@playwright/mcp` for:

- Agent-driven exploration of a new wizard step before selectors/tests are written.
- Ad hoc verification against `eventsplatform.dev.adobe.com` (auth via a persistent authenticated browser profile — see prior discussion; SSO isn't scriptable per-session).
- Debugging a flaky spec by re-driving the same flow interactively and inspecting accessibility snapshots.

MCP-driven runs are **not** a substitute for the checked-in `.spec.ts` suite — they're not deterministic/versioned. Any flow validated via MCP that should be a regression gate gets converted into a real spec using the page objects above.

---

## 9. CI integration

Extend `.github/workflows/pr_test.yml` (currently lint + type-check only, per TESTING.md) with a new job:

```yaml
  e2e-smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --grep @smoke
        env:
          E2E_BASE_URL: ${{ secrets.EMC_STAGE_URL }}
          E2E_TOKEN: ${{ secrets.EMC_E2E_TOKEN }}
          E2E_ORG: ${{ secrets.EMC_E2E_ORG }}
```

Nightly workflow runs `--grep @regression` against stage with full trace/video capture on failure (`trace: 'retain-on-failure'`).

---

## 10. Open decisions

- **Which stage environment seeds/owns test data** — needs a dedicated test IMS org/series so regression runs don't pollute real dashboards seen by authors. Confirm with platform team before wiring CI.
- **Visual regression** — deferred; revisit once S2 migration is fully rolled out and DOM churn settles.
- **Attendee/RBAC multi-role testing** — will need multiple seeded IMS identities (admin/author/viewer) once `RBAC_PERMISSION_GATING_IMPLEMENTATION.md` flows are covered; not in v1 smoke scope.
