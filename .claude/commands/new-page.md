Scaffold a new **page** in `web-src/src/pages/`.

Arguments: $ARGUMENTS (page name in PascalCase, e.g. VenueDashboard)

Steps:
1. Create the directory `web-src/src/pages/$ARGUMENTS/`

2. Create `web-src/src/pages/$ARGUMENTS/$ARGUMENTS.tsx`:

```tsx
import { Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { useContext } from 'react'
import { ApiContext } from '../../contexts/ApiContext'
import { useLoadData } from '../../hooks/useLoadData'

const $ARGUMENTS = () => {
  const { apiService } = useContext(ApiContext)

  // Use useLoadData for data fetching, e.g.:
  // const { data, loading, error } = useLoadData(() => apiService.getSomething(), [])

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 24 })}>
      <Heading level={1}>$ARGUMENTS</Heading>
      {/* page content */}
    </div>
  )
}

export default $ARGUMENTS
```

3. Create `web-src/src/pages/$ARGUMENTS/index.ts`:
```ts
export { default } from './$ARGUMENTS'
```

4. Register the route in `web-src/src/components/App.tsx` under the appropriate `<Route>`.

5. Add a nav link in `web-src/src/components/layout/TopNav.tsx` if needed.

Conventions:
- No semicolons
- Use `ResourceDashboardLayout` from shared components if it's a list/table page
- API calls go through `ApiContext` — never instantiate ApiService directly in a page
