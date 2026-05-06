# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EMC (Event Management Console) is an **Adobe Experience Cloud (ExC) Shell** SPA built on **Adobe App Builder**. It manages events, series, speakers, sponsors, venues, and attendees. **There is no backend in this repo** — the frontend calls external Adobe APIs (ESP and ESL) directly.

## Commands

```bash
npm run dev          # Dev server on port 3000 (UI local, actions deployed)
npm run dev:local    # Fully local dev (UI + actions local)
npm run lint         # ESLint (backend src/ only — web-src is excluded)
npm run lint:fix     # Auto-fix lint
npm run type-check   # TypeScript check (--noEmit)
npm run check        # lint + type-check together
```

**No `npm test`** — Jest 29 is configured but no test files exist yet. Use `aio app test` for Adobe CLI tests. To run a single test once files exist: `npx jest --testPathPattern="ComponentName"`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (hooks + functional components only — no class components) |
| Language | TypeScript (strict, ES2020, bundler module resolution) |
| UI Library | **React Spectrum 2** (`@react-spectrum/s2`) only |
| Icons | `@react-spectrum/s2/icons/...` |
| Routing | React Router 6 with HashRouter |
| State | React Context + `useReducer` (no Redux/Zustand) |
| Build | Adobe I/O CLI (`aio`) with Parcel |

**Critical**: Use React Spectrum **S2** (`@react-spectrum/s2`, style macro, S2 icons) only. See `.claude/agents/spectrum-ui.md` and `.cursor/rules/react-spectrum/react-spectrum-s2.mdc`.

## Architecture

### Directory Layout

```
web-src/src/
├── components/App.tsx        # Root: Provider, Router, Grid layout
├── components/shared/        # Reusable UI (DataTable, FormWizard, StatusBadge, etc.)
├── components/layout/        # TopNav only
├── pages/                    # Route-level features (EventForm, EventsDashboard, etc.)
├── contexts/                 # ApiContext, EventFormContext, SeriesFormContext, ToastContext
├── hooks/                    # useLoadData, useEventFormComponent, useEventFormSave, etc.
├── services/                 # api.ts, cachedApi, payloadBuilders, tokenStorage, etc.
├── config/                   # constants.ts, env.ts, eventTypeConfig
├── types/                    # domain.ts, runtime.ts, attendee.ts
├── utils/                    # dataFilters, eventFormMappers, formPersistence, etc.
└── styles/designSystem.ts    # Design tokens and layout patterns
```

### API Layer

- **ApiService** (`services/api.ts`) — centralized HTTP client
- **cachedApi** — wrapper with 10s GET caching, request dedup, pattern-based invalidation
- Two backends: Adobe ESP (events/series/speakers) and ESL (lifecycle/venues/attendees)
- Auth: Bearer token (IMS in prod, dev token in local) + `x-gw-ims-org-id`
- All fetch calls go through `safeFetch()` with ALLOWED_HOSTS validation
- Input validation via `validateString()` / `validateObject()` before mutations
- Dry-run mode: `apiService.enableDryRun()`

### Form System (EventForm / SeriesForm)

- **FormWizard** — multi-step with progress, step locking, back/next
- **useEventFormComponent** hook — each step registers with lifecycle callbacks:
  - `onGatherPayload()` — contribute partial data during save
  - `onAfterSave(eventId, response)` — post-save side effects
  - `onLoadResponse(response)` — populate from API response
  - `validate()` — pre-save validation
- Form state persisted in sessionStorage (debounced auto-save)

### Environment Detection

Set by build-time `ENVIRONMENT` variable (not hostname-based). Values: `dev` (default), `stage`, `prod`. CI/CD sets this at build time via `deploy_stage.yml` and `deploy_prod.yml`.

## Key Conventions

- **No semicolons** in TypeScript files
- **Barrel exports** (`index.ts`) in every module directory
- React Spectrum layout via `Flex`/`Grid`; use `onPress` not `onClick`
- `UNSAFE_style` / `UNSAFE_className` for non-Spectrum styling (use sparingly)
- Design tokens from `styles/designSystem.ts` — prefer over magic numbers **except** in the S2 **`style()` macro**, which requires literals only (otherwise Parcel: *Could not statically evaluate macro argument* — see `.cursor/rules/react-spectrum/react-spectrum-style-macro-s2.mdc`)
- Naming: PascalCase components, `use` prefix for hooks, UPPER_SNAKE_CASE for constants

## Routes

| Path | Component |
|---|---|
| `/overview` | OverviewDashboard |
| `/clouds` | CloudManagementConsole |
| `/series`, `/series/new`, `/series/edit/:id` | SeriesDashboard / SeriesForm |
| `/events`, `/events/new/:eventType`, `/events/edit/:id` | EventsDashboard / EventForm |
| `/attendees`, `/attendees/:eventId` | AttendeeDashboard |
| `/speakers` | SpeakersDashboard |

## Docs Warning

`docs/` contains useful architecture docs but several are **outdated**. Key discrepancies:

| Docs claim | Actual |
|---|---|
| Port 9080 | Port **3000** |
| SideBar.tsx | **TopNav.tsx** |
| RegistrationDashboard | **AttendeeDashboard** |
| OrgTeamManagement | **CloudManagementConsole** |
| `npm test` configured | **Not configured** |
| Route `/events/new` | `/events/new/:eventType` |

Always validate against actual source code.


<!-- pim-pod-agent-begin -->

## PIM — Pod Agent Protocol

This project is connected to PIM pod `pod-emc-s27-configsservice-d2506b`.
PIM server: `https://d1ygncl0yqo6sv.cloudfront.net`

### Getting Current Pod Context

When you need to understand the current state of the pod before making decisions
or starting work in an unfamiliar area, pull context with:

```bash
pim context --pod pod-emc-s27-configsservice-d2506b --scope frontend
```

Use `--brief` for a quick summary or `--diff` to see only what changed since
your last pull. If conflict pressure is >= 0.6, check open conflicts before
proceeding in contested areas.

### Automatic Reporting

Context updates are automatically reported to PIM when you:
- **Make a git commit** — via post-commit hook (captures subject, body, changed files)
- **Create a pull request** — via Claude Code hook (captures PR URL and title)

You do not need to manually report routine progress — it flows automatically.

### Manual Reporting

Report these manually using `pim report` or the MCP `submit_context_update` tool:
- **Blockers**: When you are blocked by another area or dependency
- **Decisions**: When you make a significant architectural or design decision
- **Spec changes**: When you discover the spec needs to change
- **Questions**: When you need input from another role

Example:
```bash
pim report --pod pod-emc-s27-configsservice-d2506b --type decision --scope frontend \
  --summary "Chose Redis over Memcached for session cache" \
  --details "Redis supports pub/sub which we need for real-time invalidation..."
```

### Quality Guidelines

- Summaries should be specific and actionable (avoid "made progress" or "working on it")
- Include file paths, function names, or API endpoints when relevant
- Declare blockers and input requests — this triggers PIM's escalation system
- Artifacts (changed files) are automatically included with commit reports

### Conflict Awareness

- Check pod pressure with `pim context --pod pod-emc-s27-configsservice-d2506b --brief`
- If pressure is >= 0.8, ingestion is halted — resolve conflicts first
- When your work overlaps with another area, PIM will detect it automatically

### PIM MCP Tools

If the PIM MCP server is configured in Claude Code, you can use these tools
directly instead of CLI commands. They cover the same operations plus additional
querying and management capabilities.

**Context & Session**

| Tool | When to use |
|------|-------------|
| `get_agent_session_context` | Pull pod state, living doc, conflicts, and token-budgeted org learnings in one call — the MCP equivalent of `pim context` |
| `context_search` | Search external sources (Slack archives, Jira, Confluence, GitHub, git) via PIM's aggregated search — no separate Slack/Jira MCPs needed |
| `query_knowledge` | Search the org knowledge graph for historical precedents and resolved decisions |

**Reporting**

| Tool | When to use |
|------|-------------|
| `submit_context_update` | Report progress, blockers, decisions, spec changes, or questions |

**Conflicts**

| Tool | When to use |
|------|-------------|
| `get_conflict_details` | Inspect a specific open conflict and its suggested resolutions |
| `resolve_conflict` | Mark a conflict as resolved with a chosen approach |

**Observability**

| Tool | When to use |
|------|-------------|
| `render_pod_dashboard` | Get a full interactive React artifact showing pod health, conflicts, feed, and live doc |
| `list_pods` | See all active pods in the org |

<!-- pim-pod-agent-end -->
