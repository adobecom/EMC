# EMC - Event Management Console

## Quick Start

**Adobe Experience Cloud application for managing events, series, registrations, and teams.**

### Local Development
```bash
npm install
aio app run              # Start dev server (localhost:9080)
aio app run --local      # Run actions locally
aio app test             # Run unit tests
aio app test --e2e       # Run e2e tests
```

### Deployment
```bash
aio app deploy           # Deploy to Adobe I/O Runtime
aio app undeploy         # Remove deployment
```

## Project Structure

```
EMC/
├── web-src/             # Frontend React app
│   └── src/
│       ├── components/  # UI components
│       │   ├── shared/  # Reusable shared components
│       │   └── EventForm/  # Modular event form components
│       ├── services/    # API service layer (ESP/ESL external APIs)
│       ├── types/       # TypeScript definitions
│       ├── hooks/       # Custom React hooks
│       ├── contexts/    # React context providers
│       ├── config/      # Configuration and constants
│       ├── mocks/       # Mock data for development
│       └── utils/       # Utility functions
├── actions/             # App Builder actions (unused, boilerplate only)
├── test/                # Unit tests
├── e2e/                 # End-to-end tests
└── docs/                # Documentation
    ├── PROJECT_OVERVIEW.md      # This file
    ├── DEVELOPMENT_WORKFLOW.md  # Development workflow
    ├── FRONTEND.md              # Frontend development guide
    ├── EVENT_FORM.md            # Event form implementation guide
    ├── MODULAR_COMPONENT_PATTERN.md  # Component patterns
    ├── API_CENTRALIZATION.md    # API service documentation
    ├── DEV_TOKEN_*.md           # Dev token management (3 docs)
    └── TESTING.md               # Testing guide
```

## Domain Model

```
Organization (IMS Org)
├── Teams
└── Series (Event Series)
    └── Events
        ├── Sessions
        └── Registrations (Attendees)
```

### Core Entities

| Entity | Description | Key Fields |
|--------|-------------|------------|
| **Organization** | Top-level organizational unit | name, imsOrgId |
| **Team** | Group within an organization | name, organizationId, memberCount |
| **Series** | Collection of related events | name, startDate, endDate, status |
| **Event** | Individual event | name, seriesId, startDateTime, capacity |
| **Session** | Sub-event within an event | name, eventId, speaker, location |
| **Registration** | Event attendee registration | eventId, attendeeEmail, status |

## Technology Stack

### Frontend
- **React 18** with **TypeScript**
- **Adobe React Spectrum 2** - UI component library
- **React Router** - Client-side routing
- **@internationalized/date** - Date handling

### External APIs
- **Adobe ESP (Event Service Platform)** - Series, events, speakers, sponsors, venues
- **Adobe ESL (Event Service Layer)** - Event lifecycle operations
- **Google Places API** - Venue autocomplete and location data
- **Adobe Chimera API** - CAAS tags for content tagging

### Development Tools
- **Jest** - Testing framework
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Parcel** - Frontend bundler
- **Dev Token System** - Local development authentication

## Authentication & Authorization

- **IMS (Identity Management System)** integration via Adobe ExC Shell
- Bearer token authentication for all backend actions
- Organization-scoped access control via `x-gw-ims-org-id` header
- Actions require `require-adobe-auth: true` annotation

## Key Features

### User Interface
- ✅ User profile display (IMS integration)
- ✅ Organization & team CRUD operations
- ✅ Series management with status tracking
- ✅ Multi-step event creation wizard
- ✅ Registration dashboard with CSV export
- ✅ Resource dashboard (view all series/events/sessions)

### Shared Components
- **DataTable** - Reusable table with actions
- **FormWizard** - Multi-step form container
- **StatusBadge** - Consistent status indicators
- **LoadingSpinner** - Loading states

## Configuration Files

### `app.config.yaml`
Main configuration defining:
- Actions and their settings
- Runtime manifest
- Extension configuration
- Authentication requirements

### `.env` (local only, not committed)
Runtime credentials:
```bash
AIO_RUNTIME_AUTH=...
AIO_RUNTIME_NAMESPACE=...
```

### `package.json`
Dependencies and scripts for both frontend and backend

### `tsconfig.json`
TypeScript configuration for frontend code

## Development Workflow

1. **Start Development**: `aio app run`
2. **Make Changes**: Edit files in `web-src/` or `actions/`
3. **Test Locally**: `aio app test`
4. **Debug in VS Code**: Use `WebAndActions` debug configuration
5. **Deploy**: `aio app deploy`

## Next Steps for New Developers

1. Read [FRONTEND.md](./FRONTEND.md) for UI development
2. Read [EVENT_FORM.md](./EVENT_FORM.md) for event form patterns
3. Read [DEV_TOKEN_QUICKSTART.md](./DEV_TOKEN_QUICKSTART.md) for local development setup
4. Read [TESTING.md](./TESTING.md) for testing patterns

## Common Commands

```bash
# Development
npm install              # Install dependencies
aio app run              # Start dev server
aio app run --local      # Local serverless

# Testing
npm test                 # Unit tests
npm run e2e              # E2E tests
npm run lint             # Check code style
npm run type-check       # TypeScript validation

# Deployment
aio app deploy           # Deploy everything
aio app undeploy         # Remove deployment
aio app logs             # View runtime logs

# Debug
aio app:list             # List deployed actions
aio app:get-url          # Get action URLs
```

## Debugging

### VS Code Debug Configurations
- **WebAndActions** - Debug both UI and actions
- Individual configs for UI and each action

### Viewing Logs
```bash
aio app logs            # Tail runtime logs
aio rt activation list  # List recent activations
aio rt activation get <id> # Get activation details
```

## Important Notes

- Frontend runs on `localhost:9080` by default
- Actions are deployed to Adobe I/O Runtime (even in dev mode)
- Use `--local` flag to run actions locally
- TypeScript is used only in frontend (`web-src/`)
- Backend actions use JavaScript (Node.js)

## Next Steps

- **Read the [Development Workflow](./DEVELOPMENT_WORKFLOW.md)** - Learn the official Adobe way to develop ⭐
- See [Frontend Guide](./FRONTEND.md) for React/TypeScript patterns
- See [Event Form Guide](./EVENT_FORM.md) for form implementation
- See [API Centralization](./API_CENTRALIZATION.md) for API service layer
- See [Testing Guide](./TESTING.md) for unit and E2E testing

## Resources

- [App Builder Documentation](https://developer.adobe.com/app-builder/docs/)
- [Adobe React Spectrum](https://react-spectrum.adobe.com/)
- [Adobe I/O Runtime](https://developer.adobe.com/runtime/docs/)

