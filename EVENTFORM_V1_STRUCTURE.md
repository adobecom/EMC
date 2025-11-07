# Event Form - Proper V1 Reference Structure

## Issues Fixed

### 1. Build Error ✅
**Problem:** `web-src/src/components/EventForm.tsx does not export 'EventFormatStep'`

**Solution:** Fixed import path from `'./EventForm/'` to `'./EventForm/EventFormatStep'`

### 2. Incorrect Hierarchy ✅
**Problem:** Event Format was incorrectly made a separate step

**Solution:** Reorganized to match v1 reference structure where Event Format is a **component within** the Basic Info step

## V1 Reference Structure Analysis

### Side Menu Navigation (Steps)
```
EVENT CREATION
└── Add Content
    ├── Basic info              ← Active step
    ├── Speakers & Hosts        ← Step 2
    ├── Additional content      ← Step 3
    └── RSVP                    ← Step 4
```

### Step 1: "Basic Info" Contains Multiple Components
```
Basic Info Step
├── event-format-component      (Cloud + Series pickers)
├── event-topics-component      (Tags: Product Categories, Base Tags)
├── event-info-component        (Title, Description, Language, Private toggle)
├── date-time-component         (Start/End date-time)
└── venue-info-component        (Venue details)
```

## New React Structure

### 4 Main Steps (Matching V1)

**Step 1: Basic Info**
- Contains 5 sub-components:
  1. Event Format (cloud + series) - Modular component
  2. Tags & Topics (product categories + base tags)
  3. Event Information (org, title, description, language)
  4. Date & Time (start/end datetime, timezone)
  5. Venue Information (name, address, additional info)

**Step 2: Speakers & Hosts**
- Add/remove speaker/host profiles
- Profile details (type, name, title, bio, image)

**Step 3: Additional Content**
- Event images (card image, hero image, venue image)

**Step 4: RSVP**
- Attendance capacity
- Registration settings
- Event status

## Component Hierarchy

```
EventForm (Main Container)
│
└── FormWizard
    │
    ├── Step 1: Basic Info
    │   ├── EventFormatStep (modular component)
    │   │   ├── Cloud picker
    │   │   └── Series picker
    │   ├── Tags Component (inline)
    │   │   ├── Product Categories
    │   │   └── Base Tags
    │   ├── Event Info Component (inline)
    │   │   ├── Organization picker
    │   │   ├── Title
    │   │   ├── Language
    │   │   ├── Private toggle
    │   │   └── Descriptions
    │   ├── Date/Time Component (inline)
    │   │   ├── Start datetime
    │   │   ├── End datetime
    │   │   └── Timezone
    │   └── Venue Component (inline)
    │       ├── Venue name
    │       ├── Address
    │       └── Additional info
    │
    ├── Step 2: Speakers & Hosts
    │   └── Dynamic profile list
    │
    ├── Step 3: Additional Content
    │   └── Image URL inputs
    │
    └── Step 4: RSVP
        ├── Capacity
        ├── Registration toggles
        └── Event status
```

## Key Differences: Before vs After

### Before (Incorrect)
```
8 Steps:
1. Event Format (separate step) ❌
2. Basic Information
3. Tags & Topics
4. Date & Time
5. Venue Information
6. Attendance & Registration
7. Event Images
8. Speakers & Hosts
```

### After (Correct - Matches V1)
```
4 Steps:
1. Basic Info ✅
   - Event Format component
   - Tags component
   - Event Info component
   - Date/Time component
   - Venue component
2. Speakers & Hosts ✅
3. Additional Content ✅
4. RSVP ✅
```

## Benefits of Correct Structure

### User Experience
- ✅ Matches familiar v1 flow
- ✅ Fewer steps to complete
- ✅ Logical grouping of related fields
- ✅ Less intimidating (4 steps vs 8)

### Developer Experience
- ✅ Clear step boundaries
- ✅ Modular sub-components within steps
- ✅ Easier to understand structure
- ✅ Matches documentation/reference

### Validation
- ✅ All required Basic Info fields in one step
- ✅ Optional steps (2-4) can be skipped
- ✅ Clear what's needed to proceed

## Modular Component Pattern

### EventFormatStep (First Modular Component)
```typescript
// Located in: EventForm/EventFormatStep.tsx
<EventFormatStep
  cloudType={formData.cloudType}
  seriesId={formData.seriesId}
  onChange={(data) => updateFormData(data)}
  ims={ims}
/>
```

**Usage within Step 1:**
- Self-contained component with own data fetching
- Manages cloud list and series list
- Handles loading/error states
- Communicates changes via onChange callback

### Future Modular Components

Following the same pattern, we can modularize:
1. ✅ EventFormatStep (Done)
2. 🔜 EventTopicsStep (Tags selection)
3. 🔜 EventInfoStep (Title, description, language)
4. 🔜 DateTimeStep (Date/time pickers)
5. 🔜 VenueInfoStep (Venue details)

## Code Organization

```
web-src/src/components/
├── EventForm.tsx                    # Main container
└── EventForm/                       # Step components
    ├── index.ts                     # Exports
    ├── EventFormatStep.tsx          # Modular ✅
    ├── EventTopicsStep.tsx          # Future
    ├── EventInfoStep.tsx            # Future
    ├── DateTimeStep.tsx             # Future
    └── VenueInfoStep.tsx            # Future
```

## Validation Logic

### Step 1 Validation (All required for Basic Info)
```typescript
const step1IsValid =
  formData.seriesId !== '' &&
  formData.organizationId !== '' &&
  formData.name.trim() !== '' &&
  formData.language !== '' &&
  Boolean(formData.shortDescription && formData.shortDescription.trim() !== '') &&
  formData.startDateTime !== '' &&
  formData.endDateTime !== '' &&
  formData.venue?.venueName.trim() !== ''
```

### Steps 2-4 Validation
```typescript
// All optional steps
isValid: true
```

## Testing the Structure

### Manual Test Flow
1. Navigate to `/events/new`
2. **Step 1: Basic Info**
   - Select cloud type
   - Select series
   - Select tags (optional)
   - Enter event title
   - Select organization
   - Select language
   - Enter descriptions
   - Set dates
   - Enter venue name
   - Click Next
3. **Step 2: Speakers & Hosts**
   - Add profiles (optional)
   - Click Next
4. **Step 3: Additional Content**
   - Add images (optional)
   - Click Next
5. **Step 4: RSVP**
   - Configure capacity/registration
   - Click Submit

### Expected Behavior
- ✅ Cannot proceed from Step 1 without required fields
- ✅ Can skip Steps 2-3 (optional)
- ✅ Form submits successfully

## Summary

### What Changed
1. **Fixed import path** - Build error resolved
2. **Reorganized structure** - 4 steps instead of 8
3. **Grouped related fields** - Basic Info contains multiple components
4. **Matched v1 reference** - Same step names and organization

### Current Status
- ✅ Zero linter errors
- ✅ Builds successfully
- ✅ Matches v1 structure
- ✅ EventFormatStep properly modularized
- ✅ Ready for further component modularization

### Next Steps
1. Test the new 4-step flow
2. Modularize remaining components within Step 1:
   - EventTopicsStep (tags)
   - EventInfoStep (title, description)
   - DateTimeStep (dates)
   - VenueInfoStep (venue)
3. Add unit tests for each modular component

---

**Updated:** November 6, 2025  
**Status:** ✅ Structure Corrected  
**Build Status:** ✅ Passing  
**Linter Errors:** 0

