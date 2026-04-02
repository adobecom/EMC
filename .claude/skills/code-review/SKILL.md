---
name: code-review
description: Review EMC frontend changes in React and TypeScript with Adobe React Spectrum S2 components. Use for PR review, diff review, or file review in web-src, focusing on bugs, regressions, API misuse, state flow, typing, and EMC-specific UI patterns.
---

# EMC Frontend Code Review

Review code with a bug-first mindset. Do not default to style commentary. Prioritize correctness, regressions, missing validation, broken data flow, stale optimistic-lock fields, and misuse of EMC frontend patterns.

## Scope

This skill applies to:
- `web-src/src/**`
- React components in TypeScript
- Adobe React Spectrum S2 usage
- Event form flows using shared context, cached API helpers, and modular step components

Default review scope:
- review only the PR diff or explicitly provided changed files
- compare against the target branch, typically `dev`
- do not expand into a whole-codebase audit unless the user explicitly asks for it

If the review target is unclear, prefer:
1. current branch diff against `dev`
2. explicit diff provided by the user
3. specific files named by the user

## Review Priorities

Order findings by severity:
1. Broken behavior or likely runtime errors
2. Data integrity and API contract issues
3. State synchronization and stale data problems
4. Accessibility and Spectrum component misuse
5. Type safety gaps that can hide bugs
6. Performance problems caused by unnecessary fetches, remounts, or N+1 calls

## PR Review Workflow

Use this default process for review:
1. Identify changed files from the PR diff against the base branch.
2. Review only those changed hunks, plus minimal surrounding context needed to judge correctness.
3. Follow dependencies only when the diff clearly interacts with shared types, context, API helpers, or reusable components.
4. Do not report unrelated pre-existing issues outside the diff unless the change makes them materially worse.

Allowed context expansion:
- shared type definitions used by the diff
- API methods called by the diff
- context or hook code directly affected by the diff
- reused child or parent components necessary to confirm the behavior

Avoid:
- broad repo sweeps
- unrelated legacy issues
- “while here” cleanup suggestions not tied to regression risk

## EMC-Specific Review Checklist

### React and state flow

Check for:
- derived state drifting from source of truth
- effects that refetch unnecessarily because of unstable dependencies
- stale optimistic-lock fields such as `creationTime` / `modificationTime`
- duplicated fetches where context or cached state should be reused
- writes that update child resources but leave parent event context stale
- local state updates that do not match the saved API shape

### TypeScript

Prefer strong types over `any`.

Check for:
- missing domain fields in shared types under `types/`
- UI code depending on undeclared optional fields
- lossy casts such as `as any` hiding schema mismatches
- payload builders or API wrappers accepting `Record<string, unknown>` when a concrete type is feasible
- nullable fields handled inconsistently between form state, API responses, and render logic

Call out when a type should move into a shared type file instead of being duplicated locally.

### EMC frontend architecture

Expect code to align with:
- centralized API access through `services/api.ts`
- reusable step logic through hooks and shared components
- design tokens from `styles/designSystem.ts`

Flag:
- direct fetch logic added in components when an API service method should exist
- duplicated data loading logic across steps instead of shared context
- one-off colors, spacing, or z-index values when design tokens already exist
- new cross-step data stored only locally when it should live in context

## ESLint Rules (project-specific)

Review with these repo realities in mind:
- React hook dependency suppressions exist in the codebase, but they should be rare and justified. Flag `eslint-disable react-hooks/exhaustive-deps` when the effect can be rewritten safely instead.
- `@typescript-eslint/no-explicit-any` is occasionally bypassed. Treat new `any` usage as a review issue unless there is a clear boundary reason.
- Avoid unnecessary `eslint-disable` comments. If lint is being silenced, check whether the code can be made structurally correct instead.
- EMC frontend linting is centered on application correctness, so prioritize real correctness issues over cosmetic lint commentary.
- For review comments, call out rule suppressions only when they hide risk: stale closures, skipped dependencies, unsafe casting, or dead code paths.

## Code Organization

Expect new code to follow existing EMC structure:
- page-level flows in `pages/`
- reusable UI in `components/shared/`
- API calls in `services/api.ts`
- cross-step shared state in `contexts/`
- reusable logic in `hooks/`
- shared domain shapes in `types/`
- styling tokens in `styles/designSystem.ts`

Flag:
- component files that take on API, transformation, and view logic all at once
- repeated mapping or normalization logic that belongs in a shared helper
- new domain types declared inside components when they should live in `types/`
- cross-step data fetched separately in multiple components instead of being lifted into context
- ad hoc styling constants introduced where design-system tokens already exist

For event form work specifically:
- parent containers should fetch and pass shared data to child forms when possible
- session, venue, speaker, sponsor, and registration flows should reuse existing API and context patterns instead of parallel one-off implementations

## Node.js / CommonJS Conventions

This repo is mixed:
- frontend app code in `web-src/src/**` is React + TypeScript and should follow ES module import/export style
- CommonJS appears mainly in config, test, and runtime shim files such as `jest.config.js`, webpack examples, and some bootstrap code

When reviewing:
- flag new CommonJS usage in frontend TypeScript unless it is clearly required by a config or runtime boundary
- accept `require(...)` / `module.exports` in config-only or compatibility files when that matches surrounding code

## Naming Conventions

Review names for consistency with EMC patterns:
- React components: `PascalCase`
- hooks: `useX`
- context providers/contexts: `XContext`, `XProvider`
- utility and service helpers: `camelCase`
- shared types/interfaces: descriptive domain names in `PascalCase`
- booleans should read as predicates, e.g. `isLoading`, `hasSessionFieldChanges`, `shouldUpdateSpeakers`

Flag:
- vague names like `data`, `item`, `temp`, `obj` when the domain concept matters
- inconsistent naming between API payload fields, form state, and mapped UI models
- abbreviations that make business meaning unclear
- names that imply a broader refresh than the function actually performs, or vice versa
- component props that hide ownership, such as generic callbacks where the intent should be explicit

## Using React Spectrum S2 Components

Review S2 usage as a first-class concern, not just styling:
- prefer S2 components over custom HTML controls for buttons, dialogs, fields, selectors, and layout where the equivalent exists
- use built-in S2 props for labels, disabled state, selection state, validation, loading, and accessibility before reaching for custom wrappers
- keep interaction patterns Spectrum-native; avoid making non-interactive elements behave like controls unless accessibility is handled explicitly
- use `UNSAFE_style` sparingly and mainly for layout or token-backed presentation, not to replace component behavior
- prefer design tokens and Spectrum variables over hard-coded colors or spacing

Check for:
- `TextField`, `ComboBox`, `DatePicker`, `TimeField`, `Checkbox`, `Button`, `Dialog`, `DialogContainer`, and other S2 controls being used with the appropriate validation and accessibility props
- read-only or fake-trigger controls that are clickable but not clearly accessible
- error rendering done outside the component when S2 already supports `isInvalid` and `errorMessage`
- custom dropdown, modal, or picker behavior that duplicates Spectrum functionality unnecessarily
- inconsistent control composition across similar forms

Flag:
- replacing accessible S2 controls with raw `div`, `span`, or `button` structures without a strong reason
- styling an S2 control into a different behavior instead of choosing the correct component
- hard-coded visual states that bypass Spectrum semantics
