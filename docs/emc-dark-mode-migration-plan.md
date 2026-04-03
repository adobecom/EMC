# EMC dark mode (implemented)

The app follows **OS / browser color scheme** (`prefers-color-scheme`). There is no in-app theme toggle.

## Wiring

- [`usePreferredColorScheme`](../web-src/src/hooks/usePreferredColorScheme.ts) — `useSyncExternalStore` + `matchMedia('(prefers-color-scheme: dark)')`, syncs `data-color-scheme` on `<html>`.
- [`App.tsx`](../web-src/src/components/App.tsx) / [`AuthGate.tsx`](../web-src/src/components/AuthGate.tsx) — same `colorScheme` passed to `S2Provider` so gates and main UI match.

## Tokens and CSS

- [`index.css`](../web-src/src/index.css) — Light default `:root` palette; dark overrides in `@media (prefers-color-scheme: dark)`. Does **not** override `--s2-container-bg` (S2 `page.css` controls it). Surfaces use `var(--s2-container-bg)` / `--emc-surface-raised` / `--emc-home-gradient` / `--emc-shimmer-gradient` / `--emc-tag-chip-bg`.
- [`designSystem.ts`](../web-src/src/styles/designSystem.ts) — `GRADIENT_BACKGROUND`, `SHIMMER_BASE`, `COLORS.GRAY_500`, `COLORS.DARK_GRAY` (gray-900 var), `SURFACES.*` for inline styles.

## Quill

- Dark toolbar/editor overrides live in `index.css` under `@media (prefers-color-scheme: dark)` (`.ql-toolbar.ql-snow`, `.ql-container.ql-snow`, etc.).

## References

- React Spectrum S2: `data-color-scheme` on `<html>`; `S2Provider` `colorScheme`.
- Cursor rules: `.cursor/rules/react-spectrum/react-spectrum-s2.mdc`, `emc-design-system.mdc`.
