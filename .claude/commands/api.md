Reference for making API calls in this codebase. Use this when adding new API interactions.

## Pattern

Always use `cachedApi` (for reads) or `apiService` (for mutations) from `ApiContext`:

```tsx
import { useContext } from 'react'
import { ApiContext } from '../../contexts/ApiContext'

const MyComponent = () => {
  const { apiService, cachedApi } = useContext(ApiContext)

  // GET (cached, deduped, 10s TTL)
  const data = await cachedApi.get('/endpoint')

  // POST / PUT / DELETE (uncached)
  const result = await apiService.post('/endpoint', payload)
}
```

## Payload Builders

Use existing builders in `services/payloadBuilders.ts` before adding new ones. They handle field mapping between UI state and API format.

## Validation

Always validate before mutations:
```ts
import { validateString, validateObject } from '../../services/requestHelpers'
validateString(id, 'eventId')
validateObject(payload, 'eventPayload')
```

## Cache Invalidation

After a mutation, invalidate relevant cache patterns:
```ts
cachedApi.invalidate('/events')        // invalidate all event endpoints
cachedApi.invalidate(`/events/${id}`)  // invalidate specific resource
```

## ESP vs ESL

- **ESP** (`config/constants.ts` → `ESP_BASE_URL`): events, series, speakers, sponsors
- **ESL** (`config/constants.ts` → `ESL_BASE_URL`): event lifecycle, venues, attendees, RSVP

## Dry-run mode (testing)

```ts
apiService.enableDryRun()   // logs calls, skips actual fetch
apiService.disableDryRun()
```
