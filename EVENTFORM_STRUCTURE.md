# Event Form Structure & Flow

## Visual Form Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT FORM WIZARD                        │
├─────────────────────────────────────────────────────────────┤
│  Progress: Step X of 7        [██████░░░░░] 60% Complete   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Event Format & Basic Information                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Event Format                                               │
│  ┌─────────────────────────────────┐                       │
│  │ Cloud Type *        [Picker]    │ ← Creative/Experience │
│  │ Series *            [Picker]    │                       │
│  │ Organization *      [Picker]    │                       │
│  └─────────────────────────────────┘                       │
│                                                             │
│  Event Information                                          │
│  ┌─────────────────────────────────┐                       │
│  │ Event Title *       [TextField] │ (80 chars max)        │
│  │ Language *          [Picker]    │                       │
│  │ [✓] Set as private event        │                       │
│  │ Description         [TextArea]  │ (Rich text)           │
│  │ Short Desc (SEO) *  [TextArea]  │ (160 chars max)       │
│  │ Community Forum URL [TextField] │ (Optional)            │
│  └─────────────────────────────────┘                       │
│                                                             │
│  [Cancel]                               [Next ➜]           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Tags & Topics                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Product Categories                                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │ [Graphic Design] [Video] [✓ Illustration]       │       │
│  │ [Photography] [✓ Generative AI] [Social] [3D]   │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Base Tags                                                  │
│  ┌─────────────────────────────────────────────────┐       │
│  │ [✓ Summit] [Gated]                              │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Selected Tags:                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │ [Illustration] [Generative AI] [Summit]         │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  [Back] [Cancel]                            [Next ➜]       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Date, Time & Location                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────┐                       │
│  │ Start Date & Time *  [DatePicker] │ (Minute precision)  │
│  │ End Date & Time *    [DatePicker] │ (After start)       │
│  │ Timezone             [TextField]  │ (e.g. UTC)          │
│  └─────────────────────────────────┘                       │
│                                                             │
│  [Back] [Cancel]                            [Next ➜]       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Venue Information                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Venue Information                                          │
│  ┌─────────────────────────────────┐                       │
│  │ Venue Name *         [TextField]│ (80 chars max)        │
│  │ Venue Address        [TextField]│                       │
│  │ Additional Info      [TextArea] │                       │
│  │                                 │                       │
│  │ [✓] Venue info will appear post-event                   │
│  │ [ ] Venue additional info will appear post-event        │
│  └─────────────────────────────────┘                       │
│                                                             │
│  [Back] [Cancel]                            [Next ➜]       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Attendance & Registration                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Attendance                                                 │
│  ┌─────────────────────────────────┐                       │
│  │ Capacity           [NumberField]│ (0 = unlimited)       │
│  └─────────────────────────────────┘                       │
│                                                             │
│  Registration Settings                                      │
│  ┌─────────────────────────────────┐                       │
│  │ [✓] Registration Open                                   │
│  │ [ ] Allow Waitlisting                                   │
│  │ [✓] Allow Guest Registration                            │
│  │                                                         │
│  │ Event Status *       [Picker]   │ Draft/Published/etc   │
│  └─────────────────────────────────┘                       │
│                                                             │
│  [Back] [Cancel]                            [Next ➜]       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Event Images                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────┐        │
│  │  Event Card Image                              │        │
│  │  Image URL: [____________________________]     │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
│  ┌────────────────────────────────────────────────┐        │
│  │  Event Hero Image                              │        │
│  │  Image URL: [____________________________]     │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
│  ┌────────────────────────────────────────────────┐        │
│  │  Venue Image                                   │        │
│  │  Image URL: [____________________________]     │        │
│  └────────────────────────────────────────────────┘        │
│                                                             │
│  [Back] [Cancel]                            [Next ➜]       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Speakers & Hosts                  [+ Add Profile]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Profile 1                               [Delete]│       │
│  ├─────────────────────────────────────────────────┤       │
│  │ Profile Type     [Picker] Speaker/Host          │       │
│  │ First Name       [TextField]   Last Name [...]  │       │
│  │ Title            [TextField]                    │       │
│  │ Bio              [TextArea]                     │       │
│  │ Image URL        [TextField]                    │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │ Profile 2                               [Delete]│       │
│  ├─────────────────────────────────────────────────┤       │
│  │ ... (same fields)                               │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  [Back] [Cancel]                          [Submit]         │
└─────────────────────────────────────────────────────────────┘
```

## Data Model Hierarchy

```
EventFormData
│
├─ Basic Info
│  ├─ cloudType: 'CreativeCloud' | 'ExperienceCloud'
│  ├─ seriesId: string (FK to Series)
│  ├─ organizationId: string (FK to Organization)
│  ├─ name: string
│  ├─ description: string (rich text)
│  ├─ shortDescription: string (SEO, 160 char)
│  ├─ language: string
│  ├─ isPrivate: boolean
│  └─ communityForumUrl: string
│
├─ Tags & Topics
│  └─ tags: EventTag[]
│     ├─ name: string
│     └─ caasId: string
│
├─ Date & Time
│  ├─ startDateTime: string (ISO)
│  ├─ endDateTime: string (ISO)
│  └─ timezone: string
│
├─ Venue
│  └─ venue: VenueData
│     ├─ venueName: string
│     ├─ formattedAddress: string
│     ├─ placeId: string
│     ├─ coordinates: { lat, lon }
│     ├─ gmtOffset: number
│     ├─ additionalInformation: string
│     ├─ showVenuePostEvent: boolean
│     └─ showAdditionalInfoPostEvent: boolean
│
├─ Registration
│  ├─ capacity: number
│  ├─ status: 'draft' | 'published' | ...
│  ├─ registrationOpen: boolean
│  ├─ allowWaitlist: boolean
│  └─ allowGuestRegistration: boolean
│
├─ Images
│  └─ images: EventImageData[]
│     ├─ imageKind: 'event-card-image' | 'event-hero-image' | 'venue-image'
│     ├─ imageUrl: string
│     ├─ imageId: string
│     └─ altText: string
│
└─ Speakers & Hosts
   └─ profiles: ProfileData[]
      ├─ type: 'speaker' | 'host'
      ├─ firstName: string
      ├─ lastName: string
      ├─ title: string
      ├─ bio: string
      ├─ imageUrl: string
      └─ socialLinks: SocialLink[]
```

## Component Hierarchy

```
EventForm (Main Container)
│
├─ FormWizard (Shared Component)
│  │
│  ├─ Progress Bar
│  │  ├─ Step X of 7
│  │  └─ Percentage Complete
│  │
│  ├─ Step Title & Description
│  │
│  ├─ Step Content (Dynamic)
│  │  ├─ Step 1 Component
│  │  ├─ Step 2 Component
│  │  ├─ Step 3 Component
│  │  ├─ Step 4 Component
│  │  ├─ Step 5 Component
│  │  ├─ Step 6 Component
│  │  └─ Step 7 Component
│  │
│  └─ Navigation Buttons
│     ├─ Back (hidden on first step)
│     ├─ Cancel
│     └─ Next/Submit
│
└─ State Management
   ├─ formData (comprehensive state)
   ├─ series (reference data)
   ├─ organizations (reference data)
   ├─ isLoading
   ├─ isSaving
   ├─ error
   └─ success
```

## Validation Flow

```
┌──────────────┐
│ User Enters  │
│    Data      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Step Level  │
│  Validation  │
└──────┬───────┘
       │
       ├─── Invalid ──┐
       │              ▼
       │         ┌──────────┐
       │         │ Next Btn │
       │         │ Disabled │
       │         └──────────┘
       │
       └─── Valid ────┐
                      ▼
                 ┌──────────┐
                 │ Next Btn │
                 │ Enabled  │
                 └────┬─────┘
                      │
                      ▼
                 ┌──────────┐
                 │   Next   │
                 │   Step   │
                 └──────────┘
```

## Save Flow

```
┌────────────────┐
│ User Clicks    │
│    Submit      │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Convert Form   │
│ Data to API    │
│ Format         │
└───────┬────────┘
        │
        ├─── Create Mode ──┐
        │                  ▼
        │             ┌──────────────┐
        │             │ POST /events │
        │             └──────┬───────┘
        │                    │
        └─── Edit Mode ──────┤
                             ▼
                        ┌──────────────┐
                        │ PUT /events  │
                        │    /:id      │
                        └──────┬───────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                 Success               Error
                    │                     │
                    ▼                     ▼
             ┌─────────────┐       ┌──────────┐
             │ Show Success│       │Show Error│
             │   Message   │       │ Message  │
             └──────┬──────┘       └──────────┘
                    │
                    ▼
             ┌─────────────┐
             │  Redirect   │
             │ to Dashboard│
             └─────────────┘
```

## Routing Integration

```
App.tsx Routes
│
├─ /events/new
│  └─> EventForm (isEditMode: false)
│     ├─ Empty form state
│     ├─ Pre-select first series/org
│     └─ On submit: POST /api/events
│
└─ /events/edit/:id
   └─> EventForm (isEditMode: true)
      ├─ Load event data by ID
      ├─ Populate all fields
      └─ On submit: PUT /api/events/:id
```

## Key Features

### ✅ Modularization
- Each step is self-contained
- Reusable FormWizard component
- Shared type definitions
- Centralized API service

### ✅ Validation
- Step-level validation
- Required field checking
- Character limits
- Date range validation
- Real-time feedback

### ✅ User Experience
- Progress indicator
- Step navigation (next/back)
- Visual feedback (errors, success)
- Loading states
- Disabled states for invalid steps

### ✅ Data Management
- Comprehensive form state
- Edit mode support
- Reference data loading
- API integration
- Metadata storage for extended fields

### ✅ Type Safety
- Full TypeScript coverage
- Proper interfaces for all data structures
- Type-safe component props
- Type-safe API calls

## Comparison: V1 vs V2

| Feature | V1 Reference | V2 Implementation |
|---------|-------------|-------------------|
| Architecture | Lit + Vanilla JS | Pure React |
| Type Safety | None | Full TypeScript |
| Component Library | Web Components | Adobe Spectrum |
| State Management | DOM manipulation | React Hooks |
| Validation | Inline | Step-level |
| Modularity | Mixed | Clean separation |
| Reusability | Limited | High |
| Maintainability | Difficult | Easy |
| Testing | Complex | Simple |
| Bundle Size | Larger | Optimized |

## Testing Guide

### Manual Testing Checklist

#### Create Flow
- [ ] Navigate to `/events/new`
- [ ] Verify all dropdowns populated
- [ ] Fill required fields only
- [ ] Test step navigation
- [ ] Submit and verify creation
- [ ] Check redirect to dashboard

#### Edit Flow
- [ ] Navigate to `/events/edit/:id`
- [ ] Verify all fields populated
- [ ] Modify several fields
- [ ] Test step navigation
- [ ] Submit and verify update
- [ ] Check redirect to dashboard

#### Validation
- [ ] Try to proceed without required fields
- [ ] Test character limits (80, 160)
- [ ] Set end date before start date
- [ ] Test with 0 capacity
- [ ] Test with empty tags

#### UI/UX
- [ ] Test all step navigation
- [ ] Test cancel button
- [ ] Test profile add/remove
- [ ] Test tag selection
- [ ] Test image URL inputs

#### Edge Cases
- [ ] No series available
- [ ] No organizations available
- [ ] API errors
- [ ] Network failures
- [ ] Very long text inputs

---

**Last Updated:** November 6, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

