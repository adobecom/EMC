Review all staged/unstaged changes in this branch for correctness and convention compliance.

Steps:
1. Run `git diff main...HEAD` to see all changes vs main
2. Run `npm run check` to catch lint and type errors
3. Review the diff for these common issues specific to this project:

**Spectrum conventions**
- `onPress` used instead of `onClick` on Spectrum components?
- Layout via `Flex`/`Grid` (not raw CSS flexbox)?
- No S2 imports (`@react-spectrum/s2`)?

**TypeScript**
- No `any` casts without a comment explaining why?
- New domain types defined in `types/` not inline?

**API layer**
- New fetch calls go through `apiService` or `cachedApi`, not raw `fetch()`?
- Mutations validated with `validateString`/`validateObject`?
- Cache invalidated after mutations?

**Code style**
- No semicolons?
- New directories have `index.ts` barrel exports?
- No hardcoded env-specific URLs (use `config/constants.ts`)?

**Security**
- No tokens/credentials in code?
- No new hostnames added without updating `ALLOWED_HOSTS`?

Report findings grouped by severity: blocking (must fix before merge) vs suggestions.
