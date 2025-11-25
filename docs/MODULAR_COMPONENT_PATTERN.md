# Modular Component Pattern

**Version:** 1.2  
**Last Updated:** November 25, 2025

## Overview

This document describes the modular component pattern used in the EMC application, specifically for breaking down complex forms (like the Event Form) into smaller, reusable, testable components.

## Pattern Description

Instead of having all form logic inline within a single large component, we extract logical sections into separate, self-contained components that:
- Manage their own internal state (when appropriate)
- Fetch their own data (when appropriate)
- Communicate with parent components through props
- Follow a consistent interface pattern

## Benefits

### Code Organization
- ✅ Reduced file size (main form ~300-400 lines instead of 900+)
- ✅ Clear separation of concerns
- ✅ Easier to navigate and understand codebase

### Maintainability
- ✅ Changes to one section don't affect others
- ✅ Easier to refactor individual components
- ✅ Clear component boundaries

### Testability
- ✅ Components can be tested in isolation
- ✅ Mock data can be passed via props
- ✅ Easier to write unit tests

### Reusability
- ✅ Components can be reused across different forms
- ✅ Components can be composed in different ways
- ✅ Shared logic is centralized

## Pattern Structure

### Directory Layout

```
web-src/src/components/
├── EventForm.tsx                    # Main form container
└── EventForm/                       # Modular components folder
    ├── index.ts                     # Barrel export file
    ├── EventFormatComponent.tsx     # Cloud + Series selection
    ├── EventInfoComponent.tsx       # Event information fields
    ├── AgendaComponent.tsx          # Agenda items with repeater
    ├── VenueComponent.tsx           # Venue information
    └── ...                          # Additional modular components
```

### Component Template

```typescript
/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import { /* Spectrum components */ } from '@adobe/react-spectrum'
import { /* Other imports */ } from '../shared'

// Define clear interface for component props
interface MyComponentProps {
  // Current values
  fieldOne: string
  fieldTwo: string
  
  // Callback for changes
  onChange: (data: {
    fieldOne?: string
    fieldTwo?: string
  }) => void
  
  // Optional: IMS for API calls (if needed)
  ims?: IMS
}

export const MyComponent: React.FC<MyComponentProps> = ({
  fieldOne,
  fieldTwo,
  onChange
}) => {
  // Internal state (if needed)
  const [localState, setLocalState] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data fetching (if needed)
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Fetch data from API
      const response = await apiService.getData()
      // Handle response
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Render with error/loading states
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorView error={error} />
  
  return (
    <Flex direction="column" gap="size-200">
      {/* Component fields */}
      <TextField
        label="Field One"
        value={fieldOne}
        onChange={(value) => onChange({ fieldOne: value })}
      />
      
      <TextField
        label="Field Two"
        value={fieldTwo}
        onChange={(value) => onChange({ fieldTwo: value })}
      />
    </Flex>
  )
}
```

### Barrel Export (index.ts)

```typescript
export { EventFormatComponent } from './EventFormatComponent'
export { EventInfoComponent } from './EventInfoComponent'
export { AgendaComponent } from './AgendaComponent'
export { VenueComponent } from './VenueComponent'
```

### Parent Component Usage

```typescript
import { EventFormatComponent, EventInfoComponent } from './EventForm'

// Inside component
<FormCard>
  <EventFormatComponent
    cloudType={formData.cloudType}
    seriesId={formData.seriesId}
    onChange={(data) => updateFormData(data)}
    ims={ims}
  />
</FormCard>

<FormCard>
  <EventInfoComponent
    language={formData.language}
    name={formData.name}
    // ... other props
    onChange={(data) => updateFormData(data)}
  />
</FormCard>
```

## Real-World Examples

### Example 1: EventFormatComponent

**Purpose:** Cloud type and series selection  
**Location:** `web-src/src/components/EventForm/EventFormatComponent.tsx`

**Key Features:**
- Fetches clouds and series lists from API
- Filters series by selected cloud type
- Auto-selects first available options
- Independent loading/error states
- No dependency on parent's state management

**Props Interface:**
```typescript
interface EventFormatComponentProps {
  cloudType: string
  seriesId: string
  onChange: (data: { cloudType?: string; seriesId?: string }) => void
}
```

**Usage:**
```typescript
<EventFormatComponent
  cloudType={formData.cloudType}
  seriesId={formData.seriesId}
  onChange={(data) => updateFormData(data)}
/>
```

### Example 2: EventInfoComponent

**Purpose:** Event information, dates, and secondary links  
**Location:** `web-src/src/components/EventForm/EventInfoComponent.tsx`

**Key Features:**
- Manages event title with URL title sync logic
- Date/time pickers with timezone selection
- Rich text editor for event details
- Secondary link toggle with conditional fields
- Internal state for toggle (`hasSecondaryLink`)

**Props Interface:**
```typescript
interface EventInfoComponentProps {
  language: string
  name: string
  urlTitle: string
  description: string
  shortDescription: string
  startDateTime: string
  endDateTime: string
  timezone: string
  communityForumUrl: string
  secondaryLinkTitle: string
  onChange: (data: {
    language?: string
    name?: string
    urlTitle?: string
    // ... other fields
  }) => void
}
```

**Usage:**
```typescript
<EventInfoComponent
  language={formData.language}
  name={formData.name}
  urlTitle={formData.urlTitle || ''}
  // ... other props
  onChange={(data) => updateFormData(data)}
/>
```

### Example 3: AgendaComponent

**Purpose:** Repeatable agenda items with ordering and constraints  
**Location:** `web-src/src/components/EventForm/AgendaComponent.tsx`

**Key Features:**
- Repeatable fieldsets for agenda items
- Auto-sort by time (optional)
- Clamp date pickers to event date range (optional)
- Drag/reorder functionality
- Post-event visibility toggle

**Props Interface:**
```typescript
interface AgendaComponentProps {
  agendaItems: AgendaItem[]
  showAgendaPostEvent?: boolean
  eventStartDateTime?: string
  eventEndDateTime?: string
  onChange: (agendaItems: AgendaItem[]) => void
  onShowAgendaPostEventChange: (value: boolean) => void
}
```

**Usage:**
```typescript
<AgendaComponent
  agendaItems={formData.agendaItems || []}
  showAgendaPostEvent={formData.showAgendaPostEvent}
  eventStartDateTime={formData.startDateTime}
  eventEndDateTime={formData.endDateTime}
  onChange={(agendaItems) => updateFormData({ agendaItems })}
  onShowAgendaPostEventChange={(value) => updateFormData({ showAgendaPostEvent: value })}
/>
```

### Example 4: VenueComponent

**Purpose:** Venue information with Google Places integration and image upload  
**Location:** `web-src/src/components/EventForm/VenueComponent.tsx`

**Key Features:**
- Google Places API autocomplete for venue name
- Auto-populated venue address (editable)
- Image uploader with drag & drop support
- Rich text editor for additional information
- Post-event visibility toggles
- Full-width fields

**Props Interface:**
```typescript
interface VenueComponentProps {
  venue: VenueData
  eventId?: string
  onChange: (updates: Partial<VenueData>) => void
}
```

**Usage:**
```typescript
<VenueComponent
  venue={formData.venue!}
  eventId={id}
  onChange={updateVenueData}
/>
```

**Special Features:**
- Dynamically loads Google Places API via `loadGooglePlacesAPI()` utility
- Extracts venue details (name, address, coordinates, timezone) from Places API
- Integrates ImageUploader component for venue photos

## When to Extract a Component

### Extract When:
- ✅ Section has 50+ lines of JSX
- ✅ Section has its own data fetching logic
- ✅ Section could be reused elsewhere
- ✅ Section has complex internal logic
- ✅ Section is logically independent
- ✅ You want to test the section in isolation

### Keep Inline When:
- ❌ Section is very simple (< 20 lines)
- ❌ Section is tightly coupled to parent
- ❌ Section is unlikely to be reused
- ❌ Extraction adds unnecessary complexity

## Best Practices

### 1. Clear Props Interface
```typescript
// ✅ GOOD: Explicit, typed props
interface ComponentProps {
  value: string
  onChange: (value: string) => void
}

// ❌ BAD: Generic props object
interface ComponentProps {
  data: any
  onUpdate: (data: any) => void
}
```

### 2. Single Responsibility
```typescript
// ✅ GOOD: Component handles one logical section
<EventFormatComponent />  // Only cloud + series

// ❌ BAD: Component does too much
<EventEverythingComponent />  // Format, info, dates, venue, etc.
```

### 3. Props Passing Pattern
```typescript
// ✅ GOOD: Pass only what's needed
<EventInfoComponent
  name={formData.name}
  language={formData.language}
  onChange={(data) => updateFormData(data)}
/>

// ❌ BAD: Pass entire form data
<EventInfoComponent
  formData={formData}
  setFormData={setFormData}
/>
```

### 4. onChange Callback Pattern
```typescript
// ✅ GOOD: Partial updates with optional fields
onChange: (data: {
  field1?: string
  field2?: string
}) => void

// Component can update just one field
onChange({ field1: 'new value' })

// Or multiple fields
onChange({ field1: 'value1', field2: 'value2' })
```

### 5. Error Boundaries
```typescript
// ✅ GOOD: Component handles its own errors
if (isLoading) return <LoadingSpinner />
if (error) return <ErrorView error={error} />
return <ComponentContent />

// This prevents errors in one component from breaking the entire form
```

## Migration Strategy

### Step 1: Identify Section
- Find a logical section (e.g., "Event Format")
- Note the fields it contains
- Check for dependencies on parent state

### Step 2: Create Component File
```bash
# Create new file in EventForm folder
touch web-src/src/components/EventForm/MyComponent.tsx
```

### Step 3: Define Props Interface
```typescript
interface MyComponentProps {
  // List all fields the component needs
  field1: string
  field2: number
  // Add onChange callback
  onChange: (data: { field1?: string; field2?: number }) => void
}
```

### Step 4: Copy JSX
- Copy the JSX from parent component
- Replace `formData.field` with `field` prop
- Replace `updateFormData({ field: value })` with `onChange({ field: value })`

### Step 5: Add Internal State (if needed)
```typescript
const [localState, setLocalState] = useState(false)
```

### Step 6: Add Data Fetching (if needed)
```typescript
useEffect(() => {
  loadData()
}, [])
```

### Step 7: Update Parent Component
```typescript
// Replace inline JSX with component
<MyComponent
  field1={formData.field1}
  field2={formData.field2}
  onChange={(data) => updateFormData(data)}
/>
```

### Step 8: Update Exports
```typescript
// In EventForm/index.ts
export { MyComponent } from './MyComponent'
```

### Step 9: Clean Up Imports
- Remove unused imports from parent
- Remove unused constants from parent
- Remove unused state from parent

## Testing Guidelines

### Unit Testing Modular Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { EventFormatComponent } from './EventFormatComponent'

describe('EventFormatComponent', () => {
  it('should call onChange when cloud type changes', () => {
    const mockOnChange = jest.fn()
    
    render(
      <EventFormatComponent
        cloudType="CreativeCloud"
        seriesId=""
        onChange={mockOnChange}
      />
    )
    
    // Select different cloud
    const cloudPicker = screen.getByLabelText('Select a cloud')
    fireEvent.change(cloudPicker, { target: { value: 'ExperienceCloud' } })
    
    // Verify onChange called with correct data
    expect(mockOnChange).toHaveBeenCalledWith({
      cloudType: 'ExperienceCloud'
    })
  })
  
  it('should filter series by cloud type', async () => {
    // Test filtering logic
  })
})
```

## Common Patterns

### Pattern 1: Field Syncing
When one field affects another (like Event Title → URL Title):

```typescript
onChange={(value) => {
  // Check if sync is active
  if (name === urlTitle) {
    // Sync both fields
    onChange({ name: value, urlTitle: value })
  } else {
    // Only update one field
    onChange({ name: value })
  }
}}
```

### Pattern 2: Conditional Fields
Toggle that shows/hides fields:

```typescript
const [showFields, setShowFields] = useState(false)

<Switch
  isSelected={showFields}
  onChange={(value) => {
    setShowFields(value)
    if (!value) {
      // Clear fields when disabled
      onChange({ field1: '', field2: '' })
    }
  }}
>
  Show additional fields
</Switch>

{showFields && (
  <>
    <TextField ... />
    <TextField ... />
  </>
)}
```

### Pattern 3: API-Driven Dropdown
Component fetches its own options:

```typescript
const [options, setOptions] = useState<Option[]>([])
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
  loadOptions()
}, [])

const loadOptions = async () => {
  setIsLoading(true)
  try {
    const response = await apiService.getOptions()
    setOptions(response.data)
  } finally {
    setIsLoading(false)
  }
}

if (isLoading) return <LoadingSpinner />

return (
  <Picker
    items={options}
    selectedKey={selectedId}
    onSelectionChange={(key) => onChange({ selectedId: String(key) })}
  >
    {(item) => <Item key={item.id}>{item.name}</Item>}
  </Picker>
)
```

### Pattern 4: External API Integration
Component integrates with third-party APIs (e.g., Google Places):

```typescript
import { loadGooglePlacesAPI } from '../../utils/loadGooglePlaces'

useEffect(() => {
  const initAutocomplete = async () => {
    try {
      // Load external API
      await loadGooglePlacesAPI()

      // Initialize third-party component
      if (inputRef.current && !autocomplete) {
        const instance = new window.google.maps.places.Autocomplete(
          inputRef.current,
          { types: ['establishment'] }
        )

        instance.addListener('place_changed', () => {
          const place = instance.getPlace()
          // Extract data and update form
          onChange({
            name: place.name,
            address: place.formatted_address
          })
        })

        setAutocomplete(instance)
      }
    } catch (error) {
      console.error('Error loading API:', error)
    }
  }

  initAutocomplete()
}, [autocomplete, onChange])
```

### Pattern 5: Repeater with CRUD Operations
Component manages an array of items:

```typescript
import { v4 as uuidv4 } from 'uuid'

interface Item {
  id: string
  field1: string
  field2: string
}

interface RepeaterComponentProps {
  items: Item[]
  onChange: (items: Item[]) => void
}

const addItem = () => {
  const newItem: Item = {
    id: uuidv4(),
    field1: '',
    field2: ''
  }
  onChange([...items, newItem])
}

const updateItem = (index: number, updates: Partial<Item>) => {
  const updated = [...items]
  updated[index] = { ...updated[index], ...updates }
  onChange(updated)
}

const removeItem = (index: number) => {
  onChange(items.filter((_, i) => i !== index))
}

const moveItem = (fromIndex: number, toIndex: number) => {
  const updated = [...items]
  const [moved] = updated.splice(fromIndex, 1)
  updated.splice(toIndex, 0, moved)
  onChange(updated)
}

return (
  <>
    {items.map((item, index) => (
      <View key={item.id}>
        <TextField
          value={item.field1}
          onChange={(value) => updateItem(index, { field1: value })}
        />
        <ActionButton onPress={() => removeItem(index)}>
          <Delete />
        </ActionButton>
      </View>
    ))}
    <Button onPress={addItem}>Add Item</Button>
  </>
)
```

## Troubleshooting

### Issue: Component not updating
**Problem:** Changes don't reflect in UI  
**Solution:** Ensure props are passed correctly and onChange is called

### Issue: Infinite re-renders
**Problem:** Component keeps re-rendering  
**Solution:** Check useEffect dependencies, ensure onChange doesn't cause loops

### Issue: State out of sync
**Problem:** Parent and child state disagree  
**Solution:** Make component fully controlled (no internal state for shared data)

## Related Documentation

- [Frontend Guide](./FRONTEND.md) - React/TypeScript patterns
- [Event Form Guide](./EVENT_FORM.md) - Complete event form documentation
- [Testing Guide](./TESTING.md) - Testing strategies

## Version History

- **1.2** (November 25, 2025) - Enhanced VenueComponent with integrations
  - Google Places API autocomplete
  - ImageUploader component with drag & drop
  - External API integration pattern

- **1.1** (November 25, 2025) - Added AgendaComponent and VenueComponent
  - AgendaComponent with repeater pattern
  - VenueComponent extraction
  - Component reordering example

- **1.0** (November 25, 2025) - Initial documentation
  - EventFormatComponent pattern established
  - EventInfoComponent pattern documented

---

**Questions?** Refer to existing modular components as examples:
- `EventFormatComponent.tsx` - Data fetching pattern
- `EventInfoComponent.tsx` - Complex field logic pattern
- `AgendaComponent.tsx` - Repeater and array management pattern
- `VenueComponent.tsx` - External API integration pattern
- `ImageUploader.tsx` (shared) - File upload with drag & drop pattern

