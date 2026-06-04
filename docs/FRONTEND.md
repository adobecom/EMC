# Frontend Development Guide

## Architecture Overview

The frontend is a **React + TypeScript** SPA using **React Spectrum 2** (`@react-spectrum/s2`). Route-level features live under `pages/`; reusable UI lives under `components/shared/`; the shell uses `components/layout/TopNav.tsx`.

## Directory Structure

```
web-src/src/
├── components/           # App.tsx, layout (TopNav), shared/, user/, dev/, …
├── pages/                # Route-level features (dashboards, EventForm, admin)
│   └── EventForm/        # Event wizard + modular step components
├── contexts/             # Api, Auth, Toast, EventForm, RBAC, Group, …
├── hooks/
├── services/             # api.ts, caching, payload builders, enrichment
├── config/
├── types/
├── utils/
├── styles/               # designSystem.ts
├── index.tsx
└── index.css
```

Canonical **routes** are defined in `components/App.tsx` (copy/paste from source when in doubt). Summary:

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/overview` | Overview dashboard |
| `/profile` | User profile (IMS) |
| `/series`, `/series/new`, `/series/edit/:id` | Series list and form |
| `/events`, `/events/new/:eventType`, `/events/edit/:id` | Events list and event wizard |
| `/registrations`, `/registrations/:eventId` | Registrations |
| `/speakers` | Speakers |
| `/users` | User management |
| `/access` | Scope group management |
| `/roles` | Role management |
| `/configs` | Config management |
| `/about` | About |

**Top navigation:** `components/layout/TopNav.tsx` — horizontal `NavLink`s (items may be hidden based on RBAC and group selection). **User menu:** `components/user/UserPanel.tsx`.

For the event wizard, see [EVENT_FORM.md](./EVENT_FORM.md).

## Shared Components

### DataTable (`shared/DataTable.tsx`)

**Generic table component** for displaying lists with actions.

**Props:**
```typescript
interface DataTableProps<T> {
  columns: TableColumn<T>[]        // Column definitions
  data: T[]                         // Data array
  actions?: TableAction<T>[]        // Optional action buttons
  onSelectionChange?: (keys) => void
  selectionMode?: 'none' | 'single' | 'multiple'
  emptyState?: React.ReactNode      // Custom empty state
  isLoading?: boolean
  getItemKey: (item: T) => string   // Unique key extractor
}
```

**Example Usage:**
```typescript
const columns: TableColumn<Series>[] = [
  { key: 'name', name: 'Name', width: 200 },
  { key: 'status', name: 'Status', width: 120, 
    render: (item) => <StatusBadge status={item.status} /> 
  }
]

<DataTable
  columns={columns}
  data={seriesList}
  actions={[
    { icon: 'edit', label: 'Edit', onAction: handleEdit },
    { icon: 'delete', label: 'Delete', onAction: handleDelete }
  ]}
  getItemKey={(item) => item.id}
/>
```

**Features:**
- Automatic action column rendering
- Custom cell renderers
- Empty state handling
- Selection support

### FormWizard (`shared/FormWizard.tsx`)

**Multi-step form container** with progress tracking.

**Props:**
```typescript
interface WizardStep {
  id: string
  title: string
  description?: string
  component: React.ReactNode    // Step content
  isValid: boolean              // Step validation state
}

interface FormWizardProps {
  steps: WizardStep[]
  onComplete: () => void
  onCancel: () => void
  isSubmitting: boolean
}
```

**Example Usage:**
```typescript
const steps: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Enter event details',
    component: <BasicInfoStep />,
    isValid: formData.name !== ''
  },
  // ... more steps
]

<FormWizard
  steps={steps}
  onComplete={handleSubmit}
  onCancel={() => navigate('/events')}
  isSubmitting={isSubmitting}
/>
```

**Features:**
- Progress bar with step numbers
- Next/Back navigation
- Disabled next button if current step invalid
- Submit on last step
- Cancel button on all steps

### StatusBadge (`shared/StatusBadge.tsx`)

**Consistent status indicators** across the app.

**Usage:**
```typescript
<StatusBadge status="active" />
<StatusBadge status="completed" label="Custom Label" />
```

**Supported Statuses:**
- draft, active, completed, archived (Series)
- published, ongoing, cancelled (Events)
- scheduled (Sessions)
- confirmed, pending, attended (Registrations)

**Features:**
- Pre-configured colors for each status
- Custom label override
- Uses Adobe Spectrum Badge component

### LoadingSpinner (`shared/LoadingSpinner.tsx`)

**Centered loading indicator**.

**Usage:**
```typescript
<LoadingSpinner message="Loading events..." />
```

## Type System

### Domain Types (`types/domain.ts`)

Complete TypeScript interfaces for all domain entities:

```typescript
// Core entities
Organization, Team, Series, Event, Session, Registration

// Form data types (subset without id/timestamps)
SeriesFormData, EventFormData

// API responses
ApiResponse<T>, ApiListResponse<T>

// Pagination
PaginationParams
```

**Pattern:** Separate interfaces for entities vs. form data to avoid passing unnecessary fields to API.

### IMS Types (`types.ts`)

Runtime and authentication types:
```typescript
interface IMS {
  token: string
  org: string
  profile: Record<string, any>
}

interface Runtime {
  on: (event: string, handler: Function) => void
  // ... more runtime methods
}
```

## API Service (`services/api.ts`)

**Centralized service** for all backend communication.

### Configuration

```typescript
// Set backend action URLs (from config.json)
apiService.setActionUrls(actionUrls)

// Set authentication headers
apiService.setAuthHeaders(ims.token, ims.org)
```

### Available Methods

**Organizations:**
```typescript
getOrganizations() → ApiListResponse<Organization>
getOrganization(id) → ApiResponse<Organization>
createOrganization(data) → ApiResponse<Organization>
updateOrganization(id, data) → ApiResponse<Organization>
deleteOrganization(id) → ApiResponse<void>
```

**Teams:**
```typescript
getTeams(organizationId?) → ApiListResponse<Team>
getTeam(id) → ApiResponse<Team>
createTeam(data) → ApiResponse<Team>
updateTeam(id, data) → ApiResponse<Team>
deleteTeam(id) → ApiResponse<void>
```

**Series:**
```typescript
getSeries(organizationId?) → ApiListResponse<Series>
getSeriesById(id) → ApiResponse<Series>
createSeries(data) → ApiResponse<Series>
updateSeries(id, data) → ApiResponse<Series>
deleteSeries(id) → ApiResponse<void>
```

**Events:**
```typescript
getEvents(seriesId?, organizationId?) → ApiListResponse<Event>
getEvent(id) → ApiResponse<Event>
createEvent(data) → ApiResponse<Event>
updateEvent(id, data) → ApiResponse<Event>
deleteEvent(id) → ApiResponse<void>
```

**Sessions:**
```typescript
getSessions(eventId?) → ApiListResponse<Session>
getSession(id) → ApiResponse<Session>
createSession(data) → ApiResponse<Session>
updateSession(id, data) → ApiResponse<Session>
deleteSession(id) → ApiResponse<void>
```

**Registrations:**
```typescript
getRegistrations(eventId) → ApiListResponse<Registration>
getRegistration(id) → ApiResponse<Registration>
createRegistration(data) → ApiResponse<Registration>
updateRegistration(id, data) → ApiResponse<Registration>
deleteRegistration(id) → ApiResponse<void>
```

### Usage Pattern

```typescript
import { apiService } from '../services/api'

// In component
const loadData = async () => {
  try {
    setLoading(true)
    const response = await apiService.getSeries()
    
    if (response.success && response.data) {
      setSeries(response.data)
    } else {
      setError(response.error || 'Failed to load series')
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : 'An error occurred')
  } finally {
    setLoading(false)
  }
}
```

## State Management

**Local state with React hooks** - no global state library:

```typescript
// Component state
const [data, setData] = useState<Series[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// Side effects
useEffect(() => {
  loadData()
}, [dependency])
```

**Why no Redux/MobX?**
- Application is simple enough
- Most state is server-driven (fetch when needed)
- Reduces complexity and bundle size

## Styling

### Adobe React Spectrum

All UI components use Adobe React Spectrum:
- Consistent Adobe design language
- Built-in accessibility (ARIA labels, keyboard nav)
- Responsive and mobile-friendly
- Theme support (light/dark)

### Custom CSS (`index.css`)

Minimal custom styles for:
- Sidebar navigation
- Global layout adjustments
- Spectrum overrides (when necessary)

**Pattern:** Prefer Spectrum props over custom CSS.

## Data Flow

```
1. Component Mounts
   ↓
2. useEffect triggers data fetch
   ↓
3. apiService.getX() called
   ↓
4. Backend action invoked
   ↓
5. Response received
   ↓
6. State updated (setData)
   ↓
7. Component re-renders
```

## Error Handling

### Pattern 1: Try-Catch with User Feedback

```typescript
const handleSubmit = async () => {
  try {
    setSubmitting(true)
    const response = await apiService.createSeries(formData)
    
    if (response.success) {
      showSuccessToast('Series created successfully')
      navigate('/resources')
    } else {
      setError(response.error || 'Failed to create series')
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : 'An error occurred')
  } finally {
    setSubmitting(false)
  }
}
```

### Pattern 2: Error State Display

```typescript
{error && (
  <View backgroundColor="negative" padding="size-200">
    <Text>{error}</Text>
  </View>
)}
```

## Form Validation

### Client-Side Validation

```typescript
const isFormValid = () => {
  return (
    formData.name.trim() !== '' &&
    formData.organizationId !== '' &&
    formData.startDate !== '' &&
    formData.endDate !== '' &&
    new Date(formData.endDate) > new Date(formData.startDate)
  )
}

<Button isDisabled={!isFormValid() || isSubmitting}>
  Submit
</Button>
```

## Best Practices

### 1. Type Everything

```typescript
// ✅ Good
const [data, setData] = useState<Series[]>([])

// ❌ Bad
const [data, setData] = useState([])
```

### 2. Handle Loading States

```typescript
// ✅ Good
{loading ? <LoadingSpinner /> : <DataTable data={data} />}

// ❌ Bad - shows nothing while loading
<DataTable data={data} />
```

### 3. Provide User Feedback

```typescript
// ✅ Good - show success/error messages
if (response.success) {
  showToast('Success!')
} else {
  setError(response.error)
}

// ❌ Bad - silent failures
await apiService.createSeries(data)
navigate('/resources')
```

### 4. Confirm Destructive Actions

```typescript
// ✅ Good
<AlertDialog
  title="Delete Series"
  variant="destructive"
  primaryActionLabel="Delete"
  onPrimaryAction={handleDelete}
>
  Are you sure you want to delete this series?
</AlertDialog>

// ❌ Bad - immediate deletion
<Button onPress={handleDelete}>Delete</Button>
```

### 5. Use Shared Components

```typescript
// ✅ Good - reuse DataTable
<DataTable columns={columns} data={data} />

// ❌ Bad - custom table each time
<table>
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

## Adding New Features

### Adding a New Route

1. **Create a page component** under `pages/` (and export from `pages/index.ts` if using the barrel).
2. **Add a route** in `components/App.tsx`:
   ```typescript
   <Route path='/new-page' element={<NewPage ims={ims} />} />
   ```
3. **Add a nav link** in `components/layout/TopNav.tsx` (respect RBAC / `useGroup` patterns used by existing links).

### Adding a New Entity

1. **Define types** in `types/domain.ts`:
   ```typescript
   export interface NewEntity {
     id: string
     name: string
     // ... more fields
   }
   ```

2. **Add API methods** in `services/api.ts`:
   ```typescript
   async getNewEntities(): Promise<ApiListResponse<NewEntity>> {
     return this.callAction('getNewEntities')
   }
   ```

3. **Create component** in `components/`:
   ```typescript
   export const NewEntityDashboard: React.FC<{ims: IMS}> = ({ims}) => {
     // ... implementation
   }
   ```

### Extending DataTable

```typescript
// Add custom renderer
const columns: TableColumn<Entity>[] = [
  {
    key: 'customField',
    name: 'Custom Field',
    render: (item) => (
      <Flex gap="size-100">
        <Icon />
        <Text>{item.customField}</Text>
      </Flex>
    )
  }
]
```

## Common Patterns

### Date Handling

```typescript
import { parseDate, parseDateTime } from '@internationalized/date'

// Convert string to date object
const dateObj = parseDate('2024-01-15')

// Convert date object to string
const dateStr = dateObj.toString()

// For date-time
const dateTimeObj = parseDateTime('2024-01-15T10:30:00')
```

### Modal Dialog Pattern

```typescript
const [isModalOpen, setModalOpen] = useState(false)
const [selectedItem, setSelectedItem] = useState<Item | null>(null)

const handleEdit = (item: Item) => {
  setSelectedItem(item)
  setModalOpen(true)
}

<DialogTrigger isOpen={isModalOpen} onOpenChange={setModalOpen}>
  <Dialog>
    <Heading>Edit Item</Heading>
    <Divider />
    <Content>
      {/* Form fields */}
    </Content>
  </Dialog>
</DialogTrigger>
```

### Conditional Rendering

```typescript
// Loading
{loading && <LoadingSpinner />}

// Error
{error && <ErrorMessage text={error} />}

// Empty state
{!loading && data.length === 0 && <Text>No data available</Text>}

// Data
{!loading && data.length > 0 && <DataTable data={data} />}
```

## Troubleshooting

### TypeScript Errors

```bash
npm run type-check    # Check for type errors
```

**Common issues:**
- Missing type definitions → Add to `types/domain.ts`
- Incompatible types → Check API response structure
- `any` types → Replace with proper types

### Component Not Rendering

1. Check console for errors
2. Verify route in `App.tsx`
3. Ensure all required props are passed
4. Check that IMS object is passed correctly

### API Calls Failing

1. Verify `config.json` has action URLs
2. Check IMS token is set: `apiService.setAuthHeaders(ims.token, ims.org)`
3. Check backend action is deployed
4. Check network tab for request/response details

### DatePicker Issues

- Ensure `@internationalized/date` is installed
- Use `parseDate()` to convert strings to date objects
- Dates must be in ISO format (YYYY-MM-DD)

## Resources

- [Adobe React Spectrum Docs](https://react-spectrum.adobe.com/)
- [React Router Docs](https://reactrouter.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Event Form Guide](./EVENT_FORM.md)
- [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)
- [Dev Token Guide](./DEV_TOKEN_GUIDE.md)

