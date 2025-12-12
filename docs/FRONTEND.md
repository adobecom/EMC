# Frontend Development Guide

## Architecture Overview

The frontend is a **React + TypeScript** application built with **Adobe React Spectrum** components, organized with clear separation of concerns and reusable patterns.

## Directory Structure

```
web-src/src/
├── components/                 # React components
│   ├── shared/                 # Reusable UI components
│   │   ├── DataTable.tsx       # Generic table with actions
│   │   ├── FormWizard.tsx      # Multi-step form container
│   │   ├── FormCard.tsx        # Styled card for form sections
│   │   ├── StatusBadge.tsx     # Status indicators
│   │   ├── LoadingSpinner.tsx  # Loading states
│   │   ├── RichTextEditor.tsx  # Rich text input
│   │   ├── ImageUploader.tsx   # Image upload with drag & drop
│   │   ├── TagSelector.tsx     # Tag/category picker
│   │   ├── HeadingWithTooltip.tsx  # Heading with info tooltip
│   │   ├── AutocompleteTextField.tsx  # Autocomplete input
│   │   └── ResourceDashboardLayout.tsx  # Dashboard layout
│   ├── EventForm/              # Modular event form components (13 components)
│   │   ├── EventFormatComponent.tsx     # Cloud + Series selection
│   │   ├── EventInfoComponent.tsx       # Title, dates, description
│   │   ├── EventTagsComponent.tsx       # Tags and categories
│   │   ├── VenueComponent.tsx           # Venue with Google Places
│   │   ├── SpeakersComponent.tsx        # Speaker management
│   │   ├── SponsorsComponent.tsx        # Sponsor management
│   │   ├── AgendaComponent.tsx          # Agenda items
│   │   ├── EventImagesComponent.tsx     # Image management
│   │   ├── ProfilesComponent.tsx        # Speaker/host profiles
│   │   ├── RegistrationConfigComponent.tsx  # Registration settings
│   │   ├── RegistrationFieldsComponent.tsx  # RSVP form fields
│   │   ├── PageMetadataComponent.tsx    # SEO metadata
│   │   └── index.ts                     # Barrel exports
│   ├── App.tsx                 # Main app component & routing
│   ├── TopNav.tsx              # Top navigation bar
│   ├── Home.tsx                # Home page
│   ├── EventForm.tsx           # Event form wizard (main container)
│   ├── EventsDashboard.tsx     # Events list dashboard
│   ├── SeriesDashboard.tsx     # Series list dashboard
│   ├── SeriesForm.tsx          # Series create/edit
│   ├── OrgTeamManagement.tsx   # Org & team CRUD
│   ├── RegistrationDashboard.tsx  # Registration management
│   ├── UserProfile.tsx         # IMS user profile
│   ├── UserPanel.tsx           # User panel dropdown
│   ├── DevTokenButton.tsx      # Dev token status button
│   └── DevTokenDialog.tsx      # Dev token input dialog
├── services/
│   ├── api.ts                  # Centralized API service (ESP/ESL)
│   ├── tokenStorage.ts         # Dev token storage
│   ├── requestHelpers.ts       # HTTP request utilities
│   ├── payloadBuilders.ts      # API payload construction
│   ├── dataEnrichment.ts       # Data transformation utilities
│   └── eventEnrichment.ts      # Event data enrichment
├── types/
│   ├── domain.ts               # Domain type definitions
│   └── google-places.d.ts      # Google Places API types
├── contexts/
│   ├── ApiContext.tsx          # API context provider
│   └── EventFormContext.tsx    # Event form state context
├── hooks/
│   ├── useLoadData.ts          # Data loading hook
│   ├── useDevToken.ts          # Dev token management hook
│   ├── useEventFormComponent.ts  # Event form component hook
│   ├── useEventFormSave.ts     # Event form save logic
│   └── useEventTypeFeatures.ts # Event type feature flags
├── config/
│   ├── constants.ts            # API hosts, supported clouds
│   ├── env.ts                  # Environment configuration
│   └── eventTypeConfig.ts      # Event type configurations
├── mocks/
│   ├── list-series.ts          # Mock series data
│   ├── list-events.ts          # Mock events data
│   └── index.ts                # Mock exports
├── utils/
│   ├── formPersistence.ts      # Form auto-save utilities
│   ├── loadGooglePlaces.ts     # Google Places API loader
│   ├── socialPlatformDetector.ts  # Social link detection
│   └── dataFilters.ts          # Data filtering utilities
├── styles/
│   └── designSystem.ts         # Design system tokens
├── index.tsx                   # Application entry point
├── index.css                   # Global styles
└── types.ts                    # IMS & runtime types
```

## Core Components

### Application Shell (`App.tsx`)

Main component that sets up:
- Adobe React Spectrum Provider with light theme
- React Router (HashRouter for ExC Shell compatibility)
- Grid layout with sidebar and content area
- Error boundary for graceful error handling
- Runtime event listeners (configuration, history)

**Routes:**
```typescript
/                          → Home page
/profile                   → User profile (IMS)
/organizations             → Org & team management
/resources                 → Resources dashboard
/series/new                → Create series
/series/edit/:id           → Edit series
/events/new                → Create event (wizard)
/events/edit/:id           → Edit event (wizard)
/registrations             → Registration dashboard
/registrations/:eventId    → Event-specific registrations
/actions                   → Backend action tester
/about                     → About page
```

### Navigation (`SideBar.tsx`)

Vertical navigation menu with:
- NavLink components for route highlighting
- Organized sections (Management, Resources, System)
- Adobe Spectrum styling for consistency

### User Profile (`UserProfile.tsx`)

Displays IMS (Identity Management System) profile:
- User ID, name, email
- Organization ID
- Masked authentication token
- Additional profile fields

### Organizations & Teams (`OrgTeamManagement.tsx`)

Full CRUD interface with:
- **Tabbed layout**: Organizations | Teams
- **DataTable display** with inline actions
- **Modal dialogs** for create/edit
- **Confirmation dialogs** for deletion
- **Organization-scoped team management**

**Key Patterns:**
- Separate state for organizations and teams
- Inline editing with form modals
- Delete confirmations to prevent accidents
- Real-time updates after CRUD operations

### Resources Dashboard (`ResourcesDashboard.tsx`)

Central hub for viewing all resources:
- **Tabbed interface**: Series | Events | Sessions
- **Count badges** on tabs
- **Status indicators** for each resource
- **Quick actions**: View, edit, delete
- **Navigation** to create/edit forms

**Use Case:** Get a bird's-eye view of all resources in the system.

### Series Form (`SeriesForm.tsx`)

**Single-step form** for series:
- Name, description
- Organization selector
- Date range picker (start/end dates)
- Status dropdown (draft, active, completed, archived)
- Form validation before submission
- Success/error feedback

**Key Features:**
- Pre-fills data when editing (via route param `:id`)
- Uses `@internationalized/date` for date handling
- Validates date ranges (end must be after start)

### Event Form (`EventForm.tsx`)

**Multi-step wizard** for events:

**Step 1 - Basic Info:**
- Name, description
- Series selection
- Organization selection

**Step 2 - Date & Location:**
- Start/end date-time
- Location

**Step 3 - Capacity & Registration:**
- Capacity (max attendees)
- Registration open/closed toggle
- Event status

**Key Features:**
- Progress bar showing current step
- Step validation (can't proceed if invalid)
- Back/Next navigation
- Pre-fills data when editing
- Uses FormWizard shared component

### Registration Dashboard (`RegistrationDashboard.tsx`)

Event registration management:
- **Event selector**: Dropdown to choose event
- **Statistics cards**: Total, confirmed, pending, attended, cancelled
- **Registration table**: All attendees with details
- **Status updates**: Click to cycle through statuses
- **CSV export**: Download registrations
- **Delete**: Remove registrations with confirmation

**Use Case:** Manage attendees for events, track attendance, export data.

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

1. **Create component** in `components/`
2. **Add route** in `App.tsx`:
   ```typescript
   <Route path='/new-page' element={<NewPage ims={props.ims} />} />
   ```
3. **Add navigation** in `SideBar.tsx`:
   ```typescript
   <NavLink to="/new-page">New Page</NavLink>
   ```

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

