# EMC Documentation Index

Welcome to the Event Management Console (EMC) documentation! This index will help you find the information you need.

## 🚀 Getting Started

### New Developer? Start Here!

1. **[Project Overview](./PROJECT_OVERVIEW.md)** - Architecture, folder structure, and quick commands
2. **[Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md)** - 30-second setup for local development with real API access
3. **[Development Workflow](./DEVELOPMENT_WORKFLOW.md)** - Official Adobe development workflow

## 📚 Core Documentation

### Frontend Development
- **[Frontend Guide](./FRONTEND.md)** - React/TypeScript development guide
  - Component architecture
  - State management
  - Routing with React Router
  - Adobe Spectrum UI components

- **[Event Form Guide](./EVENT_FORM.md)** - Complete event form implementation
  - Multi-step wizard with 4 main steps
  - Modular component architecture
  - Validation and data flow
  - Create and edit modes

- **[Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)** - Component extraction patterns
  - Breaking down complex forms
  - Self-contained, reusable components
  - External API integration patterns
  - Image upload with drag & drop

- **[Design System](./DESIGN_SYSTEM.md)** - Centralized design tokens and style utilities
  - Layout dimensions and calculations
  - Color palette and semantic colors
  - Z-index scale for layering
  - Common style objects and helpers

### API & Services
- **[API Centralization](./API_CENTRALIZATION.md)** - Centralized API management system
  - ApiService architecture
  - Type safety
  - Mock support
  - Consistent error handling

- **[Google Places API Setup](./GOOGLE_PLACES_SETUP.md)** - Google Places integration
  - API key setup and security
  - Venue autocomplete configuration
  - Cost optimization
  - Troubleshooting guide

### Testing
- **[Testing Guide](./TESTING.md)** - Unit and E2E testing patterns
  - Jest configuration
  - Testing components
  - Testing actions
  - E2E with Puppeteer

## 🔐 Local Development Features

### Dev Token Management

The EMC application includes a powerful token management system for local development:

- **[Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md)** ⚡ - Get up and running in 30 seconds
- **[Dev Token Complete Guide](./DEV_TOKEN_GUIDE.md)** 📖 - Comprehensive guide with architecture, examples, and visual diagrams
- **[Dev Token Security Model](./DEV_TOKEN_SECURITY.md)** 🔒 - Security architecture and bootstrap paths

**What is it?**
A system that lets you use real Adobe IMS tokens from production sites in your local development environment, enabling full API access without deploying to Experience Cloud Shell.

**Quick Start:**
1. Run `npm run dev`
2. Open **`http://localhost:3000/?devtokenmode=true`** (dev token requires this URL parameter)
3. Get token from adobe.com: `window.adobeIMS?.getAccessToken()`
4. Click "Dev Token" button in app and paste
5. Start making API calls!

## 🎨 UI/UX Documentation

### Layout & Navigation
- **[Top Navigation Layout](./TOP_NAV_LAYOUT.md)** - Navigation structure and user panel design
  - Top nav bar architecture
  - User panel components
  - Authentication display

- **[User Panel Implementation](./USER_PANEL_IMPLEMENTATION.md)** - Detailed user panel guide
  - Component breakdown
  - Profile display
  - Menu implementation

## 📋 Documentation by Topic

### Architecture & Design
- [Project Overview](./PROJECT_OVERVIEW.md)
- [API Centralization](./API_CENTRALIZATION.md)
- [Top Nav Layout](./TOP_NAV_LAYOUT.md)
- [Dev Token Architecture](./DEV_TOKEN_GUIDE.md#architecture)

### Development Workflow
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
- [Frontend Guide](./FRONTEND.md)
- [Event Form Guide](./EVENT_FORM.md)
- [Testing Guide](./TESTING.md)

### Integration & APIs
- [API Centralization](./API_CENTRALIZATION.md)
- [Dev Token Guide](./DEV_TOKEN_GUIDE.md)
- [Google Places API Setup](./GOOGLE_PLACES_SETUP.md)

### UI Components
- [Frontend Guide](./FRONTEND.md)
- [Event Form Guide](./EVENT_FORM.md)
- [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)
- [User Panel Implementation](./USER_PANEL_IMPLEMENTATION.md)
- [Top Nav Layout](./TOP_NAV_LAYOUT.md)

### Local Development
- [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) ⭐
- [Dev Token Guide](./DEV_TOKEN_GUIDE.md)
- [Dev Token Security Model](./DEV_TOKEN_SECURITY.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)

## 🚀 Deployment

### Environment Overview

| Environment | URL | How to Deploy |
|-------------|-----|---------------|
| **Dev/User Workspaces** | `14257-emc-{name}.adobeio-static.net` | `aio app deploy` (manual) |
| **Stage** | `14257-emc-stage.adobeio-static.net` | Push to `main` branch (automatic) |
| **Production** | `14257-emc-production.adobeio-static.net` | Publish GitHub release (automatic) |

### CI/CD Workflows

**Stage Deployment** (`deploy_stage.yml`):
- **Trigger**: Push/merge to `main` branch
- **Action**: Builds with `ENVIRONMENT=stage` and deploys to stage workspace

**Production Deployment** (`deploy_prod.yml`):
- **Trigger**: Publish a GitHub release
- **Action**: Builds with `ENVIRONMENT=prod` and deploys to production workspace

### Deploying to Stage

```bash
# Merge your PR or push directly to main
git checkout main
git merge your-feature-branch
git push origin main
# → Stage deployment triggers automatically
```

### Deploying to Production

```bash
# Option 1: GitHub CLI
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"

# Option 2: GitHub UI
# Go to Releases → Draft a new release → Publish
```

### Environment Configuration

The `ENVIRONMENT` variable determines which API tier to use:

| ENVIRONMENT | ESP API | ESL API |
|-------------|---------|---------|
| `dev` (default) | Dev cluster | Dev cluster |
| `stage` | `events-service-platform-stage.adobe.io` | `events-service-layer-stage.adobe.io` |
| `prod` | `events-service-platform.adobe.io` | `events-service-layer.adobe.io` |

Set in `.env` for local development:
```bash
ENVIRONMENT=dev  # or 'stage' to test against stage APIs
```

## 🔍 Quick Reference

### Common Commands

```bash
# Development
npm run dev              # Start local dev server (port 3000)
npm run dev:local        # Run with local actions
aio app run              # Alternative (port 9080)

# Testing
npm test                 # Run unit tests
npm run e2e              # Run E2E tests
npm run lint             # Check code style
npm run type-check       # TypeScript validation

# Deployment
aio app deploy           # Deploy to your workspace (dev)
aio app undeploy         # Remove deployment
```

### Common Tasks

| Task | Documentation |
|------|---------------|
| Deploy to stage/production | [Deployment section](#-deployment) |
| Set up local dev with API access | [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) |
| Set up Google Places API | [Google Places Setup](./GOOGLE_PLACES_SETUP.md) |
| Create a new component | [Frontend Guide](./FRONTEND.md) |
| Create modular form component | [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md) |
| Use API services | [API Centralization](./API_CENTRALIZATION.md) |
| Write tests | [Testing Guide](./TESTING.md) |
| Understand the architecture | [Project Overview](./PROJECT_OVERVIEW.md) |

### File Structure

```
EMC/
├── .github/workflows/              # 🚀 CI/CD pipelines
│   ├── deploy_stage.yml           # Auto-deploy on push to main
│   ├── deploy_prod.yml            # Auto-deploy on release
│   └── pr_test.yml                # PR validation
│
├── docs/                           # 📚 This documentation
│   ├── README.md                   # This index file
│   ├── PROJECT_OVERVIEW.md         # Start here!
│   ├── DEVELOPMENT_WORKFLOW.md     # How to develop
│   ├── FRONTEND.md                 # Frontend guide
│   ├── EVENT_FORM.md               # Event form guide
│   ├── MODULAR_COMPONENT_PATTERN.md # Component patterns
│   ├── API_CENTRALIZATION.md       # API architecture
│   ├── TESTING.md                  # Testing guide
│   ├── DEV_TOKEN_QUICKSTART.md    # ⚡ Quick setup
│   └── DEV_TOKEN_GUIDE.md         # 📖 Complete guide
│
├── web-src/                        # Frontend application
│   └── src/
│       ├── components/             # React components
│       ├── pages/                  # Page components
│       ├── services/               # API services
│       │   ├── api.ts             # Main API service
│       │   ├── tokenStorage.ts    # Token management
│       │   └── *Enrichment.ts     # Data enrichment utilities
│       ├── hooks/                  # React hooks
│       ├── contexts/               # React context providers
│       ├── config/                 # Configuration
│       │   ├── constants.ts       # Environment & API config
│       │   └── env.ts             # Environment variables
│       └── types/                  # TypeScript definitions
│
├── actions/                        # Backend actions (I/O Runtime)
├── test/                          # Unit tests
├── e2e/                          # E2E tests
└── app.config.yaml               # App configuration
```

## 🎯 Documentation by Role

### Frontend Developer
1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) ⚡
3. [Google Places API Setup](./GOOGLE_PLACES_SETUP.md)
4. [Frontend Guide](./FRONTEND.md)
5. [Event Form Guide](./EVENT_FORM.md)
6. [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)
7. [API Centralization](./API_CENTRALIZATION.md)

### Full-Stack Developer
1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) ⚡
3. [Development Workflow](./DEVELOPMENT_WORKFLOW.md)
4. [Frontend Guide](./FRONTEND.md)
5. [Event Form Guide](./EVENT_FORM.md)
6. [API Centralization](./API_CENTRALIZATION.md)
7. [Testing Guide](./TESTING.md)

### QA Engineer
1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Testing Guide](./TESTING.md)
3. [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md)

### Designer/UI Developer
1. [Frontend Guide](./FRONTEND.md)
2. [Top Nav Layout](./TOP_NAV_LAYOUT.md)
3. [User Panel Implementation](./USER_PANEL_IMPLEMENTATION.md)

## 🆕 Recent Updates

### Build-Time Environment Configuration (January 2026)
- ✨ **Simplified Environment Config** - Build-time injection replaces runtime detection
  - `ENVIRONMENT` variable set via CI/CD pipelines
  - 3 environment tiers: `dev`, `stage`, `prod`
  - Automatic API endpoint selection
  - See [Deployment section](#-deployment) above

### Design System (November 2025)
- ✨ **Centralized Design System** - Single source of truth for styles
  - Layout dimensions and calculated heights
  - Color palette (Adobe brand + Spectrum variables)
  - Z-index scale for proper layering
  - Common style objects (sticky nav, action bars, scrollable areas)
  - Border styles and helper functions
  - See [Design System Guide](./DESIGN_SYSTEM.md)

### Event Form Implementation (November 2025)
- ✨ **Production-Ready Multi-Step Form** - Complete event creation/editing
  - 4-step wizard matching v1 reference structure
  - Modular component architecture (EventFormatComponent, EventInfoComponent)
  - Full TypeScript type safety
  - Comprehensive validation
  - See [Event Form Guide](./EVENT_FORM.md)
  - See [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md)

### Event Dashboard Enhancements
- ✨ **Data Enrichment System** - Intelligent caching and batching for API calls
  - Thumbnail images with shimmer loading
  - Venue information enrichment
  - Series details with descriptions
  - Creator/modifier/publish history tracking
  - Automatic caching and request deduplication

### Dev Token Management
- ✨ **Local Development Token System** - Simplified local API testing
  - Token storage and validation
  - Beautiful UI for token input
  - Automatic expiration handling
  - See [Quick Start](./DEV_TOKEN_QUICKSTART.md)

## 🤔 Need Help?

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't make API calls locally | [Dev Token Quick Start](./DEV_TOKEN_QUICKSTART.md) |
| Don't understand the architecture | [Project Overview](./PROJECT_OVERVIEW.md) |
| Component not rendering | [Frontend Guide](./FRONTEND.md) |
| Form component extraction | [Modular Component Pattern](./MODULAR_COMPONENT_PATTERN.md) |
| Tests failing | [Testing Guide](./TESTING.md) |
| Token expired | [Dev Token Guide](./DEV_TOKEN_GUIDE.md#troubleshooting) |

### Getting Support
1. Check the relevant documentation above
2. Look for console error messages
3. Review example code in the codebase
4. Contact the development team

## 📝 Contributing to Documentation

When updating documentation:
1. Keep it clear and concise
2. Include code examples
3. Add screenshots where helpful
4. Update this index if adding new docs
5. Test all code examples

---

**Last Updated:** January 26, 2026
**Version:** 1.6.0

Happy coding! 🚀

