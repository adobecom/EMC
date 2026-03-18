Scaffold a new **shared** React component in `web-src/src/components/shared/`.

Arguments: $ARGUMENTS (component name in PascalCase)

Steps:
1. Create `web-src/src/components/shared/$ARGUMENTS/$ARGUMENTS.tsx` with this pattern:

```tsx
import { /* Spectrum imports */ } from '@adobe/react-spectrum'
import type { FC } from 'react'

interface ${ARGUMENTS}Props {
  // define props
}

const $ARGUMENTS: FC<${ARGUMENTS}Props> = ({ /* destructure */ }) => {
  return (
    // JSX using React Spectrum v3 components
    // Use Flex/Grid for layout
    // Use onPress not onClick
    // Use design tokens from styles/designSystem.ts for spacing/colors
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
- Import icons from `@spectrum-icons/workflow`
- Use `UNSAFE_style` / `UNSAFE_className` sparingly, prefer design tokens
