Scaffold a new **shared** React component in `web-src/src/components/shared/`.

Arguments: $ARGUMENTS (component name in PascalCase)

Steps:
1. Create `web-src/src/components/shared/$ARGUMENTS/$ARGUMENTS.tsx` with this pattern:

```tsx
import { /* Spectrum 2 imports */ } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import type { FC } from 'react'

interface ${ARGUMENTS}Props {
  // define props
}

const $ARGUMENTS: FC<${ARGUMENTS}Props> = ({ /* destructure */ }) => {
  return (
    // JSX: React Spectrum 2 components and the style() macro
    // Use onPress not onClick on Spectrum components
    // Use styles/designSystem.ts where it complements S2 tokens
  )
}

export default $ARGUMENTS
```

2. Create or update `web-src/src/components/shared/$ARGUMENTS/index.ts`:
```ts
export { default } from './$ARGUMENTS'
export type { ${ARGUMENTS}Props } from './$ARGUMENTS'
```

3. Add the export to `web-src/src/components/shared/index.ts` barrel.

Conventions:
- No semicolons
- No class components
- Import icons from `@react-spectrum/s2/icons/...`
- Use `UNSAFE_style` / `UNSAFE_className` sparingly, prefer design tokens
