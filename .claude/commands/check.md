Run the full quality check: lint then TypeScript type-check.

```bash
npm run check
```

If there are errors, fix them. Lint errors in `web-src/` are expected to be ignored (the lint script excludes web-src). TypeScript errors must be resolved — do not use `@ts-ignore` or `as any` unless the type genuinely cannot be expressed otherwise.
