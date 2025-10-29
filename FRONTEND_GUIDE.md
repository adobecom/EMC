# Frontend Development Guide

## Quick Start

### Installation

```bash
# Install the new dependency
npm install
```

The following dependency was added:
- `@internationalized/date@^3.5.0` - For date/time handling in forms

### Running the Application

```bash
# Start the development server (existing command from your setup)
# This will typically be something like:
npm run dev
```

## Architecture Overview

The frontend has been scaffolded with a modular, scalable architecture:

### 📁 File Structure

```
web-src/src/
├── components/              # All React components
│   ├── shared/             # Reusable UI components
│   │   ├── DataTable.tsx
│   │   ├── FormWizard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── LoadingSpinner.tsx
│   ├── UserProfile.tsx
│   ├── OrgTeamManagement.tsx
│   ├── ResourcesDashboard.tsx
│   ├── SeriesForm.tsx
│   ├── EventForm.tsx
│   └── RegistrationDashboard.tsx
├── services/
│   └── api.ts              # Centralized API service
├── types/
│   └── domain.ts           # Domain type definitions
├── contexts/
│   └── ApiContext.tsx      # API context provider
└── hooks/
    └── useLoadData.ts      # Custom data loading hook
```

## Features Implemented

### ✅ User Profile Interface
**Route:** `/profile`

Displays IMS profile information including:
- User details (name, email, ID)
- Organization information
- Masked authentication token

### ✅ Organization & Team Management
**Route:** `/organizations`

Full CRUD interface for:
- Creating and managing organizations
- Creating and managing teams
- Tabbed interface for easy navigation
- Inline editing and deletion

### ✅ Resources Dashboard
**Route:** `/resources`

Central hub showing:
- All series with status indicators
- All events linked to series
- All sessions linked to events
- Quick actions: view, edit, delete

### ✅ Series Form (Single-Step)
**Routes:** `/series/new`, `/series/edit/:id`

Simple form for creating/editing series:
- Basic information fields
- Organization selection
- Date range selection
- Status management

### ✅ Event Form (Multi-Step Wizard)
**Routes:** `/events/new`, `/events/edit/:id`

3-step wizard for events:
1. Basic information (name, description, series)
2. Date/time and location
3. Capacity and registration settings

### ✅ Registration Dashboard
**Routes:** `/registrations`, `/registrations/:eventId`

Event registration management:
- Event selector
- Statistics dashboard
- Registration status management
- CSV export functionality

## Integration with Backend

### API Service Configuration

The API service (`services/api.ts`) is designed to work with your backend actions. Here's how to integrate:

#### 1. Configure Action URLs

The API service expects action URLs to be loaded from `config.json` (typically generated during build). Example structure:

```json
{
  "getOrganizations": "https://your-namespace.adobeioruntime.net/api/v1/web/EMC/getOrganizations",
  "createOrganization": "https://your-namespace.adobeioruntime.net/api/v1/web/EMC/createOrganization",
  "getSeries": "https://your-namespace.adobeioruntime.net/api/v1/web/EMC/getSeries",
  // ... more action URLs
}
```

#### 2. Expected API Response Format

All API endpoints should return responses in this format:

```typescript
{
  success: boolean
  data?: T              // The actual data (for successful responses)
  error?: string        // Error message (for failed responses)
  message?: string      // Optional message
  pagination?: {        // Optional pagination info
    page: number
    pageSize: number
    totalCount: number
  }
}
```

#### 3. Customize Payloads

When you have sample data from your API, you can refine:

1. **Type Definitions** (`types/domain.ts`): Add/remove fields as needed
2. **Form Components**: Adjust form fields to match your data model
3. **API Service**: Modify method signatures if needed

Example of customizing a type:

```typescript
// Before (generic)
export interface Event {
  id: string
  name: string
  // ...
}

// After (with your specific fields)
export interface Event {
  id: string
  name: string
  customField: string    // Add your custom fields
  metadata: {
    // Your specific metadata structure
    speaker: string
    track: string
  }
}
```

## Component Usage Examples

### Using the DataTable Component

```tsx
import { DataTable, TableColumn } from './shared'

const columns: TableColumn<YourType>[] = [
  { key: 'name', name: 'Name', width: 200 },
  { 
    key: 'status', 
    name: 'Status', 
    width: 120,
    render: (item) => <StatusBadge status={item.status} />
  }
]

<DataTable
  columns={columns}
  data={yourData}
  actions={[
    { icon: 'edit', label: 'Edit', onAction: handleEdit },
    { icon: 'delete', label: 'Delete', onAction: handleDelete }
  ]}
  getItemKey={(item) => item.id}
/>
```

### Using the FormWizard Component

```tsx
import { FormWizard, WizardStep } from './shared'

const steps: WizardStep[] = [
  {
    id: 'step1',
    title: 'Step 1 Title',
    description: 'Step 1 description',
    component: <YourStep1Component />,
    isValid: step1IsValid
  },
  // ... more steps
]

<FormWizard
  steps={steps}
  onComplete={handleComplete}
  onCancel={handleCancel}
  isSubmitting={isSubmitting}
/>
```

### Using the API Service

```tsx
import { apiService } from '../services/api'
import { IMS } from '../types'

// In your component
const loadData = async () => {
  try {
    // Set auth headers (usually done once in App.tsx)
    apiService.setAuthHeaders(ims.token, ims.org)
    
    // Make API call
    const response = await apiService.getSeries()
    
    if (response.success && response.data) {
      setSeries(response.data)
    }
  } catch (error) {
    console.error('Failed to load series:', error)
  }
}
```

## Customization Points

### Adding New Fields

1. **Update Type Definition** (`types/domain.ts`):
```typescript
export interface Series {
  // ... existing fields
  newField: string  // Add your field
}
```

2. **Update Form Component** (e.g., `SeriesForm.tsx`):
```tsx
<TextField
  label="New Field"
  value={formData.newField}
  onChange={(value) => setFormData({ ...formData, newField: value })}
/>
```

3. **Update Table Display** (e.g., `ResourcesDashboard.tsx`):
```typescript
const columns: TableColumn<Series>[] = [
  // ... existing columns
  { key: 'newField', name: 'New Field', width: 150 }
]
```

### Adding New Status Types

Update `StatusBadge.tsx`:

```typescript
const statusMap: Record<string, { variant: StatusVariant; label: string }> = {
  // ... existing statuses
  'your-new-status': { variant: 'positive', label: 'Your New Status' }
}
```

### Adding New Routes

1. **Create Component** in `components/`
2. **Add Route** in `App.tsx`:
```tsx
<Route path='/your-route' element={<YourComponent ims={props.ims} />} />
```
3. **Add Navigation** in `SideBar.tsx`:
```tsx
<li className="SideNav-item">
  <NavLink to="/your-route">Your Page</NavLink>
</li>
```

## Best Practices

### 1. State Management
- Use `useState` for component-local state
- Use `useEffect` for data fetching
- Keep state as close as possible to where it's used

### 2. Error Handling
```tsx
try {
  const response = await apiService.someMethod()
  if (response.success) {
    // Handle success
  } else {
    setError(response.error || 'Operation failed')
  }
} catch (error) {
  setError(error instanceof Error ? error.message : 'An error occurred')
}
```

### 3. Loading States
Always show loading indicators:
```tsx
{isLoading ? (
  <LoadingSpinner message="Loading data..." />
) : (
  // Your content
)}
```

### 4. Form Validation
Validate before submission:
```tsx
const isFormValid = () => {
  return (
    formData.name.trim() !== '' &&
    formData.requiredField !== ''
  )
}

<Button isDisabled={!isFormValid()}>Submit</Button>
```

## Next Steps

1. **Install Dependencies**: Run `npm install`
2. **Review Sample Data**: Provide sample API responses to refine types
3. **Configure Backend**: Set up backend actions in `app.config.yaml`
4. **Test Integration**: Test each component with real API calls
5. **Customize UI**: Adjust forms and tables based on your requirements
6. **Add Validation**: Implement more sophisticated validation rules
7. **Enhance Features**: Add search, filtering, and pagination as needed

## Troubleshooting

### Common Issues

**DatePicker Issues:**
- Make sure `@internationalized/date` is installed
- Use `parseDate()` or `parseDateTime()` to convert strings to date objects
- Dates should be in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)

**API Service Not Working:**
- Check that `config.json` is generated during build
- Verify action URLs are correct
- Ensure IMS token is being passed correctly

**TypeScript Errors:**
- Run `npm run type-check` to see all type errors
- Update type definitions in `types/domain.ts` to match your API

**Component Not Rendering:**
- Check console for errors
- Verify route is added in `App.tsx`
- Ensure all required props are passed

## Support

For more information:
- See `ARCHITECTURE.md` for detailed architecture documentation
- Check Adobe React Spectrum docs: https://react-spectrum.adobe.com/
- Review TypeScript handbook: https://www.typescriptlang.org/docs/

