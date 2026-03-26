# EMC dark mode migration (future work)

This document captures a roadmap for **optional** full dark mode support. The app currently **forces light theme** at the document level (`data-color-scheme="light"` on `<html>`, `color-scheme: light` on `:root`, `S2Provider colorScheme="light"`) to avoid white-on-white text when the OS prefers dark mode.

## Why this is larger than the light-only fix

- `@react-spectrum/s2/page.css` and `S2Provider` can follow system or explicit schemes, but EMC still defines a **manual light** `--spectrum-global-color-*` palette in `web-src/src/index.css` and references it from `web-src/src/styles/designSystem.ts` and many components.
- Many surfaces use **hardcoded** `#fff` / `#FFFFFF` / `white` or fixed hex grays outside Spectrum semantics.
- Custom CSS (`AutocompleteTextField.css`, table rules in `index.css`) and **Quill** (`RichTextEditor`) need per-theme or token-driven styling.

## Phased approach

### Phase 1 — Foundation

- Decide **color scheme source**: OS only, or user toggle (and persistence) overriding OS.
- If toggling: add React state + `localStorage` (or profile) and sync `document.documentElement` `data-color-scheme` / `data-background` with `S2Provider` `colorScheme`.
- Replace or extend `:root` token strategy:
  - **Option A**: Rely on S2-provided semantic tokens where possible and reduce duplicate `--spectrum-global-*` in `index.css`.
  - **Option B**: Maintain explicit light and dark maps under `html[data-color-scheme="light"]` and `html[data-color-scheme="dark"]` (or media queries), keeping `designSystem` references valid.

### Phase 2 — Global shell

- `index.css`: `.content-area`, tables, nav, user panel — ensure backgrounds and text use theme tokens or paired light/dark rules.
- `designSystem.ts`: Replace fixed `COLORS.BLACK` / `WHITE`, `GRADIENT_BACKGROUND`, status colors where they sit on surfaces that change with theme; revisit `FORM_WIZARD_FOOTER_STYLES` (contrast for primary actions in both schemes).
- `TopNav`, `ToastContainer`, gates: audit inline colors.

### Phase 3 — High-traffic features

- Dashboards (`OverviewDashboard`, `EventsDashboard`, etc.), `DataTable`, registration flows.
- Event/Series forms: `FormWizard` buttons using `staticColor="white"` — re-validate contrast on dark surfaces.

### Phase 4 — Editors and custom widgets

- `RichTextEditor` / Quill: toolbar and content area theming (often the highest friction).
- `AutocompleteTextField.css`, `TagSelector`, image uploaders, any third-party CSS.

### Phase 5 — QA

- Visual pass on all routes in both schemes (including **ExC Shell** iframe).
- Spot-check with `prefers-color-scheme: dark` and with forced light to ensure toggle overrides OS when implemented.

## References

- React Spectrum S2: `data-color-scheme` / `data-background` on `<html>`; `S2Provider` `colorScheme`.
- Project rules: `.cursor/rules/react-spectrum/react-spectrum-s2.mdc`, `emc-design-system.mdc`.
