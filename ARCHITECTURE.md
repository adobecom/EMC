# Frontend Architecture Documentation

## Overview

This Adobe Experience Cloud application is built with React, TypeScript, and Adobe React Spectrum. The frontend is organized into a modular, scalable architecture with clear separation of concerns.

## Project Structure

```
web-src/src/
├── components/           # React components
│   ├── shared/          # Reusable components
│   │   ├── DataTable.tsx
│   │   ├── FormWizard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── LoadingSpinner.tsx
│   ├── UserProfile.tsx
│   ├── OrgTeamManagement.tsx
│   ├── ResourcesDashboard.tsx
│   ├── SeriesForm.tsx
│   ├── EventForm.tsx
│   ├── RegistrationDashboard.tsx
│   ├── App.tsx
│   ├── SideBar.tsx
│   └── index.ts
├── services/            # API service layer
│   └── api.ts
├── types/              # TypeScript type definitions
│   ├── domain.ts       # Domain models
│   └── index.ts
├── utils.ts            # Utility functions
├── index.tsx           # Application entry point
└── index.css           # Global styles
```

## Key Components

### 1. User Profile (`UserProfile.tsx`)
Displays IMS (Identity Management System) user information including:
- User ID, name, and email
- Organization ID
- Authentication token (masked)
- Additional profile fields from IMS

### 2. Organizations & Teams Management (`OrgTeamManagement.tsx`)
Comprehensive CRUD interface for:
- Creating and managing organizations
- Creating and managing teams within organizations
- Tabbed interface for switching between orgs and teams
- Inline editing and deletion with confirmation dialogs

### 3. Resources Dashboard (`ResourcesDashboard.tsx`)
Central dashboard for viewing all resources:
- **Series**: View, edit, delete series
- **Events**: View, edit, delete events
- **Sessions**: View and delete sessions
- Tabbed interface with count badges
- Status indicators for each resource
- Quick navigation to create/edit forms

### 4. Series Form (`SeriesForm.tsx`)
Single-step form for creating/editing series:
- Name, description
- Organization selection
- Start and end dates
- Status (draft, active, completed, archived)
- Form validation
- Success/error feedback

### 5. Event Form (`EventForm.tsx`)
Multi-step wizard for creating/editing events:
- **Step 1 - Basic Info**: Name, description, series, organization
- **Step 2 - Date & Location**: Start/end date-time, location
- **Step 3 - Capacity & Registration**: Capacity, registration status, event status
- Progress indicator
- Step validation
- Navigation between steps

### 6. Registration Dashboard (`RegistrationDashboard.tsx`)
Event registration management:
- Event selector dropdown
- Registration statistics (total, confirmed, pending, attended, cancelled)
- Data table with all registrations
- Status update functionality
- CSV export capability
- Delete registrations with confirmation

## Shared Components

### DataTable
Generic, reusable table component with:
- Configurable columns
- Custom cell rendering
- Action buttons (view, edit, delete)
- Empty state handling
- Selection support

### FormWizard
Multi-step form wizard with:
- Progress bar
- Step validation
- Navigation controls
- Step descriptions
- Submit handling

### StatusBadge
Styled status indicator with:
- Pre-configured colors for different statuses
- Support for custom labels
- Consistent styling across the app

### LoadingSpinner
Centered loading indicator with:
- Configurable size
- Custom loading messages
- Consistent placement

## Type System

### Domain Models (`types/domain.ts`)
Comprehensive TypeScript interfaces for:
- `Organization` - Organization entity
- `Team` - Team entity
- `Series` - Event series
- `Event` - Individual events
- `Session` - Event sessions
- `Registration` - Event registrations
- Form data types for each entity
- API response types

## API Service Layer (`services/api.ts`)

Centralized service for all API calls:
- Singleton pattern for consistent configuration
- Automatic authentication header injection
- Type-safe methods for all CRUD operations
- Error handling
- Support for pagination

### Available Methods:
- Organizations: `getOrganizations`, `createOrganization`, `updateOrganization`, `deleteOrganization`
- Teams: `getTeams`, `createTeam`, `updateTeam`, `deleteTeam`
- Series: `getSeries`, `createSeries`, `updateSeries`, `deleteSeries`
- Events: `getEvents`, `createEvent`, `updateEvent`, `deleteEvent`
- Sessions: `getSessions`, `createSession`, `updateSession`, `deleteSession`
- Registrations: `getRegistrations`, `createRegistration`, `updateRegistration`, `deleteRegistration`

## Routing

### Application Routes
- `/` - Home page
- `/profile` - User profile
- `/organizations` - Organizations & teams management
- `/resources` - Resources dashboard
- `/series/new` - Create new series
- `/series/edit/:id` - Edit series
- `/events/new` - Create new event
- `/events/edit/:id` - Edit event
- `/registrations` - Registration dashboard
- `/registrations/:eventId` - Registration dashboard for specific event
- `/actions` - Backend actions testing (original)
- `/about` - About/documentation page

## State Management

Components use React hooks for state management:
- `useState` for local component state
- `useEffect` for data fetching and side effects
- Props for passing data and callbacks
- No global state library (Redux, etc.) to keep it simple

## Data Flow

1. **Component Mount** → Load data via API service
2. **User Action** → Update local state
3. **Form Submit** → Call API service
4. **API Response** → Update state and show feedback
5. **Success** → Redirect or reload data
6. **Error** → Display error message

## Styling

- **Adobe React Spectrum** for UI components
- **Custom CSS** for sidebar navigation (`index.css`)
- **Theme**: Light color scheme with Adobe design system
- **Responsive**: Grid layout with sidebar and content areas

## Best Practices Implemented

1. **TypeScript**: Full type safety across the codebase
2. **Separation of Concerns**: Components, services, and types are separated
3. **DRY Principle**: Reusable shared components
4. **Error Handling**: Try-catch blocks and error state management
5. **User Feedback**: Loading states, success/error messages
6. **Confirmation Dialogs**: For destructive actions
7. **Form Validation**: Client-side validation before submission
8. **Code Organization**: Logical grouping and clear naming conventions

## Next Steps

When integrating with your backend:

1. **Update API URLs**: The API service will load action URLs from `config.json`
2. **Refine Payloads**: Adjust the type definitions based on your actual API responses
3. **Add More Fields**: Extend the forms with additional metadata fields as needed
4. **Implement Search/Filter**: Add search and filtering to tables
5. **Add Pagination**: Implement pagination for large datasets
6. **Add Bulk Actions**: Enable bulk operations on table items
7. **Enhanced Validation**: Add more sophisticated form validation rules

## Dependencies

Key dependencies added:
- `@internationalized/date` - Date handling for Adobe React Spectrum components
- `react-router-dom` - Client-side routing
- `@adobe/react-spectrum` - Adobe UI component library
- `@spectrum-icons/workflow` - Icon library

