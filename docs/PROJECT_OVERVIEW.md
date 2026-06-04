# EMC - Event Management Console

## Quick Start

**Adobe Experience Cloud application for managing events, series, registrations, and teams.**

### Local Development
```bash
npm install
npm run dev              # Start dev server (http://localhost:3000)
npm run dev:local        # UI + actions local (port 3000)
aio app test             # Adobe CLI tests (when configured)
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
│       ├── components/  # App shell, layout, shared UI
│       ├── pages/       # Route-level pages (EventForm, dashboards, admin)
│       ├── services/    # API service layer (ESP/ESL external APIs)
│       ├── types/       # TypeScript definitions
│       ├── hooks/       # Custom React hooks
│       ├── contexts/    # React context providers
│       ├── config/      # Configuration and constants
│       └── utils/       # Utility functions
├── actions/             # App Builder actions (I/O Runtime)
├── jest.config.js       # Jest (tests: web-src/src/**/*.test.ts)
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
- **React Spectrum 2** (`@react-spectrum/s2`) — UI components
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
- ✅ Series and event management
- ✅ Multi-step event creation and editing wizard
- ✅ Registrations (attendees) and related dashboards
- ✅ Overview, speakers, configs, and admin routes (see `App.tsx`)

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

# Quality
npm run lint             # ESLint
npm run type-check       # TypeScript validation
npm run test:unit        # Jest (when tests exist)
npm run check            # lint + type-check

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

- Local UI dev server uses **port 3000** (`npm run dev` / `npm run dev:local`)
- Actions are deployed to Adobe I/O Runtime (unless you use `--local`)
- TypeScript is used in the frontend (`web-src/`)
- Backend actions may use JavaScript (Node.js)

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

